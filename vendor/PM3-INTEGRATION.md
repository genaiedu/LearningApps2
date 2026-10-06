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
For a successful CI comparison the reconstructed valence density comes from
the CI-corrected spin-summed AO matrix printed by `DENSITY`, including its
off-diagonal entries. `compfg.f` calls `MECIP` before `writmo.f` prints the
charges, dipole and density. This was verified in the original MOPAC 7 sources
at the archive commit recorded in BUILD.json, not inferred from modern manuals.
The selected singlet is specified by `SINGLET ROOT=1...4`. Up to four single-point
jobs use identical PM3-optimized ground-state geometry. The first job's actual
low-state table determines how many singlets are available (e.g. S0–S2 in the
two-MO ammonia space); never request unavailable singlet roots. S0 ALSO includes CI;
its properties and energy are distinguished from the SCF optimization result.
Dipoles include the native MOPAC intraatomic hybrid contribution. Atomic
charges are native NDDO populations (not an independently calculated
nonorthogonal Mulliken analysis). Printed AO populations are checked against
these charges, and density trace and natural occupations are validated.

The active space starts with two highest occupied and two lowest virtual MOs,
expands to keep boundary multiplets within 0.1 eV together, and is limited to
five MOs / 100 determinants. If this is too large, start at HOMO/LUMO only
and again expand each entire multiplet; this supports e.g. ammonia/methane
without arbitrarily cutting their degeneracies. The exact chosen occupied
and virtual counts are reported. This avoids the old core's 121-configuration
storage causing silent truncation. Larger required spaces or incomplete CI
jobs yield an explicit warning and only the original SCF ground-state result.
The reported configuration count, active MO indices and energy reference
are checked against the actual listing. All requested available roots must
succeed before the state comparison is published. This is fixed-reference CI, not orbital-optimized CASSCF.

To draw a density, diagonalize its ZDO matrix and apply S^(-1/2) to the natural
orbital coefficients. Then n(r) = sum_k occupation_k |phi_k(r)|². Difference
densities diagonalize P(Si)-P(S0), retaining signed eigenvalues. This preserves
all off-diagonal information, unlike an occupation-only HOMO/LUMO picture.
MOPAC may recenter or rotate a new Cartesian job. A molecular-frame rotation
is fitted from robust noncollinear atom axes and verifies all final positions
within 0.003 Å (printed-coordinate rounding); every interatomic distance must
separately agree within 0.001 Å. Px/Py/Pz AO density blocks AND dipole vectors are rotated into
the displayed PM3 geometry's frame; scalar atom populations remain unchanged.
For the SCF-only fallback the density is 2 sum_occ |psi_i|².
Core orbitals and core density are absent. Mesh resolution is 41³ points,
reduced to 33³ above 40 AOs; surface jobs retain hard time limits.
MOPAC dipole and partial charges are read directly from its text output;
they are not estimated from the mesh. Coefficients and other text quantities
are rounded by MOPAC. The reconstructed density and Slater expansion are
visualization approximations, not an all-electron ab initio density.

This integration computes up to three available low singlet excited-state energies, densities,
partial charges and permanent dipoles in a bounded PM3-CI space. It does
**not** calculate oscillator strengths or a PM3 UV/Vis absorption spectrum.
It never substitutes MO gaps for absorption bands. RHF/CIS remains available
for computed UV/Vis and its full existing state-density features; imported
experimental spectra are independent of the local electronic method.

Verification: `tests/mo-pm3-browser.cjs` performs actual browser PM3 water and
naphthalene calculations, checks S0–S3 state properties, MO/density/difference
meshes, electron conservation and natural occupation bounds,
explicitly empty calculated spectra, molecule bounds, lazy loading/privacy,
and switching back to RHF/CIS. Water ΔHf is approximately -53.426 kcal/mol
and its PM3-SCF dipole approximately 1.739 D after this optimization. In the
bounded CI comparison its S0 dipole is approximately 1.711 D; these are model
results, not experimental reference values. `tests/mo-pm3-density.cjs` checks
multi-block/paginated full density parsing, missing entries, electron counts,
singlet root selection and the degeneracy guard.
