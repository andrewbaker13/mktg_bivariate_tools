WORK ORDER (Coding LLM): Build “Live Buzzer” Tool (WebSockets, No DB)
0) What this is (and is not)

This is NOT a new minigame. It is a separate host-run tool that happens to be launched from the same host area as minigames. Treat it as its own standalone mode/component with its own state machine, UI, and socket events.

You may reuse concepts / code patterns from SpeedTap (especially anything around round lifecycle, real-time updates, and simple leaderboards), but do not force it into the minigame architecture if that creates coupling.

1) Core user story

Host wants a Jeopardy-style buzzer:

Host controls when buzzing is allowed (green) vs not allowed (gray).

Players buzz once.

Host sees a reliable order of buzz-ins.

Players who press early are disqualified that round and get a small delay penalty next round.

2) System constraints

Real-time transport: WebSockets (existing infrastructure).

No database persistence required for rounds/buzzes/penalties.

Everything can be stored in server memory per room (and mirrored to clients).

If the server restarts, state can reset safely.

Still use existing join/auth/session behavior (guest/login) exactly as current system does.

3) Host UI + Round State Machine (Reset → Arm → Enable)
3.1 Host states

Implement explicit phases:

RESET (default / round ended)

Players: LOCKED.

Host order board shows final results for the round that just ended:

Ranked buzzers

False starts at bottom

No-buzz players at bottom

Next action: ARM.

ARM (prepare next round)

Clears board for new round.

Increments roundNumber.

Sets current round to LOCKED.

Clears “buzzed this round” for all players.

Clears “disqualified this round” for all players.

Does NOT clear “carry penalty next round” if it was earned last round (penalty is meant to apply to this next round).

Next action: ENABLE.

ENABLE (schedule release)

Schedules a future release time:

leadTimeMs constant: prefer 250ms, allow bump to 500ms if stability needs it.

releaseAtServerMs = serverNowMs + leadTimeMs

Broadcast release info to all players.

Clients flip to LIVE at the scheduled moment (plus any penalty delay).

After enabling, next action: RESET (ends the answering window).

3.2 Host board sections (always visible)

Host board should be structured into 3 groups:

Buzz Order (Ranked) — all valid buzzes sorted by time.

False Starts (Disqualified) — players who pressed while locked this round, X-ed out with note.

No Buzz — players who did not buzz this round (only “finalized” as no-buzz when host hits RESET).

During LIVE, No Buzz section can show “Not buzzed yet” live as a dynamic list.

4) Player UI + States
4.1 Button states

LOCKED

Gray button, text “DON’T PRESS”.

If pressed after ARM (during locked window): triggers false start.

LIVE

Green button, text “BUZZ IN”.

Player can press once.

Immediately show “LOCKED IN” upon press (don’t wait for rank).

DISQUALIFIED (this round)

If false-started, player is out for the round:

Show “FALSE START — OUT THIS ROUND”

Button disabled (stays gray)

ROUND ENDED

When host hits RESET, players who have not buzzed see:

“NO BUZZ THIS ROUND”

They should still be able to see Top 3 results (once known).

4.2 Player results display rules

Once leaderboard is available (or as it updates):

Always show Top 3 (names + ranks).

If player buzzed:

Show “You are #k” once rank determined.

If player didn’t buzz and round ended:

Show “You: No buzz this round”

If player rank > 3:

Show Top 3

show “…”

show “You: #k”

optionally show last place if different from You

5) False Start + Penalty Rules (Precise)
5.1 False start detection window

A “false start” is any press while LOCKED after host presses ARM for this round and before the button becomes LIVE (or before RESET ends it).

5.2 Immediate effects (current round)

If a player false-starts:

They are disqualified for this round:

They cannot buzz during LIVE this round.

Host board places them at bottom under “False Starts” with note “False start (pressed while locked)”.

Player UI shows “OUT THIS ROUND”.

5.3 Next-round penalty

False start also creates a one-time next-round penalty:

carryPenaltyNextRound = true

Penalty does not stack (additional locked presses show “already penalized”).

Penalty applied at the next round’s ENABLE:

Their button becomes LIVE 250ms later than the shared release moment.

After penalty is applied once, it clears automatically.

5.4 Clearing rules

Disqualification clears on ARM (new round).

Penalty persists across exactly one round boundary until it is applied once.

Penalty is cleared after it has been applied (even if they do not buzz).

6) Fairness + Timing Architecture (Client-estimated server time)
6.1 Scheduled release (fairness-first)

Host ENABLE schedules a future release (releaseAtServerMs) so all clients can prepare and flip at nearly the same moment.

6.2 Time sync via WebSockets

Implement basic clock offset estimation:

Client sends: TIME_PING { clientSendMs }

Server responds: TIME_PONG { clientSendMs, serverNowMs }

Client captures clientReceiveMs and estimates:

rttMs = clientReceiveMs - clientSendMs

owdMs = rttMs / 2

offsetMs = serverNowMs - (clientSendMs + owdMs)

Keep rolling estimates (e.g., last 5); use median or “lowest RTT wins”.

Run sync:

on join

on ARM

right before/after ENABLE broadcast

optionally every 10–15 seconds while tool is open

6.3 Buzz capture + ranking

On buzz press (only if eligible):

Client computes pressServerMsEstimate = clientNowMs + offsetMs

Send: BUZZ { roundId, playerId, pressServerMsEstimate }

Server sorts valid buzzes by:

smallest pressServerMsEstimate - releaseAtServerMs

tie-breaker: server receive order

Server broadcasts leaderboard snapshots to host + players.

7) In-memory state only (no DB)

Maintain per-room state in server memory:

7.1 Room buzzer state

phase (RESET/ARMED/LIVE_SCHEDULED/LIVE)

roundId

roundNumber

releaseAtServerMs

leadTimeMs

7.2 Per-player fields (per room)

hasBuzzedThisRound

isDisqualifiedThisRound

carryPenaltyNextRound

penaltyAlreadyEarnedThisRound (optional helper)

buzzPressServerMsEstimate (if buzzed)

7.3 Leaderboard assembly

At any moment compute:

rankedBuzzers[]

falseStarts[]

noBuzzYet[] (live) / noBuzzThisRound[] (after RESET)

No need to store historical rounds beyond the current round; board persistence across RESET→ARM is just the final board for that one round until ARM clears it.

8) Integration guidance: reuse SpeedTap patterns where helpful

Look at SpeedTap for:

Socket event patterns and payload conventions

“Round lifecycle” UI transitions

Real-time list/leaderboard rendering

Host vs player view separation

But implement Live Buzzer as:

A distinct tool/mode/component

With its own socket namespace/events if cleaner

Without polluting minigame scoring / DB tables

9) Concrete socket events (suggested names)

LIVE_BUZZER_ENTER / LIVE_BUZZER_EXIT (optional)

LIVE_BUZZER_ARM

LIVE_BUZZER_ENABLE (server emits scheduled release)

LIVE_BUZZER_RESET

LIVE_BUZZER_TIME_PING / LIVE_BUZZER_TIME_PONG

LIVE_BUZZER_FALSE_START

LIVE_BUZZER_BUZZ

LIVE_BUZZER_STATE (server broadcasts authoritative snapshot)