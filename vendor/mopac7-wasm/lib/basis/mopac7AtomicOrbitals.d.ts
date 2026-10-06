import type { Mopac7AtomicOrbital, Mopac7Method } from '../types.ts';
import type { Mopac7ElementBasis } from './types.ts';
/**
 * The atomic orbitals MOPAC 7 gives a molecule, in MOPAC's own order — which is
 * the row order of `Mopac7Result.coefficients`.
 *
 * MOPAC lays the basis out atom by atom and, within an atom, `S Px Py Pz`
 * (`matou1.f` `ATORBS`), taking the count from `block.f`'s `NATORB`: one orbital
 * for hydrogen, four for every other element these four hamiltonians are
 * parameterised for, and **none** for the sodium and potassium sparkles, which
 * carry a core charge and no basis function at all.
 *
 * A result always carries this list already, so the reason to call this is to
 * build a basis before running anything — the two agree exactly, which
 * `__tests__/mopac7Basis.test.ts` asserts against real listings.
 * @param elements - Element symbols, one per atom, in MOPAC's atom order.
 * @param method - The hamiltonian.
 * @returns One entry per atomic orbital.
 * @throws {Mopac7Error} With `code: 'input'` for an element the hamiltonian cannot expand.
 */
export declare function mopac7AtomicOrbitals(elements: readonly string[], method: Mopac7Method): Mopac7AtomicOrbital[];
/**
 * Look one element's valence shells up in a hamiltonian's exponent table.
 * @param symbol - The element symbol, in any case.
 * @param method - The hamiltonian.
 * @returns The entry, or `null` when MOPAC gives the element no atomic orbital.
 * @throws {Mopac7Error} With `code: 'input'` when the hamiltonian has no such element.
 */
export declare function slaterEntry(symbol: string, method: Mopac7Method): Mopac7ElementBasis | null;
//# sourceMappingURL=mopac7AtomicOrbitals.d.ts.map