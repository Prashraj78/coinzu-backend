/**
 * Masks an identity for a public leaderboard. Enough of the address survives
 * for a winner to recognise themselves; nobody else can reconstruct it.
 */
export function maskEmail(email?: string | null, name?: string | null): string {
  if (email?.includes('@')) {
    const [local, domain] = email.split('@');
    const head = local.slice(0, Math.min(5, Math.max(1, local.length - 1)));
    return `${head}@****${domain.slice(domain.indexOf('.'))}`;
  }
  if (name?.trim()) {
    const trimmed = name.trim();
    return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(3, trimmed.length - 2))}`;
  }
  return 'Coinzu player';
}
