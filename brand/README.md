# Spotter brand

**The mark: "Level up".** Three chevrons stacked and rising: the lowest dim, the middle white, the top volt. Every rep moves you up. (It replaced a squatting figure in a tick ring, which read like a restroom or accessibility sign; the other concepts are in `concepts/`.)

| File | Use |
|---|---|
| `logo-mark.svg` | App icon: the mark on a dark rounded square |
| `logo-mark-transparent.svg` | The mark on dark backgrounds (store images) |
| `logo-mark-square.svg` | Opaque full square, for the 512 and 114 px store icons |
| `logo-small-transparent.svg` | The small mark inside the apps: TV wordmark and coach card, phone page header |
| `logo-small.svg` | 16–64 px (browser tab, home-screen icon): thicker strokes, which stay crisp when tiny |
| `make-svg.py` | Writes the three SVGs (`python3 make-svg.py`) |
| `render.mjs` + `render.json` | Renders every PNG below with headless Chrome |
| `store-icon.html`, `store-background.html` | Layouts for the Fire TV store images |

**Colors:** volt `#C8FF3D` (top chevron), text `#F4F5F7` (middle), `#3A3F55` (lowest), ground `#0A0B10`. **Type:** Archivo Condensed Black for "SPOTTER".

## Where it's used

| Place | File |
|---|---|
| Fire TV launcher icon (`manifest.toml` `icon`) | `tv-app/assets/image/spotter_icon.png` (512×512) |
| TV wordmark and coach card | `tv-app/assets/brand/logo-mark.png` (96×96, transparent, from `logo-small-transparent.svg`) |
| Phone page header and browser tab | inline SVG in `phone-web/index.html` |
| Phone home-screen icon | `phone-web/apple-touch-icon.png` (180×180), served by the site Lambda |
| README | `brand/png/logo-256.png` |
| Amazon Appstore: large icon, small icon | `brand/png/logo-512.png`, `brand/png/store-small-icon-114.png` |
| Amazon Appstore: Fire TV app icon and background | `brand/png/store-app-icon-1280x720.png`, `brand/png/store-background-1920x1080.png` |

## Re-render

```bash
cd brand
python3 make-svg.py
PUPPETEER_DIR=<path to node_modules/puppeteer> node render.mjs
```
