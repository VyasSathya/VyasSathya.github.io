# vyassathya.github.io

Source of https://vyassathya.github.io: project evidence, services and contact.

Plain HTML, CSS and a little JavaScript. No build step. Fonts are Geist (SIL Open Font License, in `fonts/`).
Films in `media/` are h264 with faststart. The overview autoplays muted unless reduced motion is requested; case films load on play.

## Layout

- `index.html`: Work and Services explorer
- `site.css`, `layout-refinements.css`, `identities.css`: responsive layouts and project identities, with light and dark appearance
- `projects.json`: the source catalog, including product state and real actions
- `films.js`: four-card paging and service buying paths
- `catalog.js`, `work/<project>/index.html`: static outputs generated from the catalog
- `media/`: films, real extracted stills and original-source posters

After changing `projects.json`, run `python scripts/build-pages.py`. The checked-in outputs require no build
step to host. Serve the directory with any static HTTP server for local review.

All and every Work collection use the same two-column, two-row page. Arrows advance an entire page;
touch scrolling snaps to pages. Services describe deliverables and link to four relevant examples each.
Project pages work without JavaScript; video controls and public links remain available.

Responsive project posters have separate wide, medium, phone and 16:9 player compositions.
See `docs/poster-art-direction.md` for dimensions, the source manifest and regeneration.
The 103.4-second hero overview introduces all sixteen selected cases. It autoplays muted, with an explicit sound toggle and native controls. Reduced motion keeps manual playback. Individual project pages lead with real actions and a film, then features, two real film stills and collapsible project details.

The overview action sits in a fixed-size control row below the complete 16:9 image. About is one continuous introduction with inline project evidence; engagement terms sit with Contact.

Contact uses a project inquiry form. Its existing Supabase deployment stores submissions in a private portfolio schema; see `backend/README.md` for owner retrieval and notification status.

Film status is explicit. A missing film is not replaced with a fake demo, and a prototype is not labeled
as a public release. Front of Line footage uses a fictional practice workspace. The J Will Media case
shows the new local implementation; the existing Marquee domain currently serves the previous site.
No personal mailbox is published. The stand-up mic portrait is an unchanged original-performance frame at 435 seconds.

## Custom domain

`vyass.dev` has no DNS records yet. To serve this site there:

1. At the registrar for `vyass.dev`, add four `A` records on the apex (`@`): `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` (and optionally the `AAAA` records `2606:50c0:8000::153` to `8003::153`).
   For `www`, add a `CNAME` to `vyassathya.github.io`.
2. Verify the domain for the account first (GitHub Settings, Pages, Add a domain) so no one else can claim it.
3. In this repository's Settings, Pages, set the custom domain to `vyass.dev` (this commits a `CNAME` file) and
   tick Enforce HTTPS once the certificate is issued.

`.dev` is on the HSTS preload list, so the site only works over HTTPS; GitHub issues the certificate after DNS resolves.
