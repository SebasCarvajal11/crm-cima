export function pickAvatarUrl(
  urls: Partial<Record<'64' | '256' | '512', string>> | null | undefined,
  preferred: '64' | '256' | '512' = '64'
): string | null {
  if (!urls) return null
  if (urls[preferred]) return urls[preferred] ?? null
  return urls['64'] ?? urls['256'] ?? urls['512'] ?? null
}
