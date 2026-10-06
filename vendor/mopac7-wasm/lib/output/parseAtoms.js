import { Mopac7Error } from "../Mopac7Error.js";
/**
 * Read the per-atom blocks: `NET ATOMIC CHARGES AND DIPOLE CONTRIBUTIONS`, the
 * `DIPOLE` table under it, and the last `CARTESIAN COORDINATES` block.
 *
 * MOPAC prints the geometry twice — once as it read it, once after shifting the
 * molecule to its centre of mass — and the last block is the one that goes with
 * the wavefunction. Dummy atoms never appear in either, so these arrays are in
 * the same order as the eigenvector rows.
 * @param lines - The listing, split into lines.
 * @returns The element symbols, coordinates, charges, densities and dipole.
 * @throws {Mopac7Error} With `code: 'parse'` when the charge block is missing or inconsistent.
 */
export function parseAtoms(lines) {
    const charges = [];
    const densities = [];
    const elements = [];
    const start = findLine(lines, 'NET ATOMIC CHARGES');
    if (start === -1) {
        throw new Mopac7Error('parse', 'the listing has no "NET ATOMIC CHARGES" block');
    }
    for (let index = start + 1; index < lines.length; index++) {
        const row = CHARGE_ROW.exec(lines[index]);
        if (row?.groups === undefined) {
            if (charges.length > 0)
                break;
            continue;
        }
        const { atom, element, charge, density } = row.groups;
        if ([element, charge, density].includes(undefined)) {
            throw new Mopac7Error('parse', `the charge row "${lines[index].trim()}" is incomplete`);
        }
        if (Number(atom) !== charges.length + 1) {
            throw new Mopac7Error('parse', `the charge block jumps from atom ${charges.length} to ${String(atom)}`);
        }
        elements.push(element);
        charges.push(Number(charge));
        densities.push(Number(density));
    }
    if (charges.length === 0) {
        throw new Mopac7Error('parse', 'the "NET ATOMIC CHARGES" block held no atoms');
    }
    const coordinates = parseCoordinates(lines, elements);
    return {
        elements,
        coordinates,
        charges: Float64Array.from(charges),
        electronDensities: Float64Array.from(densities),
        dipole: parseDipole(lines),
    };
}
const CHARGE_ROW = /^\s*(?<atom>\d+)\s+(?<element>[A-Za-z]{1,2})\s+(?<charge>-?\d*\.\d+)\s+(?<density>-?\d*\.\d+)\s*$/;
const COORDINATE_ROW = /^\s*(?<atom>\d+)\s+(?<element>[A-Za-z]{1,2})\s+(?<x>-?\d*\.\d+)\s+(?<y>-?\d*\.\d+)\s+(?<z>-?\d*\.\d+)\s*$/;
const DIPOLE_SUM = /^\s*SUM\s+(?<x>-?\d*\.\d+)\s+(?<y>-?\d*\.\d+)\s+(?<z>-?\d*\.\d+)\s+(?<total>-?\d*\.\d+)\s*$/;
function parseCoordinates(lines, elements) {
    const coordinates = new Float64Array(elements.length * 3);
    let found = 0;
    for (let index = lines.length - 1; index >= 0; index--) {
        if (!lines[index].includes('CARTESIAN COORDINATES'))
            continue;
        found = 0;
        for (let row = index + 1; row < lines.length; row++) {
            const match = COORDINATE_ROW.exec(lines[row]);
            if (match?.groups === undefined) {
                if (found > 0)
                    break;
                continue;
            }
            if (found >= elements.length)
                break;
            coordinates[found * 3] = Number(match.groups.x);
            coordinates[found * 3 + 1] = Number(match.groups.y);
            coordinates[found * 3 + 2] = Number(match.groups.z);
            found++;
        }
        break;
    }
    if (found !== elements.length) {
        throw new Mopac7Error('parse', `the last "CARTESIAN COORDINATES" block holds ${found} atoms, not the ${elements.length} the charge block does`);
    }
    return coordinates;
}
function parseDipole(lines) {
    for (let index = lines.length - 1; index >= 0; index--) {
        const match = DIPOLE_SUM.exec(lines[index]);
        if (match?.groups === undefined)
            continue;
        return {
            x: Number(match.groups.x),
            y: Number(match.groups.y),
            z: Number(match.groups.z),
            total: Number(match.groups.total),
        };
    }
    return null;
}
function findLine(lines, needle) {
    for (let index = 0; index < lines.length; index++) {
        if (lines[index].includes(needle))
            return index;
    }
    return -1;
}
//# sourceMappingURL=parseAtoms.js.map