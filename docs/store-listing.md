# Amazon Appstore submission: Spotter

Everything needed to submit Spotter to the Amazon Appstore (Fire TV, Vega OS). Do the steps in the Amazon Developer Console; the files and text are below.

Amazon's Vega guide says: **don't mention "Vega" in any listing field.**

## 1. Upload Your App File

| Item | Value |
|---|---|
| File | `tv-app/build/armv7-release/spotter-tv_armv7.vpkg` only. The three Vega Fire TVs (Fire TV Stick 4K Select, Stick HD 2nd gen, Stick 4K) all take armv7; an aarch64 package targets no devices and blocks submission. Each uploaded file needs a unique build number. |
| Rebuild | `cd tv-app && source ~/vega/env && npm run build:release` |
| Package id | `com.spotter.tv` |
| Version / build | 1.1.0 / 3, submitted 2026-10-07 (1.0.0 / 1 went live 2026-10-07). `manifest.toml`; raise `build-number` for every new upload |

Draft created 2026-10-04: app "Spotter", SKU `spotter-tv` (App ID `amzn1.devportal.mobileapp.cc5718846f104947b42f51cca197de4b`).

**Console quirk:** choosing a subcategory sets the category to *Sports*; the listing still shows under Health & Fitness > Exercise Motivation as well.

## 2. Target Your App

Edit supported devices → **Amazon Fire TV** tab → select the **Vega TV** devices.

## 3. Appstore Details

### Text

**Title:** Spotter

**Short description:**
> Your phone is the camera. Your TV is the coach. Spotter counts your squats, lunges and jumping jacks, tells you when a rep doesn't count, and cheers you on by name. No account, nothing to install on your phone.

**Long description:**
> Turn your living room into a gym with a coach that actually watches your form.
>
> Lean your phone against something across the room and scan the code on your TV. Your phone tracks your body, and your TV does the coaching:
>
> • Counts every rep for squats, lunges and jumping jacks, and only full-depth reps count. Go halfway and the coach tells you: "Go deeper."
> • Trains you like a coach: sets, reps and a rest countdown in between ("Great set! Take a breather.", "Last set. Give it everything!").
> • Talks to you by name: "Let's go, Ramy!", "Last one, Ramy!"
> • Celebrates clean streaks, your deepest rep and every target you hit, with funny cartoon rewards.
> • Sums up each workout with your pace, depth and clean reps, and sets your target for next time. Finish every set with clean form and your next workout asks for 2 more reps per set.
> • Up to 4 players per TV, each with their own progress.
>
> Private by design: video never leaves your phone. Only body points (numbers) are sent to your TV. No account, no ads, no tracking. Player names and progress are saved on your TV.
>
> Works with any phone with a camera and a web browser: no app to install.
>
> Spotter gives general exercise feedback, not medical advice.

**Feature bullets:**
1. Rep counting that only counts full-depth reps
2. Spoken coaching by name, with sets and rest timers
3. Your phone is the camera: no app, no account
4. Video never leaves your phone
5. Progress and next targets for up to 4 players

**Category:** Health & Fitness
**Keywords:** fitness, workout, squats, home workout, personal trainer, exercise, rep counter, coach
**Price:** Free. No in-app purchases, no ads.
**Privacy policy URL:** https://yannegqpb2hvrix2nmxxbbygqm0ldexn.lambda-url.eu-central-1.on.aws/privacy
**Release notes (1.0.0):** First release.

### Images (all in `brand/`)

| Console field | File | Size |
|---|---|---|
| Fire TV app icon (required) | `brand/png/store-app-icon-1280x720.png` | 1280×720, PNG, no transparency |
| Fire TV background (required) | `brand/png/store-background-1920x1080.png` | 1920×1080, no transparency |
| Screenshots (required, 3–10) | `brand/store/screenshot-1-pair.png` … `screenshot-6-summary.png` | 6 × 1920×1080, no transparency |
| Featured content logo (recommended) | `brand/png/store-featured-logo-640x260.png` | 640×260, transparent |
| Featured content background (recommended) | `brand/png/store-featured-background-1920x720.png` | 1920×720, no transparency |
| Large icon, if asked | `brand/png/logo-512.png` | 512×512 |
| Small icon, if asked | `brand/png/store-small-icon-114.png` | 114×114 |

Screenshots, in order: pairing (QR), exercise picker, Who's training, a workout with a streak reward, the rest countdown, the summary with the AI coach.

### Content rating questionnaire (13 fields)

Answer from the app's actual behavior:

| Topic | Answer |
|---|---|
| Violence, sexual content, nudity, profanity, drugs, alcohol, tobacco, gambling | None |
| User-generated content shared with others | None. Player names stay on the TV and aren't shown to anyone else. |
| Location | Not collected |
| Personal information | Optional first name (stored on the TV; sent to Amazon Polly to make voice clips). Body points from the camera are processed in real time and not stored. No account. |
| Camera | Used on the user's own phone, in a web page; video never leaves the phone |
| Ads, in-app purchases | None |
| AI-generated content | Reward illustrations were made with AI ahead of time and reviewed by hand. The optional coach summary and the coach's tip between sets are rewritten by an AI model, which is only allowed to repeat the session's numbers; the tip is voiced with Amazon Polly. |

## 4. Testing instructions for Amazon reviewers

Paste into the console's testing-instructions field:

> Spotter needs a phone (any iPhone or Android phone with a camera and a browser) in addition to the Fire TV.
> 1. Open Spotter on the Fire TV. It shows a QR code and a 6-character code.
> 2. Scan the QR code with the phone's camera (or open the page shown and type the code), then tap "Start camera" and allow camera access.
> 3. Lean the phone upright about 3 m away so your whole body is visible. The TV switches to "What are we training today?" when it sees you.
> 4. Pick Squats with the remote and do a few squats. The TV counts them, shows "Go deeper" for half squats, and speaks.
> 5. Press Finish for the summary. "Who's training?" (the player pill) lets you add players and names.
> No account or login is needed.

## 5. Before you submit

- [ ] Run the end-to-end checks against the live stack (`README.md` → Checks).
- [ ] Test on a real Vega Fire TV device if one is available (Amazon lists a physical device as a prerequisite; so far tested on the Vega Virtual Device only). The hackathon itself doesn't need one: the Devpost FAQ accepts the Vega simulator for submission and judging.
- [ ] Make the GitHub repository public, so the privacy policy's contact link works.
