# vyassathya.github.io

Source of https://vyasapps.dev: project evidence, services and contact.

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
The 103.4-second hero overview introduces all sixteen selected cases. It autoplays muted with native player controls for sound, pause and seeking. Reduced motion keeps manual playback. Individual project pages lead with real actions and a film, then features, two real film stills and collapsible project details.

The overview has no separate title, duration or custom sound/play buttons. Its stand-up chapter uses a closer face/microphone crop from the original performance at435-440.5s. The separate 126.2-second stand-up reel starts after the zipper joke: original source16-81.2s, then408-469s, with unchanged internal timing and room audio. Original edits remain as history at their old media URLs. About is one continuous introduction with inline project evidence; engagement terms sit with Contact.

Contact uses a project inquiry form. Its existing Supabase deployment stores submissions in a private portfolio schema; see `backend/README.md` for owner retrieval and notification status.

Film status is explicit. A missing film is not replaced with a fake demo, and a prototype is not labeled
as a public release. Front of Line footage uses a fictional practice workspace. The J Will Media case
shows the new local implementation; the existing Marquee domain currently serves the previous site.
No personal mailbox is published. The stand-up mic portrait is an unchanged original-performance frame at 435 seconds.

## Custom domain

The existing owned domain `vyasapps.dev` is verified for the GitHub account and bound to this repository's Pages site. Keep the root `CNAME` file and the registrar's GitHub verification TXT record.

GoDaddy DNS uses four apex `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. The `www` CNAME points to `vyassathya.github.io`. Existing nameservers, domain-connect and DMARC records are retained.

GitHub Pages supplies the HTTPS certificate. The inquiry endpoint permits both `https://vyasapps.dev` and `https://www.vyasapps.dev`, along with the original Pages and local development origins.
