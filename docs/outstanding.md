# Outstanding

Open work, newest first. Remove an item when it's done.

## Waiting: AWS Support case 179076143400741 (Bedrock and CloudFront blocked)

Opened 2026-09-30, followed up 2026-10-01, escalated through AWS Support on Reddit 2026-10-04. Reddit's answer: no updates over social media; the team will reply on the case thread with questions and next steps. Follow up on the case itself if there's no reply. When Bedrock is enabled: switch `COACH_PROVIDER` to `bedrock` in `infra/stack.ts`, deploy, and run `infra/e2e-coach.mjs`.

## Store update for the new logo (don't submit yet)

The logo is now "Level up" (three rising chevrons) everywhere in the repo, the TV app and the phone page (2026-10-04). Spotter was submitted to the Amazon Appstore with the old logo. When you decide to update the store listing:
- upload the release build with build number 2 (`tv-app/manifest.toml`), from `tv-app/build/armv7-release/`;
- replace the 1280×720 app icon, background, featured logo and background, and the 512 and 114 px icons with the files in `brand/png/`;
- replace the 6 screenshots with `brand/store/` (retaken with the new mark).
