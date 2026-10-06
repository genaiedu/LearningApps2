const base64codes = Uint8Array.from([
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255,
  255, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255,
  255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 255, 255, 255, 255, 255, 255, 26, 27, 28, 29, 30, 31, 32,
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
]);

const PADDING = 61; // '='

// Below this many base64 bytes, materializing a string for the native decoder
// costs more than the scalar loop. Measured crossover, same on V8 and
// JavaScriptCore; from 512 the native decoder is 1.1x to 1.4x ahead.
const NATIVE_MIN_LENGTH = 256;

// A declined native attempt costs a thrown exception, a size-independent ~5 us
// on V8. Skipping the native path for a while afterwards means a stream of
// invalid input pays that once rather than on every call.
const NATIVE_BACKOFF = 32;
let nativeSkip = 0;

// Cap the transient string instead of materializing the whole input.
// Must stay a multiple of 4 so a chunk never splits a base64 group.
const CHUNK_LENGTH = 1 << 20;

interface Base64Target {
  setFromBase64: (base64: string) => { read: number; written: number };
}

// utf-8 rather than latin1: base64 is ASCII so the two produce the same string,
// utf-8 needs no ICU data, and it is the one encoding every runtime must have.
const asciiDecoder = new TextDecoder();

const hasNativeDecoder =
  typeof (Uint8Array.prototype as unknown as Partial<Base64Target>)
    .setFromBase64 === 'function';

/**
 * Decode a base64-encoded byte sequence into the original bytes.
 * @param input - Uint8Array holding the base64 representation (one byte per
 *   ASCII character, length must be a multiple of 4, `=` padding allowed).
 * @returns a Uint8Array containing the decoded bytes.
 */
export function decode(input: Uint8Array): Uint8Array {
  if (!ArrayBuffer.isView(input)) {
    input = new Uint8Array(input);
  }

  const length = input.length;
  if (length % 4 !== 0) {
    throw new Error('Unable to parse base64 string.');
  }

  const outputLength = 3 * (length / 4);
  const output = new Uint8Array(outputLength);
  if (length === 0) return output;

  const missingOctets =
    input[length - 2] === PADDING ? 2 : input[length - 1] === PADDING ? 1 : 0;
  const result =
    missingOctets === 0
      ? output
      : output.subarray(0, outputLength - missingOctets);

  if (hasNativeDecoder && length >= NATIVE_MIN_LENGTH) {
    if (nativeSkip > 0) {
      nativeSkip--;
    } else if (decodeNative(input, length, result)) {
      return result;
    } else {
      nativeSkip = NATIVE_BACKOFF;
    }
  }

  decodeScalar(input, length, output);
  return result;
}

/**
 * Decode through the platform's native base64 decoder, which is SIMD-wide and
 * several times faster than anything reachable from scalar JavaScript.
 * @param input - the base64 bytes.
 * @param length - `input.length`, hoisted by the caller.
 * @param result - exactly sized destination to fill.
 * @returns true when the whole input was decoded. False means the native
 *   decoder disagreed with this package's semantics — it rejects invalid
 *   characters and misplaced padding, and silently skips whitespace, where this
 *   package decodes to the same bytes as its own encoder — so the caller must
 *   fall back to the scalar loop.
 */
function decodeNative(
  input: Uint8Array,
  length: number,
  result: Uint8Array,
): boolean {
  const target = result as unknown as Base64Target;
  try {
    if (length <= CHUNK_LENGTH) {
      return (
        target.setFromBase64(asciiDecoder.decode(input)).written ===
        result.length
      );
    }
    let source = 0;
    let written = 0;
    while (source < length) {
      const end = Math.min(source + CHUNK_LENGTH, length);
      written += (
        result.subarray(written) as unknown as Base64Target
      ).setFromBase64(asciiDecoder.decode(input.subarray(source, end))).written;
      source = end;
    }
    return written === result.length;
  } catch {
    return false;
  }
}

/**
 * Decode in pure JavaScript, for platforms without a native decoder and for
 * inputs too short to amortize it. Byte-wise, so it is indifferent to both
 * `byteOffset` and the platform's endianness.
 * @param input - the base64 bytes.
 * @param length - `input.length`, hoisted by the caller.
 * @param output - destination of `3 * (length / 4)` bytes, written in full.
 */
function decodeScalar(
  input: Uint8Array,
  length: number,
  output: Uint8Array,
): void {
  const codes = base64codes;
  for (let i = 0, j = 0; i < length; i += 4, j += 3) {
    const buffer =
      (codes[input[i]!]! << 18) |
      (codes[input[i + 1]!]! << 12) |
      (codes[input[i + 2]!]! << 6) |
      codes[input[i + 3]!]!;
    output[j] = buffer >> 16;
    output[j + 1] = buffer >> 8;
    output[j + 2] = buffer;
  }
}
