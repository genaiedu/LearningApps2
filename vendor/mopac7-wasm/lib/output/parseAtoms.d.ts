import type { Mopac7Dipole } from '../types.ts';
/** The per-atom blocks of a listing: charges, geometry and the dipole. */
export interface Mopac7Atoms {
    elements: string[];
    coordinates: Float64Array;
    charges: Float64Array;
    electronDensities: Float64Array;
    dipole: Mopac7Dipole | null;
}
/**
 * Read the per-atom blocks: `NET ATOMIC CHARGES AND DIPOLE CONTRIBUTIONS`, the
 * `DIPOLE` table under it, and the last `CARTESIAN COORDINATES` block.
 *
 * MOPAC prints the geometry twice — once as it read it, once after shifting the
 * molecule to its centre of mass — and the last block is the one that goes with
 * the wavefunction. Dummy atoms never appear in either, so these arrays are in
 * the same order as the eigenvector rows.
 * @param lines - The listing, split into lines.
 * @returns The element symbols, coordinates, charges, densities and dipole.
 * @throws {Mopac7Error} With `code: 'parse'` when the charge block is missing or inconsistent.
 */
export declare function parseAtoms(lines: readonly string[]): Mopac7Atoms;
//# sourceMappingURL=parseAtoms.d.ts.map