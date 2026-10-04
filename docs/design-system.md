# Spotter design system: "Arena"

Spotter has two surfaces that must feel like one product:

| Surface | Where | Viewed from | Input |
|---|---|---|---|
| **TV app** | `tv-app/` (Vega OS, React Native) | 2.5–3 m, often mid-exercise | Fire TV remote (D-pad + OK) |
| **Phone camera page** | `phone-web/index.html` | arm's length, briefly | Touch |

The TV is the coach: it counts, cues, celebrates and talks. The phone is a camera you lean against something and forget, so its UI is minimal.

The look is **Arena**: a near-black stage, one electric volt accent for energy and focus, amber for the coach's voice, and tall condensed type, like a scoreboard.

Values come from the code as of 2026-10-03: `tv-app/src/theme.ts` and the `:root` variables in `phone-web/index.html`. If you change a value, change it here too.

---

## 1. Principles

1. **Readable from the floor.** The rep count, the cue and the pairing code must be readable from 3 m, mid-squat. If in doubt, make it bigger and remove something.
2. **One focus, always visible.** On TV exactly one element is focused, shown by a volt border and fill (§5). Every screen sets where focus lands (`hasTVPreferredFocus`).
3. **Coach, don't scold.** Cues are short instructions, shown briefly. A rep that doesn't count simply doesn't count; the TV never shows red.
4. **Color means something.** Volt = you, progress, interactive. Amber = the coach is talking. Nothing is colored for decoration.
5. **Privacy is visible.** The phone sends body keypoints, never video. Profiles are saved on the TV, with no account. Say so where it matters ("Saved on this TV · no account").

---

## 2. Color

One palette for both surfaces. Contrast is WCAG 2.x against `ground` unless stated.

| Token (TV / phone CSS) | Hex | Contrast | Use |
|---|---|---|---|
| `ground` / `--ground` | `#0A0B10` | — | Background everywhere |
| `surface` / `--surface` | `#14161F` | — | Cards, buttons, stat tiles, inputs, phone sheet |
| `raised` / `--raised` | `#1E2130` | — | Idle button border, unlit ring ticks, avatar |
| `line` / `--line` | `#2A2E40` | — | Hairlines, pill and input borders |
| `text` / `--text` | `#F4F5F7` | 18.0 : 1 | Counts, headings, focused labels |
| `textSecondary` / `--muted` | `#A3A8B8` | 8.3 : 1 | Units, sub-lines, hints, stat labels |
| `textIdle` | `#CFD3DC` | 13.1 : 1 | Unfocused TV button labels |
| `accent` / `--accent` (volt) | `#C8FF3D` | 16.7 : 1 | Focus, lit ring ticks, wordmark mark, primary phone button, skeleton |
| `accentSurface` / `--accent-surface` | `#1A2410` | — | Fill under a volt border (focused card); `text` on it is 14.8 : 1 |
| `cue` / `--cue` (amber) | `#FFB547` | 11.2 : 1 | Coach cue pill, "NEXT TIME" card, input errors, phone warnings |
| `cueSurface` | `#1F1A0E` | — | Fill under amber |
| `onCue` / `--on-cue` | `#1A1206` | 10.5 : 1 on `cue` | Text on the amber cue pill |
| `--bad` (phone only) | `#FF6B6B` | 7.1 : 1 | Phone errors ("That code didn't work") |
| `qrDark` / `qrLight` | `#0A0B10` / `#FFFFFF` | — | QR code only. Always dark on white, never themed. |

**Rules**
- **Volt** means *you are here, this is yours, this is progress*: focus, lit ticks, the player's name on the summary, "AI coach". Never decoration.
- **Amber** means *the coach is talking to you*: the cue pill, the "NEXT TIME" card, "No spaces allowed". On the workout screen nothing else is amber.
- **Red** exists only on the phone. A failed rep on TV is silence, not an error.
- Text on volt uses `ground` (16.7 : 1). Text on amber uses `onCue`.

---

## 3. Typography

Two families, bundled on TV (`tv-app/assets/fonts/`, OFL; Vega needs the file name to match the family name) and loaded from Google Fonts on the phone:

| Role | TV font | Phone |
|---|---|---|
| Display: counts, headlines, names | `ArchivoCondensed-Black` | Archivo, width 75, weight 900 |
| Display bold: stat values, coach headline | `ArchivoCondensed-ExtraBold` | Archivo 800 |
| Body | `DMSans-Regular` | DM Sans 400 |
| Body medium: labels, steps | `DMSans-Medium` | DM Sans 500 |
| Body bold: buttons, eyebrows | `DMSans-Bold` | DM Sans 700 |

Display text is uppercase ("WHAT ARE WE TRAINING TODAY?"). Body text is sentence case.

### TV type scale

Sizes are on the **1280 × 720 design canvas** (§4). A 1080p TV shows them at 1.5×.

| Role | Canvas size / font | Example |
|---|---|---|
| `count-live` | 200 display, line height 190 | rep count during a workout |
| `count-summary` | 160 display | "4" on the summary |
| `headline-pair` | 84 display | "YOUR PHONE IS THE CAMERA." |
| `headline` | 72 display | "WHAT ARE WE TRAINING TODAY?", "WHO'S TRAINING?" |
| `unit-summary` | 52 display | "SQUATS" |
| `exercise` | 50 display | "SQUATS" on the workout screen |
| `card-name` | 46 display | picker cards |
| `code` | 44 display, letter-spacing 10 | pairing code |
| `name-input` | 44 display bold, line height 60 | name field |
| `coach-headline` | 40 display bold | "4 squats done" |
| `player-name` | 38 display | Who's training cards |
| `tile-value` | 36 display bold | "2.0 s" |
| `cue` | 30 display, on amber | "GO DEEPER" |
| `next` | 30 display bold | "4 squats, every rep to full depth." |
| `wordmark` | 30 display | "SPOTTER" |
| `button` | 26 body bold | "Same again" |
| `of-target` | 24 body | "of 5 target" |
| `insight`, `error`, `phone-hint` | 22 body | coach insights, "No spaces allowed" |
| `eyebrow` | 20 body bold, letter-spacing 3, volt | "NICE WORK, RAMY" |
| `pill` | 20 body bold | "Ramy · switch" |
| `small` | 18–19 body | status pills, footers, sub-lines |
| `label` | 15 body medium, letter-spacing 2 | "PACE", "KNEE" |

**Rules**
- **Floor: 15 on the canvas** (22.5 at 1080p), and only for short uppercase labels. Anything the user must act on is 20 or more.
- Changing numbers (reps, stats) never reflow the layout: their space is reserved.
- Codes use wide letter-spacing and the unambiguous alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L).

### Phone type scale (CSS px)

| Role | Size |
|---|---|
| `h1` (start screen) | 64 display, line height 0.92 |
| Sheet and panel headings | 30–34 display |
| Live rep count | 56 display |
| Code input | 30 display, letter-spacing 8 |
| Name input | 28 display, no letter-spacing |
| Primary button | 26 display, 72 px tall |
| Body | 17 DM Sans, line height 1.45 |
| Notes, stats | 13–15 |

---

## 4. Layout, spacing and shape

**The Stage.** Every TV screen is laid out on a fixed **1280 × 720 canvas** (`tv-app/src/Stage.tsx`), scaled once to fit the TV. Layouts never reflow or clip, and the mockups map 1 : 1 to code.

| Token | TV (canvas) | Phone |
|---|---|---|
| Screen padding | 72 horizontal × 52 vertical | 24 |
| Card | radius 24, padding 28–30 | sheet radius 24 (top corners) |
| Button | radius 18, padding 18 × 40, border 4 | primary 72 tall, radius 20 |
| Pill | radius 999, padding 12 × 24, border 3 | radius 999 |
| Gaps | 14 · 18 · 24 · 32 · 40 · 56 | 10 · 12 · 14 · 28 |

**Rules**
- Rows end flush with the header above them: the last card in a row has no right margin.
- A button under a card is as wide as the card ("Edit name" on Who's training).
- The default action under a text field fills the space below it ("Save"), so D-pad Down lands on it.
- Keep content inside the 72 / 52 padding, clear of TV overscan.

---

## 5. Focus (TV)

The remote has no pointer, so focus is the whole interaction model. It is implemented once, in `tv-app/src/FocusButton.tsx`, and every focusable control uses it.

| State | Border | Fill | Label |
|---|---|---|---|
| Idle | 4 px `raised` (pills: 3 px `line`) | `surface` | `textIdle` |
| Focused | 4 px `accent` | `accentSurface` | `text` |

- **Nothing moves.** No scale and no lift: a focused card that grows next to its neighbors reads as misaligned. Focus is border plus fill only.
- Borders are the same width in both states, so focus never shifts layout.
- Cards can render their own content per state (`children(focused)`): the focused picker card turns its muscle label volt, and the focused player's avatar fills volt.
- Where focus lands: the first exercise on the picker, the active player on Who's training, the name field on the name screen, **Finish** during a workout, **Same again** on the summary.

---

## 6. Components

| Component | File | Notes |
|---|---|---|
| `Stage` | `tv-app/src/Stage.tsx` | 1280 × 720 canvas, scaled to the screen |
| `FocusButton` | `tv-app/src/FocusButton.tsx` | Button, pill (`pill`) or card (`children`) |
| `TickRing` | `tv-app/src/TickRing.tsx` | 40 ticks drawn with rotated Views (no SVG on Vega). Lit ticks are volt and longer. New ticks light one by one, led by a white tick, within 450 ms per rep. Used around the count and around the pairing QR. |
| `CelebrationBurst` / `CelebrationBadge` | `tv-app/src/Celebration.tsx` | Emoji rising beside the count plus a volt badge ("🔥 Clean streak ×5"). 1.5 s; only opacity and position animate, on the native driver. |
| `RewardSticker` and summary art | `tv-app/src/Celebration.tsx`, `src/rewardArt.ts` | Funny cartoon stickers, 4 per exercise, in a 4 px volt frame, tilted 6–8°. A big reward (target, streak, deepest) pops one beside the ring for 1.5 s, never over the count; the summary shows one beside the count. Made with Workers AI ahead of time and reviewed by hand (`reward-art/`): adult characters, natural skin tones, lime sportswear, no text or symbols, nothing resembling existing characters. |
| `QrCode` | `tv-app/src/QrCode.tsx` | Drawn with Views, dark on white, 4-module quiet zone |
| `Wordmark`, `StatusPill`, `StatTile` | `tv-app/src/screens/shared.tsx` | `StatTile grow` shares a row's width |
| Screens | `tv-app/src/screens/` | Pair, Pick, Who's training, Name, Workout, Summary |
| Name sheet (phone) | `phone-web/index.html` `#nameSheet` | Bottom sheet with a volt top edge, shown while the TV asks for a name |
| Skeleton overlay (phone) | `phone-web/index.html` `drawSkeleton` | Volt bones over a soft volt body fill, dark joint dots, amber knee arc |

### Screens

| Screen | Content |
|---|---|
| **Pair** | Wordmark, "No account. Nothing to install on your phone.", headline, 3 numbered steps, QR inside a tick ring, the code, status pill |
| **Pick** | "WHAT ARE WE TRAINING TODAY?", 3 exercise cards (muscles, name, the plan: "3 × 12 · 60 s rest" or "3 × 12 · last time 21"), pills "Ramy · switch", "Coach voice: TV" and "Rest: Auto" (Auto, 30, 45, 60, 90 s, saved per player) |
| **Who's training** | Up to 4 player cards (avatar initial, name, "Squats 4 · Lunges 6"), a "New player" card, "Edit name" under each player |
| **Name** | "WHAT'S YOUR NAME?", the field, Save and Cancel (Skip for a new player), "Easier on your phone: it's asking for your name too." |
| **Workout** | "Ramy · Set 1 of 3", exercise name, depth gauge, count in the tick ring, "of 12 squats", cue pill, stat tiles (pace, streak, best depth), Finish |
| **Rest** (between sets) | Inside the ring: volt "REST", the countdown in seconds (ticks empty as it runs), "Next: set 2 of 3 · 12 squats". **Skip rest** (focused) above Finish. Reps don't count during a rest. |
| **Summary** | "NICE WORK, RAMY", count, "SETS 12 · 12 · 12", stat tiles, coach card ("COACH", plus "✨ AI coach" when rewritten by AI), amber "NEXT TIME" card, Same again and New workout |

---

## 7. Copy and voice

**On-screen cues** (`tv-app/src/exercises/types.ts`): "Go deeper", "Slow down", "Step back: full body in frame". Shown for 2.5 s in the amber pill, uppercase.

**Spoken coach** (Amazon Polly, Matthew, neural; `voice/phrases.json`): 88 clips: counts 1–50, start, cues, praise, "Two more!", "Almost there!", streak, deepest, target and finish. A named player also gets 5 personal phrases ("Let's go, Ramy!", "That's it, Ramy!", "Ramy, go deeper.", "Last one, Ramy!", "Great work, Ramy!"). They're used at start, at finish, on the last rep, on the first "go deeper" and on every other praise, so the name stays special.

**Names:** one word, up to 16 characters, no spaces ("No spaces allowed"). "ramy" is saved as "Ramy". Placeholders ("Player 2") are never spoken.

**Copy rules**
- Cues: imperative, 1–3 words, no exclamation marks. Spoken lines may cheer ("Let's go!").
- Say what to do, not what went wrong ("Go deeper", not "Rep invalid").
- Numbers carry units ("2.0 s", "15 frames/s", "3 m").
- The product is **Spotter**. "Fire TV" names the platform only.

---

## 8. Motion and timing

| What | Value | Why |
|---|---|---|
| Ring fill per rep | at most 450 ms, one tick at a time (a big jump lights a few ticks per step, steps at least 30 ms apart) | Each rep visibly earns its share of the ring |
| Celebration | 1.5 s | Long enough to notice, never covers the count |
| Cue visible | 2.5 s | Readable mid-movement, doesn't linger |
| Rest between sets | 60 s (jumping jacks 45 s), or the player's choice | Spoken: a rest line at the start, encouragement halfway, "3, 2, 1", then the next set |
| "No spaces allowed" | 2.5 s after the last space | Readable even while typing on |
| Screen refresh during a workout | at most every 100 ms | Counting runs on every frame; redrawing on every frame backed up Vega's message queue |
| Phone considered gone | 3 s without frames, except during a rest | Back to pairing, keeping the code. The phone is silent when nobody is in view, so a rest away from the camera is fine. |
| Focus change | instant | Stays responsive on TV hardware |

---

## 9. Accessibility checklist

- [x] Text contrast is at least 7 : 1 everywhere (lowest: `--bad` 7.1 : 1, `textSecondary` on `cueSurface` 7.3 : 1).
- [x] Focus is shown by border and fill, not color alone, and never moves layout.
- [x] Pairing works without the QR code: a large code in an unambiguous alphabet.
- [x] Spoken counts and cues, for when you can't watch the screen mid-exercise.
- [x] Screen reader labels on `FocusButton` and the rep count ("7 squats"); the phone's name error is `role="alert"`.
- [ ] Check overscan margins on a real Fire TV.
- [ ] Check the system on-screen keyboard on a real Fire TV (the Virtual Device shows none; see friction log 11).
