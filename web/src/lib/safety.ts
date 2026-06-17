// Live "safety meter" — translates the user's authority choices into the same
// signals that token scanners (RugCheck, DexScreener) and buyers look at. The
// goal: make the safe choice obvious and the risky one loud, never silent.
export interface SafetyInput {
  revokeMint: boolean
  revokeFreeze: boolean
  revokeUpdate: boolean
}

export type SafetyLevel = 'high' | 'medium' | 'low'

export interface SafetyResult {
  score: number // 0–100
  level: SafetyLevel
  warnings: string[]
}

export function computeSafety(o: SafetyInput): SafetyResult {
  let score = 0
  const warnings: string[] = []

  if (o.revokeMint) score += 40
  else warnings.push('Mint authority kept — you could print unlimited new tokens later. Buyers treat this as a major red flag.')

  if (o.revokeFreeze) score += 40
  else warnings.push("Freeze authority kept — you could freeze any holder's tokens. This is a classic honeypot signal.")

  if (o.revokeUpdate) score += 20
  else warnings.push('Update authority kept — the token name, symbol, and image can still be changed after launch.')

  const level: SafetyLevel = score >= 80 ? 'high' : score >= 40 ? 'medium' : 'low'
  return { score, level, warnings }
}
