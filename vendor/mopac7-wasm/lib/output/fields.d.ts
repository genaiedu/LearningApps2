/**
 * Where MOPAC's eigenvector block puts its numbers: eight columns of eight
 * characters starting at column 10, on the eigenvalue row and on every
 * coefficient row alike.
 */
export declare const FIELD_START = 10;
/** The width of one printed column in that block. */
export declare const FIELD_WIDTH = 8;
/**
 * Read `count` numbers out of one row of MOPAC's fixed-width output.
 * @param line - The row, verbatim.
 * @param count - How many numbers the row must hold.
 * @returns The numbers, in printed order.
 * @throws {Mopac7Error} With `code: 'parse'` when the row does not read as that many numbers.
 */
export declare function readNumbers(line: string, count: number): number[];
/**
 * The same read, answering `null` instead of throwing, which is how a row is
 * recognised in the first place.
 * @param line - The row, verbatim.
 * @param count - How many numbers the row must hold.
 * @returns The numbers, or `null` when the row is something else.
 */
export declare function tryNumbers(line: string, count: number): number[] | null;
//# sourceMappingURL=fields.d.ts.map