import { cookies } from 'next/headers'

export function isAdmin(): boolean {
  const cookieStore = cookies()
  return cookieStore.get('admin_token')?.value === 'true'
}
