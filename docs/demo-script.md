# Demo video script: Spotter

**Target length: 2:50** (the limit is 3:00). English voice-over, no copyrighted music.

**It's a pitch, not a tutorial** (Devpost's advice): open with the problem, show the solution working, then say who it's for, how it uses **Fire TV (Vega OS)**, and what the working app does. Fire TV and Vega OS are named on screen and out loud, not in passing.

The rules require the video to show the app running on a Fire TV device or the Vega simulator. Every TV shot below is the **Vega Virtual Device**.

---

## Before recording

- [ ] Relay and phone page deployed. Run `node infra/e2e.mjs <RelayUrl>` and `node infra/e2e-voice-name.mjs <RelayUrl> <PhoneUrl>`; both should pass.
- [ ] Latest TV build installed with `vega device install-app` (not `run-app`, which wipes saved players; see friction log 13).
- [ ] On the TV: player **Ramy** exists, with 1–2 earlier squat sessions, so the picker shows "3 × 12 · last time …". Set **Rest: 30 s** on the picker so the rest countdown fits the video.
- [ ] **Coach voice:** test whether TV audio is audible from the Mac when recording. If it isn't, set **Coach voice: Phone** so the phone speaks and the room mic picks it up.
- [ ] Phone on a stand about 3 m away, front camera, the whole body in frame, good light from the front.
- [ ] Mac: Do Not Disturb on, no editor windows or `.env` files visible, Vega Virtual Device window at a large size.
- [ ] Recording: a QuickTime screen recording of the Vega window only, the iPhone's screen recording for phone shots, and an optional third camera filming you and the Mac screen together.

---

## Script

| Time | Shot | Voice-over | On-screen caption |
|---|---|---|---|
| **0:00–0:12** | **The problem.** You alone in a living room doing squats with a phone timer: shallow reps, losing count, checking the phone mid-set. | "Training at home, nobody watches your form. Half squats feel like full ones, you lose count, and you never know if you're getting better." | *Home workouts: no one checks your form* |
| **0:12–0:25** | **The solution, working.** Wide shot: you squatting in front of the TV (the Vega window large). The count goes up, the ring fills, "Let's go, Ramy!" | "This is Spotter, on Fire TV. My phone is the camera, my TV is the coach, and it counts every rep that actually counts." | **Spotter: a coach for Fire TV, built on Vega OS** |
| **0:25–0:42** | Vega window: the pairing screen (QR, code). Cut to the phone scanning, "Found your TV", **Start camera**, the framing guide turning green. | "No account and no app to install. Scan the code on the TV and lean the phone against something. Pose tracking runs on the phone; only body points leave it, never video." | *Pairs in one scan · no video leaves the phone* |
| **0:42–0:55** | Vega: "Who's training?", **Edit name**. Cut to the phone's "What's your name?" sheet, type **Ramy**, **Send to TV**. | "Up to four players per TV, saved on the TV. Typing on a remote is slow, so your phone asks for your name." | *Players saved on the TV · no account* |
| **0:55–1:35** | Vega: the picker ("3 × 12"), pick **Squats**. "Ramy · Set 1 of 3", the ring filling tick by tick. One half squat: amber **GO DEEPER**, "Ramy, go deeper." Clean reps: "Two more!", the 🔥 streak with its cartoon sticker, "Last one, Ramy!" | "It coaches like a trainer: 3 sets of 12. A rep only counts at full depth, and if you go halfway it tells you, by name. It counts out loud and celebrates a clean streak." | *Only full-depth reps count · spoken cues by name* |
| **1:35–1:52** | The rest screen: "REST 30", the ring emptying, and the **Coach card**: "FULL DEPTH · 2 reps didn't reach full depth…", turning "✨ AI" as the rewrite arrives; halfway, the coach says it by name. Set 2: the "FOCUS · FULL DEPTH" chip, every rep deep; next rest opens with **🎯 FOCUS KEPT**. | "Between sets, it tells you the one thing to fix, from the set you just did, and the next set checks that you did." | *A coach that watched your last set* |
| **1:52–2:12** | Vega: the summary. "NICE WORK, RAMY", "SETS 12 · 12 · 12", pace, best depth, the coach card with "✨ AI coach", the NEXT TIME target. | "After the workout, the coach sums it up and sets your next target. An AI rewrites the advice, but it can't invent a single number: every fact comes from your workout." | *AI coach that can't make up numbers* |
| **2:12–2:38** | The architecture diagram (`docs/architecture.png`), then the Vega window and the phone side by side. | "The TV app is built on Vega OS with React Native for Vega: remote-first screens, Vega storage for players with no account, and Vega's media player for the coach's voice. Behind it, an AWS WebSocket relay on Lambda and DynamoDB carries the body points in about 90 milliseconds, and Amazon Polly gives the coach its voice." | *Fire TV · Vega OS · React Native for Vega · AWS* |
| **2:38–2:50** | Back to the wide shot: the last rep of the last set, "Great work, Ramy!" | "For anyone who trains at home in front of their TV: no equipment, no account, nothing to install. Spotter, on Fire TV." | **Spotter: your phone is the camera, your Fire TV is the coach** |

**Spoken words:** about 330 at a relaxed pace, which fits 2:50 with pauses for the coach's own voice. If the cut runs long, trim the rest section (1:35–1:52) first; never cut the problem, the Fire TV / Vega OS call-outs, or the closing line.

---

## Recording tips

- Record the workout once, in one long take, and cut the shots from it. Real reps look better than staged ones.
- Let the coach's voice be heard: lower the voice-over under "Let's go, Ramy!", "Ramy, go deeper." and "Last one, Ramy!".
- Keep captions on screen for at least 2 seconds, large, in the corner away from the rep count.
- Export 1080p. Upload to YouTube or Vimeo as **Public** (the rules require it), with English captions on.
