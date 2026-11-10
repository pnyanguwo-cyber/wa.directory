-- 035_ai_usage_tracking.sql
-- AI/Gemini usage tracking for admin dashboard and quota management.
-- Safe to re-run (all IF NOT EXISTS).

-- ---------------------------------------------------------------------------
-- AI usage log: one row per Gemini API call (success or failure)
-- ---------------------------------------------------------------------------
-- Tracks: feature, model, tokens in/out, latency, cost estimate, errors
-- Business/account attribution where available.
-- Partitioned by month for performance on high-volume apps.

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- What AI feature made this call (see AI_FEATURE enum below)
  feature TEXT NOT NULL,
  -- Model used (e.g., 'gemini-3.8-flash', 'gemini-1.5-pro')
  model TEXT NOT NULL,
  -- Input tokens (prompt + context)
  input_tokens INT NOT NULL DEFAULT 0,
  -- Output tokens (completion)
  output_tokens INT NOT NULL DEFAULT 0,
  -- Total tokens
  total_tokens INT NOT NULL DEFAULT 0,
  -- Request latency in milliseconds
  latency_ms INT NOT NULL DEFAULT 0,
  -- Estimated cost in USD (based on published rates)
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  -- HTTP status or error class: '200', '429', '500', 'timeout', 'network', etc.
  status TEXT NOT NULL,
  -- Error message when status != '200'
  error_message TEXT DEFAULT '',
  -- Attribution
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  -- For org-level rollups
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  -- Channel: 'web', 'whatsapp', 'cron', 'admin'
  channel TEXT NOT NULL DEFAULT 'web',
  -- Request metadata (prompt hash, cache hit, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Timestamp in UTC
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature_time ON ai_usage_log (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_business_time ON ai_usage_log (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_time ON ai_usage_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_time ON ai_usage_log (model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status_time ON ai_usage_log (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_channel_time ON ai_usage_log (channel, created_at DESC);

-- Monthly partitioning (PostgreSQL 12+ native partitioning)
-- Uncomment after verifying table is empty on first run:
-- ALTER TABLE ai_usage_log
--   PARTITION BY RANGE (created_at);

-- Example partition creation (run monthly via cron or manually):
-- CREATE TABLE ai_usage_log_2026_01 PARTITION OF ai_usage_log
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- CREATE TABLE ai_usage_log_2026_02 PARTITION OF ai_usage_log
--   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- ---------------------------------------------------------------------------
-- AI feature registry (for admin UI dropdowns and reporting)
-- ---------------------------------------------------------------------------
-- Features using Gemini:
-- 'registration_draft'       - AI business registration from images
-- 'listing_draft'            - AI product listing from images
-- 'search_expansion'         - Query expansion for search
-- 'seo_blurb'                - SEO paragraph generation
-- 'intent_classification'    - Mid-flow WhatsApp intent detection
-- 'vision_analysis'          - Generic image analysis (fallback)

-- ---------------------------------------------------------------------------
-- Admin controls: bot_settings keys (JSON values)
-- ---------------------------------------------------------------------------
-- Key 'ai_global_paused'          : { paused: boolean, reason?: string, paused_at?: string, paused_by?: string }
-- Key 'ai_feature_controls'       : { registration_draft: {enabled, daily_limit_per_biz}, listing_draft: {...}, search_expansion: {...}, seo_blurb: {...}, intent_classification: {...}, vision_analysis: {...} }
-- Key 'ai_usage_limits'           : { free: { daily_requests, daily_tokens, monthly_tokens }, premium: {...}, admin: {...} }
-- Key 'ai_model_config'           : { default_model: string, fallback_model: string, allowed_models: string[] }
-- Key 'ai_quota_alerts'           : { warning_threshold_pct: 80, critical_threshold_pct: 95, notified_at: string|null }

-- RLS: service-role only (admin reads via /api/admin/ai-usage)
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_usage_log FROM anon, authenticated;

-- Admin access function (called via RPC from server-side admin API)
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

-- Aggregated stats function for dashboard
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
      SELECT jsonb_agg(stats ORDER BY total_tokens DESC)
      FROM (
        SELECT
          business_id,
          (SELECT name FROM businesses WHERE id = ai_usage_log.business_id) AS business_name,
          jsonb_build_object(
            'business_id', business_id,
            'business_name', (SELECT name FROM businesses WHERE id = ai_usage_log.business_id),
            'requests', COUNT(*),
            'input_tokens', COALESCE(SUM(input_tokens), 0),
            'output_tokens', COALESCE(SUM(output_tokens), 0),
            'total_tokens', COALESCE(SUM(total_tokens), 0),
            'estimated_cost_usd', COALESCE(SUM(estimated_cost_usd), 0)
          ) AS stats
        FROM ai_usage_log
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
          AND business_id IS NOT NULL
          AND (p_business_id IS NULL OR business_id = p_business_id)
          AND (p_org_id IS NULL OR org_id = p_org_id)
        GROUP BY business_id
        ORDER BY COALESCE(SUM(total_tokens), 0) DESC
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
    ) AS by_channel;
$$;