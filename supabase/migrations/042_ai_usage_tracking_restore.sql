-- 042_ai_usage_tracking_restore.sql
-- Migration 035 is recorded in the remote migration history but its objects
-- are absent from the database, so the admin AI Usage tab had nothing to read
-- and lib/ai-gateway.ts could not record calls. Recreate them idempotently.

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT DEFAULT '',
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'web',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_feature_time ON ai_usage_log (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_business_time ON ai_usage_log (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_time ON ai_usage_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_time ON ai_usage_log (model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status_time ON ai_usage_log (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_channel_time ON ai_usage_log (channel, created_at DESC);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_usage_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION admin_get_ai_usage(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_feature TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_limit INT DEFAULT 1000,
  p_offset INT DEFAULT 0
) RETURNS SETOF ai_usage_log
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM ai_usage_log
  WHERE (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to)
    AND (p_feature IS NULL OR feature = p_feature)
    AND (p_model IS NULL OR model = p_model)
    AND (p_business_id IS NULL OR business_id = p_business_id)
    AND (p_org_id IS NULL OR org_id = p_org_id)
    AND (p_status IS NULL OR status = p_status)
    AND (p_channel IS NULL OR channel = p_channel)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION admin_get_ai_usage_summary(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
) RETURNS TABLE (
  total_requests BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_tokens BIGINT,
  total_estimated_cost_usd NUMERIC(12, 6),
  avg_latency_ms NUMERIC(10, 2),
  error_rate NUMERIC(5, 4),
  by_feature JSONB,
  by_model JSONB,
  by_business JSONB,
  by_day JSONB,
  by_channel JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COALESCE(SUM(input_tokens), 0)::BIGINT AS total_input_tokens,
    COALESCE(SUM(output_tokens), 0)::BIGINT AS total_output_tokens,
    COALESCE(SUM(total_tokens), 0)::BIGINT AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0)::NUMERIC(12, 6) AS total_estimated_cost_usd,
    COALESCE(AVG(latency_ms)::NUMERIC(10, 2), 0) AS avg_latency_ms,
    CASE WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE status <> '200')::NUMERIC / COUNT(*)::NUMERIC
      ELSE 0 END AS error_rate,
    (
      SELECT jsonb_object_agg(feature, stats)
      FROM (
        SELECT
          feature,
          jsonb_build_object(
            'requests', COUNT(*),
            'input_tokens', COALESCE(SUM(input_tokens), 0),
            'output_tokens', COALESCE(SUM(output_tokens), 0),
            'total_tokens', COALESCE(SUM(total_tokens), 0),
            'estimated_cost_usd', COALESCE(SUM(estimated_cost_usd), 0),
            'avg_latency_ms', COALESCE(AVG(latency_ms)::NUMERIC(10,2), 0),
            'error_rate', CASE WHEN COUNT(*) > 0
              THEN COUNT(*) FILTER (WHERE status <> '200')::NUMERIC / COUNT(*)::NUMERIC
              ELSE 0 END
          ) AS stats
        FROM ai_usage_log
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
          AND (p_business_id IS NULL OR business_id = p_business_id)
          AND (p_org_id IS NULL OR org_id = p_org_id)
        GROUP BY feature
      ) t
    ) AS by_feature,
    (
      SELECT jsonb_object_agg(model, stats)
      FROM (
        SELECT
          model,
          jsonb_build_object(
            'requests', COUNT(*),
            'input_tokens', COALESCE(SUM(input_tokens), 0),
            'output_tokens', COALESCE(SUM(output_tokens), 0),
            'total_tokens', COALESCE(SUM(total_tokens), 0),
            'estimated_cost_usd', COALESCE(SUM(estimated_cost_usd), 0)
          ) AS stats
        FROM ai_usage_log
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
          AND (p_business_id IS NULL OR business_id = p_business_id)
          AND (p_org_id IS NULL OR org_id = p_org_id)
        GROUP BY model
      ) t
    ) AS by_model,
    (
      SELECT jsonb_agg(stats ORDER BY tokens DESC)
      FROM (
        SELECT
          a.business_id,
          COALESCE(SUM(a.total_tokens), 0)::BIGINT AS tokens,
          jsonb_build_object(
            'business_id', a.business_id,
            'business_name', (SELECT b.name FROM businesses b WHERE b.id = a.business_id),
            'requests', COUNT(*),
            'input_tokens', COALESCE(SUM(a.input_tokens), 0),
            'output_tokens', COALESCE(SUM(a.output_tokens), 0),
            'total_tokens', COALESCE(SUM(a.total_tokens), 0),
            'estimated_cost_usd', COALESCE(SUM(a.estimated_cost_usd), 0)
          ) AS stats
        FROM ai_usage_log a
        WHERE (p_from IS NULL OR a.created_at >= p_from)
          AND (p_to IS NULL OR a.created_at <= p_to)
          AND a.business_id IS NOT NULL
          AND (p_business_id IS NULL OR a.business_id = p_business_id)
          AND (p_org_id IS NULL OR a.org_id = p_org_id)
        GROUP BY a.business_id
        ORDER BY tokens DESC
        LIMIT 50
      ) t
    ) AS by_business,
    (
      SELECT jsonb_object_agg(day, stats)
      FROM (
        SELECT
          to_char(created_at AT TIME ZONE 'Africa/Harare', 'YYYY-MM-DD') AS day,
          jsonb_build_object(
            'requests', COUNT(*),
            'input_tokens', COALESCE(SUM(input_tokens), 0),
            'output_tokens', COALESCE(SUM(output_tokens), 0),
            'total_tokens', COALESCE(SUM(total_tokens), 0),
            'estimated_cost_usd', COALESCE(SUM(estimated_cost_usd), 0),
            'errors', COUNT(*) FILTER (WHERE status <> '200')
          ) AS stats
        FROM ai_usage_log
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
          AND (p_business_id IS NULL OR business_id = p_business_id)
          AND (p_org_id IS NULL OR org_id = p_org_id)
        GROUP BY to_char(created_at AT TIME ZONE 'Africa/Harare', 'YYYY-MM-DD')
        ORDER BY day DESC
        LIMIT 90
      ) t
    ) AS by_day,
    (
      SELECT jsonb_object_agg(channel, stats)
      FROM (
        SELECT
          channel,
          jsonb_build_object(
            'requests', COUNT(*),
            'input_tokens', COALESCE(SUM(input_tokens), 0),
            'output_tokens', COALESCE(SUM(output_tokens), 0),
            'total_tokens', COALESCE(SUM(total_tokens), 0),
            'estimated_cost_usd', COALESCE(SUM(estimated_cost_usd), 0)
          ) AS stats
        FROM ai_usage_log
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
          AND (p_business_id IS NULL OR business_id = p_business_id)
          AND (p_org_id IS NULL OR org_id = p_org_id)
        GROUP BY channel
      ) t
    ) AS by_channel
  FROM ai_usage_log
  WHERE (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to)
    AND (p_business_id IS NULL OR business_id = p_business_id)
    AND (p_org_id IS NULL OR org_id = p_org_id);
$$;
