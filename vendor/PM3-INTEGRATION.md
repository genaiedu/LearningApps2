# PM3 provenance and limitations

Unmodified npm package `mopac7-wasm` 1.2.0 from cheminfo, obtained 2026-10-06.
Registry tarball SHA-1: `8a299d38abbb978ef3e04943d0083a7729b5d895`.
Sources, license notices and `wasm/BUILD.json` are included alongside the
precompiled embedded WASM. The core is MOPAC 7.00 (1993), J. J. P. Stewart,
not a new implementation of PM3. Its upstream Fortran source provenance,
build patches and WASM SHA-256 are in BUILD.json. Base64 helper:
`uint8-base64` 2.1.0, MIT; sources and license included.

The browser bundle is rebuilt with `scripts/build-mo-rechenlabor.cjs`
(esbuild 0.28.2). It is loaded inside the existing terminable computation
worker only when PM3 is requested. No runtime npm/CDN/API access is used.
The bundle resolves import.meta.url to the worker location; the WASM binary
is supplied by the package's cached WebAssembly.Module, not fetched by URL.

App restrictions: H/C/N/O/F, connected neutral closed-shell molecules,
at most 20 heavy atoms, 80 total atoms, 56 H and 100 valence basis functions.
Open Babel produces a MMFF94/UFF preoptimized start. MOPAC then optimizes
using its BFGS route with PRECISE, GNORM=1.0 kcal/(mol Å), ITRY=100, MMOK.
The app's 70-second worker deadline is enforced externally; it does not
depend on the MOPAC WASM CPU clock, which is unavailable. A stop message
is retained, and no global minimum or positive Hessian is asserted.

MO isosurfaces use the method's own Slater exponents expanded in STO-6G,
with the package's S^(-1/2) back-transformation out of the ZDO metric.
The reconstructed ground-state valence density is 2 sum_occ |psi_i|².
Core orbitals and core density are absent. Mesh resolution is 41³ points,
reduced to 33³ above 40 AOs; surface jobs retain hard time limits.
MOPAC dipole and partial charges are read directly from its text output;
they are not estimated from the mesh. Coefficients and other text quantities
are rounded by MOPAC. The reconstructed density and Slater expansion are
visualization approximations, not an all-electron ab initio density.

This integration does **not** compute excited-state energies, oscillator
strengths, excited-state densities or excited-state dipole moments in PM3.
It never substitutes MO gaps for absorption bands. RHF/CIS remains available
for computed UV/Vis and its full existing state-density features; imported
experimental spectra are independent of the local electronic method.

Verification: `tests/mo-pm3-browser.cjs` performs actual browser PM3 water and
naphthalene calculations, checks MO/density meshes, ground-state dipole,
explicitly empty calculated spectra, molecule bounds, lazy loading/privacy,
and switching back to RHF/CIS. Water ΔHf is approximately -53.426 kcal/mol
and its PM3 dipole approximately 1.739 D after this optimization; these are
model results, not experimental reference values.
