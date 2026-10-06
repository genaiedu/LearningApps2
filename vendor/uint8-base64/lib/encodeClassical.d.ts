/**
 * Encode bytes to base64 using a straightforward per-byte algorithm.
 * Slower than `encodeFast` but kept as a reference implementation.
 * @param input - Uint8Array of raw bytes to encode.
 * @returns a Uint8Array containing the base64 representation (one byte per
 *   ASCII character, padded with `=` to a length that is a multiple of 4).
 */
export declare function encodeClassical(input: Uint8Array): Uint8Array;
//# sourceMappingURL=encodeClassical.d.ts.map