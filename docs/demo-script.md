# Demo video script: Spotter

**Target length: 2:45** (the limit is 3:00). English voice-over, no copyrighted music. The best material comes first: a real person squatting, the TV counting and saying their name, within the first 15 seconds.

The rules require the video to show the app running on a Fire TV device or the Vega simulator. Every TV shot below is the **Vega Virtual Device**.

---

## Before recording

- [ ] Relay and phone page deployed. Run `node infra/e2e.mjs <RelayUrl>` and `node infra/e2e-voice-name.mjs <RelayUrl> <PhoneUrl>`; both should pass.
- [ ] Latest TV build installed with `vega device install-app` (not `run-app`, which wipes saved players; see friction log 13).
- [ ] On the TV: player **Ramy** exists, with 1–2 earlier squat sessions, so the picker shows "Last time … · target …".
- [ ] **Coach voice:** test whether TV audio is audible from the Mac when recording. If it isn't, set **Coach voice: Phone** so the phone speaks and the room mic picks it up.
- [ ] Phone on a stand about 3 m away, front camera, the whole body in frame, good light from the front.
- [ ] Mac: Do Not Disturb on, no editor windows or `.env` files visible, Vega Virtual Device window at a large size.
- [ ] Recording: a QuickTime screen recording of the Vega window only, the iPhone's screen recording for phone shots, and an optional third camera filming you and the Mac screen together.

---

## Script

| Time | Shot | Voice-over | On-screen caption |
|---|---|---|---|
| **0:00–0:15** | Wide shot: you squatting in front of the screen, the Vega window large. The count goes up, the ring fills, and "Let's go, Ramy!" is heard. | "This is Spotter. My phone is the camera, my TV is the coach, and it just counted every squat." | **Spotter: AI form coaching for Fire TV** |
| **0:15–0:35** | Vega window: the pairing screen (QR in the tick ring, the code). Cut to the phone scanning the QR, "Found your TV", tap **Start camera**, the framing guide turning green (Head, Hips, Feet). | "No account and no app to install. Scan the code on the TV, lean the phone against something, and step back. Pose tracking runs on the phone, so only 33 body points leave it. Never video." | *Pairs in one scan · no video leaves the phone* |
| **0:35–0:50** | Vega: "Who's training?" with player cards. Select **Edit name**. Cut to the phone's "What's your name?" sheet, type **Ramy**, tap **Send to TV**. The TV card changes to RAMY. | "Each TV keeps up to four players, saved on the TV. Typing on a remote is slow, so your phone asks for your name too." | *Players saved on the TV · no account* |
| **0:50–1:35** | Vega: the picker ("Last time 4 · target 5"), pick **Squats**. The workout screen: the count, the depth gauge, the ring filling tick by tick. Do one half squat: amber **GO DEEPER** and the spoken "Ramy, go deeper." Then clean reps: "Two more!", the 🔥 streak badge, "Last one, Ramy!" | "Spotter counts a rep only at full depth. Go halfway and it tells you, by name. It counts out loud, cheers a clean streak, and knows how close you are to your target." | *Counts only full-depth reps · spoken cues by name* |
| **1:35–2:00** | Vega: press **Finish**. The summary: "NICE WORK, RAMY", the count, pace, best depth, clean reps, the coach card with "✨ AI coach", and the amber NEXT TIME target. | "After the set, the coach sums it up and sets a target for next time. An AI model rewrites the advice, but it isn't allowed to invent a single number: every fact comes from the session." | *AI coach that can't make up numbers* |
| **2:00–2:35** | The architecture diagram (`docs/architecture.png`), then a quick cut of the Vega window and the phone side by side. | "Under the hood: MediaPipe on the phone, an API Gateway WebSocket relay on Lambda and DynamoDB, about 90 milliseconds from phone to TV, and Amazon Polly for the coach's voice, including a personal voice for every player. The TV app is React Native on Vega OS." | *Vega OS · API Gateway · Lambda · DynamoDB · Polly* |
| **2:35–2:45** | Back to the wide shot: the final rep, the target hit 🎉, "Great work, Ramy!" | "No equipment, no account, nothing to install. Just your phone, your TV, and a coach. Spotter." | **Spotter: your phone is the camera, your TV is the coach** |

**Spoken words:** about 300 at a relaxed pace, which fits 2:45 with pauses for the coach's own voice. If the cut runs long, trim the 2:00–2:35 architecture section first; never cut the opening.

---

## Recording tips

- Record the workout once, in one long take, and cut the shots from it. Real reps look better than staged ones.
- Let the coach's voice be heard: lower the voice-over under "Let's go, Ramy!", "Ramy, go deeper." and "Last one, Ramy!".
- Keep captions on screen for at least 2 seconds, large, in the corner away from the rep count.
- Export 1080p. Upload to YouTube or Vimeo as **Public** (the rules require it), with English captions on.
