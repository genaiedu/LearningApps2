import { base64codes } from './base64codes.ts';
import { encodeClassical } from './encodeClassical.ts';

/*
3 bytes are encoded in 4 bytes of base64
11111122 22223333 33444444
We want to be the fastest possible, so we will use a lookup table to convert 12 bits to 2 bytes of base64
But in order still to avoid one operation we will create 2 of those lookup tables.
- One for 2222 11111122
- One for 3333 33444444
*/

// The output is assembled as 32-bit words and handed back as bytes, so its byte
// order is the platform's. On a big-endian machine every group of 4 would come
// out reversed, and the byte-wise encoder is used instead.
const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

// 2222 11111122
const base64codes1 = new Uint32Array(64 * 64);
for (let i = 0; i < 64; i++) {
  for (let j = 0; j < 64; j++) {
    const index = (i << 2) | ((j & 0x30) >> 4) | ((j & 0x0f) << 8);
    base64codes1[index] = base64codes[i]! | (base64codes[j]! << 8);
  }
}

// 3333 33444444 that we store on the bits 16->31 just to allow to make directly the OR with the previous value
const base64codes2 = new Uint32Array(64 * 64);
for (let i = 0; i < 64; i++) {
  for (let j = 0; j < 64; j++) {
    const index = (i << 6) | j;
    base64codes2[index] = (base64codes[i]! << 16) | (base64codes[j]! << 24);
  }
}

/**
 * Encode bytes to base64 using two precomputed 12-bit lookup tables to emit
 * 4 output bytes (one 32-bit word) per 3 input bytes. This is the default
 * `encode` exported from the package.
 * @param input - Uint8Array of raw bytes to encode.
 * @returns a Uint8Array containing the base64 representation (one byte per
 *   ASCII character, padded with `=` to a length that is a multiple of 4).
 */

export function encodeFast(input: Uint8Array): Uint8Array {
  if (!IS_LITTLE_ENDIAN) return encodeClassical(input);

  const output32 = new Uint32Array(Math.ceil(input.length / 3));
  let i, j;
  for (i = 2, j = 0; i < input.length; i += 3, j++) {
    output32[j] =
      base64codes1[input[i - 2]! | ((input[i - 1]! & 0xf0) << 4)]! |
      base64codes2[input[i]! | ((input[i - 1]! & 0x0f) << 8)]!;
  }
  if (i === input.length + 1) {
    // 1 octet yet to write
    output32[j] =
      base64codes[input[i - 2]! >> 2]! |
      (base64codes[(input[i - 2]! & 0x03) << 4]! << 8) |
      (15677 << 16);
  }
  if (i === input.length) {
    // 2 octets yet to write
    output32[j] =
      base64codes[input[i - 2]! >> 2]! |
      (base64codes[((input[i - 2]! & 0x03) << 4) | (input[i - 1]! >> 4)]! <<
        8) |
      (base64codes[(input[i - 1]! & 0x0f) << 2]! << 16) |
      (61 << 24);
  }
  const output8 = new Uint8Array(output32.buffer);
  return output8;
}
