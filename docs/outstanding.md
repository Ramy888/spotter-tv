# Outstanding

Open work, newest first. Remove an item when it's done.

## Known issue: a squat counts as a lunge (next TV version)

Found 2026-10-19 while testing. The lunge detector only tracks the more bent knee (below 105° and back above 155°), so a deep squat passes. Nothing checks the lunge stance (one foot forward, knees at clearly different heights). Kept as is for the submission. Fix it in a TV update (a stance check in `tv-app/src/exercises/index.ts`, plus a test that a squat is rejected during lunges) and in pose-reps 0.2.0, which has the same thresholds. A phone-only workaround was considered and dropped: it couldn't check the first rep of a workout, and it edits what the TV sees.

## Next store update: rest screenshot with the Coach card

The 1.1.0 screenshots predate the between-set coach: `brand/store/screenshot-5-rest.png` shows the plain countdown. Retake it on the Vega Virtual Device with the Coach card (do a few half squats in set 1 so the focus is "Full depth"), at 1920×1080 with no transparency, and upload it to both screenshot sections (Fire TV and tablet) with the next version. Don't cancel the 1.1.0 review for it.

## Devpost submission: submitted 2026-10-09 (editable until Oct 23)

- **Open Source mini challenge: resolved 2026-10-15.** On Devpost Discussions (thread 45547), Emerson (Amazon) ruled that the primary-track repo doesn't count. We built a separate library, **pose-reps** (https://github.com/Ramy888/pose-reps): MIT, 19 tests, CI green. **Public since 2026-10-19**, together with spotter-tv; **on npm as pose-reps 0.1.0** (published 2026-10-19), and the browser demo is live at https://pose-reps.ramy-comm.workers.dev (Cloudflare Workers static assets, `npm run demo:deploy`). It's the rep-counting engine, extracted from Spotter and generalized. Both Devpost OSS URLs point to pose-reps; the description mentions npm and the demo.

- Submission 1205489 submitted. Answers are also in `docs/devpost-additional-info.md`. Video https://youtu.be/9C-6zbNSxhQ, Appstore https://www.amazon.com/dp/B0HLY8788C.
- YouTube video is Public (2026-10-09), 1:52 long (under the 3:00 limit). AI shots were made with Google Flow, and there's no music, so no third-party media to clear.
- **Repo is public since 2026-10-19** (spotter-tv and pose-reps; history checked with gitleaks first, no secrets).
- **Judge path without a Fire TV (2026-10-19):** README "Try it (for judges)", and the GitHub release v1.1.0 (tagged at the store commit 4e1b4b5) carries the release `.vpkg` builds for the Vega Virtual Device. The Devpost story has an Open Source section and a "No Vega Fire TV?" pointer to it. The Vega Virtual Device has no Appstore, so the store download only works on a real Vega Fire TV.
- **Phone page and relay fixes, deployed 2026-10-19** (the TV build stays 1.1.0): the status pill no longer reads mirrored on the front camera; when the TV ends a workout the relay sends `session-done` and the phone goes back to its start screen ("Workout done", one tap to rejoin); Scan QR code shows only after leaving a workout; with nobody in view the phone sends empty frames, so the TV keeps the pairing instead of going back to the QR screen. Checks: `infra/e2e-session-done.mjs`, `infra/e2e.mjs`.
- **Judges' deck:** uploaded to Additional info (`spotter-judges-deck.pdf`). It doesn't mention pose-reps; fine for a Spotter deck.
- Between-set AI line after half reps: fixed and **deployed 2026-10-09** (live: 7/8 depth lines, 5/6 fade lines pass; a miss keeps the plain line). The demo video predates it: its first rest shows the plain card, the second the AI card.

## Optional extras (no deadline, do them if there's time)

- **Re-recorded demo take:** the video's first rest shows the plain Coach card because it was recorded before the AI-line fix. A new take would show "✨ AI" there too. The local tooling re-cuts and keeps the narration in sync, but YouTube can't replace a file: a new upload gets a new URL, which must then be updated on Devpost (and set to Public).
- **Newer rest screenshot for the Appstore:** see "Next store update" above.

## Before submitting to Devpost (from the Devpost FAQ, 2026-10-07)

- **Hardware:** the Vega Virtual Device is enough for submission and judging; a physical Fire TV isn't required.
- **Keep the AWS stack running through judging (Nov 9-20).** Judges pair a phone through the relay, so don't tear down SpotterRelay before Nov 21. It's pay-per-request (Lambda, API Gateway, DynamoDB), so idle cost is near zero.
- **AWS credits:** no longer available (Devpost ran out of codes on 2026-10-07).
- **Deploying:** the AWS CLI uses `aws login` sessions, which expire; run it before `npm run deploy` in `infra/`.
- **Video footage:** the AI clips are our own generations and every app screen is a real capture, so no third-party media rights to clear.

## Waiting: AWS Support case 179076143400741 (Bedrock and CloudFront blocked)

**2026-10-15:** AWS denied CloudFront (an account ramp-up limit; they suggest waiting for the next billing cycle). CloudFront isn't needed (the site runs on a Lambda URL). The reply didn't address Bedrock, which is still blocked (Nova Lite Converse returns "Operation not allowed" in eu-central-1 and us-east-1). I reopened the case the same day to ask about Bedrock specifically. Plan to submit on Cloudflare Workers AI unless AWS enables it before Oct 23.

Opened 2026-09-30, followed up 2026-10-01, escalated through AWS Support on Reddit 2026-10-04. Reddit's answer: no updates over social media; the team will reply on the case thread with questions and next steps. Follow up on the case itself if there's no reply. When Bedrock is enabled: switch `COACH_PROVIDER` to `bedrock` in `infra/stack.ts`, deploy, and run `infra/e2e-coach.mjs`.
