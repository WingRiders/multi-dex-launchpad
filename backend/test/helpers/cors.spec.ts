import {describe, expect, it} from 'bun:test'
import {getCorsOptions} from '../../src/helpers/cors'

const expectRegExp: (value: unknown) => asserts value is RegExp = (value) => {
  expect(value).toBeInstanceOf(RegExp)
}

describe('getCorsOptions', () => {
  it('converts wildcard origins to RegExp', () => {
    const options = getCorsOptions(
      'http://localhost:*,https://example.com',
      true,
    )

    const origin = options.origin
    if (!Array.isArray(origin)) throw new Error('Unexpected boolean origin')

    expect(origin).toHaveLength(2)

    const [first, second] = origin

    expectRegExp(first)

    expect(first.test('http://localhost:3000')).toBe(true)
    expect(first.test('http://localhost:9999')).toBe(true)
    expect(first.test('https://localhost:3000')).toBe(false)

    expect(second).toBe('https://example.com')
    expect(options.credentials).toBe(true)
  })

  it('leaves plain origins as strings', () => {
    const options = getCorsOptions('https://example.com', true)

    const origin = options.origin
    if (!Array.isArray(origin)) throw new Error('Unexpected boolean origin')

    expect(origin).toEqual(['https://example.com'])
    expect(options.credentials).toBe(true)
  })

  it('handles wildcard-only "*" origin', () => {
    const options = getCorsOptions('*', true)

    const origin = options.origin
    if (!Array.isArray(origin)) throw new Error('Unexpected boolean origin')

    expect(origin).toEqual([/^.*$/])
    expect(options.credentials).toBe(false)
  })

  it('handles empty corsEnabledFor', () => {
    const options = getCorsOptions('', true)

    const origin = options.origin
    if (!Array.isArray(origin)) throw new Error('Unexpected boolean origin')

    expect(origin).toEqual([])
    expect(options.credentials).toBe(true)
  })

  it('uses permissive CORS in non-prod mode', () => {
    const options = getCorsOptions('http://localhost:*', false)

    expect(options.origin).toBe(true)
    expect(options.credentials).toBe(true)
    expect(options.methods).toEqual(['GET', 'PUT', 'POST', 'OPTIONS'])
  })
})
