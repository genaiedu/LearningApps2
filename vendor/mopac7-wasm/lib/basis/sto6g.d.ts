import type { Mopac7StoExpansion } from './types.ts';
/**
 * Stewart's STO-6G expansions, exactly as MOPAC 7's `setupg.f` `SETUPG` writes
 * them, indexed by principal quantum number minus one and then by `l`.
 *
 * These are the unscaled, unnormalised numbers. `esp.rof` `ELESP` turns one
 * entry into a contracted gaussian by multiplying every exponent by `zeta²` and
 * folding the cartesian normalisation into every coefficient; see
 * `contractSlaterShell`.
 *
 * MOPAC 7's own `COMMON /STO6G/` is declared `(6,5,2)`, so the 6s and 6p blocks
 * `SETUPG` assigns fall past its end and MOPAC itself cannot read them back.
 * They are read from the source here, which is why mercury, thallium, lead and
 * bismuth have a basis at all.
 */
export declare const MOPAC7_STO6G: ReadonlyArray<ReadonlyArray<Mopac7StoExpansion | null>>;
//# sourceMappingURL=sto6g.d.ts.map