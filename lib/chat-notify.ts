'use client'

// Browser-side alert sound for new customer messages. Generated with WebAudio
// so there is no asset to load and it still works when the tab is in the
// background. Browsers require a user gesture before audio can start, so the
// context is created lazily and resumed on the first click or key press.

let context: AudioContext | null = null

const MUTE_KEY = 'wa-chat-alerts-muted'

/** Alert sound preference, shared by the admin and business chat workspaces. */
export function isChatMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setChatMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Private mode or blocked storage: the toggle still works for this tab.
  }
}

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  return context
}

/** Call from a user gesture once; harmless when repeated. */
export function unlockChatAudio() {
  const ctx = audioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, gainValue: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

/** Two-note WhatsApp-ish chime. Silently does nothing without audio support. */
export function playChatChime() {
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  const now = ctx.currentTime + 0.02
  tone(ctx, 880, now, 0.14, 0.12)
  tone(ctx, 1174.66, now + 0.13, 0.22, 0.1)
}
