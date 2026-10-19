# Devpost submission text: Spotter

Copy each section into the matching Devpost field.

## Project name

**Spotter**

(In a gym, a spotter is the person who watches your set and keeps you safe. That's what the app does from your TV.)

## Tagline

Your phone is the camera. Your Fire TV is the coach.

## Track and mini challenge

- **Track:** Fire TV, built on **Vega OS** (React Native for Vega), running on the Vega Virtual Device.
- **Mini challenges:** AWS Builder (API Gateway WebSocket, Lambda, DynamoDB, Amazon Polly, CDK) and Open Source ([pose-reps](https://github.com/Ramy888/pose-reps)). A project can win at most one mini challenge prize.

## Description

### The problem

Working out at home, nobody watches your form. Half squats feel like full ones, you lose count, you rush, and you have no idea whether you're improving. A personal trainer fixes all of that, but costs more than most people will pay, and fitness apps on a phone are too small to watch from across the room mid-squat.

### Who it's for

People who train at home in front of their TV: beginners who want to know a rep "counts", busy people who want a 10-minute set with real feedback, and families who share one TV (up to 4 players, each with their own progress).

### What Spotter does

**Spotter turns a Fire TV into a coach that watches your form.**

1. Open **Spotter on Fire TV**. Scan the QR code with any phone. There's no app to install and no account.
2. Lean the phone against something across the room. It tracks your body on the phone and sends only body points, never video, to the TV.
3. **The Fire TV app counts every rep live** for squats, lunges and jumping jacks. A rep only counts at full depth; a half rep gets "Go deeper" on screen and out loud.
4. It **trains you like a coach**: 3 sets of 12 squats, a rest countdown between sets ("Great set! Take a breather.", "Set two. Let's go!"), and Skip rest when you're ready. **During each rest, the coach tells you the one thing to fix next**, from the set you just did ("2 reps didn't reach full depth. Next set: every rep all the way down."), an AI rewrites it in a coaching voice and Polly says it by name; the next set checks it, and "Focus kept" is celebrated.
5. It **talks to you by name** ("Let's go, Ramy!", "Last one, Ramy!") with an Amazon Polly voice, and celebrates clean streaks and your deepest rep with funny cartoon stickers.
6. After the workout, the **coach sums it up**: pace, depth, clean reps, and a target for next time. Finish every set with clean form and the next workout asks for 2 more reps per set.

### How it uses Fire TV (Vega OS)

The whole TV experience is a **Vega OS app written in React Native for Vega**:
- remote-first design: D-pad focus on every screen, a 1280×720 layout scaled to any TV, and focus shown by border and fill so it's readable from 3 m;
- **Vega AsyncStorage** keeps players, names and progress on the TV, so there's no account;
- **Vega W3C Media** (`AudioPlayer`) plays the coach's voice on the TV;
- the Vega CLI and Virtual Device built, tested and packaged the app (release `.vpkg`), which is **live on the Amazon Appstore** for Vega Fire TVs (version 1.1.0 with the between-set coach, published 2026-10-08; each release passed primary, content policy and functionality validation).

**No Vega Fire TV?** The [README's judge quick start](https://github.com/Ramy888/spotter-tv#try-it-for-judges) runs the same 1.1.0 release build on the Vega Virtual Device, against the live backend.

### How it uses AWS

- **API Gateway WebSocket + Lambda + DynamoDB**: a serverless relay that pairs the phone and the TV with a 6-character code and carries about 15 pose frames per second, 88 ms median phone-to-TV.
- **Amazon Polly**: 113 coach phrases, plus each player's name, made once and cached, and the between-set coach's line, voiced live during the rest.
- **AWS CDK**: the whole stack as code.

### How it's built, briefly

On-device pose tracking (MediaPipe) on the phone → the WebSocket relay on AWS → the Vega app, which runs the rep counting, cues, rewards, voice and coaching. The AI coach rewrites the summary and the between-set line in friendlier words but is never allowed to invent a number, and never sees the player's name. The architecture diagram is in the README.

### Privacy

Video never leaves the phone. Names and progress stay on the TV. No account, no ads, no tracking. Privacy policy: https://yannegqpb2hvrix2nmxxbbygqm0ldexn.lambda-url.eu-central-1.on.aws/privacy

### Open Source mini challenge

Spotter's rep counter is also its own open-source library, [pose-reps](https://github.com/Ramy888/pose-reps): MIT, [on npm](https://www.npmjs.com/package/pose-reps), 19 tests, CI, and a [live demo](https://pose-reps.ramy-comm.workers.dev).

### What's next

Spotter is already live on the Amazon Appstore. Next: **Train Together**, where two households start a workout at the same moment from a shared code, see each other's progress on screen, send preset cheers from the phone, and hear the coach say how their partner is doing. Still no account, no chat and no video. Also: Bedrock for the AI coach once our account is enabled (one setting away), more exercises (push-ups, planks with a timer), and testing on a real Vega Fire TV.

## Built With

`fire-tv` · `vega-os` · `react-native-for-vega` · `react-native` · `typescript` · `amazon-appstore` · `aws` · `amazon-api-gateway` · `aws-lambda` · `amazon-dynamodb` · `amazon-polly` · `aws-cdk` · `mediapipe` · `cloudflare-workers-ai` · `node.js`

## Links

- **Try it out (Amazon Appstore):** https://www.amazon.com/dp/B0HLY8788C
- **Code:** https://github.com/Ramy888/spotter-tv (public since 2026-10-19)
- **Demo video:** https://youtu.be/9C-6zbNSxhQ
- **Product feedback:** `docs/product-feedback.md` in the repo; paste it into Devpost's feedback field
- **Friction log:** `docs/friction-log.md`
