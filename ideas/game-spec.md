# Arcane Akash — Game Spec

## One-liner
A voice-only spell duel where two players take turns shouting spells at each other, watching their avatars battle it out on screen.

## Core Loop
1. Two avatars face each other on screen
2. **Attacker** speaks a spell from the visible spellbook
3. **Defender** has a countdown (2–3 seconds) to speak a counter-spell
4. The result plays out as an animation on screen (hit, block, special effect)
5. Roles swap — the defender is now the attacker
6. One successful hit = death = round over
7. First to X round wins = game over

## Input
- **Voice only.** No keyboard, no controller during gameplay.
- Each player's turn is distinguished by the turn structure itself (attacker / defender alternation).
- A single physical button per player (one key each) could be used solely to "confirm ready" before a round starts, but all in-game actions are voice.

## What's on screen
- Two character avatars (Akash vs Evil Akash / alt skin)
- The current spellbook: a visible list of available spells and what they do
- Whose turn it is (ATTACK / DEFEND label)
- A countdown timer for the defender's response window
- Round score tracker

## Spells & Counterplay
Spells fall into categories:

| Type     | Examples             | Beats              | Loses to           |
|----------|----------------------|---------------------|--------------------|
| Attack   | Fireball, Lightning  | Unshielded opponent | Shield, Absorb     |
| Defend   | Shield, Dodge        | Incoming attacks    | Curse, Hex         |
| Disrupt  | Hex, Curse           | Defensive spells    | Direct attacks     |

- The attacker picks from attack or disrupt spells
- The defender picks from defend or disrupt spells
- If the defender fails to speak in time, the attack lands automatically

## Volume mechanic
The microphone doesn't just detect *what* you say but *how loud* you say it:
- **Attack spells** benefit from volume — shout a fireball, it hits harder (could mean: faster countdown for opponent, or breaks through a weak shield)
- **Defend spells** benefit from calm delivery — a clearly spoken shield is stronger than a panicked scream
- This creates a natural tension: attackers want to intimidate by yelling, defenders need composure under pressure

## Spell Hijack (Disrupt mechanic)
When a disrupt spell lands:
- The opponent's spellbook visually scrambles for one turn
- Spell names shuffle or get renamed (so "Shield" might display as "Blast" and vice versa)
- The opponent has to remember what's what, or guess wrong and cast the wrong spell
- This is the command hijack element: you're corrupting their interface

## Round structure
- Each round: random starting attacker
- Turns alternate until someone lands a hit
- Between rounds: brief reset, spellbook may rotate in new spells to keep it fresh
- Game: first to 3 (or 5) round wins

## What we are NOT building
- No movement or positioning of characters
- No fog of war or hidden information (shared screen, shared spellbook)
- No keyboard gameplay — keys only for pre-round ready-up at most
- No simultaneous speech — strict turn alternation solves the "who is talking" problem
- No server — runs entirely in browser

## Tech approach
- **Web Speech API** for voice recognition (Chrome)
- **Web Audio API** for volume/amplitude detection
- Small vocabulary of spell names — optimize recognition for just those words
- Game logic is a simple state machine: WAITING → ATTACK_TURN → DEFEND_COUNTDOWN → RESOLVE → swap
- Animations can be CSS/canvas — the characters don't need complex movement, just spell effect animations

## Open questions
- Exact spell list and counter matrix — keep it small to start (3–4 spells), expand if time allows
- How much does volume actually affect outcomes? Needs playtesting.
- Do spells rotate between rounds or stay fixed?
- Art style: pixel art? Simple vector? AI-generated Akash portraits?
