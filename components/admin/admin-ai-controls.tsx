'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader, ConfirmDialog } from './shared'
import { formatHarareDateTimeFull } from '@/lib/date-utils'

interface BotSettings {
  ai_global_paused: {
    paused: boolean
    reason?: string
    paused_at?: string
    paused_by?: string
  }
  ai_feature_controls: Record<string, {
    enabled: boolean
    daily_limit_per_biz?: number
    monthly_limit_per_biz?: number
  }>
  ai_usage_limits: {
    free: { daily_requests: number; daily_tokens: number; monthly_tokens: number }
    premium: { daily_requests: number; daily_tokens: number; monthly_tokens: number }
    admin: { daily_requests: number; daily_tokens: number; monthly_tokens: number }
  }
  ai_model_config: {
    default_model: string
    fallback_model: string
    allowed_models: string[]
  }
  ai_quota_alerts: {
    warning_threshold_pct: number
    critical_threshold_pct: number
    notified_at: string | null
  }
}

const FEATURES = [
  { key: 'registration_draft', label: 'Registration Draft', description: 'AI-assisted business registration from images' },
  { key: 'listing_draft', label: 'Listing Draft', description: 'AI product listing from product photos' },
  { key: 'search_expansion', label: 'Search Expansion', description: 'Query expansion for better search results' },
  { key: 'seo_blurb', label: 'SEO Blurb', description: 'SEO paragraph generation for business sites' },
  { key: 'intent_classification', label: 'Intent Classification', description: 'Mid-flow WhatsApp intent detection' },
  { key: 'vision_analysis', label: 'Vision Analysis', description: 'Generic image analysis (fallback)' },
]

const TIERS = ['free', 'premium', 'admin'] as const
type Tier = typeof TIERS[number]

const TIER_LABELS: Record<Tier, string> = { free: 'Free', premium: 'Premium', admin: 'Admin' }

export default function AdminAiControls() {
  const router = useRouter()
  const [settings, setSettings] = useState<BotSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState<{ action: string; onConfirm: () => void } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/bot-settings')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setSettings(data)
    setLoading(false)
  }

  async function save(key: string, value: unknown) {
    setSaving(key)
    const { ok, data } = await adminFetch('/api/admin/bot-settings', {
      method: 'PATCH',
      body: JSON.stringify({ [key]: value }),
    })
    setSaving(null)
    if (!ok) {
      setMessage(data?.error || 'Failed to save')
      return
    }
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
    setMessage('Saved successfully')
    setTimeout(() => setMessage(''), 3000)
  }

  function requestConfirm(action: string, onConfirm: () => void) {
    setConfirming({ action, onConfirm })
  }

  function handleConfirm() {
    confirming?.onConfirm()
    setConfirming(null)
  }

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)}</div>
  }
  if (!settings) return null

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="AI Controls"
        subtitle="Global pause, feature toggles, usage limits, model config, and quota monitoring"
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {/* Global Pause */}
      <div className="neo-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Global AI Pause</h3>
            <p className="text-xs text-text-secondary mt-0.5">Instantly disable all Gemini API calls across all features and channels.</p>
          </div>
          <button
            onClick={() => requestConfirm(
              settings.ai_global_paused.paused ? 'Resume all AI features' : 'Pause all AI features',
              () => save('ai_global_paused', {
                paused: !settings.ai_global_paused.paused,
                reason: settings.ai_global_paused.paused ? undefined : 'Manual pause via admin dashboard',
                paused_at: settings.ai_global_paused.paused ? undefined : formatHarareDateTimeFull(new Date()),
                paused_by: settings.ai_global_paused.paused ? undefined : 'admin',
              })
            )}
            disabled={saving === 'ai_global_paused'}
            className={`h-10 px-5 rounded-2xl text-sm font-semibold transition-all ${
              settings.ai_global_paused.paused
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-whatsapp-500 hover:bg-whatsapp-600 text-white'
            } ${saving === 'ai_global_paused' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saving === 'ai_global_paused' ? 'Saving...' : settings.ai_global_paused.paused ? 'Resume All' : 'Pause All'}
          </button>
        </div>
        {settings.ai_global_paused.paused && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700 font-medium">AI PAUSED</p>
            <p className="text-xs text-red-600 mt-0.5">{settings.ai_global_paused.reason || 'No reason provided'}</p>
            <p className="text-[10px] text-red-500 mt-1">Paused: {settings.ai_global_paused.paused_at ? formatHarareDateTimeFull(settings.ai_global_paused.paused_at) : 'Unknown'} by {settings.ai_global_paused.paused_by || 'unknown'}</p>
          </div>
        )}
      </div>

      {/* Feature Controls */}
      <div className="neo-card p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">Feature Toggles & Limits</h3>
        <div className="space-y-3">
          {FEATURES.map(feature => {
            const control = settings.ai_feature_controls[feature.key] || { enabled: true }
            return (
              <div key={feature.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-gray-200/80 bg-surface/50">
                <div className="flex items-center gap-3 min-w-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={control.enabled}
                      onChange={e => save('ai_feature_controls', {
                        ...settings.ai_feature_controls,
                        [feature.key]: { ...control, enabled: e.target.checked },
                      })}
                      disabled={saving === 'ai_feature_controls'}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full border-2 transition-colors ${
                      control.enabled ? 'bg-whatsapp-500 border-whatsapp-500' : 'bg-gray-300 border-gray-300'
                    }`}>
                      <span className={`block w-5 h-5 rounded-full bg-white transform transition-transform ${
                        control.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{feature.label}</p>
                    <p className="text-[11px] text-text-secondary truncate">{feature.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-text-secondary">Daily limit/biz:</label>
                    <input
                      type="number"
                      min="0"
                      value={control.daily_limit_per_biz || ''}
                      onChange={e => save('ai_feature_controls', {
                        ...settings.ai_feature_controls,
                        [feature.key]: { ...control, daily_limit_per_biz: e.target.value ? parseInt(e.target.value) : undefined },
                      })}
                      disabled={saving === 'ai_feature_controls' || !control.enabled}
                      className="input-field text-sm w-20"
                      placeholder="∞"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-text-secondary">Monthly limit/biz:</label>
                    <input
                      type="number"
                      min="0"
                      value={control.monthly_limit_per_biz || ''}
                      onChange={e => save('ai_feature_controls', {
                        ...settings.ai_feature_controls,
                        [feature.key]: { ...control, monthly_limit_per_biz: e.target.value ? parseInt(e.target.value) : undefined },
                      })}
                      disabled={saving === 'ai_feature_controls' || !control.enabled}
                      className="input-field text-sm w-20"
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Usage Limits by Tier */}
      <div className="neo-card p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">Usage Limits by Tier</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">Tier</th>
                <th className="py-2 pr-4 font-semibold text-right">Daily Requests</th>
                <th className="py-2 pr-4 font-semibold text-right">Daily Tokens</th>
                <th className="py-2 pr-4 font-semibold text-right">Monthly Tokens</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map(tier => {
                const limits = settings.ai_usage_limits[tier] || { daily_requests: 0, daily_tokens: 0, monthly_tokens: 0 }
                return (
                  <tr key={tier} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-text-primary">{TIER_LABELS[tier]}</td>
                    <td className="py-3 pr-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={limits.daily_requests}
                        onChange={e => save('ai_usage_limits', {
                          ...settings.ai_usage_limits,
                          [tier]: { ...limits, daily_requests: parseInt(e.target.value) || 0 },
                        })}
                        disabled={saving === 'ai_usage_limits'}
                        className="input-field text-sm w-24 text-right"
                      />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={limits.daily_tokens}
                        onChange={e => save('ai_usage_limits', {
                          ...settings.ai_usage_limits,
                          [tier]: { ...limits, daily_tokens: parseInt(e.target.value) || 0 },
                        })}
                        disabled={saving === 'ai_usage_limits'}
                        className="input-field text-sm w-28 text-right"
                      />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={limits.monthly_tokens}
                        onChange={e => save('ai_usage_limits', {
                          ...settings.ai_usage_limits,
                          [tier]: { ...limits, monthly_tokens: parseInt(e.target.value) || 0 },
                        })}
                        disabled={saving === 'ai_usage_limits'}
                        className="input-field text-sm w-28 text-right"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-secondary mt-2">Set to 0 for unlimited. Limits are enforced per business per day/month.</p>
      </div>

      {/* Model Configuration */}
      <div className="neo-card p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">Model Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Default Model</label>
            <select
              value={settings.ai_model_config.default_model}
              onChange={e => save('ai_model_config', { ...settings.ai_model_config, default_model: e.target.value })}
              disabled={saving === 'ai_model_config'}
              className="input-field text-sm w-full"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Recommended)</option>
              <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b (Cheaper)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (Higher quality)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Fallback Model</label>
            <select
              value={settings.ai_model_config.fallback_model}
              onChange={e => save('ai_model_config', { ...settings.ai_model_config, fallback_model: e.target.value })}
              disabled={saving === 'ai_model_config'}
              className="input-field text-sm w-full"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Allowed Models (comma-separated)</label>
            <input
              type="text"
              value={settings.ai_model_config.allowed_models.join(', ')}
              onChange={e => save('ai_model_config', {
                ...settings.ai_model_config,
                allowed_models: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
              })}
              disabled={saving === 'ai_model_config'}
              className="input-field text-sm w-full"
              placeholder="gemini-1.5-flash, gemini-1.5-pro"
            />
          </div>
        </div>
      </div>

      {/* Quota Alerts */}
      <div className="neo-card p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">Quota Alerts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Warning Threshold (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.ai_quota_alerts.warning_threshold_pct}
              onChange={e => save('ai_quota_alerts', { ...settings.ai_quota_alerts, warning_threshold_pct: parseInt(e.target.value) || 80 })}
              disabled={saving === 'ai_quota_alerts'}
              className="input-field text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Critical Threshold (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.ai_quota_alerts.critical_threshold_pct}
              onChange={e => save('ai_quota_alerts', { ...settings.ai_quota_alerts, critical_threshold_pct: parseInt(e.target.value) || 95 })}
              disabled={saving === 'ai_quota_alerts'}
              className="input-field text-sm w-full"
            />
          </div>
          <div className="flex items-end">
            <p className="text-[11px] text-text-secondary">
              Last notified: {settings.ai_quota_alerts.notified_at ? formatHarareDateTimeFull(settings.ai_quota_alerts.notified_at) : 'Never'}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-text-secondary mt-2">Alerts are sent to ADMIN_WHATSAPP when estimated daily cost exceeds thresholds.</p>
      </div>

      {/* Confirmation Dialog */}
      {confirming && (
        <ConfirmDialog
          message={`${confirming.action} — Are you sure you want to proceed?`}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  )
}