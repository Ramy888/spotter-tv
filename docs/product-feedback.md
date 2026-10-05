# Product feedback: Spotter

Spotter is AI form coaching on Fire TV: the phone tracks your pose, an AWS relay carries the keypoints, and a **Vega OS** app counts reps, cues your form, talks to you by name, and coaches you after the set. Entered in the **Fire TV track (Vega OS)** with the **AWS Builder** mini challenge.

Every Amazon tool, SDK and API we used gets the same five points: **used for**, **worked well**, **needs work**, **onboarding (zero to hello world)**, and **would we build with it again, and why**. Detailed reproductions are in [`friction-log.md`](friction-log.md) (14 entries), referenced below as "FL n".

---

## Fire TV / Vega

### Vega SDK, CLI and Vega Virtual Device

SDK 0.24.12112, CLI 1.4.2, on an M4 MacBook Pro.

- **Used for:** building, installing and running the TV app; the Virtual Device as our only TV; scripted remote input (`inputd-cli`) to test D-pad navigation from the command line; release builds for the Appstore.
- **Worked well:**
  - `vega run-app`, `vega device install-app` and `launch-app` are quick and scriptable, so the build-install-run loop is easy to automate.
  - The Virtual Device is stable over long sessions and keeps app data across stop/start.
  - `inputd-cli button_press` and `send_text` let us test focus and text entry without touching the remote. That was the single most useful tool for TV UX work.
  - The Virtual Device reaches both the host and the internet with no setup (FL 4).
  - `react-native build-vega --build-type Release --target … --build-number …` made per-architecture store builds easy.
- **Needs work:**
  - The build breaks on project paths with spaces, with an error that hides the cause (FL 1, high).
  - JavaScript `console.log` output is suppressed in `vega device start-log-stream`, so we debugged from screenshots (FL 8).
  - `inputd-cli` doesn't list its key names (FL 10).
  - `vega device run-cmd` can fail right after the device reports ready (FL 3).
  - `vega run-app` wipes app data, unlike `install-app`, and nothing documents it (FL 13).
  - The installer's unattended mode and install path are undocumented (FL 2). Our internal disk was 98% full, so the SDK had to go on an external drive.
  - The on-device `screenshooter` tool exists but fails with "No running instances of com.amazon.dev.shell.service found". Store screenshots had to be cropped from the Mac window instead.
- **Onboarding (zero to hello world):** the same day. The installer needed a symlink to put the SDK on an external drive (FL 2), `vega project generate -t helloWorld` worked, and the first build failed only because the folder name had spaces (FL 1). After renaming the folder, hello world ran on the Virtual Device. The samples (`react-native-multi-tv-app-sample`, `vega-video-sample`, `vega-audio-sample`) were the best documentation.
- **Would build with it again:** yes. The CLI is fast and scriptable, and the Virtual Device is good enough to build a whole app with no TV hardware. Fixing the path bug and the log suppression would remove most of the day-one friction.

### React Native for Vega

React Native 0.83 through `@amazon-devices/react-native-kepler`.

- **Used for:** the whole TV app: 6 screens, D-pad focus, animations, a WebSocket client, and timers for sets and rest.
- **Worked well:**
  - Standard React Native, Jest and TypeScript just worked. Our 128 tests run on the host with no device.
  - TV focus (`hasTVPreferredFocus`, focus and blur events) behaved predictably, including D-pad Down landing on the nearest control.
  - The `Animated` API on the native driver was smooth for celebrations and stickers.
  - Bundled images (`require('…/x.jpg')`) and custom fonts (file name = family name) worked as documented.
- **Needs work:**
  - **WebSocket:** occasionally delivers one message as two `onmessage` events, which crashed a naive `JSON.parse` (FL 9, high). We wrote a reassembling reader.
  - **No SVG:** our progress ring and QR code are drawn with rotated and positioned Views. It works, but an SVG or Canvas primitive would help.
  - **`TextInput`:** clips the bottom of large text when sized by padding (FL 14). The Virtual Device shows no on-screen keyboard, so typing a name from the remote can't be tested there (FL 11). We added name entry from the phone as a fallback.
- **Onboarding (zero to hello world):** immediate for a React Native developer. The helloWorld template is a normal React Native project, so our own first screens ran on the Virtual Device the same day.
- **Would build with it again:** yes. Reusing React Native skills, libraries and tests on a TV is the strongest part of Vega.

### Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)

- **Used for:** anonymous player profiles (up to 4 per TV), names, rest preferences and per-exercise progress, with no account.
- **Worked well:** a drop-in for the community package through an npm alias, with its official Jest mock. Data survived app restarts, Virtual Device reboots and app updates via `install-app`.
- **Needs work:** the module also has to be declared in `manifest.toml` (`[[needs.module]]`), which is easy to miss. A build-time check that the import and the manifest match would help.
- **Onboarding (zero to hello world):** one npm install (an alias), one manifest line, and the standard `getItem`/`setItem` API.
- **Would build with it again:** yes. It's the simplest way to keep user data on the device, which let us ship with no accounts and no personal data in the cloud.

### Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`

- **Used for:** playing the coach's voice clips (MP3 over HTTPS) on the TV.
- **Worked well:** the API (`initialize`, set `src`, `play`, then the `ended` and `error` events) is small and familiar from the web. It let us queue clips and fall back to the phone's speaker on errors.
- **Needs work:** most of the docs are about video; audio-only playback was clearest in `vega-audio-sample`, including which `[wants]` services the manifest needs. We couldn't confirm audible output on the Virtual Device from a script, since nothing in the CLI reports what's playing. A short audio-only guide, and audio state in the device logs, would help.
- **Onboarding (zero to hello world):** working once we found `vega-audio-sample`; before that, the video-centred guides made audio-only playback look harder than it is.
- **Would build with it again:** yes. A web-like player API on a TV is exactly right; it only needs audio-first docs.

### Amazon Appstore Developer Console (Vega app submission)

- **Used for:** creating the app, uploading the `.vpkg`, targeting Vega Fire TVs, the content rating and privacy questionnaires, the listing, images, and submitting for review.
- **Worked well:**
  - A clear four-step flow (upload, target, details, review) with autosave, so nothing was lost between sessions.
  - Device targeting is automatic: the uploaded armv7 package was matched to the three Vega Fire TVs (Fire TV Stick 4K Select, Stick HD 2nd generation, Stick 4K).
  - The review page blocks problems before submission, for example "This VPKG currently supports no devices".
  - The privacy questionnaire (per data type: collected, transferred, purpose) is specific and fast.
- **Needs work:**
  - **Category bug:** picking a subcategory under Health & Fitness ("Workout Guides", "Exercise Motivation") saves the category as **Sports**. Three attempts gave the same result.
  - **Architectures:** the console accepted an aarch64 package even though no Vega device uses it, and only flagged it on the final review page. The submission guide doesn't say which architecture Vega devices need (armv7).
  - **Build numbers:** every uploaded file needs a unique build number ("The build numbers of all uploaded App files in an app must be unique"). For multiple architectures of one release, that should be documented, or handled automatically.
  - Some side-navigation links and the Next button sometimes didn't respond to a click; clicking again later worked.
- **Onboarding (zero to hello world):** from "account review is complete" to a full draft in one sitting, once the release build and images were ready.
- **Would build with it again:** yes. The flow is clear and the review page catches real problems; the category bug and the architecture guidance are the main things to fix.

### Amazon Developer account and hackathon onboarding

- **Used for:** the developer account (Vega SDK access, Appstore submission) and the $150 AWS credits.
- **Worked well:** ID verification and the credit request were both approved without follow-up questions.
- **Needs work:** the Alexa+ track's MCP Toolkit turned out to be US-only and partner-only, which we only found on the product page (FL 5). Saying so on the hackathon page would save entrants a day.
- **Onboarding (zero to hello world):** sign-up, ID verification, then the console, with no blockers.
- **Would build with it again:** yes.

---

## AWS (AWS Builder mini challenge)

### How we use AWS

| Service | What for |
|---|---|
| **API Gateway WebSocket API** | Real-time link between phone and TV: pairing, about 15 pose frames per second, set and rest progress, coach and voice messages. Throttled per stage. |
| **AWS Lambda** (Node 22, ARM) | The relay (pairing, routing, validation, coach requests, name clips) and the site function that serves the phone page, privacy page and voice clips through a **function URL** |
| **Amazon DynamoDB** | Sessions and connections with **TTL**; conditional writes for one-phone-per-session and rate limits; a daily Polly quota counter; cached name clips |
| **Amazon Polly** (Matthew, neural) | 103 pre-made coach clips (counts, cues, praise, rest and set lines), plus 5 personal clips per player name made on demand ("Let's go, Ramy!") |
| **AWS Systems Manager Parameter Store** | SecureString shared secret between the relay and the AI coach Worker |
| **AWS CDK** | The whole stack as code (`infra/stack.ts`) |
| **CloudWatch Logs** | Relay and site logs with one-week retention |
| **Amazon Bedrock** | Planned for the AI coach. Blocked on our account (below). |
| **Amazon CloudFront** | Planned for the phone page. Blocked on our account (below). |

### API Gateway WebSocket + Lambda + DynamoDB

- **Used for:** the relay between the phone and the TV, and everything stateful (sessions, rate limits, cached clips).
- **Worked well:** 88 ms median phone-to-TV latency through the relay (169 ms p95), no servers, and a few cents of cost. Conditional writes made pairing and rate limits safe across Lambda instances with no extra infrastructure.
- **Needs work:** the 10-minute idle timeout on WebSocket connections isn't obvious. We added a keepalive after the TV's pairing code went stale while someone fetched their phone.
- **Onboarding (zero to hello world):** the first relay (connect, host, forward) was deployed the same day we started on AWS.
- **Would build with it again:** yes. A serverless WebSocket relay is the right shape for a living-room app that is idle most of the day.

### Amazon Polly

- **Used for:** every word the coach says, including each player's name.
- **Worked well:** neural Matthew sounds like a real coach, pronounces names well (we checked "Ramy" by ear), and a name's 5 clips are ready in about 2 seconds. Caching clips in DynamoDB keeps cost near zero.
- **Needs work:** nothing blocking. A batch request (several phrases in one call) would simplify making a name's clips.
- **Onboarding (zero to hello world):** one CLI command produced the first clip.
- **Would build with it again:** yes. It turned a silent rep counter into a coach.

### AWS CDK

- **Used for:** the whole stack: API Gateway, Lambdas, DynamoDB, IAM, logs, function URL.
- **Worked well:** fast iteration, and the diff before each deploy made security reviews easy: we could see exactly which IAM permissions changed.
- **Needs work:** when the CLI session has expired, CDK reports "Unable to resolve AWS account" rather than "please log in again".
- **Onboarding (zero to hello world):** the first relay stack deployed cleanly; the only failed deploys came from the CloudFront account block and expired CLI sessions.
- **Would build with it again:** yes. Every deploy was a reviewable diff.

### `aws login` (CLI 2.37)

- **Used for:** signing the CLI and CDK in to the account with the hackathon credits.
- **Worked well:** browser sign-in instead of long-lived keys, so no keys ever touched the repo.
- **Needs work:** it succeeds and then reports "Unable to locate credentials" when no default region is set (FL 6). Sessions also expire daily, which interrupts long builds.
- **Onboarding (zero to hello world):** blocked until we found the missing region setting.
- **Would build with it again:** yes, for the security win, once the region error is clearer.

### Amazon Bedrock: blocked

- **Used for:** planned for the AI coach's rewrite of the workout summary.
- **What happened:** every model, including Amazon Nova Lite, returns `ValidationException: Operation not allowed` in eu-central-1 and us-east-1. The Anthropic use-case form returns "not authorized, create a support case" (FL 7). Support case 179076143400741 has been open since 2026-09-30; AWS Support on Reddit confirmed the team is reviewing it.
- **Needs work:** a clear "your account is blocked because…" message, with the fix, would have saved days.
- **Onboarding (zero to hello world):** never reached; blocked at the first call.
- **Would build with it again:** yes, when it's enabled. The coach already sits behind a provider switch (`COACH_PROVIDER`), so moving to Bedrock is one setting and a deploy.

### Amazon CloudFront: blocked

- **Used for:** planned for serving the phone page over HTTPS.
- **What happened:** "Your account must be verified before you can add new CloudFront resources" (FL 12). We serve the page from a Lambda function URL instead.
- **Would build with it again:** yes, once the account is verified.

### AWS Support (Basic)

- **Needs work:** the hackathon depends on AWS services, but a blocked account has no fast path. A hackathon support channel, or pre-verifying accounts that receive hackathon credits, would remove this risk.

---

## Feature requests

| Request | Why | Urgency |
|---|---|---|
| Show `console.log` in `vega device start-log-stream` for debug builds | We debugged from screenshots | High |
| On-screen keyboard in the Vega Virtual Device | Text entry can't be tested without hardware | High |
| Complete WebSocket messages on Vega | Split messages crash apps that parse directly | High |
| Fix the Appstore category saving as Sports | Fitness apps end up listed in the wrong category | High |
| Account-level block reasons in the AWS console (Bedrock, CloudFront) | We lost days to a generic "Operation not allowed" | High |
| Say which architecture Vega devices need (armv7), and allow one build number across architectures | Avoid a rejected aarch64 upload and build-number juggling | Medium |
| SVG or Canvas primitive in React Native for Vega | Rings, charts and QR codes need workarounds today | Medium |
| `vega run-app --keep-data`, documented data behavior | Avoid false "persistence bugs" | Medium |
| A working screenshot command for the Virtual Device | Store screenshots at the right size | Medium |
| Camera or pose input on Fire TV from a paired phone, as a platform feature | A phone-as-camera pattern would help fitness, games and accessibility apps | Nice to have |

## Other tools, for context

- **Cloudflare Workers AI** (Qwen3 30B by default): stands in for Bedrock as the coach's rewrite model, behind a shared-secret Worker. The rewrite is used only if it passes our validation (no invented numbers, no banned topics). We also used FLUX.1 schnell once, offline, to make the 12 reward stickers, which were reviewed by hand before bundling (we made 21 and rejected 8).
- **MediaPipe Pose (Tasks Vision, lite model):** on-phone pose tracking in the browser, 48 fps on an iPhone 13.
- **Kiro:** not used.
