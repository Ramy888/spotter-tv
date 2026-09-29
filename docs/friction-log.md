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
