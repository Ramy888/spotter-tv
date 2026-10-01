# Friction log: Rally (Fire TV / Vega track)

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
- **Expected:** The docs state how the Virtual Device reaches the host (a host alias, NAT, or LAN).
- **Actual:** Nothing is documented. Testing showed that both the Mac's LAN IP and `10.0.2.2` (QEMU's standard host alias) work.
- **Severity:** Low.
- **Suggestion:** Add a "Networking" section to the Virtual Device docs.

## 5. Alexa+ track: the MCP Toolkit isn't available to most hackathon entrants
- **Date:** 2026-09-29
- **Task:** Evaluate the Alexa+ track from Egypt.
- **Actual:** developer.amazon.com/alexaplus says Alexa+ for Builders is "currently available to select partners", and the MCP Toolkit is available only in the United States.
- **Severity:** Medium. It shaped our choice of track.
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
- **Actual:** `ValidationException: Operation not allowed`. Only `aws bedrock get-use-case-for-model-access` reveals the cause: "You have not filled out the request form."
- **Follow-up:** Submitting the form with `aws bedrock put-use-case-for-model-access` then failed with "Your account is not authorized to perform this action. Please create a support case." Every model, including Amazon Nova Lite, returns "Operation not allowed" in both eu-central-1 and us-east-1. The account is from 2016, and Lambda, API Gateway and DynamoDB work normally. A support case is needed.
- **Severity:** High for the AWS Builder mini challenge: it blocks Bedrock entirely, and nothing in the console explains why.
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
- **Actual:** `invalid button value: ["dpad_right"]`. The help text doesn't list valid names. Linux key codes work: `KEY_RIGHT`, `KEY_ENTER`.
- **Severity:** Low.
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
