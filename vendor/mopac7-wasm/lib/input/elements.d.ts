import type { Mopac7Method } from '../types.ts';
/**
 * The elements each hamiltonian in this build is parameterised for, as element
 * symbols in ascending atomic number.
 *
 * MOPAC decides this itself: `refer.f` refuses an element whose reference
 * string in `block.f` does not start with a blank, and the four tables below
 * are the blank-prefixed entries of `REFMN`, `REFM3`, `REFAM` and `REFPM3`
 * read out of the very `block.f` this module was built from.
 *
 * Two families of entry are deliberately left out. `Cb` (MOPAC's atomic number
 * 102) is the capped bond, not an element; and MOPAC's atomic numbers 90 and 91
 * hold alternative Si and S parameter sets rather than thorium and
 * protactinium, so accepting `'Th'` would quietly run silicon.
 *
 * `Na` and `K` are parameterised in AM1 and PM3 only as sparkles — MOPAC's own
 * reference line for them reads "SODIUM-LIKE SPARKLE. USE WITH CARE".
 */
export declare const MOPAC7_ELEMENTS: Record<Mopac7Method, readonly string[]>;
/**
 * Resolve an element symbol the way MOPAC's `getgeo.f` does: case-insensitively,
 * against its own table of the first 98 elements.
 * @param symbol - An element symbol such as `'C'`, `'cl'` or `'Br'`.
 * @returns The atomic number, or `null` when MOPAC has no such symbol.
 */
export declare function elementNumber(symbol: string): number | null;
/**
 * Whether this hamiltonian carries parameters for an element.
 * @param symbol - An element symbol.
 * @param method - The hamiltonian.
 * @returns `true` when MOPAC would accept the element under that method.
 */
export declare function isElementSupported(symbol: string, method: Mopac7Method): boolean;
/**
 * Whether an atom is hydrogen, which MOPAC counts against a separate limit from
 * every other element (`MAXLIT` against `MAXHEV` in its `SIZES` file).
 * @param symbol - An element symbol.
 * @returns `true` for hydrogen.
 */
export declare function isHydrogen(symbol: string): boolean;
//# sourceMappingURL=elements.d.ts.map