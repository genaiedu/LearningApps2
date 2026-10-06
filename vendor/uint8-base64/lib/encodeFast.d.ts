/**
 * Encode bytes to base64 using two precomputed 12-bit lookup tables to emit
 * 4 output bytes (one 32-bit word) per 3 input bytes. This is the default
 * `encode` exported from the package.
 * @param input - Uint8Array of raw bytes to encode.
 * @returns a Uint8Array containing the base64 representation (one byte per
 *   ASCII character, padded with `=` to a length that is a multiple of 4).
 */
export declare function encodeFast(input: Uint8Array): Uint8Array;
//# sourceMappingURL=encodeFast.d.ts.map