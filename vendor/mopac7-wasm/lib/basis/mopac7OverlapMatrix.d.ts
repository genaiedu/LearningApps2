import type { Mopac7Basis } from './types.ts';
/**
 * The overlap matrix of a reconstructed basis, `S[i][j] = ⟨χᵢ|χⱼ⟩`, row-major.
 *
 * This is the metric MOPAC's own analytic Slater code (`diat.f` / `diat2.f`)
 * computes, rebuilt from the STO-6G expansion: over water, formaldehyde, benzene
 * and pyridine under MNDO, AM1 and PM3 it agrees with the `OVERLAP_MATRIX`
 * MOPAC 23 prints to 1.2e-4, which is the residual of the six-gaussian
 * expansion itself and not a parameter error — STO-3G on the same exponents is
 * forty times worse.
 *
 * Every diagonal entry is 1, to 1.2e-10 for the shells of the first three rows of
 * the periodic table and to 2.1e-7 for the fourth, because `contractSlaterShell`
 * folds the normalisation in and `setupg.f` prints its 4s and 4p row to seven
 * significant digits rather than ten.
 *
 * It is needed for two things: to check that a drawn orbital is normalised, and
 * to turn MOPAC's ZDO coefficients into coefficients over these orbitals. See
 * `deorthogonalizeCoefficients`.
 * @param basis - From `mopac7Basis`.
 * @returns `functions.length²` entries, row-major and symmetric.
 */
export declare function mopac7OverlapMatrix(basis: Mopac7Basis): Float64Array;
//# sourceMappingURL=mopac7OverlapMatrix.d.ts.map