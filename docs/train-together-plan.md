# Train Together: plan (proposal, not started)

Status: proposal (2026-10-14), not started. Awaiting a go/no-go.

## Verdict: build after Oct 23, release 1.2.0 after judging (Nov 21+)

- Judges pair one phone with one TV. They can't experience a feature that needs two households, and the video and Devpost entry are already submitted.
- About 6 days of solo work, plus store review, doesn't fit before Oct 23 with any slack.
- The live relay (`SpotterRelay`), the phone page and the 1.1.0 store build stay frozen from Oct 23 to Nov 20. All work goes to a second CDK stage, with its own relay, phone page and table. 1.2.0 points at it only after judging.
- Before Oct 23, at most one "What's next" sentence on Devpost.

## MVP shape

Two TVs in different homes. Each runs its own workout, with a shared start and a coach who tells you how your partner is doing.

1. **Create:** on the Pick screen, the host chooses **Train together** and the TV shows a crew code (same alphabet as the pairing code, under a separate `CREW#` key).
2. **Join:** the partner types the code **on their phone**. That reuses the phone page's existing input-sheet pattern (`name-prompt`) and avoids the TV remote keyboard. The phone shows the field only after its TV announces `crew-open`, and the TV re-announces when a phone rejoins, the same way it re-sends `name-prompt`.
3. **Start together:** the host picks the exercise, and the relay sends both TVs a relative `startIn` in milliseconds for a 3-2-1 countdown, so the TVs' clocks don't matter.
4. **Independent after the start.** Each TV runs its own plan, sets and rests exactly as today. There is no lockstep, because a host-gated rest would stall the slower player's progression (details below).
5. **Partner strip** on the workout screen: name, "set x of y", percentage of plan, and stage. Progress is compared as a percentage of each player's own plan, never as raw reps. Status goes out when a set starts, when it ends and when the workout ends; a partner with nothing new for 90 s is greyed out.
6. **The coach in a crew:** a rule-based partner sentence on the rest card, voiced from fixed pre-made clips: "Your partner just finished set two." "Together you've done 46." The tone is cooperative, never "match her", because this is a family audience on different plans.
7. **Preset cheers:** 4 fixed cheers sent from the phone, at most 1 every 5 s. The partner sees a banner and hears a fixed clip. There is no moderation to do, because nobody can type anything.
8. **Summary:** a "Together: N reps" row.
9. **Drop-out:** the relay sends `crew-left`, and the other TV carries on solo. No rejoin tokens: a dropped TV socket re-pairs anyway, so the player just enters the code again.
10. The whole mode sits behind `TRAIN_TOGETHER` in `tv-app/src/config.ts`, like `SET_COACH_AI`. When it's off, the solo path is unchanged.

Not built: free text, voice (the phone mic would send room audio to the cloud), video, matchmaking or public rooms, crews of more than 2 in 1.2.0, and a name blocklist.

## Why these choices

| Question | Decision | Deciding fact |
|---|---|---|
| Lockstep or independent | Independent, with a synced start | A set ends at its rep count (`App.tsx` `completeSet`). The next workout adds 2 reps only if every set was done in full (`plan.ts` `nextRepsPerSet`), and `checkFocus` skips a set that was cut short. A gate either makes the faster player wait or cuts the slower player's set. Lockstep would also need a new "waiting" stage that `parseStatus` (`pairing.mjs:85-91`) and the watchdog don't allow. |
| Does the LLM see partner data? | No | The rewrite check `lineRejectionReason` (`setCoach.mjs:69-87`) only checks which numbers appear, not whose they are, so a duo line could credit 12 reps to the wrong person. Each TV keeps its own `set-coach` call for its own player, with no change to cost or cooldowns. |
| Who types the code | The phone | It's quicker than the remote keyboard. Changing the phone page is safe because the second stage serves its own copy (`infra/stack.ts:84-98`). |
| Crew size | 2, with the relay model ready for 4 | The workout screen's side columns are 250 px on the 1280×720 canvas (`WorkoutScreen.tsx`), which can't fit three partner rows. |
| Names | Shown as typed (any script); spoken only if Latin | `typedName` accepts any script (`pairing.mjs:15-24`), while `SPOKEN_NAME` is Latin-only (`voiceNames.mjs:16`). Filtering what's shown would turn an Arabic name into "Partner". |
| Channel | Coach-mediated lines plus preset cheers | The Vega TV has no user mic. Phone audio would break "only keypoints leave the phone". Free text would bring Appstore user-generated-content duties (filtering, reporting, blocking) to a family app. |

## Backend (additive only)

- **New items:**
  - `CREW#<code>` holds `{hostConn, members: {connId: {name}}, exercise, started, expiresAt}`.
  - `CREWCONN#<connId>` holds `{crew, lastCheerAt, lastStatusAt}`.
  - `SESSION#` and `CONN#` keep their shapes.
- **New actions in `parseMessage` and `onMessage`:**
  - `crew-open` (TV)
  - `crew-join {code}` (phone, resolved to its TV with `tvConnectionFor`)
  - `crew-start` (host TV only)
  - `crew-status {set, sets, pct, stage}` (TV, integers validated like `parseStatus`). Sent once per change of stage, at least 3 s apart: 20 jumping jacks can take about 10 s, so a fixed 1-per-10 s cap would drop the set-end status.
  - `crew-cheer {id}` (phone, from a fixed list)
- **Joining** is a conditional update that succeeds only if the crew exists, has no partner yet and hasn't expired. Rate limits use conditional updates, as the voice-name quota already does.
- **`onDisconnect`** gets one extra lookup: if a `CREWCONN#` item exists, delete it and notify the partner. For every 1.1.0 connection that lookup simply finds nothing.
- **Load:** a few messages per set per TV, which is negligible next to 15 frames a second. There's no extra AI or Polly spend, because the cheer and partner clips are pre-made.
- **Backward compatibility:** `parseMessage` already ignores unknown actions, and the TV's own `ping` exercises that path in production today. The 1.1.0 TV never sends `crew-*` and ignores unknown types, and a phone paired with 1.1.0 never receives `crew-open`.
- **Privacy wording at release:** the README says "no personal data in the cloud", but crew mode stores the display name in `CREW#` until it expires. Update the README and `phone-web/privacy.html` to say the name is shared with your crew partner for that session only.

## Testing

- `infra/fake-crew.mjs`, built on `fake-tv.mjs`: it joins by code, sends scripted `crew-status`, and sends cheers.
- `infra/e2e-crew.mjs`: two fake TVs and two fake phones, needing no Vega devices.
- A live demo is one Vega Virtual Device, one real phone, and the fake partner (clearly labelled as a test harness).
- Relay unit tests use `node --test`, like `pairing.test.mjs`.

## Effort (about 6 solo days)

| Piece | Days |
|---|---|
| Second CDK stage, with a configurable stack name and URLs | 0.5 |
| Relay items, actions, disconnect and unit tests | 1.5 |
| TV: lobby, countdown, partner strip, rest-card line, summary row | 1.5 |
| Phone: join field and cheer bar | 0.5 |
| Partner and cheer clips (Polly, made once) | 0.25 |
| Fake crew and end-to-end tests | 0.5 |
| Two-device QA and store review | 1.5 |

**Phase 2:**
- An opt-in "wait for crew" rest.
- A spoken duo line, using placeholders so names never reach the model.
- Crews of 3-4 after a layout pass.
- Crew streaks.
