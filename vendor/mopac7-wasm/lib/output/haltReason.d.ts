import type { Mopac7ErrorCode } from '../types.ts';
/** Why MOPAC stopped, in MOPAC's own words, with a code to switch on. */
export interface Mopac7Halt {
    /** The code the thrown error carries. */
    code: Mopac7ErrorCode;
    /** The lines MOPAC printed about it, trimmed and joined with ` / `. */
    reason: string;
}
/**
 * Read out of a listing why MOPAC 7 stopped.
 *
 * MOPAC 7 has 114 `STOP` statements and exits 0 at every one of them, so the
 * exit code says nothing and the listing says everything: the last thing MOPAC
 * printed before it stopped *is* the reason. This reads that, rather than
 * inferring a cause from a block that is missing.
 *
 * Two passes. {@link MOPAC7_HALTS} recognises the halts worth a code of their
 * own — MOPAC's own wording, taken from the Fortran and never paraphrased. When
 * none matches, the tail of the listing is quoted verbatim under
 * `code: 'halt'`, which is what keeps a halt nobody anticipated from being
 * reported as something else.
 * @param lines - The listing, split into lines, `symtrz.f`'s debug noise already dropped.
 * @returns The halt, or `null` when MOPAC printed none of these.
 */
export declare function findHaltReason(lines: readonly string[]): Mopac7Halt | null;
/**
 * What MOPAC last said, for a halt {@link MOPAC7_HALTS} does not name.
 * @param lines - The listing, split into lines.
 * @returns Up to {@link TAIL_LINES} trimmed lines, joined with ` / `, or `''` when the listing is blank.
 */
export declare function listingTail(lines: readonly string[]): string;
//# sourceMappingURL=haltReason.d.ts.map