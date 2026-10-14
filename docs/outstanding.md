# Outstanding

Open work, newest first. Remove an item when it's done.

## Next store update: rest screenshot with the Coach card

The 1.1.0 screenshots predate the between-set coach: `brand/store/screenshot-5-rest.png` shows the plain countdown. Retake it on the Vega Virtual Device with the Coach card (do a few half squats in set 1 so the focus is "Full depth"), at 1920×1080 with no transparency, and upload it to both screenshot sections (Fire TV and tablet) with the next version. Don't cancel the 1.1.0 review for it.

## Devpost submission: submitted 2026-10-09 (editable until Oct 23)

- Submission 1205489 submitted. Answers are also in `docs/devpost-additional-info.md`. Video https://youtu.be/9C-6zbNSxhQ, Appstore https://www.amazon.com/dp/B0HLY8788C.
- YouTube video is Public (2026-10-09), 1:52 long (under the 3:00 limit). AI shots were made with Google Flow, and there's no music, so no third-party media to clear.
- **Repo goes public on 2026-10-19 or 10-20** (3-4 days before the Oct 23 deadline), which the Open Source mini challenge needs (answered Yes). Until then it's private, shared with knmeiss, giolaq, anishamalde, mosesroth, emersonsklar and devposttesting (testing@devpost.com), all with write access, which personal repos can't avoid. Invites expire after 7 days; once the repo is public they no longer matter. Once public, optionally add the GitHub link back to "Try it out" on Devpost.
- Between-set AI line after half reps: fixed and **deployed 2026-10-09** (live: 7/8 depth lines, 5/6 fade lines pass; a miss keeps the plain line). The demo video predates it: its first rest shows the plain card, the second the AI card.

## Optional extras (no deadline, do them if there's time)

- **Re-recorded demo take:** the video's first rest shows the plain Coach card because it was recorded before the AI-line fix. A new take would show "✨ AI" there too. The local tooling re-cuts and keeps the narration in sync, but YouTube can't replace a file: a new upload gets a new URL, which must then be updated on Devpost (and set to Public).
- **Short PDF deck for judges:** built 2026-10-14 (8 slides in the Arena look, ending on What's next with Train Together): https://claude.ai/artifact/6xNm3osH6Piky1yGD215F1. Left to do: export it as a PDF and upload it to Devpost's Additional info "Upload a File" field (judges only).
- **Newer rest screenshot for the Appstore:** see "Next store update" above.

## Before submitting to Devpost (from the Devpost FAQ, 2026-10-07)

- **Repo:** make https://github.com/Ramy888/spotter-tv public (it's private now). `LICENSE` (MIT) is already there, which is all a public repo needs. If it has to stay private instead, add the reviewers as collaborators close to submitting (invites expire after 7 days): knmeiss, giolaq, anishamalde, mosesroth, emersonsklar, and testing@devpost.com.
- **Hardware:** the Vega Virtual Device is enough for submission and judging; a physical Fire TV isn't required.
- **Keep the AWS stack running through judging (Nov 9-20).** Judges pair a phone through the relay, so don't tear down SpotterRelay before Nov 21. It's pay-per-request (Lambda, API Gateway, DynamoDB), so idle cost is near zero.
- **AWS credits:** $150 per person; request through the form on the Devpost Resources page if not done yet.
- **Video footage:** the AI clips are our own generations and every app screen is a real capture, so no third-party media rights to clear.

## Waiting: AWS Support case 179076143400741 (Bedrock and CloudFront blocked)

Opened 2026-09-30, followed up 2026-10-01, escalated through AWS Support on Reddit 2026-10-04. Reddit's answer: no updates over social media; the team will reply on the case thread with questions and next steps. Follow up on the case itself if there's no reply. When Bedrock is enabled: switch `COACH_PROVIDER` to `bedrock` in `infra/stack.ts`, deploy, and run `infra/e2e-coach.mjs`.
