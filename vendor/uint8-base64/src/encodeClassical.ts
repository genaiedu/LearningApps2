import { base64codes } from './base64codes.ts';

/**
 * Encode bytes to base64 using a straightforward per-byte algorithm.
 * Slower than `encodeFast` but kept as a reference implementation.
 * @param input - Uint8Array of raw bytes to encode.
 * @returns a Uint8Array containing the base64 representation (one byte per
 *   ASCII character, padded with `=` to a length that is a multiple of 4).
 */

export function encodeClassical(input: Uint8Array): Uint8Array {
  const output = new Uint8Array(Math.ceil(input.length / 3) * 4);
  let i, j;
  for (i = 2, j = 0; i < input.length; i += 3, j += 4) {
    output[j] = base64codes[input[i - 2]! >> 2]!;
    output[j + 1] =
      base64codes[((input[i - 2]! & 0x03) << 4) | (input[i - 1]! >> 4)]!;
    output[j + 2] =
      base64codes[((input[i - 1]! & 0x0f) << 2) | (input[i]! >> 6)]!;
    output[j + 3] = base64codes[input[i]! & 0x3f]!;
  }
  if (i === input.length + 1) {
    // 1 octet yet to write
    output[j] = base64codes[input[i - 2]! >> 2]!;
    output[j + 1] = base64codes[(input[i - 2]! & 0x03) << 4]!;
    output[j + 2] = 61;
    output[j + 3] = 61;
  }
  if (i === input.length) {
    // 2 octets yet to write
    output[j] = base64codes[input[i - 2]! >> 2]!;
    output[j + 1] =
      base64codes[((input[i - 2]! & 0x03) << 4) | (input[i - 1]! >> 4)]!;
    output[j + 2] = base64codes[(input[i - 1]! & 0x0f) << 2]!;
    output[j + 3] = 61;
  }
  return output;
}
