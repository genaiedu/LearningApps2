import type { Mopac7AtomicOrbital, Mopac7Orbital } from '../types.ts';
/** The molecular orbitals, their basis, and the coefficient matrix between them. */
export interface Mopac7Eigenvectors {
    orbitals: Mopac7Orbital[];
    basis: Mopac7AtomicOrbital[];
    coefficients: Float64Array;
}
/**
 * Read the final `EIGENVECTORS` block: every printed molecular orbital, its
 * energy and symmetry label, the atomic orbital basis, and the coefficient of
 * each atomic orbital in each molecular orbital.
 *
 * MOPAC prints the block in groups of up to eight roots. A deck carrying
 * `DEBUG` also dumps one "EIGENVECTORS AND EIGENVALUES ON ITERATION n" matrix
 * per SCF iteration beforehand; only the last block, the one headed by a bare
 * `EIGENVECTORS`, is the converged one, and it is the one read here whether or
 * not the others are there.
 *
 * The coefficients are returned with their phases pinned by
 * {@link normalizeOrbitalPhases} — the largest coefficient of each orbital is
 * positive — so they do not carry the arbitrary column signs the listing
 * happens to have.
 * @param lines - The listing, split into lines.
 * @param filledLevels - MOPAC's `NO. OF FILLED LEVELS`, used to set the occupancies.
 * @returns The orbitals, the basis and the phase-normalised coefficient matrix.
 * @throws {Mopac7Error} With `code: 'parse'` when the block is missing or does not add up.
 */
export declare function parseEigenvectors(lines: readonly string[], filledLevels: number): Mopac7Eigenvectors;
//# sourceMappingURL=parseEigenvectors.d.ts.map