import type { Mopac7Options } from '../types.ts';
/**
 * Turn a molecule and a set of options into a MOPAC 7 input deck. No
 * WebAssembly is involved, so this is also how a deck is inspected, stored or
 * handed to a native MOPAC.
 *
 * Everything MOPAC cannot report clearly is checked here first: an unknown
 * element symbol, an element the hamiltonian has no parameters for, a
 * coordinate count that does not match the elements, the array bounds the
 * binary was compiled with, and — through {@link checkExtraKeyword} — an extra
 * keyword that would shift the deck's own lines or produce a listing this
 * package cannot read.
 *
 * The deck always carries one of `MMOK` and `NOMM`, because MOPAC 7 stops on
 * any molecule holding an `-HNCO-` group when it is given neither. See
 * {@link Mopac7Options.amideCorrection}.
 * @param options - The molecule and the calculation to run.
 * @returns The deck, ending in a newline.
 * @throws {Mopac7Error} With `code: 'input'` when the options cannot produce a valid deck.
 */
export declare function buildMopac7Input(options: Mopac7Options): string;
//# sourceMappingURL=buildMopac7Input.d.ts.map