# Product feedback: Spotter

Spotter is AI form coaching on Fire TV: the phone tracks your pose, an AWS relay carries the keypoints, and a Vega OS app counts reps, cues your form, talks to you by name, and coaches you after the set. Entered in the **Fire TV track (Vega OS)** with the **AWS Builder** mini challenge.

This covers every Amazon tool, SDK and API we used, then AWS usage, feature requests, and the other tools for context. Detailed reproductions are in [`friction-log.md`](friction-log.md) (14 entries), referenced below as "FL n".

---

## Amazon Developer account and hackathon onboarding

- **Used for:** the developer account (Vega SDK access, future Appstore submission) and the $150 AWS credits.
- **Worked:** ID verification and the credit request were both approved before we needed them.
- **Needs work:** the Alexa+ track's MCP Toolkit turned out to be US-only and partner-only, which we only found on the product page (FL 5). Saying so on the hackathon page would save entrants a day.
- **Would use again:** yes.

## Vega SDK, CLI and Vega Virtual Device

SDK 0.24.12112, CLI 1.4.2, on an M4 MacBook Pro.

- **Used for:** building, installing and running the TV app; the Virtual Device as our only TV; scripted remote input (`inputd-cli`) to test D-pad navigation from the command line.
- **Worked well:**
  - `vega run-app`, `vega device install-app` and `launch-app` are quick and scriptable, so the build-install-run loop is easy to automate.
  - The Virtual Device is stable over long sessions and survives stop/start with app data intact.
  - `inputd-cli button_press` and `send_text` let us test focus and text entry without touching the remote. That was the single most useful tool for TV UX work.
  - The Virtual Device reaches both the host and the internet without setup (FL 4).
- **Needs work:**
  - The build breaks on project paths with spaces, with an error that hides the cause (FL 1, high).
  - JavaScript `console.log` output is suppressed in `vega device start-log-stream`, so we debugged from screenshots (FL 8).
  - `inputd-cli` doesn't list its key names (FL 10).
  - `vega device run-cmd` can fail right after the device reports ready (FL 3).
  - `vega run-app` wipes app data, unlike `install-app`, and nothing documents it (FL 13).
  - The installer's unattended mode and install path are undocumented (FL 2). We had 98% disk usage and needed the SDK on an external drive.
- **Onboarding:** good once installed. The samples (`react-native-multi-tv-app-sample`, `vega-video-sample`, `vega-audio-sample`) were the best documentation.
- **Would use again:** yes.

## React Native for Vega

React Native 0.83 through `@amazon-devices/react-native-kepler`.

- **Used for:** the whole TV app: 6 screens, D-pad focus, animations and the WebSocket client.
- **Worked well:**
  - Standard React Native, Jest and TypeScript just worked. Our 101 tests run on the host with no device.
  - TV focus (`hasTVPreferredFocus`, focus and blur events) behaved predictably, including D-pad Down landing on the nearest control.
  - The `Animated` API on the native driver was smooth for the celebrations.
  - Custom fonts worked as documented (file name = family name).
- **Needs work:**
  - **WebSocket:** occasionally delivers one message as two `onmessage` events, which crashed a naive `JSON.parse` (FL 9, high). We wrote a reassembling reader.
  - **No SVG:** our progress ring and QR code are drawn with rotated and positioned Views. It works, but an SVG or Canvas primitive would help.
  - **`TextInput`:** clips the bottom of large text when sized by padding (FL 14). The Virtual Device shows no on-screen keyboard, so typing a name from the remote can't be tested there (FL 11). We added name entry from the phone as a fallback.
- **Would use again:** yes. Reusing React Native skills on a TV platform is the strongest part of Vega.

## Vega AsyncStorage (`@amazon-devices/react-native-async-storage__async-storage`)

- **Used for:** anonymous player profiles (up to 4 per TV) and per-exercise progress, with no account.
- **Worked:** a drop-in for the community package through an npm alias, with the official Jest mock. Data survived app restarts and Virtual Device reboots.
- **Needs work:** the module also has to be declared in `manifest.toml` (`[[needs.module]]`), which is easy to miss. A build-time check that the import and the manifest match would help.
- **Would use again:** yes.

## Vega W3C Media (`@amazon-devices/react-native-w3cmedia`) `AudioPlayer`

- **Used for:** playing the coach's voice clips (MP3 over HTTPS) on the TV.
- **Worked:** the API (`initialize`, set `src`, `play`, then the `ended` and `error` events) is small and familiar from the web. It let us queue clips and fall back to the phone's speaker on errors.
- **Needs work:** most of the docs are about video, and audio-only playback was clearest in `vega-audio-sample`. We couldn't confirm TV audio output on the Virtual Device from a script, since nothing in the CLI reports what is playing. A short audio-only guide, and audio state in the device logs, would help.
- **Would use again:** yes.

## AWS

### How we use AWS

| Service | What for |
|---|---|
| **API Gateway WebSocket API** | Real-time link between the phone and the TV: pairing, about 15 pose frames per second, coach and voice messages. Throttled per stage. |
| **AWS Lambda** (Node 22, ARM) | The relay (pairing, routing, validation, coach requests, name clips) and the site function that serves the phone page and voice clips through a **function URL** |
| **Amazon DynamoDB** | Sessions and connections with **TTL**, conditional writes for one-phone-per-session and rate limits, a daily Polly quota counter, cached name clips |
| **Amazon Polly** (Matthew, neural) | 88 pre-made coach clips, plus 5 personal clips per player name made on demand ("Let's go, Ramy!") |
| **AWS Systems Manager Parameter Store** | SecureString shared secret between the relay and the AI coach Worker |
| **AWS CDK** | The whole stack as code (`infra/stack.ts`) |
| **CloudWatch Logs** | Relay and site logs with one-week retention |
| **Amazon Bedrock** | Planned for the AI coach. Blocked on our account (below). |
| **Amazon CloudFront** | Planned for the phone page. Blocked on our account (below). |

### API Gateway WebSocket + Lambda + DynamoDB
- **Worked very well:** 88 ms median phone-to-TV latency through the relay (169 ms p95), no servers, and a few cents of cost. Conditional writes made pairing and rate limits safe across Lambda instances with no extra infrastructure.
- **Needs work:** the 10-minute idle timeout on WebSocket connections isn't obvious. We added a keepalive after the TV's pairing code went stale while someone fetched their phone.
- **Would use again:** yes.

### Amazon Polly
- **Worked very well:** neural Matthew sounds like a real coach, pronounces names well (we checked "Ramy" by ear), and a name's 5 clips are ready in about 2 seconds. Caching clips in DynamoDB keeps cost near zero.
- **Would use again:** yes.

### AWS CDK
- **Worked:** fast iteration, and the diff before each deploy made security reviews easy: we could see exactly which IAM permissions changed.
- **Needs work:** when the CLI session has expired, CDK reports "Unable to resolve AWS account" rather than "please log in again".

### `aws login` (CLI 2.37)
- **Needs work:** succeeds and then reports "Unable to locate credentials" when no default region is set (FL 6). Sessions also expire daily, which interrupts long builds.

### Amazon Bedrock: blocked
- Every model, including Amazon Nova Lite, returns `ValidationException: Operation not allowed` in eu-central-1 and us-east-1. The Anthropic use-case form returns "not authorized, create a support case" (FL 7).
- Support case 179076143400741 has had no reply since 2026-09-30. It was escalated through AWS Support on Reddit on 2026-10-04.
- **Impact:** we built the AI coach on Cloudflare Workers AI behind a provider switch, so Bedrock is one setting away. A clear "your account is blocked because…" message would have saved days.

### Amazon CloudFront: blocked
- "Your account must be verified before you can add new CloudFront resources" (FL 12). We serve the page from a Lambda function URL instead.

### AWS Support (Basic)
- **Needs work:** the hackathon depends on AWS services, but a blocked account has no fast path. A hackathon support channel, or pre-verifying accounts that receive hackathon credits, would remove this risk.

---

## Feature requests

| Request | Why | Urgency |
|---|---|---|
| Show `console.log` in `vega device start-log-stream` for debug builds | We debugged from screenshots | High |
| On-screen keyboard in the Vega Virtual Device | Text entry can't be tested without hardware | High |
| Complete WebSocket messages on Vega | Split messages crash apps that parse directly | High |
| SVG or Canvas primitive in React Native for Vega | Rings, charts and QR codes need hacks today | Medium |
| `vega run-app --keep-data`, documented data behavior | Avoid false "persistence bugs" | Medium |
| Account-level block reasons in the AWS console (Bedrock, CloudFront) | We lost days to a generic "Operation not allowed" | High |
| Camera or pose input on Fire TV from a paired phone, as a platform feature | A phone-as-camera pattern would help fitness, games and accessibility apps | Nice to have |

## Other tools, for context

- **Cloudflare Workers AI** (Qwen3 30B by default): stands in for Bedrock as the coach's rewrite model, behind a shared-secret Worker. The rewrite is used only if it passes our validation (no invented numbers, no banned topics). We also used FLUX.1 schnell once, offline, to make the 12 reward stickers, which were reviewed by hand before bundling (we made 21 and rejected 8).
- **MediaPipe Pose (Tasks Vision, lite model):** on-phone pose tracking in the browser, 48 fps on an iPhone 13.
- **Kiro:** not used.
