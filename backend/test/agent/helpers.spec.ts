import {describe, expect, test} from 'bun:test'
import {sqrtBigInt} from '../../src/agent/helpers'

describe('sqrtBigInt', () => {
  test('throws on negative input', () => {
    expect(() => sqrtBigInt(-1n)).toThrow(
      'square root of negative numbers is not supported',
    )
  })

  test('handles small edge cases', () => {
    expect(sqrtBigInt(0n)).toBe(0n)
    expect(sqrtBigInt(1n)).toBe(1n)
    expect(sqrtBigInt(2n)).toBe(1n)
    expect(sqrtBigInt(3n)).toBe(1n)
  })

  test('perfect squares', () => {
    expect(sqrtBigInt(4n)).toBe(2n)
    expect(sqrtBigInt(9n)).toBe(3n)
    expect(sqrtBigInt(16n)).toBe(4n)
    expect(sqrtBigInt(1_000_000n)).toBe(1000n)
  })

  test('rounds down for non-perfect squares', () => {
    expect(sqrtBigInt(5n)).toBe(2n)
    expect(sqrtBigInt(15n)).toBe(3n)
    expect(sqrtBigInt(26n)).toBe(5n)
    expect(sqrtBigInt(999_999n)).toBe(999n)
  })

  test('very large numbers (DEX scale)', () => {
    const n = 10n ** 24n
    expect(sqrtBigInt(n)).toBe(10n ** 12n)

    const nonPerfect = 10n ** 24n - 123456789n
    const r = sqrtBigInt(nonPerfect)
    expect(r * r <= nonPerfect).toBe(true)
    expect((r + 1n) * (r + 1n) > nonPerfect).toBe(true)
  })

  test('invariant property holds: r² ≤ n < (r+1)²', () => {
    const samples = [7n, 123n, 10_000n, 12345678901234567890n, 2n ** 128n - 1n]

    for (const n of samples) {
      const r = sqrtBigInt(n)
      expect(r * r <= n).toBe(true)
      expect((r + 1n) * (r + 1n) > n).toBe(true)
    }
  })
})
