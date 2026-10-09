# Devpost submission: "Additional info" answers

Copy source for the Additional info step of the Devpost form. The form drops everything if it is saved with a required field empty, so fill the personal fields first.

## Short fields

| Field | Answer |
|---|---|
| Submitter Type | Individual |
| Organization Name | N/A |
| Submitter Country of Residence | (you choose) |
| Canada province | N/A unless you live in Canada |
| Primary Track | Fire TV |
| Code repository URL | https://github.com/Ramy888/spotter-tv (make it public first, or share with testing@devpost.com and @AmazonAppDev) |
| New or existing | New (first commit 2026-09-30) |
| AWS Builder Mini Challenge | Yes |
| Open Source Mini Challenge | Yes |
| OSS Contribution URL | https://github.com/Ramy888/spotter-tv |
| OSS Project Repository URL | https://github.com/Ramy888/spotter-tv |
| OSS GitHub Username | Ramy888 |
| Friction Log (link) | https://github.com/Ramy888/spotter-tv/blob/main/docs/friction-log.md |
| Declarations (3 checkboxes), learning level, AI value | (you choose) |

## AWS Builder: which AWS services and how

Spotter's whole backend is AWS serverless, defined as code with AWS CDK (infra/stack.ts in the repo):

- Amazon API Gateway WebSocket API: the real-time link between the phone and the Fire TV. Pairs them with a 6-character code and carries about 15 pose frames per second: 88 ms median phone-to-TV (169 ms p95). Throttled per stage.
- AWS Lambda (Node 22, ARM): the relay (pairing, routing, validation, AI coach requests, name clips), plus a site function behind a Lambda function URL that serves the phone page, the privacy page and the voice clips.
- Amazon DynamoDB: sessions and connections with TTL; conditional writes for one-phone-per-session and rate limits across Lambda instances; a daily Polly quota; cached name clips and coach lines.
- Amazon Polly (Matthew, neural): every word the coach says. About 100 pre-made coach clips (counts, cues, praise, rest and set lines), 5 personal clips per player name made on demand ("Let's go, Ramy!"), and the between-set coach's line, voiced live during the rest.
- AWS Systems Manager Parameter Store (SecureString): the shared secret between the relay and the AI rewrite worker.
- Amazon CloudWatch Logs: relay and site logs, one-week retention.
- Amazon Bedrock: built in behind a provider switch (COACH_PROVIDER) for the AI coach, but our account is blocked (support case 179076143400741), so Cloudflare Workers AI stands in for now. Switching is one setting and a deploy.

Documented in the README (architecture diagram) and docs/product-feedback.md (what worked, what needs work, per service).

## Open Source: what you did, how it works, why it matters

Spotter is a new open-source project (MIT license), created during the hackathon (first commit 2026-09-30): https://github.com/Ramy888/spotter-tv

What it is: a Fire TV fitness coach. A phone in any browser tracks your body on-device (MediaPipe) and sends only body points through an AWS WebSocket relay to a Vega OS app (React Native for Vega), which counts full-depth reps, cues your form out loud by name, coaches you between sets, and sums up the workout. It's live on the Amazon Appstore.

What's in the repo: the complete TV app with 128 host-run tests, the phone web page, the AWS CDK stack and Lambda relay with tests, the voice-clip generator, the brand assets, a 14-entry friction log, and the scripts that recorded the demo video on the Vega Virtual Device.

Why it matters: it's a reusable, documented pattern for "phone as camera, TV as screen" apps (fitness, games, accessibility), plus pieces other Vega developers can lift directly: a WebSocket reader that survives split messages on Vega, remote-first focus components, angle-based rep detectors, a serverless pairing relay, and a validator that stops an AI rewrite from inventing numbers.

## Feature Requests

- Show `console.log` in `vega device start-log-stream` for debug builds. Why: We debugged from screenshots. Priority: Critical
- On-screen keyboard in the Vega Virtual Device. Why: Text entry can't be tested without hardware. Priority: Critical
- Complete WebSocket messages on Vega. Why: Split messages crash apps that parse directly. Priority: Critical
- Fix the Appstore category saving as Sports. Why: Fitness apps end up listed in the wrong category. Priority: Critical
- Account-level block reasons in the AWS console (Bedrock, CloudFront). Why: We lost days to a generic "Operation not allowed". Priority: Critical
- Say which architecture Vega devices need (armv7), and allow one build number across architectures. Why: Avoid a rejected aarch64 upload and build-number juggling. Priority: Important
- SVG or Canvas primitive in React Native for Vega. Why: Rings, charts and QR codes need workarounds today. Priority: Important
- `vega run-app --keep-data`, documented data behavior. Why: Avoid false "persistence bugs". Priority: Important
- A working screenshot command for the Virtual Device. Why: Store screenshots at the right size. Priority: Important
- Camera or pose input on Fire TV from a paired phone, as a platform feature. Why: A phone-as-camera pattern would help fitness, games and accessibility apps. Priority: Nice-to-have

## Feedback Q1: tools, APIs, SDKs used and for what

**Vega SDK, CLI and Vega Virtual Device**: building, installing and running the TV app; the Virtual Device as our only TV; scripted remote input (`inputd-cli`) to test D-pad navigation from the command line; release builds for the Appstore.

**React Native for Vega**: the whole TV app: 6 screens, D-pad focus, animations, a WebSocket client, and timers for sets and rest.

**Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)**: anonymous player profiles (up to 4 per TV), names, rest preferences and per-exercise progress, with no account.

**Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`**: playing the coach's voice clips (MP3 over HTTPS) on the TV.

**Amazon Appstore Developer Console (Vega app submission)**: creating the app, uploading the `.vpkg`, targeting Vega Fire TVs, the content rating and privacy questionnaires, the listing, images, and submitting for review.

**Amazon Developer account and hackathon onboarding**: the developer account (Vega SDK access, Appstore submission) and the $150 AWS credits.

**API Gateway WebSocket + Lambda + DynamoDB**: the relay between the phone and the TV, and everything stateful (sessions, rate limits, cached clips).

**Amazon Polly**: every word the coach says, including each player's name.

**AWS CDK**: the whole stack: API Gateway, Lambdas, DynamoDB, IAM, logs, function URL.

**`aws login` (CLI 2.37)**: signing the CLI and CDK in to the account with the hackathon credits.

**Amazon Bedrock: blocked**: planned for the AI coach's rewrite of the workout summary.

**Amazon CloudFront: blocked**: planned for serving the phone page over HTTPS.

**Other tools:**
- **Cloudflare Workers AI** (Qwen3 30B by default): stands in for Bedrock as the coach's rewrite model, behind a shared-secret Worker. The rewrite is used only if it passes our validation (no invented numbers, no banned topics). We also used FLUX.1 schnell once, offline, to make the 12 reward stickers, which were reviewed by hand before bundling (we made 21 and rejected 8).
- **MediaPipe Pose (Tasks Vision, lite model):** on-phone pose tracking in the browser, 48 fps on an iPhone 13.
- **Kiro:** not used.

## Feedback Q2: what worked well

**Vega SDK, CLI and Vega Virtual Device**
- `vega run-app`, `vega device install-app` and `launch-app` are quick and scriptable, so the build-install-run loop is easy to automate.
- The Virtual Device is stable over long sessions and keeps app data across stop/start.
- `inputd-cli button_press` and `send_text` let us test focus and text entry without touching the remote. That was the single most useful tool for TV UX work.
- The Virtual Device reaches both the host and the internet with no setup (FL 4).
- `react-native build-vega --build-type Release --target … --build-number …` made per-architecture store builds easy.

**React Native for Vega**
- Standard React Native, Jest and TypeScript just worked. Our 128 tests run on the host with no device.
- TV focus (`hasTVPreferredFocus`, focus and blur events) behaved predictably, including D-pad Down landing on the nearest control.
- The `Animated` API on the native driver was smooth for celebrations and stickers.
- Bundled images (`require('…/x.jpg')`) and custom fonts (file name = family name) worked as documented.

**Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)**: a drop-in for the community package through an npm alias, with its official Jest mock. Data survived app restarts, Virtual Device reboots and app updates via `install-app`.

**Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`**: the API (`initialize`, set `src`, `play`, then the `ended` and `error` events) is small and familiar from the web. It let us queue clips and fall back to the phone's speaker on errors.

**Amazon Appstore Developer Console (Vega app submission)**
- A clear four-step flow (upload, target, details, review) with autosave, so nothing was lost between sessions.
- Device targeting is automatic: the uploaded armv7 package was matched to the three Vega Fire TVs (Fire TV Stick 4K Select, Stick HD 2nd generation, Stick 4K).
- The review page blocks problems before submission, for example "This VPKG currently supports no devices".
- The privacy questionnaire (per data type: collected, transferred, purpose) is specific and fast.

**Amazon Developer account and hackathon onboarding**: ID verification and the credit request were both approved without follow-up questions.

**API Gateway WebSocket + Lambda + DynamoDB**: 88 ms median phone-to-TV latency through the relay (169 ms p95), no servers, and a few cents of cost. Conditional writes made pairing and rate limits safe across Lambda instances with no extra infrastructure.

**Amazon Polly**: neural Matthew sounds like a real coach, pronounces names well (we checked "Ramy" by ear), and a name's 5 clips are ready in about 2 seconds. Caching clips in DynamoDB keeps cost near zero.

**AWS CDK**: fast iteration, and the diff before each deploy made security reviews easy: we could see exactly which IAM permissions changed.

**`aws login` (CLI 2.37)**: browser sign-in instead of long-lived keys, so no keys ever touched the repo.

## Feedback Q3: what needs work

**Vega SDK, CLI and Vega Virtual Device**
- The build breaks on project paths with spaces, with an error that hides the cause (FL 1, high).
- JavaScript `console.log` output is suppressed in `vega device start-log-stream`, so we debugged from screenshots (FL 8).
- `inputd-cli` doesn't list its key names (FL 10).
- `vega device run-cmd` can fail right after the device reports ready (FL 3).
- `vega run-app` wipes app data, unlike `install-app`, and nothing documents it (FL 13).
- The installer's unattended mode and install path are undocumented (FL 2). Our internal disk was 98% full, so the SDK had to go on an external drive.
- The on-device `screenshooter` tool exists but fails with "No running instances of com.amazon.dev.shell.service found". Store screenshots had to be cropped from the Mac window instead.

**React Native for Vega**
- **WebSocket:** occasionally delivers one message as two `onmessage` events, which crashed a naive `JSON.parse` (FL 9, high). We wrote a reassembling reader.
- **No SVG:** our progress ring and QR code are drawn with rotated and positioned Views. It works, but an SVG or Canvas primitive would help.
- **`TextInput`:** clips the bottom of large text when sized by padding (FL 14). The Virtual Device shows no on-screen keyboard, so typing a name from the remote can't be tested there (FL 11). We added name entry from the phone as a fallback.

**Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)**: the module also has to be declared in `manifest.toml` (`[[needs.module]]`), which is easy to miss. A build-time check that the import and the manifest match would help.

**Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`**: most of the docs are about video; audio-only playback was clearest in `vega-audio-sample`, including which `[wants]` services the manifest needs. We couldn't confirm audible output on the Virtual Device from a script, since nothing in the CLI reports what's playing. A short audio-only guide, and audio state in the device logs, would help.

**Amazon Appstore Developer Console (Vega app submission)**
- **Category bug:** picking a subcategory under Health & Fitness ("Workout Guides", "Exercise Motivation") saves the category as **Sports**. Three attempts gave the same result.
- **Architectures:** the console accepted an aarch64 package even though no Vega device uses it, and only flagged it on the final review page. The submission guide doesn't say which architecture Vega devices need (armv7).
- **Build numbers:** every uploaded file needs a unique build number ("The build numbers of all uploaded App files in an app must be unique"). For multiple architectures of one release, that should be documented, or handled automatically.
- Some side-navigation links and the Next button sometimes didn't respond to a click; clicking again later worked.

**Amazon Developer account and hackathon onboarding**: the Alexa+ track's MCP Toolkit turned out to be US-only and partner-only, which we only found on the product page (FL 5). Saying so on the hackathon page would save entrants a day.

**API Gateway WebSocket + Lambda + DynamoDB**: the 10-minute idle timeout on WebSocket connections isn't obvious. We added a keepalive after the TV's pairing code went stale while someone fetched their phone.

**Amazon Polly**: nothing blocking. A batch request (several phrases in one call) would simplify making a name's clips.

**AWS CDK**: when the CLI session has expired, CDK reports "Unable to resolve AWS account" rather than "please log in again".

**`aws login` (CLI 2.37)**: it succeeds and then reports "Unable to locate credentials" when no default region is set (FL 6). Sessions also expire daily, which interrupts long builds.

**Amazon Bedrock: blocked**: every model, including Amazon Nova Lite, returns `ValidationException: Operation not allowed` in eu-central-1 and us-east-1. The Anthropic use-case form returns "not authorized, create a support case" (FL 7). Support case 179076143400741 has been open since 2026-09-30; AWS Support on Reddit confirmed the team is reviewing it. A clear "your account is blocked because…" message, with the fix, would have saved days.

**Amazon CloudFront: blocked**: "Your account must be verified before you can add new CloudFront resources" (FL 12). We serve the page from a Lambda function URL instead.

**AWS Support (Basic)**: the hackathon depends on AWS services, but a blocked account has no fast path. A hackathon support channel, or pre-verifying accounts that receive hackathon credits, would remove this risk.

Full reproductions: docs/friction-log.md in the repo ("FL n" above).

## Feedback Q4: onboarding

**Vega SDK, CLI and Vega Virtual Device**: the same day. The installer needed a symlink to put the SDK on an external drive (FL 2), `vega project generate -t helloWorld` worked, and the first build failed only because the folder name had spaces (FL 1). After renaming the folder, hello world ran on the Virtual Device. The samples (`react-native-multi-tv-app-sample`, `vega-video-sample`, `vega-audio-sample`) were the best documentation.

**React Native for Vega**: immediate for a React Native developer. The helloWorld template is a normal React Native project, so our own first screens ran on the Virtual Device the same day.

**Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)**: one npm install (an alias), one manifest line, and the standard `getItem`/`setItem` API.

**Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`**: working once we found `vega-audio-sample`; before that, the video-centred guides made audio-only playback look harder than it is.

**Amazon Appstore Developer Console (Vega app submission)**: from "account review is complete" to a full draft in one sitting, once the release build and images were ready. Review was fast: submitted on 2026-10-04, live on 2026-10-07, passing primary, content policy and functionality validation with no back-and-forth.

**Amazon Developer account and hackathon onboarding**: sign-up, ID verification, then the console, with no blockers.

**API Gateway WebSocket + Lambda + DynamoDB**: the first relay (connect, host, forward) was deployed the same day we started on AWS.

**Amazon Polly**: one CLI command produced the first clip.

**AWS CDK**: the first relay stack deployed cleanly; the only failed deploys came from the CloudFront account block and expired CLI sessions.

**`aws login` (CLI 2.37)**: blocked until we found the missing region setting.

**Amazon Bedrock: blocked**: never reached; blocked at the first call.

## Feedback Q5: would you build with them again

Yes, all of them. Per tool:

**Vega SDK, CLI and Vega Virtual Device**: yes. The CLI is fast and scriptable, and the Virtual Device is good enough to build a whole app with no TV hardware. Fixing the path bug and the log suppression would remove most of the day-one friction.

**React Native for Vega**: yes. Reusing React Native skills, libraries and tests on a TV is the strongest part of Vega.

**Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)**: yes. It's the simplest way to keep user data on the device, which let us ship with no accounts and no personal data in the cloud.

**Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`**: yes. A web-like player API on a TV is exactly right; it only needs audio-first docs.

**Amazon Appstore Developer Console (Vega app submission)**: yes. The flow is clear and the review page catches real problems; the category bug and the architecture guidance are the main things to fix.

**Amazon Developer account and hackathon onboarding**: yes.

**API Gateway WebSocket + Lambda + DynamoDB**: yes. A serverless WebSocket relay is the right shape for a living-room app that is idle most of the day.

**Amazon Polly**: yes. It turned a silent rep counter into a coach.

**AWS CDK**: yes. Every deploy was a reviewable diff.

**`aws login` (CLI 2.37)**: yes, for the security win, once the region error is clearer.

**Amazon Bedrock: blocked**: yes, when it's enabled. The coach already sits behind a provider switch (`COACH_PROVIDER`), so moving to Bedrock is one setting and a deploy.

**Amazon CloudFront: blocked**: yes, once the account is verified.

## Which AI tools

Claude Code (Anthropic): coding partner for the TV app, the AWS relay, tests, reviews, and the demo-video tooling.
Cloudflare Workers AI (Llama 3.3 70B, Qwen3 30B, gpt-oss-120b): the in-app coach's rewrite model, standing in for Bedrock; every rewrite is validated (no invented numbers).
FLUX.1 schnell: the cartoon reward stickers (21 made, 8 rejected by hand).
Amazon Polly: the coach's voice.
Google Flow (Veo): the AI-generated living-room shot in the demo video (the app on its TV is a real capture).
HiggsField: the character reference image for the video.
Cartesia Sonic: the video narration, in my own cloned voice.
Kiro: not used.
