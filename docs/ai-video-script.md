# Spotter: launch film (AI-generated, 2:45)

A product film, not a tutorial. **Problem → turn → the product working → who it's for → how it's built on Fire TV → close.**

## The one rule

Every Spotter screen in the film is a **real capture of the app running on the Vega Virtual Device** (Devpost requires the app shown running on Fire TV or the Vega simulator). AI generates the people, rooms, light and mood; the TV in each AI shot shows a **blank or green screen**, replaced in the edit with the real capture. Never let an AI model draw the app's interface.

## Look and sound

- **Visual style (paste into every AI prompt):** *cinematic, shallow depth of field, modern apartment living room at dusk, warm practical lamps, cool TV glow, subtle lime-green (#C8FF3D) accent light, 35mm film look, natural skin tones, realistic, 24 fps, no text, no logos*.
- **The athlete:** one consistent character in every AI shot: *a woman in her early 30s, dark hair in a ponytail, charcoal sweatpants and a lime-green tank top, barefoot on a yoga mat*. Generate a character reference sheet first and use it as the reference image for every shot.
- **Narrator:** a calm, warm voice, different from the coach (the coach is Polly's Matthew, heard from the TV). AI voice, or record your own.
- **Music:** AI-generated, royalty-free (no copyrighted tracks): *minimal electronic, 100 BPM, soft pulse that builds at 0:22 and lifts at 2:20*.
- **Format:** 16:9, 1080p, burned-in English captions for the narrator.

## Shot list

| # | Time | Source | Picture | Narrator | On screen |
|---|---|---|---|---|---|
| 1 | 0:00–0:05 | AI | Close-up: the athlete's feet on a mat, a phone propped on a sofa cushion, its timer app ticking. She starts a squat. | — (music only, soft) | — |
| 2 | 0:05–0:12 | AI | Medium shot, side angle: she squats, but only halfway; she glances at the phone, loses count, frowns. | "At home, nobody watches your form." | — |
| 3 | 0:12–0:20 | AI | Slow push-in on her face, catching her breath, unsure. Lamp light. | "Half reps feel like full ones. You lose count. You never really know if you're getting better." | — |
| 4 | 0:20–0:24 | AI + real | She picks up the TV remote; the TV lights up (screen replaced with **the Spotter pairing screen**). Music lifts. | "So we gave your TV a coach." | **SPOTTER** (logo, center, 1.5 s) |
| 5 | 0:24–0:36 | AI + real | Over-the-shoulder: she scans the QR on the TV with her phone, then leans the phone against a shelf. Cut to **real capture**: the phone's camera page, "Found your TV", Start camera. | "Scan the code. Lean your phone across the room. That's it. No account, no app to install." | *No account · nothing to install* |
| 6 | 0:36–0:58 | AI + real | Wide hero shot: she squats in front of the TV, full depth now (TV replaced with **real capture: the workout screen, the count rising, the ring filling tick by tick**). Insert the real Polly audio: "Let's go, Ramy!" (use the player name you record with). | "Your phone tracks your body. Only body points leave it, never video. Your Fire TV counts every rep, and only full-depth reps count." | *Video never leaves your phone* |
| 7 | 0:58–1:12 | real | **Real capture:** a half squat triggers the amber **GO DEEPER**, and the coach says "go deeper." Then a clean rep, the 🔥 clean-streak badge and the cartoon sticker. | "Go halfway, and it tells you. By name." | *Real-time form cues* |
| 8 | 1:12–1:30 | AI + real | He rests, hands on knees (TV replaced with **real capture: the rest countdown and the Coach card, "FULL DEPTH", turning "✨ AI"**). Real audio: the coach's line by name. Cut to set 2 and "🎯 FOCUS KEPT". | "Between sets, it tells you the one thing to fix, and checks that you did." | *A coach that watched your last set* |
| 9 | 1:30–1:48 | real | **Real capture:** the summary: "NICE WORK", "SETS 12 · 12 · 12", the coach card with "✨ AI coach", the NEXT TIME target. | "After the workout, your coach sums it up and sets your next target. The AI can rephrase the advice, but it can't invent a single number." | *An AI coach you can trust* |
| 10 | 1:48–2:00 | AI + real | A family moment: two people on the sofa, one standing up to train next; cut to **real capture: "Who's training?"** with player cards. | "Up to four players on one TV, each with their own progress, saved on the TV." | *Made for the whole household* |
| 11 | 2:00–2:28 | motion graphics | Animated architecture on the volt/dark palette: phone → AWS relay → Fire TV. Labels appear in sync with the narration. Use `docs/architecture.png` as the reference. | "Spotter is built for Fire TV on Vega OS, with React Native for Vega: remote-first screens, Vega storage for players without accounts, and Vega's media player for the coach's voice. On AWS, a WebSocket relay on Lambda and DynamoDB carries every movement in under a tenth of a second, and Amazon Polly gives the coach its voice." | **Fire TV · Vega OS** · then *API Gateway · Lambda · DynamoDB · Polly* |
| 12 | 2:28–2:38 | AI | Golden-hour wide shot: she finishes the last rep, arms up, laughing; the TV glows lime. | "For everyone who trains at home in front of their TV." | — |
| 13 | 2:38–2:45 | graphics | End card on #0A0B10: the Spotter mark and wordmark, the tagline, "Built on Fire TV (Vega OS)", and "Available now on the Amazon Appstore for Fire TV". | "Spotter. Your phone is the camera. Your TV is the coach." | **Your phone is the camera. Your TV is the coach.** · *Fire TV · Vega OS* |

About 230 narrated words, which leaves room for the coach's own lines (shots 6–8) and the music lifts.

## Which tool, and how

**Character reference:** `video/character-reference.png` (made with HiggsField Z Image). Upload it as the reference or start image for every shot with the athlete.

**Free tiers that fit (checked 2026-10-05; free tiers change often, so check before relying on them):**
- **Google Flow (Veo 3.1):** about 50 daily credits, roughly 12 videos a day at 720p. Enough for all 9 AI shots in one day.
- **Kling AI:** 66 credits a day, roughly 2–6 videos, with image-to-video from a reference. Spread the shots over 2–3 days.
- Others with daily credits: Hailuo, PixVerse, Seedance.

Free tiers often add a watermark; check before generating all the shots. Generate each shot at 16:9, 5 seconds, from the reference image plus its prompt below.

## AI generation prompts

Append the visual style line to each. Use the character sheet as the reference image in every shot with the athlete. Keep the TV screen **blank black** (or green) in every prompt.

1. *Close-up of bare feet on a gray yoga mat in a modern living room at dusk; a smartphone propped against a sofa cushion shows a countdown timer; the person begins to bend their knees into a squat; shallow depth of field.*
2. *Medium side shot of the athlete doing a shallow half squat, glancing at a phone on the sofa, losing count, slight frown; warm lamp light, cool window light.*
3. *Slow push-in on the athlete's face, catching her breath, looking unsure; bokeh lamps behind her.*
4. *The athlete picks up a TV remote; a large wall-mounted TV with a blank black screen turns on and glows; lime-green accent light spills into the room.*
5. *Over-the-shoulder shot: the athlete holds a smartphone up to a wall TV with a blank screen, as if scanning a code, then leans the phone upright against a bookshelf.*
6. *Wide hero shot from behind the TV's side: the athlete does deep, controlled squats facing a wall TV with a blank screen; strong, confident; lime accent light pulses gently.*
8. *The athlete resting between sets, hands on knees, smiling at a wall TV with a blank screen; soft breathing; warm light.*
10. *Two adults on a sofa in the same living room; one stands up and steps onto the mat, high-fiving the other; a wall TV with a blank screen glows.*
12. *Golden-hour wide shot: the athlete finishes a final squat, raises both arms and laughs; the TV with a blank screen glows lime-green; lens flare.*

## Real captures to record (Vega Virtual Device + phone)

Record each at 1080p with a screen recorder on the Vega window only (no editor windows or `.env` files on screen; see `docs/demo-script.md`, "Before recording").

| For shot | Capture |
|---|---|
| 4 | Pairing screen with the QR code |
| 5 | Phone: camera page, "Found your TV", Start camera, the framing guide turning green |
| 6 | Workout: count rising, the ring filling, with the coach audio |
| 7 | A half squat → GO DEEPER, then the clean-streak sticker |
| 8 | Rest countdown with the Coach card (do a few half squats in set 1 so the focus is "Full depth"), the AI line spoken; then set 2 clean and "🎯 FOCUS KEPT" |
| 9 | Summary with "✨ AI coach" |
| 10 | Who's training? |

Set **Rest: 30 s** on the picker beforehand.

## Edit

1. Place the real captures onto the blank TV screens (corner-pin or screen-replace; add a soft glow so they sit in the room).
2. Keep the coach's real voice audible over the music in shots 6–8; duck the narrator there.
3. Captions: white, DM Sans; key phrases in volt.
4. Export 1080p H.264 and upload to YouTube or Vimeo as **Public**.
5. In the Devpost description, say the lifestyle footage is AI-generated and every app screen is a real capture.
