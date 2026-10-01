# Spotter design system

Spotter has two surfaces that must feel like one product:

| Surface | Where | Viewed from | Input |
|---|---|---|---|
| **TV app** | `tv-app/` (Vega OS, React Native) | 2.5–3 m, often mid-exercise | Fire TV remote (D-pad + OK) |
| **Phone camera page** | `phone-web/index.html` | arm's length, briefly | Touch |

The TV is the coach and does the talking. The phone is a camera you set down and forget, so its UI is minimal.

Values below are taken from the code as of 2026-10-01. If you change a value, change it here too.

---

## 1. Principles

1. **Readable from the floor.** The most important information on each screen (rep count, cue, pairing code) must be readable from 3 m, mid-squat, without glasses. If in doubt, make it bigger and remove something.
2. **One focus, always visible.** On TV, exactly one element is focused, and the focus is unmistakable (§5). Every screen gives a focus target on arrival (`hasTVPreferredFocus`).
3. **Coach, don't scold.** Cues are short imperative phrases ("Go deeper"), shown briefly, then gone. Never shame. A rep that doesn't count simply doesn't increment.
4. **Dark by default.** Workouts happen in living rooms and the TV is the brightest thing in the room. Use a near-black background, and keep color for meaning.
5. **Privacy is visible.** The phone sends body keypoints, never video. Say so in copy wherever it matters (pairing, README, demo).

---

## 2. Color

One palette, shared by both surfaces. Contrast ratios are against the background `#0b0b0f` (WCAG 2.x).

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `bg` | `#0b0b0f` | — | App and page background |
| `surface` | `#15151c` | — | Buttons, inputs, camera frame |
| `surface-raised` | `#24242d` | — | Secondary buttons (phone), idle button border (TV) |
| `surface-focus` | `#1d2a33` | — | Background of the focused TV button |
| `border-input` | `#33333d` | — | Phone code input border |
| `text` | `#ffffff` | 19.6 : 1 | Rep count, pairing code, headings, focused label |
| `text-phone` | `#f2f2f5` | 17.6 : 1 | Phone body text (slightly softer on small screens) |
| `text-secondary` | `#aaaaaa` | 8.5 : 1 | Units ("squats"), sub-lines, instructions |
| `text-idle` | `#cccccc` | 12.2 : 1 | Unfocused TV button labels |
| `text-muted` | `#888888` | 5.5 : 1 | Button details |
| `text-meta` | `#666666` | **3.4 : 1** | Frames/s line on TV. See the open issue below. |
| `text-muted-phone` | `#9a9aa6` | 7.1 : 1 | Phone helper text and stats |
| `accent` | `#44ccff` | 10.6 : 1 | Brand wordmark, focus ring, primary phone button, skeleton overlay |
| `on-accent` | `#002233` | 8.9 : 1 on `accent` | Text on the primary phone button |
| `cue` / `warn` | `#ffcc66` | 13.2 : 1 | Coaching cues, "Connecting…", phone warnings |
| `bad` | `#ff6b6b` | 7.1 : 1 | Phone errors ("That code didn't work") |
| `qr-dark` / `qr-light` | `#000000` / `#ffffff` | — | QR code only. Always black on white, never themed. |

**Rules**
- `accent` means *you are here / this is interactive*. Don't use it for decoration.
- `cue` means *the coach is talking to you*. Every coaching cue uses it, and nothing else does on the workout screen.
- `bad` exists only on the phone. The TV never shows red: a failed rep is silence, not an error.
- **Open issue:** `text-meta` (`#666666`) is 3.4 : 1, which only passes for large text (24 px or more, as used now). If meta text ever gets smaller, switch to `#8a8a96` (5.8 : 1).

---

## 3. Typography

System fonts: Amazon Ember on Fire TV, `-apple-system` / Segoe UI on the phone. Weights used: 400, 600, 700 and 800 only.

### TV type scale (density-independent pixels)

| Role | Size / weight | Example |
|---|---|---|
| `display-rep` | 150 / 800, line height 170 | the rep count "7" |
| `display-code` | 72 / 800, letter-spacing 10 | the pairing code "B3XCAK" |
| `cue` | 44 / 700 | "Go deeper" |
| `title` | 40 / 700, `accent` | "Spotter", "Squats" |
| `unit` | 36 / 400 | "squats" under the count |
| `status` | 36 / 400, `cue` | "Connecting…" |
| `button` | 34 / 700 | "Squats", "Change workout" |
| `heading` | 32 / 700 | "Scan with your phone's camera" |
| `body` | 24 / 400 | "or open the Spotter page and enter", meta line |
| `caption` | 22 / 400 | placement hint, button detail |

**Rules**
- **Nothing on TV smaller than 22.** At 3 m, 22 is the floor for secondary text and 32 or more for anything the user must act on.
- Numbers that change (reps) use one size and never reflow the layout. Reserve the space.
- Codes use wide letter-spacing and the unambiguous alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L).

### Phone type scale (CSS px)

| Role | Size / weight |
|---|---|
| `title` | 28 / inherited (bold h1), `accent` |
| `code-input` | 28 / 600, monospace, letter-spacing 6, uppercase |
| `body` | 17 / 400, line height 1.4 |
| `button` | 18 / 600 |
| `stats` | 13 / 400, tabular numbers |

---

## 4. Spacing, shape and layout

**Spacing steps:** `12 · 16 · 20 · 24 · 32 · 40 · 48`. Use these; don't invent new ones.

| Token | TV | Phone |
|---|---|---|
| Screen padding | 48 | 16 |
| Gap between stacked elements | 12–32 | 16 |
| Button padding | 28 vertical × 36 horizontal | 14 × 18 |
| Corner radius | 20 (buttons) | 12 (inputs, buttons), 16 (camera frame) |
| Border | 4 (TV buttons) | 2 (code input) |

**TV layout**
- Everything is centered in one column, except the pairing screen, which uses two columns (QR on the left, instructions on the right).
- **Sizes come from the screen, not constants**, where it matters: the QR code is `min(55 % of height, 30 % of width)`. Fixed pixel sizes clipped the QR on the virtual device.
- Keep content inside a 5 % margin on each edge so TVs that crop the picture don't cut anything off. The 48 padding covers this at 1080p. Check on a real device when one is available.
- One row of options holds at most 3 buttons (minimum width 240), which still fits at 1.04× focus scale.

**Phone layout**
- Single column, maximum width 480, safe-area aware (`viewport-fit=cover`).
- The camera frame is 3 : 4, preserving the body-in-view framing the user needs to see.

---

## 5. Focus (TV)

The remote has no pointer, so focus is the whole interaction model.

| State | Border | Background | Label | Scale |
|---|---|---|---|---|
| Idle | 4 px `surface-raised` | `surface` | `text-idle` | 1.00 |
| Focused | 4 px `accent` | `surface-focus` | `text` | 1.04 |

- Implemented once in `tv-app/src/FocusButton.tsx`. Every focusable thing uses it.
- On arrival at each screen, the most likely next action gets `hasTVPreferredFocus`: the first workout on the picker, "Change workout" during a workout.
- The border color changes, not just the scale. Scale alone is too subtle from 3 m.
- The border is always 4 px in both states, so focus never shifts the layout.

---

## 6. Components

| Component | File | Notes |
|---|---|---|
| `FocusButton` | `tv-app/src/FocusButton.tsx` | The only TV button. Label plus an optional detail line. |
| `QrCode` | `tv-app/src/QrCode.tsx` | Drawn with `View`s (no SVG dependency), black on white, 4-module quiet zone. Encodes `PHONE_URL?code=XXXXXX`. |
| Rep display | `tv-app/src/App.tsx` (active phase) | Title (exercise name), then count, unit, cue line (always reserved, a blank space when idle), meta line, and the "Change workout" button. |
| Pairing panel | `tv-app/src/App.tsx` (waiting phase) | QR, then "Scan with your phone's camera", "or open the Spotter page and enter", the code, and the placement hint. |
| Camera stage | `phone-web/index.html` `#stage` | Video plus skeleton canvas, mirrored for the front camera. |
| Status line | `phone-web/index.html` `#status` | One line, colored by state: `ok` → `accent`, `warn` → `cue`, `bad` → `bad`. |

---

## 7. Coaching cues and copy

Cues are defined once in `tv-app/src/exercises/types.ts` (`CUE_TEXT`).

| Cue | Text | When | On screen |
|---|---|---|---|
| `deeper` | **Go deeper** | Went past the dip angle, came back up without reaching depth. Not counted. | 2.5 s |
| `slower` | **Slow down** | Counted, but under 1 s from the start of the dip to standing | 2.5 s |
| `step-back` | **Step back: full body in frame** | The needed joints are below visibility 0.6 | 2.5 s, once per occurrence |

**Copy rules**
- Imperative, 1–3 words for cues, sentence case, no exclamation marks, no emoji.
- Say what to do, not what went wrong ("Go deeper", not "Rep invalid").
- Numbers carry their units ("15 frames/s", "2.5–3 m").
- The product name is **Spotter**. Write "Fire TV" only when describing the platform, never as part of the product name.

---

## 8. Motion and timing

| What | Value | Why |
|---|---|---|
| Screen refresh during a workout | at most every 100 ms | Counting runs on every frame; redrawing on every frame backed up the message queue on Vega |
| Cue visible | 2.5 s | Long enough to read mid-movement, short enough not to linger |
| Phone considered gone | 3 s without frames | Back to the pairing screen, keeping the session and code |
| Focus change | instant scale to 1.04 | No animation; it stays responsive on low-end TV hardware |

No decorative animation. Motion on screen is the user's own body, mirrored as the rep count.

---

## 9. Accessibility checklist

- [x] Text contrast is at least 4.5 : 1 everywhere except `text-meta` (3.4 : 1 at 24 px, which counts as large text).
- [x] Focus is shown by color and border, not color alone.
- [x] Pairing works without the QR code: the code is printed large, in an unambiguous alphabet.
- [ ] Screen reader labels (`accessibilityLabel`) on `FocusButton` and the rep count. Not done yet.
- [ ] Spoken cues for users who can't watch the screen mid-exercise. Planned, see the roadmap.
- [ ] Check the 5 % edge margin on a real Fire TV.
