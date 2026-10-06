/** One atom's cartesian position in ångström. */
export interface Point {
    x: number;
    y: number;
    z: number;
}
/**
 * Write the geometry rows of a MOPAC 7 deck, working around two hard
 * behaviours of its `getgeo.f` that no keyword can switch off:
 *
 *   a geometry of three atoms or fewer is ALWAYS read as internal
 *     coordinates, whatever `XYZ` says, so one to three atoms are emitted as a
 *     Z-matrix built from the cartesians;
 *   the first three atoms must not be collinear — `getgeo.f` stops with its
 *     own wording, "DUE TO PROGRAM BUG, THE FIRST THREE ATOMS MUST NOT LIE IN A
 *     STRAIGHT LINE". A dummy `XX` atom is inserted as the third row to break
 *     the line; it carries no orbitals, and MOPAC drops it from the printed
 *     geometry and from the orbital list.
 * @param elements - Element symbols, one per atom.
 * @param positions - Cartesian coordinates in ångström, in `elements` order.
 * @returns The geometry block, newline-separated, with no trailing newline.
 */
export declare function geometryBlock(elements: readonly string[], positions: readonly Point[]): string;
/**
 * Whether the deck this geometry produces carries a dummy `XX` row, which
 * shifts every later atom by one in MOPAC's own numbering.
 * @param positions - Cartesian coordinates in ångström.
 * @returns `true` when a dummy atom has to be inserted.
 */
export declare function needsDummyAtom(positions: readonly Point[]): boolean;
//# sourceMappingURL=geometry.d.ts.map