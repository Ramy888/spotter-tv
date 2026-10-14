# Friction log: Spotter (Fire TV / Vega track + AWS Builder)

Project: Spotter, AI form coaching on Fire TV (`README.md`). Entries are in the order we hit them.

Machine: MacBook Pro M4 (10-core CPU, 10-core GPU), 16 GB RAM, macOS 26.6.2. Vega SDK 0.24.12112, Vega CLI 1.4.2.

## 1. Vega build fails when the project path contains spaces
- **Date:** 2026-09-29
- **Task:** Build the helloWorld-based app with `npm run build:debug`.
- **Steps:** Generated the project with `vega project generate -t helloWorld`, moved it into a folder named `Amazon "Build, Ship, Shape" Developer Hackathon`, then ran the build.
- **Expected:** The build succeeds regardless of the folder name.
- **Actual:** `Unable to generate a manifest ... /bin/sh: /Volumes/Ex-Dev/Amazon: No such file or directory`. `kepler-compatibility-metro-config` (`utils.js:38`) passes the project path to a shell command without quoting it.
- **Severity:** High. The build is blocked, and the error doesn't point at the real cause.
- **Workaround:** Renamed the folder to `amazon-build-ship-shape`.
- **Suggestion:** Call the manifest builder with `execFile` and an argument array, or quote the paths. Until then, make `vega project doctor` warn when the project path contains spaces.

## 2. Installer has no documented non-interactive mode or install-location option
- **Date:** 2026-09-29
- **Task:** Install the Vega Developer Tools onto an external SSD, because the internal disk was 98% full.
- **Steps:** Read the install docs, then read `get_vvm.sh`.
- **Expected:** Documented flags for an unattended install and a custom install directory.
- **Actual:** The docs mention a prompt for "a custom path", but `VEGA_DIR` is hardcoded to `~/vega`. `NONINTERACTIVE=true` exists only in the script source.
- **Severity:** Medium.
- **Workaround:** Symlinked `~/vega` to the external drive and ran with `NONINTERACTIVE=true`.
- **Suggestion:** Document `NONINTERACTIVE`, `VEGA_SDK_VERSION` and `SKIP_SDK_INSTALL`, and honor a `VEGA_DIR` override.

## 3. `vega device run-cmd` reports "device offline" right after "Virtual device ready"
- **Date:** 2026-09-29
- **Task:** Run shell commands on the Vega Virtual Device to test its networking.
- **Steps:** Ran `vega virtual-device start`, waited for "Virtual device ready.", then immediately ran `vega device run-cmd -c '...'`.
- **Expected:** The command runs once the device reports ready.
- **Actual:** The first call failed with "No connected Vega devices found" and the second with "vda: device offline". The third call succeeded.
- **Severity:** Low. It's flaky, and scripts need retries.
- **Workaround:** Retry after a few seconds.
- **Suggestion:** Only print "ready" once `vda` is reachable, or add `vega device wait-for-device`.

## 4. The docs don't describe the Vega Virtual Device's networking
- **Date:** 2026-09-29
- **Task:** Confirm that an app running in the Virtual Device can reach a WebSocket relay on the host Mac or the LAN.
- **Steps:** Searched the Vega Virtual Device docs for networking, then pointed the app's relay URL at the Mac's LAN IP, and then at `10.0.2.2`.
- **Expected:** The docs state how the Virtual Device reaches the host (a host alias, NAT, or LAN).
- **Actual:** Nothing is documented. Testing showed that both the Mac's LAN IP and `10.0.2.2` (QEMU's standard host alias) work.
- **Severity:** Low.
- **Workaround:** Found by trial: `10.0.2.2` or the Mac's LAN IP.
- **Suggestion:** Add a "Networking" section to the Virtual Device docs.

## 5. Alexa+ track: the MCP Toolkit isn't available to most hackathon entrants
- **Date:** 2026-09-29
- **Task:** Evaluate the Alexa+ track from Egypt.
- **Steps:** Read developer.amazon.com/alexaplus and the MCP Toolkit availability notes.
- **Expected:** A path that any registered hackathon entrant can use to build and test for Alexa+.
- **Actual:** developer.amazon.com/alexaplus says Alexa+ for Builders is "currently available to select partners", and the MCP Toolkit is available only in the United States.
- **Severity:** Medium. It shaped our choice of track.
- **Workaround:** Entered the Fire TV track instead.
- **Suggestion:** Give hackathon entrants a sandbox or web-simulator path that doesn't require partner onboarding.

## 6. `aws login` succeeds, but the CLI then reports "Unable to locate credentials"
- **Date:** 2026-09-30
- **Task:** Sign the AWS CLI (2.37.6, Homebrew) in to the account that received the hackathon credits.
- **Steps:** Ran `aws login --region eu-central-1` and completed the browser sign-in. Then ran `aws sts get-caller-identity`.
- **Expected:** The call succeeds, because the login session is cached in `~/.aws/login/cache`.
- **Actual:** `NoCredentials: Unable to locate credentials. You can configure credentials by running "aws login"`. No default region had been saved to `~/.aws/config`, and the login credential provider silently fails without one.
- **Severity:** Medium. The error message points at the step that had just succeeded.
- **Workaround:** `aws configure set region eu-central-1`
- **Suggestion:** Have `aws login --region` save the region to the profile, or report "no region configured" instead of "no credentials".

## 7. Bedrock returns "Operation not allowed" until the Anthropic use-case form is submitted
- **Date:** 2026-09-30
- **Task:** Make a first Bedrock `converse` call to Claude from a new account.
- **Steps:** Called `aws bedrock-runtime converse` in eu-central-1, then ran `aws bedrock get-use-case-for-model-access` to find the cause, then `aws bedrock put-use-case-for-model-access`.
- **Expected:** The call works, or the error says what is missing and how to fix it.
- **Actual:** `ValidationException: Operation not allowed`. Only `aws bedrock get-use-case-for-model-access` reveals the cause: "You have not filled out the request form."
- **Follow-up:** Submitting the form with `aws bedrock put-use-case-for-model-access` then failed with "Your account is not authorized to perform this action. Please create a support case." Every model, including Amazon Nova Lite, returns "Operation not allowed" in both eu-central-1 and us-east-1. The account is from 2016, and Lambda, API Gateway and DynamoDB work normally. A support case is needed.
- **Update 2026-10-04:** Support case 179076143400741 (opened 2026-09-30, followed up 2026-10-01) has had no reply in 4 days, and Bedrock still returns "Operation not allowed". Asked in the hackathon Discord; the advice was to contact AWS Support on Reddit, which escalated the case. The same account also can't create CloudFront distributions (entry 12).
- **Severity:** High for the AWS Builder mini challenge: it blocks Bedrock entirely, and nothing in the console explains why.
- **Workaround:** The AI coach runs on Cloudflare Workers AI behind a provider switch (`COACH_PROVIDER` in `infra/stack.ts`), ready to move to Bedrock once it's enabled.
- **Suggestion:** Say in the `converse` error that the model's use-case form hasn't been submitted, and link to it. When an account is blocked at the account level, state that and the reason, rather than returning a generic "Operation not allowed".

## 8. App `console.log` output doesn't show up in `vega device start-log-stream`
- **Date:** 2026-09-30
- **Task:** Read an app's own debug output (a session code and rep events) while it runs in the Vega Virtual Device, without a screenshot.
- **Steps:** Built a debug build, launched it with `vega run-app`, and ran `vega device start-log-stream`.
- **Expected:** JavaScript `console.log` lines appear in the stream, tagged with the app.
- **Actual:** System and renderer logs for `com.spotter.tv` appear, but no JavaScript console output. The stream shows `lc_ProcessConfigManager Log suppression ended at level [info]. [1074] logs were suppressed at this level.`
- **Severity:** Medium. Debugging the app's behavior needed screenshots of the device window instead.
- **Workaround:** Screenshots of the Virtual Device window, plus tests on the host with Jest.
- **Suggestion:** Don't suppress JavaScript console output for debug builds, or document the flag or log level that shows it.

## 9. Vega WebSocket delivers one message as two `onmessage` events
- **Date:** 2026-10-01
- **Task:** Receive ~1 KB JSON pose frames at 15 per second from an API Gateway WebSocket in a Vega app (SDK 0.24, Vega Virtual Device).
- **Steps:** Called `JSON.parse(e.data)` in `ws.onmessage`. The same code works in Node and in browsers.
- **Expected:** Each `onmessage` event carries exactly one complete WebSocket message, as the WebSocket API specifies.
- **Actual:** Sometimes one message arrives as two events. The logs show `JSON Parse error: Unexpected end of input` immediately followed by `Unexpected character: ,` (the remainder). The uncaught exception restarted the app, which showed up as a new pairing code and as lost frames (about 10 of 15 per second).
- **Severity:** High. It looks like flaky networking, and it crashes apps that parse messages directly.
- **Workaround:** `src/relayMessages.ts` joins pieces until they parse, never throws, and caps its buffer.
- **Suggestion:** Deliver complete messages, or document the behavior.

## 10. `inputd-cli button_press` key names aren't documented
- **Date:** 2026-10-01
- **Task:** Press D-pad keys on the Vega Virtual Device from a script, to test TV focus navigation.
- **Steps:** `vega device run-cmd -c 'inputd-cli button_press dpad_right'`
- **Expected:** A D-pad key name such as `dpad_right` is accepted, or the help text lists the valid names.
- **Actual:** `invalid button value: ["dpad_right"]`. The help text doesn't list valid names. Linux key codes work: `KEY_RIGHT`, `KEY_ENTER`.
- **Severity:** Low.
- **Workaround:** Used Linux key codes (`KEY_RIGHT`, `KEY_ENTER`, found by trial) to drive focus on the Virtual Device.
- **Suggestion:** List the accepted key names in `inputd-cli --help`, and expose key presses as a `vega device` command.

## 11. No on-screen keyboard for `TextInput` on the Vega Virtual Device
- **Date:** 2026-10-01
- **Task:** Let a player type their name on the TV with the remote (React Native `TextInput`, SDK 0.24, Vega Virtual Device).
- **Steps:** Focused a `TextInput` with the D-pad and pressed OK.
- **Expected:** The system on-screen keyboard opens, as on Fire OS.
- **Actual:** The field shows a cursor but no keyboard appears. Typed text arrives only through `inputd-cli send_text` or key presses. The SDK has a keyboard service (`IKeyboardManager` in `KeplerUIViewInterface`), but nothing says whether the Virtual Device shows it or how a React Native app should open it.
- **Severity:** Medium. The text input can't be tested from the remote without a device, and there's no way to tell whether real hardware will show the keyboard.
- **Workaround:** Tested typing with `inputd-cli send_text`.
- **Suggestion:** Show the system keyboard on the Virtual Device, or document how text entry works there and on devices.

## 12. CloudFront: "Your account must be verified" on a 2016 account
- **Date:** 2026-09-30
- **Task:** Serve the phone camera page over HTTPS through CloudFront (the phone camera needs a secure page), defined in the CDK stack.
- **Steps:** Added a CloudFront distribution to the stack and ran `cdk deploy`.
- **Expected:** The distribution is created. The account is from 2016 and other services work.
- **Actual:** `Your account must be verified before you can add new CloudFront resources. To verify your account, please contact AWS Support` (request ID 055fba00-b44e-4e46-8303-d14311539aef). The stack rolled back. Nothing in the console said the account needed verification before this.
- **Severity:** Medium. It blocks the standard way to host a static page.
- **Workaround:** Served the page from a Lambda function URL (HTTPS by default), which only answers an allow-list of paths.
- **Suggestion:** Show pending account verification (and which services it blocks) in the console, and let the owner start it without a support case.

## 13. `vega run-app` wipes the app's saved data; `vega device install-app` keeps it
- **Date:** 2026-10-01
- **Task:** Keep players and progress saved with Vega AsyncStorage while installing new builds on the Vega Virtual Device.
- **Steps:** Saved a player name and a workout, rebuilt, and installed the new build with `vega run-app <vpkg> com.spotter.tv.main -d VirtualDevice`.
- **Expected:** Installing a new build of the same app keeps its data, as an app update does.
- **Actual:** After `vega run-app`, the app started with no saved players. After `vega device install-app -p <vpkg> -d VirtualDevice` the data was kept ("Ramy · switch" was still there). The data also survived app restarts and a full `vega virtual-device stop` / `start`.
- **Severity:** Medium. It looks like a persistence bug in your own app, and it cost us time ruling one out.
- **Workaround:** Use `vega device install-app` (then `vega device launch-app`) whenever saved data matters, such as when recording a demo.
- **Suggestion:** Document which commands clear app data, and add a flag such as `vega run-app --keep-data`.

## 14. `TextInput` clips the bottom of its text when sized by padding
- **Date:** 2026-10-01
- **Task:** A large name field on the TV (React Native `TextInput`, 44 pt condensed font, 18 pt vertical padding).
- **Steps:** Styled the `TextInput` with the 44 pt font and 18 pt vertical padding, ran it on the Vega Virtual Device, and typed "Ramy".
- **Expected:** The text fits inside the field, as it does on iOS and Android.
- **Actual:** On the Vega Virtual Device the bottom of the text was cut off: the tail of the "y" in "Ramy" was missing.
- **Severity:** Low.
- **Workaround:** Gave the field an explicit `height` and `lineHeight`, with no vertical padding.
- **Suggestion:** Size text inputs from the font's full line height, or document the explicit height requirement.
