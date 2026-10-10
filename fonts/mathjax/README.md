# Local mathematical font comparison

Unmodified browser CommonHTML components, dynamic data and WOFF2 fonts from
the official MathJax font packages, pinned to **4.1.2**, matching the reused
renderer `../../../LearningApps/fonts/tex-mml-chtml.js`.

| Local directory | Official npm package | Distribution |
| --- | --- | --- |
| `mathjax-stix2` | `@mathjax/mathjax-stix2-font@4.1.2` | https://registry.npmjs.org/@mathjax/mathjax-stix2-font/-/mathjax-stix2-font-4.1.2.tgz |
| `mathjax-pagella` | `@mathjax/mathjax-pagella-font@4.1.2` | https://registry.npmjs.org/@mathjax/mathjax-pagella-font/-/mathjax-pagella-font-4.1.2.tgz |
| `mathjax-fira` | `@mathjax/mathjax-fira-font@4.1.2` | https://registry.npmjs.org/@mathjax/mathjax-fira-font/-/mathjax-fira-font-4.1.2.tgz |

The npm metadata declares **Apache-2.0** for the MathJax packages. The full
license text is retained in `LICENSE-MathJax.txt`. The WOFF2 metadata also
retains the underlying fonts' licenses: **SIL OFL 1.1** for STIX Two and Fira
Math, and **GUST Font License / LPPL 1.3c** for TeX Gyre Pagella Math. These
license texts are included in each font directory. MathJax is a project of
the MathJax Consortium. Original font metadata and component bytes are
unchanged. No package installation scripts were run.

Copyright notices retained in the WOFF2 name tables:

- MathJax adaptations: Copyright (c) 2022 MathJax, Inc. (www.mathjax.org).
- STIX Two: Copyright 2001–2021 The STIX Fonts Project Authors
  (https://github.com/stipub/stixfonts).
- Fira Math: Copyright (C) 2018, 2019 Xiangdong Zeng.
- TeX Gyre Pagella Math OTF: Copyright 2012–2014 B. Jackowski,
  P. Strzelczyk and P. Pianowski, on behalf of TeX users groups.

Underlying font license sources:

- https://raw.githubusercontent.com/stipub/stixfonts/master/OFL.txt
- https://raw.githubusercontent.com/firamath/firamath/master/LICENSE
- https://tug.org/fonts/licenses/GUST-FONT-LICENSE.txt
- https://www.latex-project.org/lppl/lppl-1-3c.txt

Package SHA-512 integrity values, verified before extracting:

- STIX Two: `+KQlFrF87BELgXsgDS66OtJW+hgViW+NCpVeE0mwvaWbKzgrycxNeN9oGBXXdM6nel0DOJIleAAOPflhunxmsg==`
- Pagella: `RVc1fKU34zkdmb7H2IZ6o3jtwkftQ2sBDRjK+d8d2zmZoodBdXNZ8zupZmjg8lZANu3xlpGTmoNvFS73TUWOBA==`
- Fira: `EgJzNpae2u9AVX9m6hxVPo52DPUw2waXXWnT/vG7pPhCpXZcYehTu4bDU3vl3Kn5B0ohuLeU4xCmJHEY7ftMDQ==`

The existing New Computer Modern installation is reused from
`../../../LearningApps/fonts/mathjax-newcm`; it is not duplicated here.
Both component and WOFF2/dynamic paths are set to local URLs. The isolated
comparison documents also enforce a same-origin Content Security Policy.

Documentation: https://docs.mathjax.org/en/latest/output/fonts.html
