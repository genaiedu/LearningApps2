import { Mopac7Error } from "../Mopac7Error.js";
import { readAtomicOrbital } from "./atomicOrbitalLabel.js";
import { readNumbers, tryNumbers } from "./fields.js";
import { normalizeOrbitalPhases } from "./normalizeOrbitalPhases.js";
/**
 * Read the final `EIGENVECTORS` block: every printed molecular orbital, its
 * energy and symmetry label, the atomic orbital basis, and the coefficient of
 * each atomic orbital in each molecular orbital.
 *
 * MOPAC prints the block in groups of up to eight roots. A deck carrying
 * `DEBUG` also dumps one "EIGENVECTORS AND EIGENVALUES ON ITERATION n" matrix
 * per SCF iteration beforehand; only the last block, the one headed by a bare
 * `EIGENVECTORS`, is the converged one, and it is the one read here whether or
 * not the others are there.
 *
 * The coefficients are returned with their phases pinned by
 * {@link normalizeOrbitalPhases} — the largest coefficient of each orbital is
 * positive — so they do not carry the arbitrary column signs the listing
 * happens to have.
 * @param lines - The listing, split into lines.
 * @param filledLevels - MOPAC's `NO. OF FILLED LEVELS`, used to set the occupancies.
 * @returns The orbitals, the basis and the phase-normalised coefficient matrix.
 * @throws {Mopac7Error} With `code: 'parse'` when the block is missing or does not add up.
 */
export function parseEigenvectors(lines, filledLevels) {
    const start = findLastBlock(lines);
    const roots = [];
    const energies = [];
    const labels = [];
    const columns = [];
    let basis = null;
    for (let index = start; index < lines.length; index++) {
        const line = lines[index];
        if (line.includes('NET ATOMIC CHARGES'))
            break;
        const header = /^\s*Root No\.\s+(?<roots>\d+(?:\s+\d+)*)\s*$/.exec(line);
        if (header?.groups === undefined)
            continue;
        const group = (header.groups.roots ?? '').trim().split(/\s+/).map(Number);
        const energyIndex = findEnergyRow(lines, index, group.length);
        const groupEnergies = readNumbers(lines[energyIndex], group.length);
        const groupLabels = readLabels(lines, index, energyIndex, group.length);
        const { rows, atomicOrbitals } = readCoefficientRows(lines, energyIndex + 1, group.length);
        if (basis === null) {
            basis = atomicOrbitals;
        }
        else if (!sameBasis(basis, atomicOrbitals)) {
            throw new Mopac7Error('parse', 'the atomic orbital order changed between eigenvector groups');
        }
        for (let k = 0; k < group.length; k++) {
            roots.push(group[k]);
            energies.push(groupEnergies[k]);
            labels.push(groupLabels[k] ?? null);
            columns.push(rows[k]);
        }
    }
    if (basis === null || columns.length === 0) {
        throw new Mopac7Error('parse', 'the EIGENVECTORS block held no molecular orbitals');
    }
    for (let index = 0; index < roots.length; index++) {
        if (roots[index] !== index + 1) {
            throw new Mopac7Error('parse', `MOPAC printed root ${String(roots[index])} where root ${index + 1} was expected, so this is ` +
                'a window of the spectrum and not the whole of it; the deck needs the ALLVEC keyword');
        }
    }
    // The eigenvector matrix is NORBS x NORBS, so a listing that printed more
    // roots than it printed rows lost rows. This is the check that would have
    // caught the >99-atom truncation: every root group stopped at the same row,
    // so the per-orbital width test below compared two equally short things.
    if (columns.length !== basis.length) {
        throw new Mopac7Error('parse', `MOPAC printed ${columns.length} molecular orbitals over a basis of ${basis.length} atomic orbitals, ` +
            'and the eigenvector matrix is square, so the listing was not read to the end');
    }
    const orbitals = [];
    const coefficients = new Float64Array(columns.length * basis.length);
    for (let mo = 0; mo < columns.length; mo++) {
        orbitals.push({
            index: mo,
            energy: energies[mo],
            occupancy: mo < filledLevels ? 2 : 0,
            symmetry: labels[mo] ?? null,
        });
        const column = columns[mo];
        if (column.length !== basis.length) {
            throw new Mopac7Error('parse', `orbital ${mo + 1} has ${column.length} coefficients for a basis of ${basis.length}`);
        }
        for (let ao = 0; ao < column.length; ao++) {
            coefficients[mo * basis.length + ao] = column[ao];
        }
    }
    normalizeOrbitalPhases(coefficients, basis.length);
    return { orbitals, basis, coefficients };
}
function findLastBlock(lines) {
    for (let index = lines.length - 1; index >= 0; index--) {
        if (/^\s*EIGENVECTORS\s*$/.test(lines[index]))
            return index;
    }
    throw new Mopac7Error('parse', 'the listing has no EIGENVECTORS block; the deck needs the VECTORS keyword');
}
// The eigenvalue row is the first line under the header that reads as `count`
// numbers.
function findEnergyRow(lines, header, count) {
    for (let index = header + 1; index < Math.min(header + 8, lines.length); index++) {
        if (tryNumbers(lines[index], count) !== null)
            return index;
    }
    throw new Mopac7Error('parse', `no row of ${count} eigenvalues under "Root No."`);
}
// Symmetry labels sit between the header and the eigenvalues, as `1 A1G`,
// separated by two or more spaces. MOPAC prints none when symtrz.f could not
// classify the orbitals, in which case the labels are simply absent.
function readLabels(lines, header, energyRow, count) {
    for (let index = header + 1; index < energyRow; index++) {
        const line = lines[index];
        if (!/[A-Za-z]/.test(line))
            continue;
        const labels = line
            .trim()
            .split(/\s{2,}/)
            .map((piece) => piece.replaceAll(' ', ''));
        if (labels.length === count)
            return labels;
    }
    return Array.from({ length: count }, () => null);
}
function readCoefficientRows(lines, from, count) {
    const rows = Array.from({ length: count }, () => []);
    const atomicOrbitals = [];
    for (let index = from; index < lines.length; index++) {
        const line = lines[index];
        if (line.trim().length === 0)
            continue;
        const atomicOrbital = readAtomicOrbital(line);
        if (atomicOrbital === null)
            break;
        const values = readNumbers(line, count);
        atomicOrbitals.push(atomicOrbital);
        for (let k = 0; k < count; k++) {
            rows[k].push(values[k]);
        }
    }
    if (atomicOrbitals.length === 0) {
        throw new Mopac7Error('parse', 'an eigenvector group carried no atomic orbital rows');
    }
    return { rows, atomicOrbitals };
}
function sameBasis(a, b) {
    if (a.length !== b.length)
        return false;
    for (let index = 0; index < a.length; index++) {
        const left = a[index];
        const right = b[index];
        if (left.type !== right.type || left.element !== right.element) {
            return false;
        }
        if (left.atomIndex !== right.atomIndex)
            return false;
    }
    return true;
}
//# sourceMappingURL=parseEigenvectors.js.map