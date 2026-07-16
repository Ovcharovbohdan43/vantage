export const BLOG_OWNER_USER_ID = 'db1c0e15-f6f4-4b59-b6b9-b2d56cb508b8'
export const BLOG_OWNER_EMAIL = 'f62688798@gmail.com'

export function isBlogOwner(
  user: { id: string; email?: string | null } | null | undefined,
): boolean {
  if (!user) return false
  if (user.id.toLowerCase() === BLOG_OWNER_USER_ID) return true
  return (user.email ?? '').trim().toLowerCase() === BLOG_OWNER_EMAIL
}
