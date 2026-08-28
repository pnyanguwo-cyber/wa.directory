'use client'

export interface PasswordStrength {
  score: number
  label: string
  valid: boolean
  color: string
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-whatsapp-500']

export function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '', valid: false, color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const clamped = Math.min(score, 4)
  const valid = pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw)
  return { score: clamped, label: LABELS[clamped], valid, color: COLORS[clamped] }
}

export function validatePassword(pw: string): string | null {
  if (!pw) return null
  if (pw.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use both letters and numbers'
  return null
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null
  return (
    <div className="mt-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? color : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </div>
      <p className={`text-xs mt-1 ${score >= 3 ? 'text-whatsapp-600' : 'text-text-secondary'}`}>
        Strength: {label}
      </p>
    </div>
  )
}
