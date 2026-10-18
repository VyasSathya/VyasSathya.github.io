# vyassathya.github.io

Source of https://vyassathya.github.io: who I am, the work as launch films, what I take on, how to reach me.

Plain HTML, CSS and a little JavaScript. No build step. Fonts are Geist (SIL Open Font License, in `fonts/`).
Films in `media/` are h264 with faststart and load only when played; posters are the only media the page loads up front.

## Layout

- `index.html` page
- `site.css` styles, light and dark (follows the system, the toggle remembers a choice)
- `films.js` the film list: one entry per film drives both the grid and the player
- `media/<id>.mp4`, `media/<id>.jpg` film and poster; `<id>-tall` is the 9:16 cut the player picks on portrait screens

To add a film: put `<id>.mp4` and `<id>.jpg` in `media/`, add an entry to `FILMS` in `films.js` with its row.

## Custom domain

`vyass.dev` has no DNS records yet. To serve this site there:

1. At the registrar for `vyass.dev`, add four `A` records on the apex (`@`): `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` (and optionally the `AAAA` records `2606:50c0:8000::153` to `8003::153`).
   For `www`, add a `CNAME` to `vyassathya.github.io`.
2. Verify the domain for the account first (GitHub Settings, Pages, Add a domain) so no one else can claim it.
3. In this repository's Settings, Pages, set the custom domain to `vyass.dev` (this commits a `CNAME` file) and
   tick Enforce HTTPS once the certificate is issued.

`.dev` is on the HSTS preload list, so the site only works over HTTPS; GitHub issues the certificate after DNS resolves.
