import type { Mopac7Job } from '../types.ts';
/**
 * Run one MOPAC 7 deck and return the listing, whatever MOPAC made of it. This
 * is the escape hatch below the high-level entry point: it never throws for
 * MOPAC's own failures — a rejected keyword, a faulty geometry, an SCF that did
 * not converge all come back as a listing to read — and throws only when the
 * WebAssembly module itself trapped.
 *
 * Every call builds a fresh module instance, and that is not a choice: MOPAC 7
 * is Fortran 77 whose entire state lives in `SAVE`d COMMON blocks, so a second
 * `main` in the same instance inherits the first run's converged density and
 * keyword flags, and in practice aborts. Instantiating costs about 0.6 ms once
 * the module is compiled, which {@link compileMopac7} does once per realm.
 * @param input - A MOPAC input deck, keyword line first.
 * @returns The deck, the listing, MOPAC's stderr and the exit code.
 * @throws {Mopac7Error} With `code: 'aborted'` when the module trapped.
 */
export declare function runMopac7Job(input: string): Promise<Mopac7Job>;
//# sourceMappingURL=runMopac7Job.d.ts.map