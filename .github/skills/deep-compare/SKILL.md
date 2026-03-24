---
name: deep-compare
description: >
  Deep comparative audit between original C++ XenoHammer game code and the
  TypeScript/Canvas web rewrite. Use this skill when asked to compare, audit,
  port, verify, or debug differences between the C++ and web implementations.
  Also use when fixing gameplay bugs that may stem from porting inaccuracies.
  Encodes 21 sessions of hard-won lessons across every game system.
---

# Deep Compare — C++ ↔ Web Audit Skill

## Purpose

This skill performs a systematic, line-by-line comparison between the original
C++ XenoHammer source (`E:\Source\xenohammer\`) and the web TypeScript rewrite
(`web/src/`). It produces authoritative findings with exact values, identifies
discrepancies, and recommends fixes.

This skill encodes learnings from 21 iterative audit sessions covering: velocity
scaling, sprite systems, collision detection, boss fight state machines, capital
ships, wave spawning, UI/menus, audio, input handling, visual effects, and more.

## Source Locations

| Track | Path | Language | Notes |
|-------|------|----------|-------|
| Original C++ | `E:\Source\xenohammer\` | C++ / ClanLib 0.6.x | READ-ONLY reference |
| Web rewrite | `E:\Source\xenohammer_2026\web\src\` | TypeScript / Canvas | Active development |
| Shared assets | `E:\Source\xenohammer_2026\assets\` | PNG, WAV, OGG/MP3 | Converted from PCX |
| Game spec | `E:\Source\xenohammer_2026\SPEC.md` | Markdown | Authoritative reference |
| Reference screenshots | `E:\Source\xenohammer_2026\assets\reference_screenshots\` | PNG | 10 original game captures |

## Key C++ Source Files

| File | Contents | Lines |
|------|----------|-------|
| `Boss.cpp` | Boss constructor (38 components), state machine, collision, destruction, turret firing | ~800 |
| `GL_Handler.cpp` | Shield bubble, energy beams/glows, particles, boss energy effects, OpenGL rendering | ~1200 |
| `GameManager.cpp` | Game loop, state machine, `make_engine()`, level animations, entity management | ~1945 |
| `PlayerShip.cpp` | Player update, banking frames, weapon offsets, shield regen | ~400 |
| `GameObject.cpp` | Base `show()` with VELOCITY_DIVISOR scaling, frame animation | ~300 |
| `Projectile.cpp` | Velocity lookup table (8-angle), homing logic, projectile update | ~250 |
| `TurretAI.cpp` | AI types: NORMAL, RANDOM, SWEEPING, FIXED; `CalculateHeading()`, `Think()` | ~200 |
| `Weapon.cpp` | `fire()` method (2-param and 4-param overloads), weapon damage, spawn position | ~150 |
| `FrigateAI.cpp` | 6-state machine (ENTERING→STRAFING↔CHARGING↔RETREATING→SITTING→RUNAWAY) | ~300 |
| `Sound.cpp` | Music/SFX mapping (only 2 music tracks!) | ~150 |
| `GUI.cpp` | ALL menu/UI screens, HUD, customization, briefing, tooltips | ~2460 |
| `Console.h` | HUD bar position constants (C_SHIELD_X, C_ARMOR_X, etc.) | ~50 |
| `GameAnimation.h` | Level intro frame animation (100ms/frame) | ~30 |
| `Ship.cpp` / `CapitalShip.cpp` | Base ship classes, component management | ~200 |
| `ShipComponent.cpp` | Component collision, damage, visibility, damageable flag | ~150 |
| `explosionGenerator.cpp` | `MakeExplosions()` — 5 trails × (4 small + 1 big) = 21 explosions per call | ~100 |

## Web Source Structure

| File | Contents | Lines |
|------|----------|-------|
| `game/Boss.ts` | Boss fight — all components, state machine, rendering, energy effects | ~1600 |
| `game/GameManager.ts` | Game loop, entity management, collision, customization, debug menu | ~2100 |
| `game/CapitalShip.ts` | Frigate with FrigateAI 6-state machine, TurretAI, turret fire formula | ~733 |
| `game/Player.ts` | Player ship, banking, weapons, shield bubble, engine flame | ~273 |
| `game/Enemy.ts` | Enemy types (LightFighter, FighterB, Gunship), AI | ~400 |
| `game/Projectile.ts` | Projectile movement, velocity scaling, homing | ~200 |
| `game/Weapon.ts` | Weapon types, fire logic | ~150 |
| `game/Collision.ts` | Collision detection (sprite masks) | ~100 |
| `game/HUD.ts` | HUD rendering, bar colors, power cells | ~300 |
| `game/StarField.ts` | Parallax stars + Earth/Moon celestial bodies | ~200 |
| `game/Wave.ts` | Wave spawning definitions | ~100 |
| `game/PowerPlant.ts` | Power management (shields, engines, weapons) | ~100 |
| `game/PowerUp.ts` | Power-up pickups | ~80 |
| `data/ships.ts` | VELOCITY_DIVISOR, TURRET_VELOCITY_TABLE, ship/weapon configs | ~220 |
| `data/levels.ts` | All 140 waves transcribed from C++ across 3 levels | ~231 |
| `engine/Canvas.ts` | Canvas rendering abstraction, CSS scaling | ~150 |
| `engine/Input.ts` | Keyboard/mouse input with pressedQueue for race conditions | ~150 |
| `engine/Audio.ts` | Web Audio API for music + SFX, autoplay policy handling | ~195 |
| `engine/Sprite.ts` | Sprite rendering, animation, collision masks | ~250 |
| `engine/Particles.ts` | Particle system (engine flame, explosions) | ~200 |
| `engine/AssetLoader.ts` | Async asset batch loading | ~100 |

## Audit Methodology

### Phase 1: Extract C++ Values

For each system being audited, read the C++ source and extract EVERY concrete
value. Do not summarize or paraphrase — record exact numbers.

**What to extract:**
- Constructor parameters (position offsets, armor, shields, damageable flag)
- Timing constants (ms intervals, speeds, delays)
- State machine transitions (conditions, what changes on transition)
- Collision priority order (which component is checked first/last)
- Draw order (which component is rendered first/last)
- AI parameters (type, fire rate, turn rate, behavior)
- Sprite frame counts and animation intervals
- Explosion positions (exact pixel offsets)
- Visual effect parameters (colors, sizes, alpha values, positions)
- Sprite names and frame numbering conventions

### Phase 2: Extract Web Values

Read the corresponding TypeScript source and extract the same values.

### Phase 3: Cross-Reference

Build comparison tables. For each value, note:
- ✅ Match — values are identical
- ⚠️ Close — values differ slightly but intentionally (document why)
- ❌ Mismatch — values differ and need fixing

### Phase 4: Document & Fix

- Update SPEC.md with authoritative values from C++ source
- Fix web code where mismatches are found
- Document intentional deviations with rationale
- Test with Puppeteer screenshots and compare against reference screenshots

---

## Critical C++ Patterns

### 1. Velocity Scaling (VELOCITY_DIVISOR = 32)

ALL movement in C++: `actual_px = (velocity × dt_ms) / 32`

```cpp
// From GameObject::show()
x += (int)((float)dx * (float)(frameTic - lastFrameTic)) / 32;
y += (int)((float)dy * (float)(frameTic - lastFrameTic)) / 32;
```

Web equivalent: `moveScale = dt * 1000 / 32`

At 60fps (dt≈16.67ms): moveScale ≈ 0.52. This effectively HALVES all velocities.

**Exception — Celestial bodies:** Earth/Moon use `show(32, 600)` — YSCALE=600
instead of 32, giving Y velocity = `(dy × dt_ms) / 600`. Earth dy=30→50px/s,
Moon dy=18→30px/s.

### 2. Tick-Based Timing Pattern

C++ uses `if(tic - nLastX >= interval)` with `nLastX -= interval` (NOT `nLastX = tic`).
This is an `if`, not a `while`, so only ONE tick processes per frame.

**CRITICAL:** Watch for accumulated time drift. If `nLastX` is set long before the
timing check runs (e.g., set in constructor, checked 110s later), the check passes
every frame until caught up, effectively running at frame-rate speed instead of the
intended interval.

Example: Boss entering speed is 1px/100ms in code, but `nLastMove` is set 110s
before entering begins, so it actually runs at ~1px/frame ≈ 60px/s at 60fps.

### 3. ClanLib Coordinate System

- Y increases downward (standard screen coordinates)
- Screen: 800×600; Play area: 650×600 (left); HUD: 150×600 (right, x=650-800)
- `get_x()` / `get_y()` return absolute screen position
- Component offsets are relative to parent ship origin
- `set_visible(false)` = component is NOT drawn AND NOT collision-checked
- `set_damageable(false)` = accepts no damage but may still be drawn

### 4. Component Offset Pattern

```cpp
Component = new ShipComponent(x_offset, y_offset, damageable, shields, armor, parent, manager);
```

Screen position = `parent.get_x() + component.get_x_offset()`,
                  `parent.get_y() + component.get_y_offset()`

### 5. Weapon Fire Position Chain

```cpp
// Weapon::fire() adds its own stored offset to the passed position
fire_x = _x + offset_x;  // offset_x set in Weapon constructor
fire_y = _y + offset_y;
```

For boss turrets: weapon offset = `turret_offset + 16` (NOT center of turret +32).
Full chain: `boss_x + direction_offset + weapon_offset`.

### 6. Turret Frame-to-Angle Conversion

```cpp
rad = (frame - 8) / 32.0 * 2π;
x_off = cos(rad) * 24;
y_off = sin(rad) * -24;
```

Frame 0 = down, Frame 8 = right, Frame 16 = up, Frame 24 = left.

### 7. CalculateHeading (C++ has a typo)

```cpp
if(xoffset < 0) target_rad += 3.1514926;  // NOTE: typo, should be 3.1415926
```

Also includes a rounding offset of +0.0982 radians before int cast, and +8 frame
shift with %32 wrap. Web uses `Math.PI` (correct). Difference ≈ 0.57°, negligible.

### 8. Collision Detection (Sprite-Level)

C++ `ShipComponent::collision_update()` checks:
1. Component is not NULL
2. Component is damageable (`set_damageable(true)`)
3. Projectile overlaps component bounds (ClanLib sprite collision)
4. If hit: apply damage to shields first, then armor; return true

Priority order = the order components are checked in `collision_update()`.
First match wins (returns true, stops further checks).

**Web implementation:** Sprite-level collision masks built from actual sprite
images using offscreen canvas + getImageData. Each pixel becomes 1 byte
(0=transparent, 1=opaque). This avoids the ugly bounding-box rectangle flash
when bullets hit near sprite edges.

### 9. Cascade Destruction Pattern

When a component is destroyed, related components are:
- `set_visible(false)` — stop drawing entirely (do NOT draw destroyed frame)
- `set_damageable(false)` — stop accepting damage
- Counter decremented (e.g., `orbCount--`)

Boss connector mapping: Orb0→[connector0], Orb1→[connector0,connector1],
Orb2→[connector1,connector2], Orb3→[connector2].

### 10. GL_Handler Visual Effects

GL effects are drawn in a SEPARATE pass from sprites. They use:
- Additive blending (`GL_SRC_ALPHA, GL_ONE`) → Canvas: `globalCompositeOperation = 'lighter'`
- `createTriangleStrip(x, y, x1, y1, offset_x, offset_y)` draws a textured quad
- Colors are `(R, G, B, Alpha)` with alpha often tied to game state variables
- Positions are absolute screen coordinates (boss position + component offset)

**Important:** GL_Handler uses inverted Y for OpenGL: `y = -tempCap->get_y()-offset`.
Canvas Y is normal (increases downward). Must convert correctly.

### 11. Player Banking Frame System

Frame 0 = banked RIGHT, Frame 8 = center (neutral), Frame 16 = banked LEFT.
Moving RIGHT → frame-- (toward 0); Moving LEFT → frame++ (toward 16).
This is COUNTER-INTUITIVE — moving right shows the ship banked right.

### 12. Projectile Velocity Lookup Table (8-Angle)

Turret bullets use a discrete 8-direction table, NOT trigonometry:
```
Frame 0 (down):   dx=0,  dy=speed
Frame 4 (right):  dx=speed, dy=0
Frame 8 (up):     dx=0,  dy=-speed
Frame 12 (left):  dx=-speed, dy=0
// Diagonals at frames 2,6,10,14 use ±speed*0.707
```
Enemy blasters always fire with angle = 0 (straight down), NOT 180°.

### 13. Projectile Frames = Power Levels

```cpp
set_curr_frame(WeaponPower->get_power_cell_2() - 1);
```

Frame is set ONCE at projectile creation (NOT animated). power_cell_2 range 1-5,
frame index 0-4. Different frames may have different sprite dimensions, so
Sprite.setFrame() must update width/height.

### 14. Explosion System (MakeExplosions)

`MakeExplosions()` creates 5 trails of (4 small + 1 big) = 21 total explosions:
- Trail positions: 5 random offsets from source center
- Trail velocity: random spread for SPAWN positions only
- Actual explosion velocity: `source_dx / 2` (which is 0 for stationary boss)
- Small explosions: SmallExp sprite, Big: BigExp sprite
- Both types: sprite animation + particle burst + additive glow

### 15. FrigateAI 6-State Machine

```
ENTERING → STRAFING ↔ CHARGING ↔ RETREATING → SITTING → RUNAWAY
```

Constants from C++:
- MAX_SPEED=6, DRAG=0.95, ACCEL=0.2
- ACCEL_RATE=100ms, FAI_FIRE_RATE=3000ms, SCREEN_TIME=60000ms
- Nose fires only within 64px x-alignment of player
- Shortest-path turning: compare 3 frame candidates with wrapping

### 16. Wave Type Mapping

```
type 0 = LIGHTFIGHTER
type 1 = HEAVYFIGHTER (NOT gunship!)
type 3 = Frigate (capital ship)
type 4 = Boss
```

Gunships are 30% random spawns per wave (not a wave type).

Spawn formula: X = startX + i (1px offset per ship), Y = -(i × 64) (64px vertical stagger).

### 17. Fire Rate Separation

AI controls WHEN to fire (timing interval per ship type):
- LightFighter: 400ms, FighterB: 1000ms, Gunship: 600ms per burst shot
- Weapon fire rate is a SECONDARY gate (minimum interval between shots)
- Both conditions must be met to fire

### 18. Music System

Only TWO music tracks in the entire game:
- `Level2.ogg` (converted to MP3) — ALL levels including menus
- `bossTEST.ogg` (converted to MP3) — Boss fight only

`start.wav` is a SFX (menu start sound), NOT music.

---

## Web-Specific Patterns

### 19. Audio Autoplay Policy

Chrome blocks AudioContext creation before user gesture. Solution:
- Defer AudioContext creation until first click/keydown event
- Queue pending play/resume operations in `_pendingResumes`
- Use Web Audio API (`AudioBufferSourceNode`) for BOTH music and SFX
- Non-blocking `loadMusic()` — don't await, let it load in background

### 20. OGG Vorbis Compatibility

Original OGG files use pre-standard Vorbis with "codebook lookup type 2"
(removed from final Vorbis spec). ALL modern browsers/decoders fail silently.

Fix: Convert to MP3 via VLC command line (VLC's internal decoder handles old formats):
```
vlc.exe input.ogg --sout "#transcode{acodec=mp3,ab=192}:std{access=file,mux=raw,dst=output.mp3}" vlc://quit
```

### 21. Canvas Scaling

Internal resolution always 800×600. CSS `transform: scale(factor)` where
`factor = Math.min(innerWidth/800, innerHeight/600)`.

Input.ts uses `getBoundingClientRect()` which handles CSS transforms automatically —
no manual coordinate conversion needed for mouse events.

### 22. Sprite Transparency (Magenta Bleed)

Original PCX files had magenta (255,0,255) at palette index for transparency.
PNG conversion preserved magenta RGB at alpha=0 pixels. Canvas anti-aliasing
bleeds the magenta color at sprite edges, causing pink halos.

Fix: Post-process ALL converted PNGs — set every transparent pixel to (0,0,0,0)
instead of (255,0,255,0). Applied to 241 sprites.

### 23. Input Race Condition

Puppeteer (and fast human input) fires keydown+keyup in the same event loop tick.
Standard `isKeyPressed()` edge detection misses these instant press+release events.

Fix: `pressedQueue: Set<string>` — keydown adds key to queue, queue is cleared at
`endFrame()`. `wasPressed(key)` checks the queue. Same pattern for mouse:
`mouseClickQueued` boolean.

### 24. Additive Blending

C++ uses `glBlendFunc(GL_SRC_ALPHA, GL_ONE)` for ALL visual effects globally.

Canvas equivalent: `ctx.globalCompositeOperation = 'lighter'`

Applied to: shield bubble, projectile glow, particle effects, explosions, energy
beams, boss energy effects. ALWAYS save/restore the composite operation.

### 25. Sprite Naming Conventions

C++ uses 1-indexed resource names but naming varies:
- Player: `PlayerSprite00` to `PlayerSprite16` (2-digit, 17 frames)
- Light Fighter: `LightF00` to `LightF31` (2-digit, 32 frames)
- Small Explosion: `SmallExp000` to `SmallExp015` (3-digit!)
- Big Explosion: `BigExp00` to `BigExp15` (2-digit)
- Blaster: `blaster_1` to `blaster_5` (1-indexed)
- Boss: `BossNode1`, `BossNode2` (1-indexed)

### 26. Earth/Moon Positioning

Both start at x=0 in C++ (NOT centered). Earth: z=150, dy=30 → 50px/s at YSCALE=600.
Moon: z=200, dy=18 → 30px/s at YSCALE=600. Moon is drawn FIRST (behind Earth).
Both are spaceObject children using show(32, 600) with the YSCALE parameter.

### 27. Dynamic Bar Colors (HUD)

```cpp
// Value ≥ 150:
R = (val * -0.015) + 4.5;  // 2.25→4.5 (decreasing as val increases)
G = 1.0;                    // always green
// Value < 150:
R = 1.0;                    // always red
G = val * 0.0066;           // 0→0.99 (increasing toward green)
```

This produces: green at max → yellow at 150 → red at 0.

### 28. Engine Flame Particles

From C++ `make_engine()`:
```
intensity = 0.4 (NOT 1.0!)
R = 1.0, G = rand(0-2)/10, B = rand(0-2)/10
angle ≈ 175° (near straight down)
speed ≈ near-zero (0.001-type values)
life = 0.003 to 0.103 seconds
position: (ship_x + 38, ship_y + 47)
```
Low intensity (0.4) prevents overbright particles when additive blending stacks.

---

## Common Discrepancy Categories

### Positions (Most Common)
- Off-by-one in offsets (e.g., +31 vs +32)
- Missing sub-offsets (e.g., weapon at turret+16 vs turret+32)
- GL_Handler Y inversion mistakes
- Sprite center vs top-left origin confusion

### Timing
- Using wrong interval (ms vs frames)
- Missing accumulated time drift effects
- `if` vs `while` for tick processing
- Timer reset (subtract interval) vs timer set (current time)

### State Machine
- Missing or wrong transition conditions
- Wrong order of checks within a frame
- Missing state-specific behavior (e.g., U-turrets only fire in FINAL)
- Missing MORPH states between boss phases

### Rendering
- Wrong draw order (components drawn over each other incorrectly)
- Missing visibility checks (`get_visible()` before drawing)
- Missing GL effects (energy beams, glows, shield effects)
- Wrong alpha/color values for effects
- Missing additive blending on effects
- Forgetting to restore composite operation after 'lighter'

### Collision
- Wrong priority order (which component absorbs hit first)
- Missing damageable flag checks
- Bounding box vs sprite-level collision (causes visible rectangle flash)
- Shield transparency: shield ring has transparent center that lets bullets through

### Destruction
- Drawing destroyed sprites instead of hiding (`set_visible(false)`)
- Not setting `damageable = false` on cascade-destroyed components
- Wrong explosion positions or counts
- Explosion velocity inheriting from wrong source (should be source_dx/2)
- Destroyed turret sprites remaining after parent platform explodes
- Missing sound effects on destruction

### Entity System
- Wave type confusion (type 1 = HEAVYFIGHTER, not gunship)
- Gunship dual cannon fire (BOTH weapons simultaneously, not alternating)
- Spawn position formula (Y stagger is -64 × i, not horizontal spread)
- Game Over sprite at (272,268), NOT fullscreen

---

## Audit Output Format

Structure findings as a comparison table:

```markdown
### [System Name] Audit

| Parameter | C++ Value | Web Value | Status | Notes |
|-----------|-----------|-----------|--------|-------|
| Position X | -213 | -213 | ✅ | |
| Position Y | 111 | 112 | ❌ | Off by 1 |
| Armor | 500+Hp | 500+hp | ✅ | |
| Fire Rate | 60ms | 60 | ⚠️ | Web uses raw value, same meaning |
```

For complex systems (like boss), break into sub-audits:
1. Component creation (positions, armor, flags)
2. State machine (transitions, timing)
3. Collision (priority, detection method)
4. Rendering (draw order, effects)
5. Destruction (cascade, explosions)
6. AI (turret behavior, firing)

---

## Lessons Learned (from 21 audit sessions)

### Core Principles

1. **Always read the ACTUAL C++ code** — don't rely on assumptions or documentation.
   The C++ code IS the spec. Every session that tried to "guess" or use docs failed.

2. **Trace the full call chain** — e.g., `Boss::FireTurret()` → `Weapon::fire()` →
   `Projectile()`. Each step may add offsets or transformations. Missing any step
   in the chain = wrong position.

3. **Check for accumulated time drift** — the `nLastMove -= interval` pattern with
   `if` (not `while`) can cause speeds to differ from what the interval suggests.
   This is the most subtle C++ porting bug.

4. **Verify weapon fire position** — C++ `Weapon::fire()` adds `offset_x/offset_y`
   to the passed position. For boss turrets, this offset is `turret_position + 16`,
   NOT the turret center (+32).

5. **Component visibility** — C++ uses `set_visible(false)` to hide destroyed
   components. They are NOT drawn at all. Do not render destroyed frame sprites.

### Boss-Specific

6. **Shield vs component collision order matters** — C++ checks bossShield LAST
   (lowest priority). The web checks shield FIRST with sprite-level masks
   (transparent center lets bullets through). This is an intentional design difference.

7. **U-turrets only fire in BOSS_FINAL** — not during morph phases.

8. **Connector damageable flag** — C++ creates connectors with `damageable=false`
   then immediately calls `set_damageable(true)`. Easy to miss.

9. **GL_Handler effects use INVERTED Y** for OpenGL — `y = -tempCap->get_y()-offset`.
   Canvas Y is normal (increases downward). Must convert correctly.

10. **Outer orb Y offset is +31, not +32** — a real off-by-one in the original code.

11. **Boss shield sprite** — Shield.bmp is a RING texture (transparent center, bright
    edges) with a black background. DON'T render the sprite directly — use additive
    purple glow effect instead. The black background caused a visible black circle.

12. **Hit flash** — Track which specific component was hit (`hitFlashComp`) and flash
    only that component. Don't flash the center node for all hits — that shows a white
    rectangle around the center.

13. **Morph timing** — Boss morph is 1px/100ms in code but feels too slow. Web uses
    MORPH_TICK_MS=10 for better feel. Document as intentional deviation.

### Asset & Rendering

14. **Sprite transparency** — ALL alpha=0 pixels must be (0,0,0,0), not (255,0,255,0).
    Canvas anti-aliasing bleeds underlying RGB values at edges. 241 sprites affected.

15. **Additive blending is EVERYWHERE** — Shield, projectiles, particles, explosions,
    energy effects all use it. Missing additive blending = effects look flat/wrong.

16. **Sprite naming varies** — Some use 2-digit padding (LightF00), some 3-digit
    (SmallExp000), some 1-indexed (blaster_1). Check each sprite family individually.

### Audio

17. **Only TWO music tracks** — Level2.ogg for everything, bossTEST.ogg for boss.
    `start.wav` is SFX. Don't search for level-specific music — it doesn't exist.

18. **OGG files are pre-standard** — Modern decoders silently fail. Must convert to
    MP3 via VLC. This is not a bug in your code — it's a format incompatibility.

19. **Audio autoplay blocking** — Chrome blocks AudioContext before user gesture.
    Defer creation, queue operations. Non-blocking loadMusic().

### Input

20. **Puppeteer press race condition** — keydown+keyup in same tick. Use pressedQueue
    pattern (Set that's cleared each frame). Same for mouse clicks.

21. **Debug keys** — Use e.key values ('`', '1', '2'), NOT e.code ('Backquote',
    'Digit1'). Backtick for debug toggle (NOT F-keys which conflict with browser).

### Gameplay

22. **Wave type 1 = HEAVYFIGHTER, not gunship** — This was wrong for many sessions.
    Gunships are 30% random spawns, not a wave type.

23. **Gunship dual cannon** — Both weapons fire simultaneously per burst shot, not
    alternating. C++ loops through all weapons in fire call.

24. **Projectile frames are NOT animated** — Frame = power_cell_2 - 1, set once at
    creation. Different frames have different sprite dimensions.

25. **FrigateAI constants from C++** — MAX_SPEED=6, DRAG=0.95, ACCEL=0.2,
    ACCEL_RATE=100ms, FAI_FIRE_RATE=3000ms, SCREEN_TIME=60000ms. Nose fires only
    within 64px x-alignment. Shortest-path turning with frame wrapping.

### Development Process

26. **Don't trust documentation or assumptions** — Read the C++ every single time.
    Every "I think I know what it does" has been wrong at least once.

27. **Rogue background agents** — Stale async agents can complete after main work and
    commit changes that overwrite current state. Always verify commits before accepting.
    If a bad commit lands, `git reset --hard` to known good commit.

28. **File deletion during editing** — The edit tool on Windows can sometimes corrupt
    or delete files mid-edit. Always verify file exists after edits. Restore via
    `git checkout -- <file>` if lost.

29. **Test with Puppeteer after EVERY change** — `node debug.mjs` captures 13
    screenshots through the full game flow. Compare against reference screenshots.
    Visual bugs are immediately obvious in screenshots.

30. **SPEC.md is the living document** — When C++ analysis reveals new details, update
    SPEC.md FIRST, then implement. This prevents re-discovering the same facts in
    future sessions.

---

## Quick Reference — Customization Screen

The ship customization screen (`GUI.cpp:228-333`) has been a recurring source of bugs:

- Background: `GUI_ship.png` (800×555) — this IS the entire background, don't draw extras
- 6 weapon zones with click areas defined in C++ GUI.cpp
- Power cells at Console.h `C_*` position constants
- Turret angle selector with 8-direction arrows
- Live ship demo with animated projectiles and engine feedback
- `speed_ship` bounces (reflects velocity) to show engine power
- Settings persist via localStorage (web) / game save (C++)

## Quick Reference — Boss Component Sizes

Sizes come from ACTUAL sprite PNG dimensions, NOT guesses:
- CenterNode (BossNode1): 160×160
- OuterNodes (BossNode2): 128×128
- Platforms (bossPlatform): 80×80
- U-pieces (bossU): 144×288
- Orbs (bossOrb): 64×64
- Turrets (bossTurret): 64×64
- Shield (bossShield): 192×192 (ring texture, transparent center)
