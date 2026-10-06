/** The eigenvalues and eigenvectors of a real symmetric matrix. */
export interface SymmetricEigen {
    /** The eigenvalues, ascending. */
    values: Float64Array;
    /** Row-major: column `k` is the eigenvector of `values[k]`, so `vectors[i * n + k]`. */
    vectors: Float64Array;
}
/**
 * Diagonalise a real symmetric matrix by cyclic Jacobi rotations.
 *
 * MOPAC does the same job with `RSP` (`esp.rof` calls it to build `S^-1/2`).
 * Jacobi is used here instead because it is twenty lines, needs no tridiagonal
 * reduction and no external matrix library, and is backward stable — and the
 * matrix it is asked about, an overlap matrix, is small (299 rows for
 * paclitaxel, the largest molecule this build holds) and well conditioned: the
 * smallest eigenvalue measured over 84 NDDO jobs was 0.136.
 * @param matrix - `n²` entries, row-major and symmetric. It is copied, not modified.
 * @param size - The number of rows.
 * @returns The eigenvalues and eigenvectors.
 * @throws {Mopac7Error} With `code: 'input'` on a wrong length, or if the sweeps do not converge.
 */
export declare function symmetricEigen(matrix: Float64Array, size: number): SymmetricEigen;
//# sourceMappingURL=symmetricEigen.d.ts.map