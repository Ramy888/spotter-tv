# Outstanding

Open work, newest first. Remove an item when it's done.

## Next store update: rest screenshot with the Coach card

The 1.1.0 screenshots predate the between-set coach: `brand/store/screenshot-5-rest.png` shows the plain countdown. Retake it on the Vega Virtual Device with the Coach card (do a few half squats in set 1 so the focus is "Full depth"), at 1920×1080 with no transparency, and upload it to both screenshot sections (Fire TV and tablet) with the next version. Don't cancel the 1.1.0 review for it.

## Devpost submission: submitted 2026-10-09 (editable until Oct 23)

- **Open Source mini challenge: resolved 2026-10-15.** On Devpost Discussions (thread 45547), Emerson (Amazon) ruled that the primary-track repo doesn't count. We built a separate library, **pose-reps** (https://github.com/Ramy888/pose-reps): MIT, 19 tests, CI green, browser demo. **Public since 2026-10-19**, together with spotter-tv. It's the rep-counting engine, extracted from Spotter and generalized. Both Devpost OSS URLs now point to pose-reps, and the description was rewritten. Spotter's own code is unchanged (the judged build stays frozen).

- Submission 1205489 submitted. Answers are also in `docs/devpost-additional-info.md`. Video https://youtu.be/9C-6zbNSxhQ, Appstore https://www.amazon.com/dp/B0HLY8788C.
- YouTube video is Public (2026-10-09), 1:52 long (under the 3:00 limit). AI shots were made with Google Flow, and there's no music, so no third-party media to clear.
- **Repo is public since 2026-10-19** (spotter-tv and pose-reps; history checked with gitleaks first, no secrets).
- Between-set AI line after half reps: fixed and **deployed 2026-10-09** (live: 7/8 depth lines, 5/6 fade lines pass; a miss keeps the plain line). The demo video predates it: its first rest shows the plain card, the second the AI card.

## Optional extras (no deadline, do them if there's time)

- **Re-recorded demo take:** the video's first rest shows the plain Coach card because it was recorded before the AI-line fix. A new take would show "✨ AI" there too. The local tooling re-cuts and keeps the narration in sync, but YouTube can't replace a file: a new upload gets a new URL, which must then be updated on Devpost (and set to Public).
- **Short PDF deck for judges:** built 2026-10-14 (8 slides in the Arena look, ending on What's next with Train Together): https://claude.ai/artifact/6xNm3osH6Piky1yGD215F1. Left to do: export it as a PDF and upload it to Devpost's Additional info "Upload a File" field (judges only).
- **Newer rest screenshot for the Appstore:** see "Next store update" above.

## Before submitting to Devpost (from the Devpost FAQ, 2026-10-07)

- **Hardware:** the Vega Virtual Device is enough for submission and judging; a physical Fire TV isn't required.
- **Keep the AWS stack running through judging (Nov 9-20).** Judges pair a phone through the relay, so don't tear down SpotterRelay before Nov 21. It's pay-per-request (Lambda, API Gateway, DynamoDB), so idle cost is near zero.
- **AWS credits:** $150 per person; request through the form on the Devpost Resources page if not done yet.
- **Video footage:** the AI clips are our own generations and every app screen is a real capture, so no third-party media rights to clear.

## Waiting: AWS Support case 179076143400741 (Bedrock and CloudFront blocked)

**2026-10-15:** AWS denied CloudFront (an account ramp-up limit; they suggest waiting for the next billing cycle). CloudFront isn't needed (the site runs on a Lambda URL). The reply didn't address Bedrock, which is still blocked (Nova Lite Converse returns "Operation not allowed" in eu-central-1 and us-east-1). I reopened the case the same day to ask about Bedrock specifically. Plan to submit on Cloudflare Workers AI unless AWS enables it before Oct 23.

Opened 2026-09-30, followed up 2026-10-01, escalated through AWS Support on Reddit 2026-10-04. Reddit's answer: no updates over social media; the team will reply on the case thread with questions and next steps. Follow up on the case itself if there's no reply. When Bedrock is enabled: switch `COACH_PROVIDER` to `bedrock` in `infra/stack.ts`, deploy, and run `infra/e2e-coach.mjs`.
