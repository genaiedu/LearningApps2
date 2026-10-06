import type { Mopac7AtomicOrbital } from '../types.ts';
/**
 * Read the label part of one coefficient row: orbital type, element symbol,
 * atom number.
 *
 * `matou1.f` writes the row as `FORMAT (1H ,2(1X,A2),I3,F8.4,10F8.4)`, so the
 * label is three fixed-width fields and not three whitespace-separated words:
 *
 *     column   1   2  3-4   5  6-7   8-10   11-18
 *     field   1H  1X   A2  1X   A2     I3   F8.4
 *              _   _  'S '  _  ' C'  '  1'  ' -.3780'
 *
 * The `I3` runs out of room at atom 100, and the space between the element and
 * the number is the first casualty:
 *
 *       S   C  1  -.0459 ...      atom 1
 *       S   H100  -.0061 ...      atom 100, no separator at all
 *
 * Reading this by splitting on whitespace therefore stops dead at the first
 * three-digit atom — which, for paclitaxel at 113 atoms, silently cost the
 * last 14 basis functions of every orbital. The columns never move, so they are
 * what is read.
 * @param line - The row, verbatim.
 * @returns The atomic orbital, or `null` when the line is not a coefficient row.
 */
export declare function readAtomicOrbital(line: string): Mopac7AtomicOrbital | null;
//# sourceMappingURL=atomicOrbitalLabel.d.ts.map