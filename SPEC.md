# XenoHammer — Game Specification

> Authoritative reference for both `web/` and `classic/` implementations.
> All values sourced from the original C++ code and `assets/game-constants.json`.

---

## 1. Game Overview

**Title:** Codename: XenoHammer  
**Genre:** Top-down 2D space combat arcade shooter  
**Core Loop:** Survive timed waves of alien fighters, destroy capital ships, defeat the boss across 3 levels. Between levels, customize your ship's weapons and power distribution.

**Screen:** 800×600 pixels, 32-bit color  
**Play Area:** 650×600 (left side) — the rightmost 150 pixels are the HUD console  
**Levels:** 3 — Level 1 (95s), Level 2 (95s), Level 3/Boss (600s)

---

## 2. CRITICAL: Timing & Movement Model

The original game uses **time-scaled movement** via `GameObject_Sprite::show()`. All game objects (player, enemies, projectiles, explosions, power-ups) move through the same unified system.

### Movement Formula (from `GameObject_Sprite::show()`)

```
actual_pixels = (velocity × time_delta_ms) / VELOCITY_DIVISOR
```

Where:
- **velocity** = the `dx`/`dy` values set by AI, weapons, or input (the "raw" values listed in this spec)
- **time_delta_ms** = milliseconds since the last frame (`CL_System::get_time()` delta)
- **VELOCITY_DIVISOR** = **32** (hardcoded `XSCALE = YSCALE = 32` in `GameObject.cpp`)

### Effective Speeds at Common Frame Rates

| Frame Rate | time_delta_ms | Scale Factor | Example: speed 7 → actual px/frame |
|-----------|--------------|-------------|-------------------------------------|
| 30 fps | 33.3 ms | 1.04× | 7.3 px/frame |
| 60 fps | 16.67 ms | 0.52× | 3.65 px/frame |
| 120 fps | 8.33 ms | 0.26× | 1.82 px/frame |

At 60 fps, raw velocity values are effectively **halved** (multiplied by ~0.52).

### Implementation for Modern Targets

Use a **fixed 60 fps logic timestep** (16.67ms) with the VELOCITY_DIVISOR scaling:

```typescript
// Movement per tick (dt in seconds):
const moveScale = dt * 1000 / 32;  // = 16.67/32 ≈ 0.52 at 60fps
this.x += this.vx * moveScale;
this.y += this.vy * moveScale;
```

- Fire rates and delays are in **milliseconds** (timer-based, independent of frame rate)
- All velocity values in this spec are **raw values** before VELOCITY_DIVISOR scaling
- The only exception is `spaceObject` which uses `YSCALE=600` for extremely slow vertical drift (not used in gameplay)

---

## 3. Game Flow — Exact Screen Sequence

### 3.1 App Launch
- Initialize display (800×600, 32-bit)
- Load all resources (sprites, sounds, fonts)
- Initialize sound system

### 3.2 Start Screen
- Full-screen splash image (`XenoStart`)
- "Start Game" text drawn at (400, 580)
- Mouse click anywhere to proceed
- Plays ambient space sound (`Space`, looping)
- **Only shown once** on first launch — subsequent returns go to Ready Room

### 3.3 Ready Room
- Background image (`room`) with overlay screen (`room_screen`)
- Three clickable zones:

| Zone | Coordinates | Action |
|------|-------------|--------|
| Left (Ship Customization) | x: 10–218, y: 260–380 | Opens Cust_GUI |
| Center (Briefing & Options) | x: 200–400, y: 185–218 | Opens Options_GUI |
| Right (Launch Door) | x: 601–800, y: 0–540 | Starts current level |

- Contextual messages displayed based on game state:
  - Level 0, no briefing read: "Read the briefing before your first mission"
  - Level 0, briefing read: "You are cleared for launch, pilot"
  - Level 1+: "Next mission: Level {N+1}"
  - After death: "Better luck this time, pilot"

### 3.4 Ship Customization (Cust_GUI)
- Ship diagram on left half (0–512), config panel on right (512–800)
- Background: `cust_start` with `custimization_ship` overlay

**6 Clickable Weapon/System Zones** (on ship diagram):

| Zone | System | Config Panel Position |
|------|--------|----------------------|
| Nose area | Blaster | Rate x:230, Power x:265, y:102 |
| Left wing upper | Left Turret | Rate x:111, Power x:145, y:162 |
| Right wing upper | Right Turret | Rate x:352, Power x:387, y:162 |
| Left wing lower | Left Missile | Rate x:188, Power x:223, y:171 |
| Right wing lower | Right Missile | Rate x:276, Power x:311, y:171 |
| Center body | Ship Power (Shields/Engine) | Shield x:230, Engine x:265, y:258 |

**Power Cell Distribution:**
- Each system has 2 cells (Rate and Power)
- Each cell: 1–5 levels, costs 1 RU per cell level
- Cell power multipliers: 0→1.0×, 1→1.5×, 2→2.0×, 3→2.5×, 4→3.0×, 5→5.0×
- Customization bar dimensions: width 14, height 10

**Research Options:**
- Turret Rotation Research: 5 RU — unlocks turret angle selection
- Missile Homing Research: 15 RU — enables missile target tracking

**Turret Angle Options:**
- Left turret angles: 90°, 135°, 180°, 225°, 270°
- Right turret angles: 90°, 45°, 0°, 315°, 270°
- Default: Left = 135°, Right = 45°

**Done Button:** Resets shields and armor to 300 (full repair)

### 3.5 Options Screen (Options_GUI)
5 menu items:
1. **Briefing** → Briefing submenu
2. **Save** → Save game state
3. **Load** → Load game state
4. **Difficulty** → Cycle through Easy/Normal/Hard/Nightmare
5. **Quit** → Exit game

Sound effects: `MenuChange` on hover, `MenuSelect` on click.

### 3.6 Briefing Submenu
Three sub-options:
1. **Backstory** — Scrolling background image (`backstory`)
2. **Level Briefing** — Scrolling per-level briefing image (`briefing_lvl_1`, `briefing_lvl_2`, `briefing_lvl_3`)
3. **Ship Specs** — Static ship specification image (`ship_specs`)

### 3.7 Level Start
1. 2-second wait period
2. Player reset to position (287, 300)
3. Level music starts
4. Engine sound (`ShipEngine`) starts looping

### 3.8 Level Start Animation
- "LEVEL X" text animation sequence
- Appears at ~600ms into level, fades/animates through ~4000ms
- Uses `in_game_start2` / `in_game_start3` level-specific animation frames

### 3.9 Gameplay
- Main combat loop — see Sections 4–11 for all mechanics
- Waves spawn according to level wave tables
- Player controls: Arrow keys (movement), Space (fire), Q/W/E (power settings), A (armor display), Escape (exit)

### 3.10 Level End Animation
- "END OF LEVEL X" text appears in last 5 seconds of level timer
- Uses `in_game_end2` animation frame

### 3.11 Level Complete
1. All enemies/projectiles cleaned up
2. All sounds stopped
3. Level index incremented
4. Return to Ready Room
5. 3-second delay before prompt is active

### 3.12 Player Death
1. Explosion cascade at player position
2. `game_over` image displayed for 4 seconds
3. Game state reset to level 0
4. Return to menu

### 3.13 Boss Destruction (Level 3)
1. Central node HP reaches 0
2. Chain explosion sequence: 30 explosions over 3 seconds
3. Random explosions within 200px radius of boss center
4. 50% chance each explosion is big vs small
5. After 3 seconds: boss marked dead, level can end

### 3.14 Victory
- Aftermath screen with scrolling background image (`aftermath`)
- Score and stats displayed
- VictoryScreen: Gold text at Y=120, stats panel at center

---

## 4. Player Ship

### Sprite
- 17 frames: `PlayerSprite00` through `PlayerSprite16`
- Frame 8 = flying straight (center)
- Frame 0 = fully banked RIGHT (ship leans right when moving right)
- Frame 16 = fully banked LEFT (ship leans left when moving left)
- Banking logic (from `PlayerShip.cpp`):
  - Moving RIGHT (`hori_axis > 0.2`): `curr_frame--` (toward frame 0)
  - Moving LEFT (`hori_axis < -0.2`): `curr_frame++` (toward frame 16)
  - No horizontal input: frame drifts back toward 8 (center)

### Movement
- **Base speed:** 7 px/frame
- **Engine bonus:** ship power multiplier × 2 px/frame
- **Max engine power:** 5 levels → max +10 px/frame bonus
- **Effective speed at max:** 17 px/frame (1020 px/s at 60fps)
- **Bounds:** x ∈ [0, 650 − sprite_width], y ∈ [0, 600 − sprite_height]
- **Starting position:** (287, 300)

### Durability
- **Armor:** 300 HP (max 300), type HEAVY_ARMOR
- **Shields:** 300 HP (max 300)
- **Shield regeneration:** shield_power_multiplier HP per tick, every 150ms
- **Shield regen delay:** 2000ms after last damage taken
- Shields absorb damage first; overflow passes to armor

### Weapons
5 weapon slots, all fire simultaneously when Space is held, every 150ms:

| Slot | Type | Offset (x, y) | Default Angle |
|------|------|---------------|---------------|
| 1 — Nose Blaster | BLASTER | (22, −12) | 0° |
| 2 — Left Turret | TURRET | (−1, −5) | 135° |
| 3 — Right Turret | TURRET | (44, −5) | 45° |
| 4 — Left Missile | MISSILE | (13, 0) | 0° |
| 5 — Right Missile | MISSILE | (30, 0) | 0° |

---

## 5. Weapons

### Player Weapons

| Property | Blaster (1) | Turret (2) | Missile (3) |
|----------|------------|------------|-------------|
| Base Damage | 6 | 4 | 10 |
| Damage Formula | 6 × WEAPON_POWER mult | 4 × WEAPON_POWER mult | 10 × WEAPON_POWER mult |
| Fire Rate | 100ms | 250ms | 1000ms |
| Projectile Speed | dy = −27 px/frame | angle-dependent (see below) | dy = −17 px/frame |
| Sprite Frames | 5 (`blaster_1`–`5`) | 5 (`turret_1`–`5`) | 5 (`torp_1`–`5`) |
| Special | — | Rotatable angle | Homing after 50px travel (if researched) |

**Turret Velocity Lookup Table** (discrete 8-angle table from `Projectile.cpp`, NOT trigonometry):

| Angle | dx | dy | Direction |
|------:|---:|---:|-----------|
| 0° | +29 | 0 | RIGHT |
| 45° | +20 | −21 | UP-RIGHT |
| 90° | 0 | −29 | UP |
| 135° | −20 | −21 | UP-LEFT |
| 180° | −29 | 0 | LEFT |
| 225° | −20 | +21 | DOWN-LEFT |
| 270° | 0 | +29 | DOWN |
| 315° | +20 | +21 | DOWN-RIGHT |

Angles snap to the nearest 45° before lookup. Default turret angles: Left=135° (fires up-left), Right=45° (fires up-right).

**Missile Homing** (from `Projectile::update()`):
- Flies straight up (dy=−17) for the first **50 pixels** of travel distance
- Then homes toward its target at speed **20 raw units**
- Tracking stops (permanently) when missile enters a **64px bounding box** around the target
- Once tracking stops, the missile retains its last heading and flies straight
- Requires homing research (15 RU) to activate

### Enemy Weapons

| Property | Enemy Blaster (4) | Enemy Cannon (5) |
|----------|-------------------|------------------|
| Base Damage | 5 × 3 multiplier = 15 | 5 × 4 multiplier = 20 |
| Fire Rate | 100ms | 250ms |
| Projectile Speed | Inherits ship velocity ×2 | dy = +21 px/frame |
| Sprite Frames | 8 (`enemy_1`–`8`) | 8 (`enemy_1`–`8`) |
| Used By | Light Fighters, Heavy Fighters | Gunships, Frigates |

### Power Multipliers (Cell Total → Multiplier)

| Cells | Multiplier |
|------:|----------:|
| 0 | 1.0× |
| 1 | 1.5× |
| 2 | 2.0× |
| 3 | 2.5× |
| 4 | 3.0× |
| 5 | 5.0× |

---

## 6. Enemy Types

### 6.1 Light Fighter (Type 0)

| Property | Value |
|----------|-------|
| Armor | 10 HP |
| Shields | 0 |
| Speed | 10 px/frame |
| Turn Rate | 60°/frame |
| Fire Rate | 400ms |
| Weapon | ENEMYBLASTER, offset (16, 16) |
| Sprite Frames | 32 (`LightF00`–`31`) |
| Wave Offset | 64px between ships |
| Power-up Drop | 5% chance |
| Explosion | Small |
| Score | 100 points |

**AI State Machine (LightFighterAI):**
1. `LFAI_ENTERING_SCREEN` — Fly onto screen from spawn position
2. `LFAI_TARGETING` — Turn toward player position
3. `LFAI_FLYBY` — Fly past player, firing weapons
4. `LFAI_SCATTER` — Break away from player with random vector
5. `LFAI_RUNAWAY` — Exit screen (despawn when off-screen)

### 6.2 Heavy Fighter / Fighter B (Type 2)

| Property | Value |
|----------|-------|
| Armor | 30 HP |
| Shields | 0 |
| Speed | 12 px/frame |
| Turn Rate | 60°/frame |
| Fire Rate | 1000ms |
| Weapon | ENEMYBLASTER, offset (16, 16) |
| Sprite Frames | 32 (`FighterB00`–`31`) |
| Wave Offset | 64px |
| Power-up Drop | 10% chance |
| Explosion | Small |
| Score | 250 points |

**AI State Machine (FighterBAI):**
1. `FBAI_ENTERING_SCREEN` — Enter from top
2. `FBAI_RIGHT` — Sweep right across screen while firing
3. `FBAI_LEFT` — Sweep left across screen while firing
4. `FBAI_RUNAWAY` — Exit screen

### 6.3 Gunship (Type 1)

| Property | Value |
|----------|-------|
| Armor | 100 HP |
| Shields | 0 |
| Max Speed | 9 px/frame |
| Drag | 0.9 (velocity multiplied each frame) |
| Acceleration | 1.571 px/frame² |
| Accelerate Rate | 100ms |
| Bank Rate | 80ms |
| Fire Rate | 600ms |
| Burst Rate | 3000ms (burst cycle) |
| Fire Range | 64px |
| Max Passes | 3 (then runs away) |
| Sprite Frames | 17 (`Gunship00`–`16`) |
| Power-up Drop | 25% chance |
| Explosion | Large |
| Score | 500 points |

**Dual Cannons:**

| Mount | Weapon | Offset (x, y) |
|-------|--------|---------------|
| Left | ENEMYCANNON | (11, 51) |
| Right | ENEMYCANNON | (85, 51) |

**AI State Machine (GunshipAI):**
1. `GSAI_ENTERING_SCREEN` — Enter from top
2. `GSAI_FLYBY_RIGHT` — Fly-by sweep to the right, firing bursts
3. `GSAI_FLYBY_LEFT` — Fly-by sweep to the left, firing bursts
4. `GSAI_RUNAWAY_LEFT` / `GSAI_RUNAWAY_RIGHT` — Exit screen after max passes

---

## 7. Capital Ships (Frigate, Type 3)

| Property | Value |
|----------|-------|
| Body Armor | 900 HP |
| Body Shields | 500 HP |
| Score | 2000 points |
| Power-up Drop | 0% |

### Component Layout (offsets relative to body center)

| Component | Offset (x, y) | Armor | Damageable | Weapon |
|-----------|---------------|-------|------------|--------|
| Body | (0, 0) | 900 | Yes (last) | — |
| Nose | (0, 112) | 900 | Yes | ENEMYCANNON at (32, 212), power frame 8 |
| Right Wing | (−62, 5) | 300 | No (until turret destroyed) | — |
| Left Wing | (62, 5) | 300 | No (until turret destroyed) | — |
| Right Turret | (−47, 37) | 600 | Yes | ENEMYBLASTER at (−31, 53), power frame 4 |
| Left Turret | (79, 37) | 600 | Yes | ENEMYBLASTER at (95, 53), power frame 4 |

**Turret AI:** `TURRETAI_TYPE_NORMAL`, fire rate 3000ms

**Damage Propagation:**
- Turrets must be destroyed before their corresponding wings become damageable
- Wings must be destroyed before the body becomes vulnerable
- Sprites swap to destroyed variants (`CapShipNoseDest`, `CapShipLtDest`, `CapShipRtDest`) when component destroyed

---

## 8. Boss (Type 4)

### Overview

| Property | Value |
|----------|-------|
| Base Armor | 1000 HP |
| Base Shields | 1000 HP |
| Starting Position | (245, −600) — offscreen above |
| Hover Position | Y = 40 |
| Descent Speed | 40 px/s |
| AI Wait Time | 110,000ms (110 seconds into level before entering) |

### Center Node
- Offset: (0, 0) relative to boss origin
- Armor scales by difficulty:

| Difficulty | Armor |
|-----------|------:|
| Easy (0) | 800 |
| Normal (1) | 1000 |
| Hard (2) | 1200 |
| Nightmare (3) | 2000 |

### Center Orb
- Offset from center node: (48, 48)
- Not directly damageable (cosmetic/animation)
- Armor: 1000 HP (structural)
- Starting frame: 0

### Outer Nodes (4)

| Node | Offset (x, y) | Armor |
|------|---------------|------:|
| 1 (upper-left) | (−213, 111) | 500,000 |
| 2 (lower-left) | (−65, 259) | 500,000 |
| 3 (lower-right) | (97, 259) | 500,000 |
| 4 (upper-right) | (245, 111) | 500,000 |

### Outer Orbs (4, one per outer node)
- Offset from parent node: (32, 31)
- Armor: 500 HP each
- Damageable: Yes
- 33 animation frames (`orb00`–`orb32`)
- Frame interval: 60ms
- Starting frames: Orb 0 = frame 5, Orb 1 = frame 25, Orb 2 = frame 10, Orb 3 = frame 15

### Platforms (8)

| Platform | Type | Parent Node | Offset from Node | Armor |
|----------|------|-------------|-------------------|------:|
| 0 | LEFT | Node 1 | (−51, 23) | 10 |
| 1 | LEFT | Node 2 | (−51, 23) | 10 |
| 2 | RIGHT | Node 3 | (101, 24) | 10 |
| 3 | RIGHT | Node 4 | (101, 24) | 10 |
| 4 | DOWN | Node 1 | (25, 100) | 10 |
| 5 | DOWN | Node 2 | (25, 100) | 10 |
| 6 | DOWN | Node 3 | (25, 100) | 10 |
| 7 | DOWN | Node 4 | (25, 100) | 10 |

Sprites: `BossLeftPlatform`, `BossRightPlatform`, `BossDownPlatform`

### U-Components (2)

| Component | Offset (x, y) | Armor |
|-----------|---------------|------:|
| LeftU | (−174, −404) | 500 |
| RightU | (192, −401) | 500 |

Not damageable. Sprites: `BossLeftU`, `BossRightU`

### Turrets

**8 Outer Turrets (on platforms):**

| Turret | AI Type | AI Parameter | Weapon |
|--------|---------|-------------|--------|
| 0 | SWEEPING | 60°/s | ENEMYBLASTER, power frame 4 |
| 1 | RANDOM | 2000ms | ENEMYBLASTER, power frame 4 |
| 2 | RANDOM | 2000ms | ENEMYBLASTER, power frame 4 |
| 3 | SWEEPING | 60°/s | ENEMYBLASTER, power frame 4 |
| 4 | RANDOM | 2000ms | ENEMYBLASTER, power frame 4 |
| 5 | RANDOM | 2000ms | ENEMYBLASTER, power frame 4 |
| 6 | RANDOM | 2000ms | ENEMYBLASTER, power frame 4 |
| 7 | RANDOM | 2000ms | ENEMYBLASTER, power frame 4 |

**6 U-Turrets:** 3 on LeftU, 3 on RightU. Weapon: ENEMYBLASTER.

Turret sprites: 33 frames (`Turret00`–`Turret32`), frame 32 = destroyed state.

### Boss AI States
1. `BOSS_WAITING` — Boss does not appear. Timer counts from level start to 110 seconds.
2. `BOSS_ENTERING_SCREEN` — Descends from Y=−600 to Y=40 at 40 px/s.
3. `BOSS_NORMAL` — Shield active, all turrets fire. Shield protects center node while any outer node lives.
4. `BOSS_MORPH1` — One outer node destroyed, fire rate ×0.75.
5. `BOSS_MORPH2` — Both outer nodes destroyed, fire rate ×0.5.
6. `BOSS_FINAL` — All outer nodes destroyed, center node vulnerable.

**Boss Music:** `BossNear1` triggers at 96 seconds into level (14 seconds before boss appears).

### Boss Shield
- 1000 HP total (sprite: `bossShield`)
- Active while at least one outer node is alive
- Absorbs all damage directed at center node
- Outer nodes must be destroyed first to expose center

### Destruction Sequence
1. Center node HP reaches 0 → death sequence begins
2. Chain explosion: 30 explosions over 3.0 seconds
3. Each explosion: 50% big (`BigExp`), 50% small (`SmallExp`)
4. Random positions within 200px radius of boss center
5. Evenly staggered delay across 3-second duration
6. After 3 seconds: boss marked dead

---

## 9. Wave Definitions

### Difficulty Modifier
Applied to `count` for every wave:

| Difficulty | Modifier |
|-----------|--------:|
| Easy (0) | −2 |
| Normal (1) | 0 |
| Hard (2) | +2 |
| Nightmare (3) | +5 |

Minimum count after modifier is 1.

### Level 1 — Outer Perimeter (95 seconds, 45 waves)

All light fighters (type 0). Spawns from Y=0 (top of screen).

| Wave | Time (s) | Count | X Pos | Type |
|-----:|--------:|------:|------:|------|
| 1 | 5 | 3 | 0 | Light Fighter |
| 2 | 6 | 3 | 200 | Light Fighter |
| 3 | 8 | 3 | 400 | Light Fighter |
| 4 | 10 | 2 | 100 | Light Fighter |
| 5 | 12 | 3 | 300 | Light Fighter |
| 6 | 14 | 2 | 500 | Light Fighter |
| 7 | 16 | 1 | 250 | Gunship |
| 8 | 18 | 3 | 0 | Light Fighter |
| 9 | 20 | 3 | 400 | Light Fighter |
| 10 | 22 | 4 | 200 | Light Fighter |
| 11 | 24 | 1 | 100 | Gunship |
| 12 | 26 | 3 | 350 | Light Fighter |
| 13 | 28 | 3 | 50 | Light Fighter |
| 14 | 30 | 4 | 250 | Light Fighter |
| 15 | 32 | 1 | 450 | Gunship |
| 16 | 34 | 3 | 150 | Light Fighter |
| 17 | 36 | 3 | 500 | Light Fighter |
| 18 | 38 | 4 | 0 | Light Fighter |
| 19 | 40 | 3 | 300 | Light Fighter |
| 20 | 42 | 1 | 200 | Gunship |
| 21 | 44 | 4 | 100 | Light Fighter |
| 22 | 46 | 3 | 400 | Light Fighter |
| 23 | 48 | 3 | 50 | Light Fighter |
| 24 | 50 | 1 | 350 | Gunship |
| 25 | 52 | 4 | 200 | Light Fighter |
| 26 | 54 | 3 | 500 | Light Fighter |
| 27 | 56 | 3 | 0 | Light Fighter |
| 28 | 58 | 1 | 250 | Gunship |
| 29 | 60 | 4 | 150 | Light Fighter |
| 30 | 62 | 3 | 400 | Light Fighter |
| 31 | 64 | 3 | 300 | Light Fighter |
| 32 | 66 | 1 | 100 | Gunship |
| 33 | 68 | 4 | 50 | Light Fighter |
| 34 | 70 | 3 | 450 | Light Fighter |
| 35 | 72 | 3 | 200 | Light Fighter |
| 36 | 74 | 1 | 350 | Gunship |
| 37 | 76 | 4 | 0 | Light Fighter |
| 38 | 78 | 3 | 500 | Light Fighter |
| 39 | 80 | 3 | 100 | Light Fighter |
| 40 | 81 | 3 | 250 | Light Fighter |
| 41 | 82 | 1 | 400 | Gunship |
| 42 | 83 | 4 | 150 | Light Fighter |
| 43 | 84 | 3 | 350 | Light Fighter |
| 44 | 85 | 4 | 450 | Light Fighter |
| 45 | 85 | 4 | 450 | Light Fighter |

### Level 2 — Capital Engagement (95 seconds, 32 waves)

Mixed fighters + frigates. First frigate appears at t=28s.

| Wave | Time (s) | Count | X Pos | Y Pos | Type |
|-----:|--------:|------:|------:|------:|------|
| 1 | 5 | 5 | 0 | 0 | Light Fighter |
| 2 | 7 | 4 | 300 | 0 | Light Fighter |
| 3 | 9 | 3 | 100 | 0 | Heavy Fighter |
| 4 | 11 | 4 | 400 | 0 | Light Fighter |
| 5 | 13 | 3 | 200 | 0 | Heavy Fighter |
| 6 | 15 | 1 | 350 | 0 | Gunship |
| 7 | 17 | 5 | 50 | 0 | Light Fighter |
| 8 | 19 | 4 | 450 | 0 | Heavy Fighter |
| 9 | 21 | 4 | 150 | 0 | Light Fighter |
| 10 | 23 | 1 | 250 | 0 | Gunship |
| 11 | 25 | 3 | 500 | 0 | Heavy Fighter |
| 12 | 27 | 5 | 0 | 0 | Light Fighter |
| 13 | **28** | **1** | 300 | **−300** | **Frigate** |
| 14 | 30 | 4 | 0 | 0 | Heavy Fighter |
| 15 | 33 | 5 | 200 | 0 | Light Fighter |
| 16 | 36 | 4 | 400 | 0 | Heavy Fighter |
| 17 | 39 | 1 | 100 | 0 | Gunship |
| 18 | 42 | 5 | 350 | 0 | Light Fighter |
| 19 | 45 | 3 | 50 | 0 | Heavy Fighter |
| 20 | **48** | **1** | 250 | **−300** | **Frigate** |
| 21 | 51 | 5 | 450 | 0 | Light Fighter |
| 22 | 54 | 4 | 150 | 0 | Heavy Fighter |
| 23 | 57 | 1 | 300 | 0 | Gunship |
| 24 | 60 | 5 | 0 | 0 | Light Fighter |
| 25 | 63 | 3 | 500 | 0 | Heavy Fighter |
| 26 | 66 | 1 | 200 | 0 | Gunship |
| 27 | 70 | 5 | 100 | 0 | Light Fighter |
| 28 | 74 | 4 | 350 | 0 | Heavy Fighter |
| 29 | **78** | **1** | 150 | **−300** | **Frigate** |
| 30 | 82 | 5 | 400 | 0 | Light Fighter |
| 31 | 86 | 3 | 250 | 0 | Heavy Fighter |
| 32 | 90 | 1 | 50 | 0 | Gunship |

### Level 3 — Final Assault / Boss (600 seconds, 27 fighter waves + Boss)

Boss spawns immediately at level start (110s AI wait, enters screen at ~110s).  
Fighter waves continue throughout:

| Wave | Time (s) | Count | X Pos | Type |
|-----:|--------:|------:|------:|------|
| 1 | 5 | 6 | 0 | Heavy Fighter |
| 2 | 15 | 4 | 400 | Heavy Fighter |
| 3 | 25 | 5 | 200 | Light Fighter |
| 4 | 35 | 6 | 100 | Heavy Fighter |
| 5 | 50 | 5 | 350 | Light Fighter |
| 6 | 65 | 4 | 0 | Heavy Fighter |
| 7 | 80 | 5 | 500 | Light Fighter |
| 8 | 100 | 6 | 150 | Heavy Fighter |
| 9 | 120 | 5 | 300 | Light Fighter |
| 10 | 140 | 4 | 450 | Heavy Fighter |
| 11 | 160 | 5 | 50 | Light Fighter |
| 12 | 180 | 6 | 250 | Heavy Fighter |
| 13 | 200 | 5 | 400 | Light Fighter |
| 14 | 220 | 4 | 100 | Heavy Fighter |
| 15 | 240 | 5 | 350 | Light Fighter |
| 16 | 270 | 6 | 0 | Heavy Fighter |
| 17 | 300 | 5 | 200 | Light Fighter |
| 18 | 330 | 4 | 500 | Heavy Fighter |
| 19 | 360 | 5 | 150 | Light Fighter |
| 20 | 390 | 6 | 300 | Heavy Fighter |
| 21 | 420 | 5 | 450 | Light Fighter |
| 22 | 450 | 4 | 50 | Heavy Fighter |
| 23 | 480 | 5 | 250 | Light Fighter |
| 24 | 510 | 6 | 400 | Heavy Fighter |
| 25 | 540 | 5 | 100 | Light Fighter |
| 26 | 560 | 4 | 350 | Heavy Fighter |
| 27 | 580 | 5 | 0 | Light Fighter |

---

## 10. Collision System

Checks performed each frame, in order:

### 10.1 Enemy Projectiles vs Player
- For each alive enemy projectile: AABB overlap test with player rect
- On hit: player takes projectile damage (shields absorb first, then armor)
- Emit 8 red particles (1.0, 0.3, 0.3), speed 40, life 0.3s
- Projectile destroyed

### 10.2 Player Projectiles vs Enemies
- For each alive player projectile, test against each alive enemy
- On hit: enemy takes weapon damage × power multiplier
- Emit 6 orange particles (1.0, 0.8, 0.2), speed 50, life 0.3s
- If enemy armor ≤ 0: trigger explosion, drop power-up roll, add score
- Projectile destroyed

### 10.3 Player Projectiles vs Capital Ship Components
- Test against each damageable component (turrets first, then wings, then body)
- Damage propagation rules apply (see Section 7)

### 10.4 Player Ship vs Enemies (Ram Damage)
- AABB overlap test between player rect and each enemy rect
- Player takes 20 contact damage
- Enemy takes 50 contact damage

### 10.5 Player vs Power-ups
- Power-up hitbox: 16×16 pixels
- On collection: armor +50, shield +50, or weapon power bonus (+500 score)
- Sound: `CoinCollected`

### Collision Function
```
rectsOverlap(a, b) =
  a.x < b.x + b.w AND a.x + a.w > b.x AND
  a.y < b.y + b.h AND a.y + a.h > b.y
```

### Out-of-Bounds Cleanup
Projectiles destroyed when 64px beyond any play area edge (650×600).

---

## 11. Particle System

### Explosion Particles

| Event | Count | Color (R,G,B) | Speed | Life | Fade |
|-------|------:|---------------|------:|-----:|-----:|
| Fighter kill | 15 | 1.0, 0.6, 0.1 | 100 | 0.8s | 1.5/s |
| Capital ship kill | 30 | 1.0, 0.6, 0.1 | 100 | 0.8s | 1.5/s |
| Enemy projectile hit player | 8 | 1.0, 0.3, 0.3 | 40 | 0.3s | 1.0/s |
| Player projectile hit enemy | 6 | 1.0, 0.8, 0.2 | 50 | 0.3s | 1.0/s |

### Particle Properties
- Position: (x, y)
- Velocity: (vx, vy) — computed from angle and speed
- Life: remaining time (0–1), decrements by fade rate × dt
- Color: RGB (0–1 range)
- Direction spread: 2π (omnidirectional by default)
- Speed variation: speed × (0.5 + random × 0.5)
- Max particles: 500

### Trajectory
- Direction: `baseAngle + (random − 0.5) × spread`
- Velocity: `vx = sin(angle) × speed`, `vy = −cos(angle) × speed`
- Gravity (when enabled): `vx += gravityX × dt`, `vy += gravityY × dt`
- Rendered as 2×2 pixels with alpha = life

### Engine Particles
- 1 particle per frame emitted from ship rear
- Color intensity based on engine power level

### Original C++ Particle System
The original uses a more complex gravity-well system:
- Max gravity lookup table: 2500 entries
- Universal gravity constant: 6.52
- Particle properties include mass, gravity flags, vector components

---

## 12. Starfield

### Configuration
- **Star count:** 600
- **Depth range:** 0–300 (Z axis)
- **Base scroll speed:** 30 px/frame
- **Activation chance:** 20% per star per frame (initially)

### Star Properties
| Property | Description |
|----------|-------------|
| x, y | World position |
| z | Depth (1–300) |
| size | 2px if z < 100, else 1px |
| color | Brightness = 255 × (1 − z/300), minimum 40 |
| moving | 0 or 1 |
| xscr, yscr | Screen position after parallax |

### Color Tinting
- 60% white (255, 255, 255)
- 20% blue-tint (R×0.7, G×0.8, B)
- 20% warm-tint (R, G×0.9, B×0.6)

### Parallax Formula
```
layerSpeed = scrollSpeed × (STAR_DISTANCE / (z + 1))
screen_y = world_y + layerSpeed × dt
```
Closer stars (lower z) move faster.

### Celestial Bodies
- **Earth:** z = 200, yscr = 300. Appears ~300ms into level.
- **Moon:** z = 400. Appears ~300ms into level.

---

## 13. HUD / Console

### Layout
Right panel: x = 650–800, y = 0–600  
Background: `console` sprite

### Console Element Positions

| Element | X | Y | Notes |
|---------|--:|--:|-------|
| Score label | 660 | 20 | — |
| Score value | 660 | 34 | — |
| Level | 660 | 56 | — |
| Timer | 740 | 56 | Format M:SS, red if < 10s |
| Rank | 660 | 78 | Based on kill count |
| Blaster Rate/Power | 719 / 729 | 52 | Bar indicator |
| Left Turret Rate/Power | 768 / 778 | 80 | Bar indicator |
| Right Turret Rate/Power | 868 / 878 | 80 | Bar indicator |
| Left Missile Rate/Power | 798 / 808 | 83 | Bar indicator |
| Right Missile Rate/Power | 838 / 848 | 83 | Bar indicator |
| Ship Shield/Engine | 718 / 728 | 122 | Bar indicator |
| Shield Bar | 667 | 565 | Width 45, height 1 (per row) |
| Armor Bar | 740 | 565 | Width 45, height 1 (per row) |

### Bar Indicators
- Console bars: width 4, height 4 pixels per cell
- Customization screen bars: width 14, height 10 pixels per cell

### Speed Ship Animation
`speed_ship` sprite displayed in console, animates based on engine power level.

---

## 14. Sound Map

### Music Tracks

The original game has only **TWO music tracks** (from `Sound.cpp`):

| Variable | File | Usage | Loop |
|----------|------|-------|:----:|
| `sfx_backgroundMusic` | `Level2.ogg` | **ALL levels** (1, 2, and 3) | Yes |
| `sfx_bossBackgroundMusic` | `bossTEST.ogg` | Boss fight (replaces level music when boss triggers) | Yes |

> **Note:** Files `start.wav`, `SMC.wav`, `SMD.ogg`, `SMM.wav` exist in the assets but are NOT referenced in the original `Sound.cpp` as music. `start.wav` is a 13KB sound effect, not a music track.

### Sound Effects

| Event | Sound File | Loop | Notes |
|-------|-----------|:----:|-------|
| Start screen ambient | `Space` | Yes | Plays on start screen |
| Menu item hover | `MenuChange` | No | UI navigation |
| Menu item select | `MenuSelect` | No | UI confirm |
| Boss approaching | `BossNear1` | No | Sound effect at 96s into Level 3 |
| Ship engine | `ShipEngine` | Yes | During gameplay, volume ~0.1 |
| Player blaster fire | `PlayerGun1` | No | Nose blaster |
| Player turret fire | `PlayerGun2` | No | Turret shots |
| Player missile fire | `newFire` | No | Missile launch |
| Enemy blaster fire | `AlienWeapon1` | No | Light/Heavy fighter shots |
| Enemy cannon fire | `AlienWeapon5` | No | Gunship/Frigate cannon |
| Alien alternate fire | `AlienFire1` | No | Alternate alien weapon |
| Small explosion | `ExploMini1` | No | Fighter destruction |
| Power-up collected | `CoinCollected` | No | Pickup |
| Warcraft-style fire | `WarCraftFire` | No | Special weapon variant |
| Intro/start sound | `01- start_wav` | No | Short SFX, NOT music |

---

## 15. Asset Manifest

### Sprites

| Asset Group | Frames | IDs |
|-------------|-------:|-----|
| Player Ship | 17 | `PlayerSprite00`–`16` |
| Light Fighter | 32 | `LightF00`–`31` |
| Heavy Fighter | 32 | `FighterB00`–`31` |
| Gunship | 17 | `Gunship00`–`16` |
| Turrets | 33 | `Turret00`–`32` (32 = destroyed) |
| Boss Orbs | 33 | `orb00`–`32` |
| Small Explosions | 16 | `SmallExp000`–`015` |
| Big Explosions | 16 | `BigExp00`–`15` |
| Mini Explosions | 10 | `expl000`–`009` |
| Blaster Projectiles | 5 | `blaster_1`–`5` |
| Turret Projectiles | 5 | `turret_1`–`5` |
| Missile Projectiles | 5 | `torp_1`–`5` |
| Enemy Projectiles | 9 | `enemy_1`–`9` |

### Boss Components
`BossNode1`, `BossNode1Destroyed`, `BossNode2`, `BossDownPlatform`, `BossLeftPlatform`, `BossRightPlatform`, `BossLeftU`, `BossRightU`, `bossShield`

### Capital Ship Components
`CapShipBody`, `CapShipNose`, `CapShipNoseDest`, `CapShipLt`, `CapShipLtDest`, `CapShipRt`, `CapShipRtDest`

### Connectors
`ConnectorH`, `ConnectorHRED`, `ConnectorUL`, `ConnectorULRED`, `ConnectorUR`, `ConnectorURRED`

### UI Screens
| Screen | Asset ID |
|--------|----------|
| Start Screen | `XenoStart` |
| Ready Room | `room` |
| Ready Room Screen | `room_screen` |
| Customization BG | `cust_start` |
| Customization Ship | `custimization_ship` |
| Console | `console` |
| Game Over | `game_over` |
| Aftermath | `aftermath` |
| Backstory | `backstory` |
| Ship Specs | `ship_specs` |
| Level 1 Briefing | `briefing_lvl_1` |
| Level 2 Briefing | `briefing_lvl_2` |
| Level 3 Briefing | `briefing_lvl_3` |

### In-Game Animations
- Level start: `in_game_start2`, `in_game_start3`
- Level end: `in_game_end2`
- In-game overlays: `in_game_1` through `in_game_22`, `in_game_empty`

### Other Graphics
`bar`, `pointer`, `target`, `warning`, `Shield`, `Particle`, `star`, `earth`, `moon`, `moon2`, `powerup`, `speed_ship`, `GUI_button`, `GUI_ship`, `ship_selected`, `finger2`, `buy`, `setup`, `turret_pannel`, `turret_pannel_left`, `turret_pannel_right`, `turret_selector`, `turretbig`, `pturret0`, `pturret45`, `b_pressed`, `b_unpressed`, `exit_GUI_button`, `exit_GUI_BUTTON_pressed`, `exit_GUI_BUTTON_unpressed`, `capShip`, `gun_turret`, `gun_turretDest`, `xenofont`, `xenofont1`, `clanfont`, `Image7`, `InstallXenoStart`

### Sounds (24 files)
See Section 14 for event mapping. Formats: WAV (most), OGG Vorbis (`Level2`, `SMD`, `bossTEST`).

### Fonts (11 files)
**TTF:** ABAEXBC, ARLRDBD, BAUHS93, MICROSBE, OCRAExt, STOP, TIMES, lcd, mine  
**Bitmap:** font.tga, font_1.tga

---

## 16. Scoring and Rankings

### Points Per Enemy

| Enemy Type | Points |
|-----------|-------:|
| Light Fighter | 100 |
| Heavy Fighter | 250 |
| Gunship | 500 |
| Frigate | 2,000 |
| Boss | 10,000 |

### Rank Thresholds (by kill count)

| Rank | Min Kills |
|------|----------:|
| TEST PILOT | 0 |
| AIRMAN | 20 |
| SERGEANT | 42 |
| LIEUTENANT | 66 |
| CAPTAIN | 98 |
| MAJOR | 135 |
| COLONEL | 182 |
| GENERAL | 245 |
| HERO | 295 |
| SAVIOR | 350 |
| GOD | 420 |
| PONDEROSA | 666 |

### Difficulty Settings

| Difficulty | Wave Modifier | Boss Armor Modifier | Description |
|-----------|:------------:|:-------------------:|-------------|
| Easy (0) | −2 | −200 | Fewer enemies, weaker boss |
| Normal (1) | 0 | 0 | Standard difficulty |
| Hard (2) | +2 | +200 | More enemies, tougher boss |
| Nightmare (3) | +5 | +1000 | Maximum difficulty |

---

## Input Controls

| Action | Keyboard | Joystick |
|--------|----------|----------|
| Move | Arrow Keys | Axis 0/1 |
| Fire | Space | Button 0 |
| Power Setting 1 | Q | Button 1 |
| Power Setting 2 | W | Button 2 |
| Power Setting 3 | E | Button 3 |
| Armor Display | A | — |
| Exit/Menu | Escape | — |
