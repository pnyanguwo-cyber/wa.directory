const store = new Map<string, { value: Promise<unknown>; expiresAt: number }>()

export function memoize<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) return hit.value as Promise<T>

  const value = fn()
  store.set(key, { value, expiresAt: now + ttlMs })
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key)
  })
  return value
}

export function clearMemo() {
  store.clear()
}