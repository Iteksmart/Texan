const LEGACY_EMAIL_ALIASES: Record<string, string> = {
  'admin@nextup.demo': 'admin@nextus.demo',
};

export function resolveLoginEmailCandidates(email: string): string[] {
  const normalized = email.toLowerCase().trim();
  const candidates = [normalized];
  const alias = LEGACY_EMAIL_ALIASES[normalized];
  if (alias && !candidates.includes(alias)) candidates.push(alias);
  return candidates;
}
