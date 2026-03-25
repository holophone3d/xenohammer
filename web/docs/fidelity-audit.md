# XenoHammer Web Fidelity Audit

Generated: 2026-03-25

Scope: compare the original C++ game in `E:\Source\xenohammer\` against the current web rewrite in `E:\Source\xenohammer_2026\web\`.

This is an analysis-only report. No fixes were applied as part of this audit.

## Purpose

This document is meant to drive the web rewrite toward maximum behavioral and presentation fidelity. It focuses on:

- gameplay behavior
- timing and speeds
- asset usage and omissions
- UI and menu fidelity
- known remaining gaps
- likely false positives from earlier audits that are already fixed

## Method

The audit was based on:

- direct comparison of the original C++ source, especially `GUI.cpp`, `GameManager.cpp`, `PlayerShip.cpp`, `Projectile.cpp`, `Sound.cpp`, `Console.h`, and related gameplay files
- direct comparison of the current web code, especially `web\src\game\GameManager.ts`, `Player.ts`, `Enemy.ts`, `Projectile.ts`, `Weapon.ts`, `AI.ts`, `CapitalShip.ts`, `Boss.ts`, `HUD.ts`, and `web\src\data\ships.ts`
- inspection of `assets\manifest.json`
- reference screenshots under `assets\reference_screenshots\`
- cross-check against prior session findings, correcting any stale conclusions that no longer match the current codebase

## Executive Summary

The current web build is already strong on core structure and much of the feel:

- movement scaling via `VELOCITY_DIVISOR = 32` is in place
- player banking, projectile lookup tables, missile homing, major enemy/boss architecture, customization flows, level intro text, save/load semantics, shield bubble, RU glow, and most menu plumbing are present
- HUD console sprite usage and health bar color formulas are aligned with the C++ direction

The highest-value remaining fidelity risks are now concentrated in a smaller set of areas:

1. gameplay balance mismatches in weapon/fire-rate behavior
2. a few remaining ready-room and UI presentation differences
3. missing end-of-level text animations
4. missing frigate turret animation assets, despite animation code already existing
5. a short list of items that need manual verification in live play, not blind code edits

## Current-State Items Verified as Already Fixed

These are important because some earlier audit notes would now be stale.

### Already present in current web build

- **Level intro animation is implemented**
  - `web\src\game\GameManager.ts:157-174` loads `in_game_*` level intro assets
  - `web\src\game\GameManager.ts:929-937` renders the intro frames at `(253, 200)`
- **Menu sounds are implemented and called**
  - `web\src\game\GameManager.ts:119-120` loads `MenuChange` and `MenuSelect`
  - `web\src\game\GameManager.ts` contains many `audio.playSound(...)` calls on hover and select
- **Turret angle panels are implemented in customization**
  - `web\src\game\GameManager.ts:1933-1937`
- **Game over and victory screens are implemented**
  - `web\src\game\GameManager.ts:1012-1026` renders `game_over`
  - `web\src\game\GameManager.ts:1039-1043` renders `aftermath`
- **HUD console sprite is used**
  - `web\src\game\HUD.ts:39-55`
- **HUD bar color formula is implemented**
  - `web\src\game\HUD.ts:20-35`

These should not be treated as current gaps.

## Fallbacks and Silent-Fail Behavior Still Present

This deserves explicit tracking because the stated goal is for the web build to run as-defined, not to quietly substitute placeholder behavior when content is missing.

### Summary

The current web code still contains multiple fallback paths and silent-fail paths.

The main patterns are:

- `tryGetImage(...)` followed by alternate rendering
- `getImage(...)` wrapped in `try/catch` with `/* skip */` or `/* not available */`
- audio load/play wrapped in silent `try/catch`
- procedural stand-ins for missing assets
- text or gradient stand-ins for missing screens/images

If the project goal is **no fallbacks in shipping behavior**, then this remains an active gap.

### Core mechanism enabling fallback behavior

`web\src\engine\AssetLoader.ts`

- `getImage(id)` throws if the asset is missing
- `tryGetImage(id)` returns `null` instead of failing

That means the codebase currently supports both strict and permissive asset access, and many rendering paths choose the permissive route.

### Confirmed fallback categories

#### 1. Missing-image fallback rendering

Representative examples:

- `web\src\game\Screens.ts:11-24`
  - fullscreen image falls back to a dark gradient
- `web\src\game\Enemy.ts:150-169`
  - enemy sprite loading failure falls back to a colored rectangle
- `web\src\game\Explosion.ts:115-124`
  - missing explosion frames fall back to procedural explosion rendering
- `web\src\game\PowerUp.ts`
  - missing power-up sprite falls back to a colored rectangle
- `web\src\game\Player.ts`
  - missing shield texture falls back to alternate shield rendering path
- `web\src\game\HUD.ts:42-61`
  - missing console sprite falls back to drawn panel rectangles
- `web\src\game\StarField.ts`
  - missing earth/moon sprites fall back to non-sprite rendering

#### 2. Missing-screen fallback text or placeholder UI

Representative examples in `web\src\game\GameManager.ts`:

- `1327-1337`
  - missing `backstory` image falls back to `"Backstory image not available"`
- `1370-1380`
  - missing `briefing_lvl_*` image falls back to centered text like `"Level X Briefing"`
- `1402-1410+`
  - missing `ship_specs` image falls back to generic drawn screen content
- `1016-1024`
  - missing `game_over` image falls back to plain `"GAME OVER"` text
- `1041-1047`
  - missing `aftermath` image falls back to a blank dark screen
- `1092-1098`
  - missing `room_screen` overlay falls back to a flat greenish fill
- `316-323`, `369-376`
  - missing start/room backgrounds fall back to plain fills instead of required art

#### 3. Silent audio failure

`web\src\game\GameManager.ts` contains many silent audio guards such as:

- `try { this.audio.playSound(...) } catch { /* skip */ }`
- `try { this.audio.playMusic(...) } catch { /* skip */ }`
- `try { await this.audio.loadSound(...) } catch { /* skip */ }`
- `try { await this.audio.loadMusic(...) } catch { /* skip */ }`

Representative locations:

- `123-135` during audio loading
- `308` start-screen ambient sound
- `477`, `581`, `2172`, `2205` music playback
- many menu and gameplay SFX call sites throughout the file

Why this matters:

- missing or broken audio can silently disappear instead of failing loudly
- that makes fidelity regressions harder to detect
- it also means the game can appear to “work” while still being incomplete

#### 4. Procedural stand-ins for authored assets

Examples:

- `web\src\game\Explosion.ts`
  - procedural additive explosion/glow if authored frames are unavailable
- `web\src\game\Enemy.ts`
  - colored rectangle if sprite frames are unavailable
- `web\src\game\Screens.ts`
  - gradient background instead of authored fullscreen art
- `web\src\game\GameManager.ts`
  - text-only fallback for briefing/specs/backstory screens

These are useful for development, but they are still fallback behavior rather than strict asset-backed fidelity.

### What this means for fidelity

From a pure fidelity standpoint, these fallbacks reduce confidence in the build because:

- missing assets can be masked instead of surfaced
- broken load paths can degrade gracefully without being noticed
- placeholder rendering can make a screen seem implemented when it is only partially asset-backed

### Practical conclusion

If the desired end state is:

> all code paths should run using the defined original-inspired assets and behaviors, with no silent substitutes

then the web rewrite is **not there yet**.

The build is currently resilient, but that resilience is still partly implemented as fallback logic.

## Fidelity Snapshot

### Strong matches

#### Gameplay and physics

- `VELOCITY_DIVISOR = 32` is implemented and used broadly across movement/projectile systems
- player banking direction matches the original frame progression
- shield and armor maxima remain `300`
- shield regeneration timing is implemented with the expected cadence and damage delay behavior
- turret velocity lookup table matches the original discrete-angle approach
- missile homing behavior uses the expected delayed activation and tracking logic
- player weapon spawn offsets are aligned to the original offsets

#### Audio and music structure

- the project correctly uses the original two-track music model: level music plus boss music
- boss music transition logic exists
- engine sound, ambient sound, and menu/UI sound concepts are present

#### UI/screens with good structural parity

- ready room has the three core interaction zones
- options and briefing menus are wired and navigable
- customization has correct system hit-zones and a working preview area
- ship specs, difficulty, game over, and victory screens exist

## Confirmed Remaining Gaps

These are the issues most likely to matter for fidelity right now.

### P0 - gameplay-affecting mismatches

#### 1. Enemy light/heavy blaster damage is too high in web

- C++ reference: base enemy blaster damage is `5`
- Web current state: `web\src\data\ships.ts:133-140`
  - `enemyBlast.damage = 15`

Why this matters:

- this materially changes incoming damage and the feel of early combat
- it is not a cosmetic gap; it affects balance and survivability

Confidence: **high**

#### 2. Player fire cadence likely differs from the original unified 150ms gate

C++ behavior, from `PlayerShip.cpp`, strongly suggests that the player fire input is globally gated every `150ms`, after which all enabled weapons attempt to fire in that window.

Web current state:

- `web\src\game\Player.ts:158` loops weapons individually
- `web\src\game\Weapon.ts:67-74` gates firing per weapon instance using each weapon's own `fireRate`

Why this matters:

- it can change overall DPS cadence and the rhythm of the ship
- even if single-weapon stats are correct, the combined firing feel may be too permissive

Confidence: **high on mismatch risk**

Recommended review: verify against live C++ behavior before changing, because this is a feel-critical system.

#### 3. Gunship enemy cannon fire rate appears too slow in web

Evidence from audit:

- C++ gunship cannon rate effectively resolves to `250 / get_power_MUX(...)`
- with the gunship power-cell setup, that likely lands at `125ms`
- Web current state in `web\src\data\ships.ts` sets `enemyCannon.fireRate = 250`

Why this matters:

- gunships may feel noticeably less threatening than the original
- this compounds with other gunship behavior issues if any remain

Confidence: **high**

### P1 - presentational or systemic fidelity gaps

#### 4. End-of-level typewriter/outro animations are still not wired

Current state:

- level intro start text is wired
- there is no evidence in current web code that `in_game_9` through `in_game_22`, `in_game_end2`, or `in_game_empty` are used
- search in `web\src\game\GameManager.ts` shows no usage of the end-of-level asset IDs

Why this matters:

- the original has stronger transition presentation between phases
- these animations are part of the original game's pacing and tone

Confidence: **high**

#### 5. Ready room still misses some original notification behavior

Confirmed missing or differing items:

- the original shows **"NEW!"** near ship customization (`GUI.cpp:208`)
- the original shows **"New Level Briefing Available!"** near briefing (`GUI.cpp:213`)
- the original shows a **death/restarted** bottom message in the ready room (`GUI.cpp:202`)

Current web state:

- the ready room core zones and tooltip behavior exist
- the exact original notification set is not fully mirrored

Why this matters:

- these are small but distinctive parts of the room's original UX
- they contribute to the "old Windows executable" feel the project is targeting

Confidence: **high**

#### 6. Menu/room headline text sizing is still somewhat below original `large_font` feel

C++ references:

- ready room and options labels are rendered with `large_font`
- examples:
  - `GUI.cpp:114`
  - `GUI.cpp:130`
  - `GUI.cpp:359-364`

Current web state:

- options menu was recently increased, but remains an approximation
- some ready room hover labels still appear smaller than the original `large_font` presence

Why this matters:

- this is a fidelity issue more than a correctness issue
- it affects how "era-authentic" the menus feel

Confidence: **medium-high**

#### 7. Projectile culling is more forgiving than the original

C++ behavior:

- projectiles die once out of the play bounds

Web behavior:

- `Collision.ts` uses a `64px` margin for out-of-bounds checks

Why this matters:

- low gameplay impact
- but it is a real physics/presentation deviation near the edges of the screen

Confidence: **high**

### P1/P2 - asset/export fidelity gaps

#### 8. Frigate turret animation logic exists, but the frame assets are missing

Current web code:

- `web\src\game\CapitalShip.ts:34` defines `TURRET_TURN_RATE = 65`
- `web\src\game\CapitalShip.ts:47` defines `TURRET_SPRITE_FRAMES = 33`
- `web\src\game\CapitalShip.ts:177-183` attempts to load turret frames

Asset reality:

- no `assets\graphics\gun_turret*` frame set is present in the converted assets
- manifest only has the single turret-related entries already known, not a complete rotating frame export set

Why this matters:

- the code is ready, but the asset pipeline does not currently provide the full original visual behavior
- this is best treated as an **asset/export gap**, not a logic gap

Confidence: **high**

#### 9. Some original transition/UI assets remain unused

Notable currently-unused or not-fully-used assets with fidelity value:

- end-of-level typewriter assets
- some menu/briefing-related overlays depending on exact current fallback paths

Lower-priority or optional fidelity assets:

- some alternate sprites and miscellaneous art from the session asset audit

Confidence: **high**

## Manual Verification Queue

These should be reviewed in play before changing code.

### 1. LightFighter targeting/firing window

Current web state:

- `web\src\game\AI.ts:59` uses `FIRE_RANGE = 200`
- the original appears to use a different targeting condition than a simple radius

Why verify first:

- this is exactly the kind of change that can make enemies feel wrong even when constants look plausible in code
- a play-test against the original behavior is the right next step

### 2. Player unified-fire interpretation

The code comparison strongly suggests a global `150ms` gate in the original, but this should still be confirmed against observed original gameplay rhythm before implementing.

### 3. Gunship feel after rate/damage review

If enemy blaster damage and gunship cannon cadence are corrected, gunship encounter feel should be reassessed as a combined package, not as isolated constants.

### 4. Boss/frigate encounter parity

The large boss/frigate systems are structurally present, but they remain too complex to trust from static code review alone. They should be verified with focused play-throughs and screenshot/video comparison.

### 5. Exact font metrics and vertical alignment

The project has already improved several UI fonts and offsets. Remaining text discrepancies are now mostly metric/presentation issues, which are best tuned against screenshot comparisons rather than inferred only from code.

## Asset and Audio Notes

### Good current-state findings

- two-track music structure matches the original design
- menu sounds are loaded and actually used
- level intro assets are now wired correctly
- console sprite is used in HUD
- turret angle panel art is already integrated in customization

### Important remaining asset questions

- whether the original frigate turret frame set can be exported or reconstructed into the web asset pipeline
- whether any additional transition assets beyond the current intro set should be surfaced

### OGG vs MP3 note

The original references OGG music files, while the web build currently loads MP3 variants. This is not, by itself, a fidelity bug if the audio content is the same master and playback behavior is correct. Treat this as a packaging choice unless an audible difference is confirmed.

## Key Constants and Behaviors Worth Preserving

These remain important anchors for all future fidelity passes:

- screen: `800x600`
- play area: `650x600`
- HUD/console width: `150`
- movement formula: `(velocity * dt_ms) / 32`
- player shield and armor maxima: `300`
- level intro start text:
  - delay around `600ms`
  - `100ms` per frame
  - draw position `(253, 200)`
- shield/armor bar color formulas from `GUI.cpp`
- discrete turret angle velocity table, not trig-driven firing
- old-exe save/load behavior:
  - fresh launch/refresh = fresh session
  - explicit save/load only writes/reads local storage

## Recommended Review Order

For the next human review pass, the highest-value order is:

1. verify enemy blaster damage against the original
2. verify player unified fire cadence against the original
3. verify gunship cannon cadence
4. decide whether end-of-level text animations are required for the next fidelity milestone
5. decide whether to prioritize ready room notification polish or frigate turret asset recovery first

## Suggested Backlog from This Audit

### Highest priority

- correct `enemyBlast.damage`
- confirm and, if appropriate, implement original player unified-fire cadence
- confirm and likely correct gunship cannon fire cadence

### Medium priority

- implement end-of-level typewriter/outro animations
- restore ready room `"NEW!"`, briefing-available, and death/restarted messaging
- continue menu/room font-size tuning against screenshot references

### Lower priority

- tighten projectile culling to original bounds
- recover/export frigate turret animation frame assets
- sweep remaining unused original UI/transition assets for fidelity value

## Conclusion

The web rewrite is no longer in a "missing whole systems" phase. It is in a much tighter and more interesting phase: **high overall parity with a short list of meaningful remaining deviations**.

The biggest current risks are no longer broad architecture problems. They are:

- a few balance-critical numbers
- one likely fire-cadence difference
- a handful of presentation cues that still matter a lot to the game's identity
- an asset export gap for frigate turret animation

That is a good place to be. The next round should be driven by targeted review of the items above rather than broad rework.
