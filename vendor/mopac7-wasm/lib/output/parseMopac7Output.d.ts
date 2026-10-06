import type { Mopac7Result } from '../types.ts';
/**
 * Read a MOPAC 7 listing into a typed result. No WebAssembly is involved, so
 * this also parses the output of a native MOPAC 7 run.
 *
 * MOPAC 7 has no machine-readable output file — no `.aux`, no `.json` — so
 * every number here comes from fixed-width Fortran, and every block is checked
 * rather than assumed: a missing heading, a root numbering that does not start
 * at 1, a charge block that skips an atom, a coefficient row of the wrong
 * width, and an eigenvector matrix that is not square or does not reach the
 * last atom all throw instead of yielding a plausible wrong number.
 *
 * When MOPAC stopped instead of finishing, the error carries the reason MOPAC
 * printed — it exits 0 at all 114 of its `STOP` statements, so the listing is
 * the only place a reason exists. See `src/output/haltReason.ts`.
 *
 * The one number that is not the listing's own is the sign of a molecular
 * orbital coefficient: eigenvector phases are arbitrary and differ between
 * builds, so they are pinned to one convention. See
 * {@link Mopac7Result.coefficients}.
 * @param listing - The listing MOPAC produced, verbatim.
 * @returns Everything the listing carries.
 * @throws {Mopac7Error} With the code that matches MOPAC's own complaint, or `'parse'`.
 */
export declare function parseMopac7Output(listing: string): Mopac7Result;
//# sourceMappingURL=parseMopac7Output.d.ts.map