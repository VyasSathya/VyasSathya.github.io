# vyassathya.github.io

Source of https://vyassathya.github.io: project evidence, services and contact.

Plain HTML, CSS and a little JavaScript. No build step. Fonts are Geist (SIL Open Font License, in `fonts/`).
Films in `media/` are h264 with faststart and load only when played; posters are the only media the page loads up front.

## Layout

- `index.html`: Work and Services explorer
- `site.css`, `layout-refinements.css`, `identities.css`: responsive layouts and project identities, with light and dark appearance
- `projects.json`: the source catalog, including product state and real actions
- `films.js`: four-card paging and service buying paths
- `catalog.js`, `work/<project>/index.html`: static outputs generated from the catalog
- `media/`: films and original-source posters; nothing autoplays

After changing `projects.json`, run `python scripts/build-pages.py`. The checked-in outputs require no build
step to host. Serve the directory with any static HTTP server for local review.

All and every Work collection use the same two-column, two-row page. Arrows advance an entire page;
touch scrolling snaps to pages. Services describe deliverables and link to four relevant examples each.
Project pages work without JavaScript; video controls and public links remain available.

Responsive project posters have separate wide, medium, phone and 16:9 player compositions.
See `docs/poster-art-direction.md` for dimensions, the source manifest and regeneration.
The hero overview plays only after an explicit action. About, working-together and Contact
sections link to actual project evidence and the verified LinkedIn contact routes.

Film status is explicit. A missing film is not replaced with a fake demo, and a prototype is not labeled
as a public release. Front of Line footage uses a fictional practice workspace. The J Will Media case
shows the new local implementation; the existing Marquee domain currently serves the previous site.
Public contact uses the existing LinkedIn profile, with no personal email in source or assets.

## Custom domain

`vyass.dev` has no DNS records yet. To serve this site there:

1. At the registrar for `vyass.dev`, add four `A` records on the apex (`@`): `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` (and optionally the `AAAA` records `2606:50c0:8000::153` to `8003::153`).
   For `www`, add a `CNAME` to `vyassathya.github.io`.
2. Verify the domain for the account first (GitHub Settings, Pages, Add a domain) so no one else can claim it.
3. In this repository's Settings, Pages, set the custom domain to `vyass.dev` (this commits a `CNAME` file) and
   tick Enforce HTTPS once the certificate is issued.

`.dev` is on the HSTS preload list, so the site only works over HTTPS; GitHub issues the certificate after DNS resolves.
