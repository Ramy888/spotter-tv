# Spotter

**Your phone is the camera. Your TV is the coach.**

Spotter is AI form coaching for Fire TV. Prop your phone up across the room and the TV counts your reps and tells you when a rep doesn't count. Built for the Amazon "Build, Ship, Shape" Developer Hackathon (Fire TV track + AWS Builder).

> Status: early build. The phone → relay → Vega TV app pipeline works end to end. Pairing through the cloud, more exercises and AI coaching are in progress.

## How it works

```
iPhone / Android browser                 Mac (dev relay)              Fire TV (Vega OS)
MediaPipe pose tracking on-device  ──►   WebSocket relay       ──►    tv-app: rep counting,
sends 33 body keypoints, no video        spikes/pose-relay            form hints, live stats
```

- **Privacy:** video never leaves the phone. Only body keypoints (x, y, visibility) are sent.
- **Counting:** the knee angle is smoothed, a rep only counts after the knees go below 110° and back above 155°, and joints the model can't actually see are ignored.

## Measured so far (iPhone 13, M4 Mac, Vega Virtual Device)

| Stage | Result |
|---|---|
| Pose tracking on iPhone 13 (Safari) | 48 fps |
| Phone → relay round trip (Wi-Fi) | ~40 ms |
| Relay → Vega app | 29 frames/s |

## Run it locally

Requires Node 20+, the [Vega Developer Tools](https://developer.amazon.com/docs/vega/latest/install-vega-sdk.html), and a phone on the same Wi-Fi.

```bash
# 1. Relay (serves the phone page over HTTPS: the camera needs a secure context)
cd spikes/pose-relay
npm install
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 30 \
  -subj "/CN=spotter-dev" -addext "subjectAltName=IP:<your-mac-lan-ip>"
node server.mjs

# 2. TV app (set RELAY_URL in tv-app/src/App.tsx to your Mac's LAN IP)
cd tv-app
source ~/vega/env
npm install
npm run build:debug
vega virtual-device start
vega run-app build/aarch64-debug/spotter-tv_aarch64.vpkg com.spotter.tv.main -d VirtualDevice

# 3. Phone: open https://<your-mac-lan-ip>:8443/, accept the dev certificate, tap Start camera
```

> The Vega build fails if the project path contains spaces (see `docs/friction-log.md`).

## Repo layout

| Path | What |
|---|---|
| `tv-app/` | Vega OS (React Native) Fire TV app |
| `spikes/pose-relay/` | Dev relay, phone camera page, browser viewer |
| `docs/friction-log.md` | Friction log for the hackathon |

## License

MIT
