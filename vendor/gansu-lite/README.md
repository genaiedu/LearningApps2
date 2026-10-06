# Vendored GANSU-Lite numerical core

Original project: https://github.com/Yasuaki-Ito/GANSU-Lite

Revision: `ace6e83555014606857f78d4e25d3f6289e6eed2`.
BSD-3-Clause, copyright Yasuaki Ito, 2026. See `LICENSE.txt`.

`src/core`, `src/linalg`, and `src/data` originate from this revision.
Local modification: `core/cis.ts` also returns full normalized CIS
amplitudes for unrelaxed excited-state densities (no numerical change to
energies or oscillator strengths). Remaining upstream files are unchanged.
`sto-3g.gbs` is the project's basis file, based on Basis Set
Exchange data. `wasm/` contains the corresponding upstream scalar and SIMD
ERI binaries. Original Rust/WASM build sources are available at the linked
revision. The application only exposes RHF, analytic RHF gradients and
singlet CIS; importing the core does not expose its other methods in the UI.

Application source: `scripts/mo-rechenlabor-worker.ts`, GPL-2.0 integration.
Build the classic self-contained worker with:

    node scripts/build-mo-rechenlabor.cjs

Requires Node.js and esbuild 0.28.2 in the module search path. The generated
worker carries license notices and loads the local basis and local WASM
files. A generated worker is committed so users need no build tools.

Limits: 36 AO functions; 324 occupied→virtual CIS configurations; at most
60 singlet excited states. SCF must converge in at most 80 iterations;
nonconverged calculations are rejected. Electronic work has a 60-second
internal deadline and a 70-second external worker-termination deadline.
HF geometry refinement is optional: at most 20 AO functions, 20 geometry
steps, 5 line-search trials per step, all within the same electronic budget.
It does not certify a minimum (no frequencies / Hessian).

MO surfaces are evaluated from the calculated Gaussian basis expansion,
not from a preselected schematic orbital. Marching tetrahedra uses a
41³ grid in Å, with basis-function evaluation in Bohr; fine core structure
can be missed at this teaching resolution. Analytic MO gradients supply the
surface normals. Colors mean signs of ψ.

Optional external-data layer: PubChem3D is fetched only after separate
consent and a manual search. Search SMILES are transmitted to PubChem; the
local computation remains unchanged. A selected external conformer is
display-only, with CID, retrieval date, documented OMEGA/MMFF94s procedure
and supplied per-record metadata. NIST spectra are searched on their
original page (no cross-origin fetch bypass / no proxy). User-selected
JCAMP-XYPOINTS UV/Vis or CSV files are parsed locally with mandatory source,
measurement conditions and explicit molecule-assignment confirmation.
Log epsilon is exponentiated before normalization. Curves can be shown
individually or overlaid; each is normalized independently, never interpreted
as absolute intensity agreement. QCArchive/CCCBDB links are research access
only, not automatically fetched orbital or density data. No additional
semiempirical engine is advertised as installed.

Spectrum: calculated CIS energies and length-gauge transition dipoles /
oscillator strengths. Gaussian broadening is applied in energy, then
displayed against wavelength, normalized to the 40–800 nm overview maximum
even when zooming. An optional absolute oscillator-strength threshold
filters the table/sticks, not the broadened curve. Numbered bands group
states separated by at most 1.5 Gaussian widths; orbital contributions
remain listed separately for each contributing state. The
spectrum is qualitative: STO-3G lacks diffuse and polarization functions;
CIS lacks double excitations. No solvent, temperature, vibrations,
relativistic effects, triplets or absolute extinction calibration.

State properties: full singlet-CIS vectors form the unrelaxed spin-summed
one-particle density (occupied block 2I−XXᵀ; virtual block XᵀX). Every state
retains all off-diagonal terms. All states use the ground-state geometry;
no excited-state geometry or orbital relaxation. Dipoles use the nuclear
term minus the analytic AO dipole-integral contraction; atom colors use
Mulliken populations, not electrostatic potential. Total electron density
and signed excited-minus-ground difference surfaces are calculated on demand
on a 41³ grid with absolute thresholds (electrons/Bohr³); at most five
surfaces cached; 20-second external deadline. Ground and all calculated
excited-state dipoles/atomic charges are included in the JSON export.

## Verification

`tests/mo-engine-browser.cjs`: actual local WASM/Chrome tests, H₂ RHF
energy reference at 0.74 Å, calculated surface and singlet transitions;
water/ammonia/methane/ethene/methanal/benzene geometries and electronic
calculations; unsupported-input rejection.

`tests/mo-ui-browser.cjs`: actual app pipeline, MO selection and rotation,
spectrum/configuration inspection, JSON download, preserved results after
input errors, worker cancellation/restart, HF refinement, fullscreen,
small-screen navigation, themes and absence of unsolicited external calls.

Browser tests require Playwright and local Google Chrome and start their
own read-only local HTTP servers. They do not submit molecule data to
an external calculation service.

`tests/mo-core.test.cjs`: input-size, charge and spin restrictions,
orbital labels, spectrum units and energy-based sampling, XYZ export.

`tests/mo-state-density.test.cjs` (requires esbuild): normalized full CIS
vectors, off-diagonal coherence, conserved electron count, AO transformation
and absolute isosurface threshold. The engine browser test checks charge
conservation for all states, polar water and practically nonpolar methane /
benzene, plus positive/negative excited-minus-ground density surfaces.
`tests/mo-data.test.cjs`: bounded external parsing, JCAMP UV identification,
log-epsilon conversion and explicit rejection of unsupported data.
`tests/mo-features-browser.cjs`: benzene's 8 bright states of 60, range
cropping/assignments, all-state density/dipole controls, separate database
consent, PubChem response fixture with provenance, mandatory spectrum
metadata and local import/source selection. Fixtures are explicitly synthetic,
never published as experimental datasets.

`tests/mo-production-browser.cjs`: repeat a real water calculation on the
published GitHub Pages app, check required assets, surfaces and CIS table,
and verify absence of external requests before Wikipedia consent. Its
article-reader test intercepts the Wikipedia endpoint with a harmless
fixture; it does not fetch third-party article contents or pictures.

Test screenshots remain in `/tmp`. To deliberately refresh the published
recommendation preview, run the UI test with `MO_CAPTURE_PREVIEW=1`; normal
test runs do not modify repository images.
