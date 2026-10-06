# Vendored GANSU-Lite numerical core

Original project: https://github.com/Yasuaki-Ito/GANSU-Lite

Revision: `ace6e83555014606857f78d4e25d3f6289e6eed2`.
BSD-3-Clause, copyright Yasuaki Ito, 2026. See `LICENSE.txt`.

`src/core`, `src/linalg`, and `src/data` are copied unchanged from this
revision. `sto-3g.gbs` is the project's basis file, based on Basis Set
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

Spectrum: calculated CIS energies and length-gauge transition dipoles /
oscillator strengths. Gaussian broadening is applied in energy, then
displayed against wavelength, normalized to its plotted maximum. The
spectrum is qualitative: STO-3G lacks diffuse and polarization functions;
CIS lacks double excitations. No solvent, temperature, vibrations,
relativistic effects, triplets or absolute extinction calibration.

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

`tests/mo-production-browser.cjs`: repeat a real water calculation on the
published GitHub Pages app, check required assets, surfaces and CIS table,
and verify absence of external requests before Wikipedia consent. Its
article-reader test intercepts the Wikipedia endpoint with a harmless
fixture; it does not fetch third-party article contents or pictures.

Test screenshots remain in `/tmp`. To deliberately refresh the published
recommendation preview, run the UI test with `MO_CAPTURE_PREVIEW=1`; normal
test runs do not modify repository images.
