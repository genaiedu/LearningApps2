import type { Mopac7Basis, Mopac7BasisInput, Mopac7BasisOptions } from './types.ts';
/**
 * Rebuild the atomic-orbital basis a MOPAC 7 result was computed in, as
 * contracted cartesian gaussians, so its molecular orbitals can be drawn.
 *
 * MOPAC 7 prints orbital energies and coefficients and nothing about the basis
 * they are coefficients over, so the basis is reconstructed from MOPAC's own
 * parameters: the valence Slater exponents of `block.f`, the principal quantum
 * numbers of `diat.f`, and Stewart's STO-6G expansion of `setupg.f`. See
 * `MOPAC7_SLATER_EXPONENTS` and `contractSlaterShell`.
 *
 * The returned `functions` are in the same order as the `basis` handed in, which
 * is the row order of the result's `coefficients`, so
 * `coefficients[mo * functions.length + ao]` is the coefficient of
 * `functions[ao]`. Shells are shared: one entry per element and angular
 * momentum, referenced by `functions[ao].shell`, and one centre per atom rather
 * than per orbital, so the payload stays small — the basis of paclitaxel is 299
 * functions over 7 shells and 113 centres.
 *
 * The coefficients MOPAC prints are **not** coefficients over these orbitals
 * directly. NDDO neglects diatomic overlap, so MOPAC's vectors live in the
 * Löwdin-orthogonalised basis and `Cᵀ S C` is not the identity. See
 * `deorthogonalizeCoefficients`, and the README, for what that costs a
 * drawing (very little) and how MOPAC itself undoes it.
 * @param result - A `Mopac7Result`, or anything carrying its `method`, `elements`, `coordinates` and `basis`.
 * @param options - The ångström-to-bohr divisor.
 * @returns The basis.
 * @throws {Mopac7Error} With `code: 'input'` when an element has no expandable shells, or the input does not add up.
 */
export declare function mopac7Basis(result: Mopac7BasisInput, options?: Mopac7BasisOptions): Mopac7Basis;
/**
 * The ångström-to-bohr divisor MOPAC 7 hard-codes, at `diat.f` line 142 and in
 * six of its other files. It is 19 parts per million below the CODATA value
 * (`0.529177210903`), which is what MOPAC 23 and most other programs use.
 */
export declare const MOPAC7_BOHR_PER_ANGSTROM = 0.529167;
//# sourceMappingURL=mopac7Basis.d.ts.map