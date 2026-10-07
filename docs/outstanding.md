# Outstanding

Open work, newest first. Remove an item when it's done.

## Waiting: Appstore review of 1.1.0

Submitted 2026-10-07 (build 3: the between-set coach, the counting fixes, the Level up logo and new store images). The console estimates it goes live by 2026-10-12, 11:00 PDT. Then update README and devpost.md ("live", version 1.1.0).

## Next store update: rest screenshot with the Coach card

The 1.1.0 screenshots predate the between-set coach: `brand/store/screenshot-5-rest.png` shows the plain countdown. Retake it on the Vega Virtual Device with the Coach card (do a few half squats in set 1 so the focus is "Full depth"), at 1920×1080 with no transparency, and upload it to both screenshot sections (Fire TV and tablet) with the next version. Don't cancel the 1.1.0 review for it.

## Before submitting to Devpost (from the Devpost FAQ, 2026-10-07)

- **Repo:** make https://github.com/Ramy888/spotter-tv public (it's private now). `LICENSE` (MIT) is already there, which is all a public repo needs. If it has to stay private instead, add the reviewers as collaborators close to submitting (invites expire after 7 days): knmeiss, giolaq, anishamalde, mosesroth, emersonsklar, and testing@devpost.com.
- **Hardware:** the Vega Virtual Device is enough for submission and judging; a physical Fire TV isn't required.
- **Keep the AWS stack running through judging (Nov 9-20).** Judges pair a phone through the relay, so don't tear down SpotterRelay before Nov 21. It's pay-per-request (Lambda, API Gateway, DynamoDB), so idle cost is near zero.
- **AWS credits:** $150 per person; request through the form on the Devpost Resources page if not done yet.
- **Video footage:** the AI clips are our own generations and every app screen is a real capture, so no third-party media rights to clear.

## Waiting: AWS Support case 179076143400741 (Bedrock and CloudFront blocked)

Opened 2026-09-30, followed up 2026-10-01, escalated through AWS Support on Reddit 2026-10-04. Reddit's answer: no updates over social media; the team will reply on the case thread with questions and next steps. Follow up on the case itself if there's no reply. When Bedrock is enabled: switch `COACH_PROVIDER` to `bedrock` in `infra/stack.ts`, deploy, and run `infra/e2e-coach.mjs`.
