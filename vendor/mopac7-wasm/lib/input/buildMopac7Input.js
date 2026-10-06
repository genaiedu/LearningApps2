import { Mopac7Error } from "../Mopac7Error.js";
import { MOPAC7_LIMITS } from "../limits.js";
import { MOPAC7_ELEMENTS, elementNumber, isElementSupported, isHydrogen, } from "./elements.js";
import { geometryBlock, needsDummyAtom } from "./geometry.js";
import { AMIDE_KEYWORDS, MAX_KEYWORD_LINE, SPIN_KEYWORDS, checkExtraKeyword, } from "./keywords.js";
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
export function buildMopac7Input(options) {
    const method = options.method ?? 'AM1';
    const positions = toPoints(options.coordinates, options.elements.length);
    validate(options.elements, positions, method);
    const keywords = [method];
    if (options.optimize !== true)
        keywords.push('1SCF');
    keywords.push('XYZ', 'VECTORS');
    // ALLVEC alone is enough since patches/fortran/0010-wrtkey-allvec.patch: the
    // archive's wrtkey.f never listed it, so it took DEBUG to get past
    // "UNRECOGNIZED KEY-WORDS" -- and DEBUG is also what arms iter.f's
    // per-iteration dump of the whole eigenvector matrix.
    if (options.allOrbitals !== false)
        keywords.push('ALLVEC');
    if (options.precise !== false)
        keywords.push('PRECISE');
    keywords.push('GEO-OK', `CHARGE=${options.charge ?? 0}`);
    const spin = SPIN_KEYWORDS[options.spin ?? 'singlet'];
    if (spin !== null)
        keywords.push(spin);
    keywords.push(AMIDE_KEYWORDS[options.amideCorrection ?? 'mmok']);
    for (const keyword of options.keywords ?? []) {
        keywords.push(checkExtraKeyword(keyword));
    }
    const line = keywords.join(' ');
    if (line.length > MAX_KEYWORD_LINE) {
        throw new Mopac7Error('input', `the keyword line is ${line.length} characters; MOPAC 7 reads at most ${MAX_KEYWORD_LINE} on the first line`);
    }
    const title = (options.title ?? 'mopac7-wasm')
        .replaceAll(/[\r\n]/g, ' ')
        .slice(0, 80);
    return `${line}\n${title}\n \n${geometryBlock(options.elements, positions)}\n`;
}
function toPoints(coordinates, atomCount) {
    const points = [];
    if (Array.isArray(coordinates) &&
        coordinates.length > 0 &&
        Array.isArray(coordinates[0])) {
        const rows = coordinates;
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            if (row === undefined || row.length < 3) {
                throw new Mopac7Error('input', `coordinates[${index}] does not hold three numbers`);
            }
            points.push({
                x: row[0],
                y: row[1],
                z: row[2],
            });
        }
        return assertLength(points, atomCount);
    }
    const flat = coordinates;
    if (flat.length % 3 !== 0) {
        throw new Mopac7Error('input', `coordinates holds ${flat.length} numbers, which is not a multiple of three`);
    }
    for (let index = 0; index < flat.length; index += 3) {
        points.push({
            x: flat[index],
            y: flat[index + 1],
            z: flat[index + 2],
        });
    }
    return assertLength(points, atomCount);
}
function assertLength(points, atomCount) {
    if (points.length !== atomCount) {
        throw new Mopac7Error('input', `there are ${atomCount} elements but ${points.length} sets of coordinates`);
    }
    for (let index = 0; index < points.length; index++) {
        const point = points[index];
        if (!Number.isFinite(point.x) ||
            !Number.isFinite(point.y) ||
            !Number.isFinite(point.z)) {
            throw new Mopac7Error('input', `the coordinates of atom ${index} are not finite`);
        }
    }
    return points;
}
function validate(elements, positions, method) {
    if (elements.length === 0) {
        throw new Mopac7Error('input', 'there are no atoms');
    }
    let heavy = 0;
    let hydrogen = 0;
    let orbitals = 0;
    for (const element of elements) {
        if (elementNumber(element) === null) {
            throw new Mopac7Error('input', `"${element}" is not an element symbol MOPAC 7 knows`);
        }
        if (!isElementSupported(element, method)) {
            throw new Mopac7Error('input', `MOPAC 7 has no ${method} parameters for ${element}; ${method} covers ${describeSupported(method)}`);
        }
        if (isHydrogen(element)) {
            hydrogen++;
            orbitals += 1;
        }
        else {
            heavy++;
            orbitals += 4;
        }
    }
    const atoms = elements.length + (needsDummyAtom(positions) ? 1 : 0);
    if (heavy > MOPAC7_LIMITS.maxHeavyAtoms) {
        throw new Mopac7Error('input', `${heavy} non-hydrogen atoms, and this build of MOPAC 7 holds at most ${MOPAC7_LIMITS.maxHeavyAtoms}`);
    }
    if (hydrogen > MOPAC7_LIMITS.maxHydrogenAtoms) {
        throw new Mopac7Error('input', `${hydrogen} hydrogen atoms, and this build of MOPAC 7 holds at most ${MOPAC7_LIMITS.maxHydrogenAtoms}`);
    }
    if (atoms > MOPAC7_LIMITS.maxAtoms) {
        throw new Mopac7Error('input', `${atoms} atoms, and this build of MOPAC 7 holds at most ${MOPAC7_LIMITS.maxAtoms}`);
    }
    if (orbitals > MOPAC7_LIMITS.maxOrbitals) {
        throw new Mopac7Error('input', `${orbitals} atomic orbitals, and this build of MOPAC 7 holds at most ${MOPAC7_LIMITS.maxOrbitals}`);
    }
}
function describeSupported(method) {
    return MOPAC7_ELEMENTS[method].join(', ');
}
//# sourceMappingURL=buildMopac7Input.js.map