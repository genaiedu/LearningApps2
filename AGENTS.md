# Publishing and shared assets

- Never link the code generator, profile registration, or code-issuance administration from a learner app, public overview, learner code card, or their privacy notices. Do not add a "get/create a code" action. Learners receive codes from their teacher.
- Only the authenticated, authorized teacher may create new learning-code profiles in the protected administration. A learner code is not a creation credential; hiding a link is not sufficient access control.

- Do not deploy this repository to Vercel. The user explicitly prohibits it.
- Narrow exception explicitly approved on 11 October 2026: only the separate
  `services/kunst-kurator` feedback service may be published to Vercel. Do not
  import or deploy the entire repository there or change existing projects.
- Keep automatic Vercel Git deployments disabled in `vercel.json`.
- Publish finished, verified applications with GitHub Pages under
  `https://genaiedu.github.io/LearningApps2/`.
- List every new application in the main publication hub
  `../LearningApps/heft65wl2.html`
  (`https://genaiedu.github.io/LearningApps/heft65wl2.html`).
- Additionally list chemistry and physics applications in
  `../LearningApps/materialien.html`. That overview is exclusively for those
  two subjects; do not add art, other subjects, or tools there.
- Applications and this repository's landing page must not link back to the
  material overviews.
- Reuse fonts and libraries from the sibling LearningApps repository instead
  of duplicating assets. Keep relative paths usable in a sibling-folder local
  checkout and on GitHub Pages.
- Preserve unrelated user changes. Do not commit test screenshots or local
  output files.

- Do not list or link applications in `index.html`. The user explicitly wants
  application discovery exclusively in the main hub `../LearningApps/heft65wl2.html`.
