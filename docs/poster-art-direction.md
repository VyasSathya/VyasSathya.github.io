# Portfolio posters

`python scripts/build-thumbnails.py` composes native SVG assets from approved source imagery. It requires Pillow and fontTools. Geist wordmarks are stored as glyph paths, so poster text does not depend on fonts loading inside an image. Embedded images retain their proportions. The source rectangles, hashes, credits and output filenames are in `media/thumbnails/provenance.json`.

The layout measurements that drove the compositions:

| Viewport | Card image interior |
| --- | --- |
| 1920 / 1440 | 537 x 168 |
| 900 | 399 x 168 |
| 700 | 321 x 112 |
| 390 | 166 x 112 |
| 360 | 157 x 98 |

Every project has four independently composed variants: wide 1611 x 504, medium 1200 x 504, compact 996 x 672, and player 1920 x 1080. Picture sources select compact at up to 500 CSS pixels, medium at up to 1100, and wide above that. `object-fit: contain` preserves the whole composition between those measured widths. The project background fills the remaining space. Hover does not zoom or cut the image.

Phone compositions move the wordmark above the subject. Wider variants put the brand beside the image. Selected source regions remove film captions and unrelated margins before composition. The actual Talkover panel is preserved in full; crewboard uses its actual task view on lavender, while agent-brain uses source-linked evidence on green. video-studio combines the original panel with the complete whiteboard output. Collection artwork retains its original attribution. Gameplay posters focus on the arena instead of a partially visible HUD.

The overview has its own 16:9 poster combining approved Talkover, Kpop Sing and material-repair imagery. It uses the final 60.9-second overview film. No films were modified for this revision.

The J Will Media reference uses a full-height, shaded background film. A screenshot comparison of that treatment on this portfolio showed that the shade obscures the product and a phone crop removes most of the frame. The retained hero puts the complete 16:9 film beside the headline, or below it on phone. There is no autoplay or initial media preload; an explicit play action enables native sound, pause, seek and fullscreen controls. Reduced motion never triggers playback.

About links to existing project evidence. Working-together and Contact sections explain engagement scope and how to start. Contact uses the verified public LinkedIn profile and services page. There is no contact-form backend, invented mailbox, or submission made by this site. Pricing is by discussion.

GitHub Pages currently publishes `main:/`. The portfolio changes are on the draft `portfolio-proof-library` PR. Publishing the github.io site needs the approved PR marked ready and merged, the automatic Pages build confirmed, and public case/media URLs checked. No new host, paid resource, DNS change or custom domain is required.
