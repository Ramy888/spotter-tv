# Outstanding

Open work, newest first. Remove an item when it's done.

## Before submitting to Devpost (from the Devpost FAQ, 2026-10-07)

- **Repo:** make https://github.com/Ramy888/spotter-tv public (it's private now). `LICENSE` (MIT) is already there, which is all a public repo needs. If it has to stay private instead, add the reviewers as collaborators close to submitting (invites expire after 7 days): knmeiss, giolaq, anishamalde, mosesroth, emersonsklar, and testing@devpost.com.
- **Hardware:** the Vega Virtual Device is enough for submission and judging; a physical Fire TV isn't required.
- **Keep the AWS stack running through judging (Nov 9-20).** Judges pair a phone through the relay, so don't tear down SpotterRelay before Nov 21. It's pay-per-request (Lambda, API Gateway, DynamoDB), so idle cost is near zero.
- **AWS credits:** $150 per person; request through the form on the Devpost Resources page if not done yet.
- **Video footage:** the AI clips are our own generations and every app screen is a real capture, so no third-party media rights to clear.

## Waiting: AWS Support case 179076143400741 (Bedrock and CloudFront blocked)

Opened 2026-09-30, followed up 2026-10-01, escalated through AWS Support on Reddit 2026-10-04. Reddit's answer: no updates over social media; the team will reply on the case thread with questions and next steps. Follow up on the case itself if there's no reply. When Bedrock is enabled: switch `COACH_PROVIDER` to `bedrock` in `infra/stack.ts`, deploy, and run `infra/e2e-coach.mjs`.

## Store update for the new logo (don't submit yet)

The logo is now "Level up" (three rising chevrons) everywhere in the repo, the TV app and the phone page (2026-10-04). Spotter 1.0.0 went **live on the Amazon Appstore on 2026-10-07** with the old logo; the update goes in as a new version ("Add upcoming version" in the console). When you decide to update the store listing:
- upload the release build with build number 2 (`tv-app/manifest.toml`), from `tv-app/build/armv7-release/`;
- replace the 1280×720 app icon, background, featured logo and background, and the 512 and 114 px icons with the files in `brand/png/`;
- replace the 6 screenshots with `brand/store/` (retaken with the new mark).
