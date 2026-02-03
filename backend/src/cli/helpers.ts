export const parseDuration = (input: string): number => {
  const match = input.match(/^(\d+)(s|m|h|d)$/)
  if (!match) throw new Error(`Invalid duration: ${input}`)

  const value = Number(match[1])
  const unit = match[2]

  const multipliers = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }

  return value * multipliers[unit as keyof typeof multipliers]
}
