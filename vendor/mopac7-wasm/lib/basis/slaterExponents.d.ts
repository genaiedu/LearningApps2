import type { Mopac7Method } from '../types.ts';
import type { Mopac7ElementBasis } from './types.ts';
/**
 * The valence Slater exponents and principal quantum numbers of every element
 * each hamiltonian can draw, read out of MOPAC 7's own `block.f` and `diat.f`.
 *
 * The keys are the element symbols of `MOPAC7_ELEMENTS` minus the ones MOPAC
 * parameterises as sparkles — Na (MNDO, AM1, PM3), K (MNDO, AM1, PM3) —
 * which carry a point charge and no exponent, and to which `NATORB` gives no
 * atomic orbital at all.
 */
export declare const MOPAC7_SLATER_EXPONENTS: Record<Mopac7Method, Readonly<Record<string, Mopac7ElementBasis>>>;
//# sourceMappingURL=slaterExponents.d.ts.map