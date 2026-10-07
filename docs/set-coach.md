# Between-set coach (spec)

During each rest the coach names **one focus** for the next set, based on the set just done; the next set checks it, and "Focus kept" is celebrated. The rule-based layer always works; the AI only rewrites the wording.

## Focus, picked from the set just done (first match wins)

| Focus | When | Card title | Kept in the next set when |
|---|---|---|---|
| `frame` | left the frame at least once | Stay in frame | no step-back cue |
| `depth` | a too-shallow rep, or depth faded ≥ 8° from the first to the second half | Full depth | no too-shallow rep and no fade |
| `tempo` | a rushed rep (the "slow down" cue) | Slow it down | no rushed rep |
| `keep` | otherwise (a clean set) | Same again | no cue at all |

A set cut short with Finish is not checked (it didn't reach its reps). Jumping jacks only ever get `frame` or `keep` (they have no depth or tempo cues).

## Timing during rest (rest ≥ 20 s; every rest choice is ≥ 30 s)

1. Rest starts: the **Coach card** shows the rule-based line at once. Voice: "Focus kept!" (if the last focus was kept) or the usual rest line, then a fixed focus clip ("Next set, every rep to full depth.").
2. The TV asks the relay for an AI rewrite (`set-coach`). If it arrives while still resting the same set, the card shows it (marked "AI coach").
3. Halfway: the AI line is spoken if it's ready (Polly, Matthew); otherwise the usual rest-mid clip. An AI line arriving after halfway is spoken only with more than 8 s of rest left.
4. A late reply (after Skip rest, Finish, or a newer rest) is ignored.

## Messages (additive; the live 1.0.0 app's messages are unchanged)

- TV → relay: `{action: "set-coach", exercise, set, sets, focus, line, facts: {reps, target, shallow, rushed, leftFrame, depthFirst, depthLast}, name?}` (`set` = the set the focus is for).
- Relay → TV: `{type: "set-coach", set, line, clip}` or `{type: "set-coach", set, line: null}` when the model fails or is rejected.
- `clip` is `line-<16 hex>`; the site serves `/audio/line-<id>.mp3` read-only from DynamoDB (`LINE#<id>`, 1 h TTL). The id is random because the line may contain the player's name.

## Limits

- TV connections only; one request per 15 s per connection (a set takes longer); 500 lines a day across all TVs (`QUOTA#setline#<date>`), separate from the name-clip quota.
- Model reply: one sentence, ≤ 160 characters and ≤ 25 words; numbers only from the facts and every number of the rule-based line kept; the banned-topic list from the summary coach.
- 8 s model timeout. Any failure: the TV keeps the rule-based line and the fixed clips.
- `SET_COACH_AI` in `tv-app/src/config.ts` turns off the AI request; the rule-based coach stays.

## Saved

Each player's progress per exercise counts focuses kept (`focusKept`); the summary shows "Focus kept 2 of 2".
