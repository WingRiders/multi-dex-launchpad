import {CryptoHasher} from 'bun'

export const sha3_256 = (input: Buffer) => CryptoHasher.hash('sha3-256', input)

export const blake2b256 = (input: Buffer) =>
  CryptoHasher.hash('blake2b256', input)
