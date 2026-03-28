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
- Background image: `room_GUI` sprite at (0, 0) — 3D-rendered sci-fi room with two CRT monitors and a glowing door
- **No green CRT overlay** on default room view (overlay only in Options_GUI)
- Bottom tooltip bar: black rectangle (0, 550) to (800, 600)

**Three clickable/hover zones** with dynamic tooltip text:

| Zone | Coordinates | Hover Label | Bottom Tooltip Text |
|------|-------------|-------------|---------------------|
| Left (Ship Customization) | x: 10–218, y: 260–380 | "Ship Customization" at (114, 340) | "Click here to customize your ship." |
| Center (Briefing & Options) | x: 200–400, y: 185–218 | "Briefing Area and Options" at (300, 206) | "Click here to See Briefings, Save, Load, or Quit" |
| Right (Launch Door) | x: 601–800, y: 0–540 | "Launch" at (600, 270) | See launch tooltips below |

**Default tooltip** (no hover): "Click on a screen or the door opening" at (400, 580)

**Launch zone tooltips** (varies by level and briefing state):
| Level | Briefed? | Tooltip Text |
|-------|----------|-------------|
| Level 1 (levelNum=0) | No | "Recon has new info see the level briefing." |
| Level 1 (levelNum=0) | Yes | "Launch into the Outer Earth Sector" |
| Level 2 (levelNum=1) | No | "Recon has new info see the level briefing." |
| Level 2 (levelNum=1) | Yes | "Penetrate the Outer Defense Matrix" |
| Level 3 (levelNum=2) | No | "Recon has new info see the level briefing." |
| Level 3 (levelNum=2) | Yes | "Destroy the Nexus Core" |
| Completed | — | "You Have Completed the Mission!" |

**After player death:** tooltip shows "You have died, your game has been restarted"

**Notification labels:**
- **"New Level Briefing Available!"** at (300, 206) using `font` — shown when `new_level_briefing == true`
- **"NEW!"** at (114, 340) using `large_font` — shown when `new_cust == true`
- These reset when entering respective screens

### 3.4 Ship Customization (Cust_GUI)
- **Background sprite:** `cust_GUI` at (0, 0)
- **Additional sprites:** `b_pressed`, `b_unpressed`, `gui_button`, `buy_button`, `cust_start`, `left_turret_pannel`, `right_turret_pannel`, `turret_selector`
- **Black fill regions:**
  - Top bar: (0, 0) to (800, 40) — black
  - Left panel bottom: (0, 301) to (512, 600) — black
  - Right panel: (512, 45) to (800, 553) — black
  - Button separator: (512, 553) to (517, 600) — black

**Top stats bar (y=35):**
- "RU's:" at (5, 35) + count at (55, 35)
- Rank centered at (400, 35) — e.g., "Test Pilot"
- "Kills:" at (600, 35) + count at (675, 35)

**Ship diagram area (left half: 0–512, y: 45–301):**

**6 Clickable Weapon/System Zones** (on ship diagram):

| Zone | Coordinates | System | Config Panel Position |
|------|-------------|--------|----------------------|
| Nose area | x: 215–290, y: 45–110 | Blaster | Rate x:230, Power x:265, y:102 |
| Left wing upper | x: 100–170, y: 105–170 | Left Turret | Rate x:111, Power x:145, y:162 |
| Right wing upper | x: 340–410, y: 105–170 | Right Turret | Rate x:352, Power x:387, y:162 |
| Left wing lower | x: 180–245, y: 115–180 | Left Missile | Rate x:188, Power x:223, y:171 |
| Right wing lower | x: 265–335, y: 115–180 | Right Missile | Rate x:276, Power x:311, y:171 |
| Center body | x: 220–290, y: 195–265 | Ship Power (Shields/Engine) | Shield x:230, Engine x:265, y:258 |

**"Select All Systems"** displayed at (490, 260)  
**"System Selected:"** at (10, 285) + current system name at (160, 285)

**Right panel — User Settings (x: 520+):**
| Setting | Y | Hotkey | Hit Zone |
|---------|---|--------|----------|
| speed setting | 110 | Q | x: 520–800, y: 80–110 |
| power setting | 140 | W | x: 520–800, y: 111–140 |
| armor setting | 170 | E | x: 520–800, y: 141–170 |

Active setting uses green font (`font`), inactive uses dimmed font (`inactive_font`).

**Weapon panel functions** (called per-system click):
- `nose_blaster_clicked()`, `l_turret_clicked()`, `r_turret_clicked()`
- `l_missle_clicked()`, `r_missle_clicked()`, `engine_clicked()`
- Each shows: weapon name, research info + cost, power pods display, buy button at (300, 460)

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

**Done/Exit Button:** (517, 553) to (800, 600) — resets shields and armor to 300 (full repair)

### 3.5 Options Screen (Options_GUI)
- **Background:** `room_screen` sprite at (0, 0) — **green CRT scanline overlay** composited over room
- 6 menu buttons: dark greenish-gray bars (RGB 0.2, 0.25, 0.2), width 400px (x: 200–600), height 33px each

| # | Button Text | Y Center | Hit Zone Y | Tooltip | Action |
|---|------------|----------|------------|---------|--------|
| 1 | "Briefing Area" | 100 | 77–110 | "XenoHammer Back Story or Level Briefing" | → Briefing_Options_GUI |
| 2 | "Save Your Game" | 175 | 152–185 | "Click Here To Save" / "Save Done" | Save game state |
| 3 | "Load Your Game" | 250 | 227–260 | "Load Your Saved Game" / "Load Done" | Load game state |
| 4 | "Set Difficulty" | 325 | 302–335 | (see difficulty screen) | → set_difficulty() |
| 5 | "Quit to the Ready Room" | 400 | 377–410 | "Go Back to the Ready Room" | Return to Room |
| 6 | "Quit to System" | 475 | 452–485 | "Exit The Game" | Exit application |

Sound effects: `MenuChange` on hover, `MenuSelect` on click.

### 3.6 Briefing Submenu (Briefing_Options_GUI)
Same green CRT overlay background as Options_GUI. 5 menu buttons (same style):

| # | Button Text | Y Center | Hit Zone Y | Action |
|---|------------|----------|------------|--------|
| 1 | "Back Story" | 133 | 110–143 | → Backstory_GUI |
| 2 | "Level Briefing" | 208 | 185–218 | → Level_Briefing_GUI |
| 3 | "XenoHammer Ship Specifications" | 283 | 260–293 | → ship_specs() |
| 4 | "Quit to the Options Screen" | 358 | 325–358 | Return to Options_GUI |
| 5 | "Quit to the Ready Room" | 433 | 400–433 | Return to Room_GUI |

**Backstory (Backstory_GUI):**
- **Starfield background** (same `m_stars` system, with `near_earth=false` — stars only, no Earth/Moon)
- Sprite: `backstory` — scrolls upward from y=475
- Scroll rate: 1 pixel per 60ms (≈16.7 px/s)
- Ends when y ≤ −550 (total scroll: 1025 pixels, ~61.5 seconds)
- Click to exit: `exit_button->is_pressed()`

**Level Briefing (Level_Briefing_GUI):**
- **Starfield background** (same, `near_earth=false`)
- Per-level sprites: `briefing_lvl_1`, `briefing_lvl_2`, `briefing_lvl_3`
- Scroll rate: 1 pixel per 40ms (25 px/s), starts at y=600
- Level 1 ends at y=−620 (1220 pixels, ~48.8s)
- Level 2 ends at y=−420 (1020 pixels, ~40.8s)
- Level 3 ends at y=−400 (1000 pixels, ~40s)
- Click to skip (only when y < 0)
- Sets `level_briefed` flag per level

**Ship Specs (ship_specs):**
- Static full-screen sprite: `ship_specs` at (0, 0)
- "Done" button zone: x: 680–800, y: 540–600
- All content is baked into the bitmap — no procedural text rendering

### 3.6b Difficulty Screen (set_difficulty)
Same green CRT overlay. 5 buttons:

| # | Button Text | Y Center | Sets Difficulty |
|---|------------|----------|----------------|
| 1 | "Easy" | 143 | 0 |
| 2 | "Medium" | 208 | 1 |
| 3 | "Hard" | 283 | 2 |
| 4 | "Extremely Hard" | 358 | 3 |
| 5 | "Done" | 433 | (return to Options) |

Bottom text (y=580) shows currently selected difficulty.

### 3.7 Level Start
1. 2-second wait period
2. Player reset to position (287, 300)
3. Level music starts
4. Engine sound (`ShipEngine`) starts looping

### 3.8 Level Start Animation
- **Sprite frame animation** (NOT typewriter text — pre-rendered bitmap frames)
- `GameAnimation` objects at position (253, 200)
- **Frame update interval:** 100ms per frame
- **Timing:** Starts at 600ms into level, plays until 4000ms
- **Level 1 frames:** `level_anim_1` through `level_anim_8` (8 frames, ~800ms)
- **Level 2 frames:** `level_anim_1` through `level_anim_7` + `level_anim_2_start`
- **Level 3 frames:** `level_anim_1` through `level_anim_7` + `level_anim_3_start`
- The "LEVEL 1" text and blinking cursor effect are baked into the sprite frames

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

### Shield Bubble Effect (Visual)
- Rendered as an **OpenGL textured quad** using `Shield.bmp` texture (`texture[1]` in GL_Handler)
- **Blending:** `GL_SRC_ALPHA, GL_ONE` — **additive blending** (creates a glow, not a semi-transparent overlay)
- **Color:** Blue `(R=0.3, G=0.6, B=0.9)` with alpha = `shields / 300.0` (fades as shields deplete)
- **Size:** 129×89 pixel quad (offsets: ±64.5 horizontal, ±44.5 vertical from center)
- **Position:** Player ship center + offset (x+38, y−24)
- **Web implementation:** Radial gradient with `globalCompositeOperation = 'lighter'` (Canvas equivalent of additive blend)
  - Outer gradient: blue (77,153,230) fading to transparent at edges
  - Inner bright core: white-blue (150,200,255) for glow punch
  - Ship sprite drawn BEFORE shield (shield overlays additively on top)
- Always visible when shields > 0; fully transparent when shields = 0
- **Boss shield** uses same texture but purple-blue `(R=0.4, G=0.15, B=1.0)`, alpha = `orbCount / 4.0`

### Engine Flame Effect (Visual)
- **Particle system effect**, NOT a sprite — created by `GameManager::make_engine()`
- Called from `PlayerShip::update()` at position `(ship_x + 38, ship_y + 47)` (engine nozzle)
- **Particle properties:**
  - Color: Red/pink `(R=1.0, G=random 0–2, B=random 0–2)` — creates flickering red/orange/pink
  - Angle: ~175° (pointing downward/backward from ship)
  - Speed: `StarField::rnd() / 20.0` (small random)
  - Lifetime: 0.003–0.103 seconds (very short-lived particles)
  - Count: 1 particle per call
  - No gravity
- **Capital ship** has a similar dual-engine effect via `make_CapShipEngine()`

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
5 weapon slots, all fire simultaneously when Space is held (each at its own fire rate):

| Slot | Type | Offset (x, y) | Default Angle |
|------|------|---------------|---------------|
| 1 — Nose Blaster | BLASTER | (22, −12) | 0° |
| 2 — Left Turret | TURRET | (−1, −5) | 135° |
| 3 — Right Turret | TURRET | (44, −5) | 45° |
| 4 — Left Missile | MISSILE | (13, 0) | 0° |
| 5 — Right Missile | MISSILE | (30, 0) | 0° |

---

## 5. Weapons

### Power Cell System (C++ PowerPlant)

Each weapon has **two independent power cells** that control different aspects:

| Cell | Purpose | Formula | Default | Max |
|------|---------|---------|---------|-----|
| **Cell 1** (WEAPON_RATE) | Fire rate | `effectiveDelay = baseDelay / getPowerMUX(cell1)` | 1 (1.5×) | 5 (5.0×) |
| **Cell 2** (WEAPON_POWER) | Damage + sprite | `actualDamage = baseDamage × getPowerMUX(cell2)` | 1 (1.5×) | 5 (5.0×) |

- **Sprite frame** = `cell2 - 1` (higher cell → larger/more powerful projectile sprite)
- Cell values are upgraded via the Ship Customization screen using Research Units (RUs)
- Both cells start at 1 for all weapons; max achievable through upgrades is 5

### Player Weapons

| Property | Blaster (1) | Turret (2) | Missile (3) |
|----------|------------|------------|-------------|
| Base Damage | 6 | 4 | 10 |
| Damage Formula | 6 × getPowerMUX(cell2) | 4 × getPowerMUX(cell2) | 10 × getPowerMUX(cell2) |
| Base Fire Rate | 100ms (BLASTER_DELAY) | 250ms (TURRET_DELAY) | 1000ms (MISSILE_DELAY) |
| Effective Fire Rate | 100ms / getPowerMUX(cell1) | 250ms / getPowerMUX(cell1) | 1000ms / getPowerMUX(cell1) |
| Projectile Speed | dy = −27 px/frame | angle-dependent (see below) | dy = −17 px/frame |
| Sprite Frames | 5 (`blaster_1`–`5`) | 5 (`turret_1`–`5`) | 5 (`torp_1`–`5`) |
| Special | — | Rotatable angle | Homing after 50px travel (if researched) |

At default cell1=1 (1.5× multiplier): Blaster fires every 67ms, Turret every 167ms, Missile every 667ms.

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

Enemy weapons use the **default PowerPlant(1,1)** — cell1=1, cell2=1, giving a 1.5× multiplier
to both fire rate and damage (same as player weapons at starting power). This means effective
damage is higher than the raw formula values below.

| Property | Enemy Blaster (4) | Enemy Cannon (5) |
|----------|-------------------|------------------|
| Base Damage | 3 × ENEMY_DAMAGE_1(5) = 15 | 4 × ENEMY_DAMAGE_1(5) = 20 |
| Effective Damage | 15 × 1.5 = **22** | 20 × 1.5 = **30** (gunship: 20 × 2.0 = **40**) |
| Base Fire Rate | 100ms (BLASTER_DELAY) | 250ms (TURRET_DELAY) |
| Effective Fire Rate | 100ms / 1.5 = **67ms** | 250ms / 1.5 = **167ms** |
| Projectile Speed | Inherits ship velocity ×2 | dy = +21 px/frame |
| Sprite Frames | 8 (`enemy_1`–`8`) | 8 (`enemy_1`–`8`) |
| Used By | Light Fighters, Heavy Fighters | Gunships, Frigates |

**Note:** Gunship explicitly sets `power_cell_2 = 2` (C++ `EnemyShip.h`), giving 2.0× damage.
All other enemies use the default cell2=1 (1.5×). The AI-level fire rate (400ms for Light Fighters,
1000ms for Fighter B, 600ms for Gunships) is the primary timing gate — the weapon's own fire rate
only matters when the AI interval is shorter (e.g., boss turret sweeping at 60ms).

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

## 8. Boss (Type 4) — Authoritative Reference

> **Source of truth:** This section was compiled from a line-by-line audit of
> `Boss.cpp` (constructor lines 27–256, state machine lines 684–778,
> collision lines 501–540, destruction lines 575–664) and
> `GL_Handler.cpp` (energy effects lines 328–534).
> All positions, armor values, AI configs, and state transitions are
> verified against the original C++ source.

### 8.1 Overview

| Property | C++ Value | Notes |
|----------|-----------|-------|
| Starting Position | (245, −600) — offscreen above | Set by GameManager |
| Hover Position | Y = −50 | `y == -50` triggers BOSS_NORMAL |
| Entering Speed | 1 px / 100ms = **10 px/s** | Tick-based: `y++` every 100ms |
| Wait Time | 110,000ms (110 seconds into level) | `BOSS_WAIT = 110000` |
| Boss Music Trigger | 96 seconds (BOSS_WAIT − 14000ms) | `BossNear1` + background music |
| Orb Animation Interval | 60ms per frame | `nLastOrbUpdate` |
| Difficulty HP Offset | Easy=−200, Medium=0, Hard=+200, ExtremelyHard=+1000 | Added to base armor/shields |

### 8.2 All 38 Components — Complete Reference

#### Constants

```
NODE_OFFSETS:
  NODE1 = (-213, 111)    NODE2 = (-65, 259)
  NODE3 = ( 97, 259)     NODE4 = (245, 111)

U-COMPONENT BASE:
  LEFTU_X  = -94     LEFTU_Y  = -68
  RIGHTU_X = 112     RIGHTU_Y = -65
```

#### Center Components

| Component | Offset (x,y) | Shields | Armor | Damageable | Sprite | Start Frame |
|-----------|-------------|---------|-------|------------|--------|-------------|
| CenterNode | (0, 0) | 1000+Hp | 1000+Hp | **true*** | CenterNodeTemplate (160×160) | 0 |
| CenterOrb | (48, 48) | 1000+Hp | 1000+Hp | **false**† | OrbTemplate (64×64) | 0 |

\* CenterNode is created with `damageable=true` in C++, but during Normal phase it is protected
by the boss shield (solid circle hitbox blocks all projectiles to internals). CenterNode becomes
effectively targetable only at **BOSS_FINAL** state.

† CenterOrb is created with `damageable=false`. It is set to `damageable=true` at the
BOSS_MORPH2→BOSS_FINAL transition. Destroying CenterOrb triggers the death sequence.

#### Outer Nodes (4) — Structural, effectively invulnerable

| Node | Offset | Shields | Armor | Damageable | Sprite |
|------|--------|---------|-------|------------|--------|
| 0 (upper-left) | (−213, 111) | 500,000 | 500,000 | true | OuterNodeTemplate (128×128) |
| 1 (lower-left) | (−65, 259) | 500,000 | 500,000 | true | OuterNodeTemplate |
| 2 (lower-right) | (97, 259) | 500,000 | 500,000 | true | OuterNodeTemplate |
| 3 (upper-right) | (245, 111) | 500,000 | 500,000 | true | OuterNodeTemplate |

#### Outer Orbs (4) — Primary targets in Normal phase

| Orb | Offset | Shields | Armor | Start Frame | Sprite |
|-----|--------|---------|-------|-------------|--------|
| 0 | (NODE1_X+32, NODE1_Y+**31**) = (−181, 142) | 500+Hp | 500+Hp | 5 | OrbTemplate (64×64) |
| 1 | (NODE2_X+32, NODE2_Y+**31**) = (−33, 290) | 500+Hp | 500+Hp | 25 | OrbTemplate |
| 2 | (NODE3_X+32, NODE3_Y+**31**) = (129, 290) | 500+Hp | 500+Hp | 10 | OrbTemplate |
| 3 | (NODE4_X+32, NODE4_Y+**31**) = (277, 142) | 500+Hp | 500+Hp | 15 | OrbTemplate |

**Important:** Y offset is **+31**, not +32. 33 animation frames; frame interval = 60ms.
When `curr_frame == num_frames - 1` (frame 32), the orb is considered destroyed.

#### Platforms (8) — Not damageable, destroyed in cascade

| Platform | Offset (absolute) | Type | Parent Node | Sprite |
|----------|-------------------|------|-------------|--------|
| 0 | (−264, 134) | LEFT | 0 | PlatformLTemplate (80×80) |
| 1 | (−116, 282) | LEFT | 1 | PlatformLTemplate |
| 2 | (198, 283) | RIGHT | 2 | PlatformRTemplate |
| 3 | (346, 135) | RIGHT | 3 | PlatformRTemplate |
| 4 | (−188, 211) | DOWN | 0 | PlatformDTemplate |
| 5 | (−40, 359) | DOWN | 1 | PlatformDTemplate |
| 6 | (122, 359) | DOWN | 2 | PlatformDTemplate |
| 7 | (270, 211) | DOWN | 3 | PlatformDTemplate |

Platform offsets relative to parent node:
- LEFT: (NODE_X − 51, NODE_Y + 23)
- RIGHT: (NODE_X + 101, NODE_Y + 24)
- DOWN: (NODE_X + 25, NODE_Y + 100)

#### Connectors (3)

| Connector | Offset (absolute) | Shields | Armor | Sprite |
|-----------|-------------------|---------|-------|--------|
| 0 (UL) | ((N1_X+N2_X)/2, (N1_Y+N2_Y)/2) = (−139, 185) | 10,000 | 10,000 | connectorul |
| 1 (H) | ((N2_X+N3_X)/2+32, (N2_Y+N3_Y)/2+48) = (48, 307) | 10,000 | 10,000 | connectorh |
| 2 (UR) | ((N3_X+N4_X)/2, (N3_Y+N4_Y)/2) = (171, 185) | 10,000 | 10,000 | connectorur |

Created with `damageable=false` then immediately set to `true` via `set_damageable(true)`.

#### U-Components (2) — Not damageable, hidden until morph

| Component | Start Offset | Shields | Armor | Sprite |
|-----------|-------------|---------|-------|--------|
| LeftU | (LEFTU_X−80, LEFTU_Y−336) = (−174, −404) | 500+Hp | 500+Hp | bossul (144×288) |
| RightU | (RIGHTU_X+80, RIGHTU_Y−336) = (192, −401) | 500+Hp | 500+Hp | bossur (144×288) |

Created with `damageable=false` in C++ and **never** changed. The arms themselves are not
targetable — only the turrets mounted on them can be hit. Only visible/rendered during
Morph1, Morph2, and Final states.

#### Boss Shield

| Property | Value |
|----------|-------|
| Offset | (−48, −48) |
| Shields | **50,000** |
| Armor | **50,000** |
| Sprite | bossShield (256×256) |
| Damageable | Created false, set to true |
| Deleted when | `orbCount == 0` (all 4 outer orbs destroyed) |

### 8.3 Turrets — AI Configurations

#### 8 Outer Turrets (on platforms)

| Turret | Offset (absolute) | Shields | Armor | AI Type | Fire Rate (ms) |
|--------|-------------------|---------|-------|---------|---------------|
| 0 | (−256, 142) | 0 | 600+Hp | SWEEPING | 60 |
| 1 | (−108, 290) | 0 | 600+Hp | RANDOM | 2000 |
| 2 | (206, 291) | 0 | 600+Hp | RANDOM | 2000 |
| 3 | (354, 143) | 0 | 600+Hp | SWEEPING | 60 |
| 4 | (−180, 219) | 0 | 600+Hp | RANDOM | 2000 |
| 5 | (−32, 367) | 0 | 600+Hp | RANDOM | 2000 |
| 6 | (130, 367) | 0 | 600+Hp | RANDOM | 2000 |
| 7 | (278, 219) | 0 | 600+Hp | RANDOM | 2000 |

Turret offsets = Platform offset + 8 (centering 64×64 turret on 80×80 platform).
All turrets fire in ALL states after entering. Weapon: ENEMYBLASTER, power cell 2 = 4.

Turret weapon positions: `(turret_x_offset + 16, turret_y_offset + 16)`.

**Turret Weapon Timing (CRITICAL):** Boss turrets have **two independent timing gates**:
1. **TurretAI fireRate** — AI-level cooldown (e.g., 60ms for SWEEPING)
2. **Weapon ready_to_fire()** — `BLASTER_DELAY / getPowerMUX(cell1)` = 100 / 1.5 ≈ **67ms**

Both must be satisfied for a projectile to spawn. For SWEEPING turrets (60ms AI rate),
the weapon cooldown blocks every other tick, giving an effective rate of ~120ms.
Boss turrets use power_cell_1=1 (default), power_cell_2=4 (3.0× multiplier).
Effective damage: 3 × ENEMY_DAMAGE_1(5) × getPowerMUX(4) = 15 × 3.0 = **45**.

#### 6 U-Turrets (on U-components)

| UTurret | Start Offset (absolute) | Shields | Armor | AI Type | Fire Rate (ms) |
|---------|------------------------|---------|-------|---------|---------------|
| 0 | (−128, −190) | 0 | 600+Hp | SWEEPING | 30 |
| 1 | (−159, −231) | 0 | 600+Hp | NORMAL | 500 |
| 2 | (−159, −282) | 0 | 600+Hp | SWEEPING | 60 |
| 3 | (224, −189) | 0 | 600+Hp | SWEEPING | 30 |
| 4 | (252, −230) | 0 | 600+Hp | NORMAL | 500 |
| 5 | (252, −281) | 0 | 600+Hp | SWEEPING | 60 |

U-turrets **only fire during BOSS_FINAL state**. However, they are **always damageable**
(created with `damageable=true` in C++) — players can damage them during morph phases.
Sprite: GunTurretTemplate (33 frames).

UTurret weapon positions:
- Left U (indices 0–2): `(x_offset + 96, y_offset + 352)`
- Right U (indices 3–5): `(x_offset − 64, y_offset + 352)`

#### Turret AI Types (C++ TurretAI behavior)

| Type | Behavior |
|------|----------|
| NORMAL | Tracks player, fires when facing. FireRate = cooldown between shots |
| RANDOM | Snaps to random frame every FireRate ms, fires |
| SWEEPING | Turns to heading−5, waits 3000ms, then sweeps +1 frame/FireRate ms firing continuously until heading+5 (10 frame arc ≈ 112°) |
| FIXED | Never changes frame (unused on boss) |

Turn rate for all types: **65ms per frame** (TURRET_TURN_RATE).

#### Turret Fire Direction (C++ `FireTurret()`)

```
frame → angle:  rad = ((frame - 8) / 32) × 2π
offset:         x_off = cos(rad) × 24,  y_off = sin(rad) × −24
C++ velocity:   weapon.fire(x + x_off, y + y_off, x_off/2, y_off/2)
                Projectile doubles: dx = (x_off/2)×2 = x_off, dy = (y_off/2)×2 = y_off
                → final velocity magnitude ≈ 24 px/frame
```

Frame 0 = right, Frame 8 = down (toward player), Frame 16 = left, Frame 24 = up.
32 frames = 360°. Uses trig (NOT the discrete 8-angle player turret table).

### 8.4 State Machine

```
BOSS_WAITING ──(110s)──→ BOSS_ENTERING_SCREEN ──(y reaches -50)──→ BOSS_NORMAL
                                                                       │
                                            (all 4 outer orbs at final frame)
                                                                       │
                                                                       ▼
                                                                 BOSS_MORPH1
                                            (LeftU.offsetY reaches LEFTU_Y-80 = -148)
                                                                       │
                                                                       ▼
                                                                 BOSS_MORPH2
                                            (LeftU.offsetY reaches LEFTU_Y = -68)
                                                                       │
                                                                       ▼
                                                                 BOSS_FINAL
                                            (CenterOrb destroyed → death sequence)
```

#### State Details

**BOSS_WAITING:**
- No rendering/updates. Boss music triggers at BOSS_WAIT − 14000ms = 96 seconds.
- Transition: `levelTime >= 110000ms`

**BOSS_ENTERING_SCREEN:**
- Movement: `y++` every 100ms (1 px/100ms = 10 px/s)
- Transition: `y == -50` → BOSS_NORMAL

**BOSS_NORMAL:**
- All 8 outer turrets fire. Shield active (orbCount > 0).
- Hover bob: gentle sine oscillation.
- Transition trigger: ALL 4 outer orbs at `curr_frame == num_frames - 1` (destroyed frame)

**BOSS_MORPH1:**
- U-components move **straight down** only: +1 Y per 100ms
- All 6 U-turrets also move +1 Y per 100ms
- Target: `LeftU.offsetY == LEFTU_Y - 80` = −148
- Distance: from −404 to −148 = **256 pixels = 25.6 seconds**

**BOSS_MORPH2:**
- U-components move **down + inward**: +1 Y and ±1 X per 100ms
  - LeftU: +1 X (rightward), RightU: −1 X (leftward)
  - UTurrets 0–2: +1 X, UTurrets 3–5: −1 X
- Target: `LeftU.offsetY == LEFTU_Y` = −68
- Distance: from −148 to −68 = **80 pixels = 8.0 seconds**

**BOSS_FINAL:**
- `CenterNode.damageable = true`, `CenterOrb.damageable = true`
- U-turrets begin firing (in addition to outer turrets)
- Win condition: destroy CenterOrb

### 8.5 Collision Detection — Priority Order

C++ `collision_update()` checks components in this **exact order** (first hit wins):

1. **CenterOrb** (highest priority — checked first)
2. **CenterNode**
3. **OuterOrbs[0–3]**
4. **OuterTurrets[0–7]**
5. **Connectors[0–2]**
6. **UTurrets[0–5]**
7. **bossShield** (lowest priority — checked last)

Each component's `collision_update()` checks:
- Component is not NULL
- Component is damageable
- Projectile overlaps component bounds
- If hit: apply damage, return true (stops further checks)

**Ship-body collision** (`collision_update_ship`) has a different order:
CenterNode → OuterNodes[0–3] → LeftU → RightU → Connectors[0–2] → bossShield

**Web implementation note:** The `bossShield.png` sprite has a transparent center, so pixel-mask
collision would let bullets through. When `shieldActive` (orbCount > 0), the web version uses a
**solid circle hitbox** (radius=128px, centered on boss) instead of the sprite mask. All internal
components (platforms, connectors, centerNode, centerOrb, bossShield) are protected while shield
is active — only outer orbs and outer turrets are targetable through the shield. When shield is
inactive, normal sprite-mask collision applies.

### 8.6 Cascade Destruction (When Outer Orb Dies)

When OuterOrb `i` is destroyed:
1. **OuterOrbs[i]**: `set_visible(false)` — stop drawing entirely
2. **OuterNodes[i]**: `set_visible(false)` — stop drawing
3. **OuterTurrets[i]** (side): `set_visible(false)`, `set_damageable(false)`, set to destroyed frame
4. **OuterTurrets[i+4]** (down): `set_visible(false)`, `set_damageable(false)`, set to destroyed frame
5. **platforms[i]** (side): `set_visible(false)`
6. **platforms[i+4]** (down): `set_visible(false)`
7. **Connectors** per mapping:
   - Orb 0 → Connector[0]
   - Orb 1 → Connector[0], Connector[1]
   - Orb 2 → Connector[1], Connector[2]
   - Orb 3 → Connector[2]
   - For each: `set_visible(false)`, `set_damageable(false)`
8. `orbCount--`
9. When `orbCount == 0`: `bossShield` is deleted (set to NULL)

**Important:** Destroyed turrets are **not drawn at all** in C++ (`set_visible(false)`).
Do not draw them in a destroyed frame — simply skip rendering.

### 8.7 Death Sequence (CenterOrb Destroyed)

1. CenterOrb destroyed → begin death sequence
2. All 6 U-turrets: trigger `destroy_ship()` explosions, mark destroyed
3. 11-second death timer begins with random chain explosions
4. Boss marked dead when timer expires

#### Explosion Positions — `destroy_ship(x, y)` (9 explosions per turret)

Relative to component position `(_x, _y)`:
```
(_x+32, _y+32)   (_x+62, _y+32)   (_x+96, _y+32)
(_x+32, _y+62)   (_x+62, _y+62)   (_x+96, _y+62)
(_x+32, _y+96)   (_x+62, _y+96)   (_x+96, _y+96)
```
(3×3 grid at positions 32, 62, 96 — covers a ~64px area centered within 128px component)

#### Explosion Positions — `destroy_orb(x, y)` (5 explosions per orb)

```
(_x+32, _y+32)   (_x+62, _y+32)   (_x+96, _y+32)
(_x+32, _y+62)                     (_x+96, _y+62)
```
(Top row + side middle — no bottom row, no center bottom)

### 8.8 Draw Order (from `update()` component iteration)

Components are updated/rendered in this order:
1. CenterNode
2. CenterOrb
3. OuterNodes[0–3]
4. OuterOrbs[0–3]
5. LeftU, RightU (only during Morph1/Morph2/Final)
6. platforms[0–7]
7. OuterTurrets[0–7] (skip destroyed — `get_visible()` check)
8. UTurrets[0–5] (only during Morph1/Morph2/Final)
9. Connectors[0–2]
10. bossShield

Energy effects (GL_Handler) are drawn as a separate overlay pass (see §8.9).

### 8.9 Energy Effects (GL_Handler.cpp)

All positions are relative to boss origin `(get_x(), get_y())`.
Uses OpenGL additive blending with textured quads.

#### Shield Glow (always while orbCount > 0)
- Center: `(+80, +80)`, Size: 260×230 (offsets 130×115)
- Color: `(0.4, 0.15, 1.0)` purple — Alpha: `orbCount / 4.0`

#### Central Red Orb Glow (always)
- Center: `(+80, +80)`, Size: 180×180 (offsets 90×90)
- Color: `(1.0, 0.0, 0.0)` red — Alpha: `bossAlpha` (pulsing)

#### Outer Node Orb Glows (conditionally visible per orb)
- Center: `(NODE_X + 64, NODE_Y + 64)`, Size: 180×180
- Color: `(1.0, 0.0, 0.0, bossAlpha)` red
- Only drawn if corresponding `OuterOrb[i].get_visible()`

#### Center Connector Points (white pulsing dots)
- CP1: `(+12, +148)` — shown if Orb[0] OR Orb[1] visible
- CP2: `(+148, +148)` — shown if Orb[2] OR Orb[3] visible
- Size: 60×60 (offset 30×30), Color: `(1.0, 1.0, 1.0, warningAlpha)`

#### Energy Beams (node-to-center connector lines)
- Color: `(0.4, 0.15, 1.0, warningAlpha × 0.5)` — purple, half-alpha
- Texture: `bar.bmp` (texture[3])

| Beam | From | To | Offset | Notes |
|------|------|----|--------|-------|
| Node1→CP1 | `(N1_X+128, N1_Y+64−10)` = (−85, 165) | `(+12, +148)` → y−16 | 30×30 | y−16 on destination |
| Node2→CP1 | `(N2_X+64, N2_Y)` = (−1, 259) | `(+12, +148)` | 20×30 | Narrower beam |
| Node3→CP2 | `(N3_X+64, N3_Y)` = (161, 259) | `(+148, +148)` | 20×30 | Narrower beam |
| Node4→CP2 | `(N4_X, N4_Y+64−10)` = (245, 165) | `(+148, +148)` → y−16 | 30×30 | y−16 on destination |

#### Node Connector Points (white dots at beam origins)
- Same color as center connector points: `(1.0, 1.0, 1.0, warningAlpha)`
- Size: 60×60 (offset 30×30)

| Node | Position |
|------|----------|
| Node 1 | `(N1_X+128, N1_Y+64)` = (−85, 175) |
| Node 2 | `(N2_X+64, N2_Y)` = (−1, 259) |
| Node 3 | `(N3_X+64, N3_Y)` = (161, 259) |
| Node 4 | `(N4_X, N4_Y+64)` = (245, 175) |

#### Connector Bars (diagonal energy lines between nodes)
- Color: `(0.0, 0.0, 1.0, bossAlpha)` — blue
- Texture: bar.bmp

| Bar | Condition | From | To | Offset |
|-----|-----------|------|----|--------|
| Left | Orb[0] AND Orb[1] | `(N1_X+104, N1_Y+104+16)` = (−109, 231) | `(N2_X+26, N2_Y+26−16)` = (−39, 269) | 30×30 |
| Right | Orb[2] AND Orb[3] | `(N4_X+26, N4_Y+104+16)` = (271, 231) | `(N3_X+104, N3_Y+26−16)` = (201, 269) | 30×30 |
| Center | Orb[1] AND Orb[2] | `(N2_X+148, N2_Y+65)` = (83, 324) | same point | 50×25 |

#### U-Arm Red Lights (only when `orbCount == -1`)
- Color: `(1.0, 0.0, 0.0, bossAlpha)` — red
- Size: 40×40 (offset 20×20)
- LeftU light: `(LeftU.x + 96, LeftU.y + 281)`
- RightU light: `(RightU.x + 43, RightU.y + 281)`

#### Pulsing Alpha Values
- `bossAlpha`: oscillates sinusoidally, used for orb glows + connector bars
- `warningAlpha`: oscillates at different rate, used for connector points + beams

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

### Projectile Rendering (from GL_Handler.cpp)
All projectiles use **additive blending** (`GL_SRC_ALPHA, GL_ONE`), creating glowing energy effects.

| Weapon Type | GL Color (R,G,B,A) | Web Color | Size Progression (frames 0–4) |
|------------|-------------------|-----------|-------------------------------|
| Energy Blast (blaster) | 0.0, 1.0, 0.2, 0.7 | Bright lime green | 27→28→29→30→35 px |
| Energy Bullet (turret) | 0.0, 1.0, 0.5, 0.7 | Cyan-green | 27→30→35→40→45 px (+4 Y offset) |
| Energy Missile | 0.0, 0.0, 1.0, 0.7 | Bright blue | 27→35→40→45→55 px |
| Enemy (fighter blast) | Red-orange | Orange-red | — |
| Enemy (gunship cannon) | Red | Red | — |

Web implementation: Each projectile draws a radial gradient glow (1.5× sprite width) behind its sprite frame, using `globalCompositeOperation = 'lighter'`.

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
- Rendered as 3×3 core dot with 8px radial gradient glow halo
- **Additive blending** for all particles (`globalCompositeOperation = 'lighter'`)
- Glow halo only rendered when alpha > 0.2 for performance

### Engine Particles
Created by `GameManager::make_engine(int x, int y, float intensity)`:
- **Count:** 1 particle per call (called from `PlayerShip::update()`)
- **Position:** Player ship at `(x+38, y+47)` — engine nozzle location
- **Color:** `R=1.0, G=random(0–2), B=random(0–2)` — red/pink/orange flicker
- **Angle:** ~175° (downward/backward)
- **Speed:** `StarField::rnd() / 20.0` (small random velocity)
- **Lifetime:** `(rand()%100) / 1000.0 + 0.003` → 0.003–0.103 seconds
- **No gravity**, uses intensity parameter from engine power level
- Capital ships use `make_CapShipEngine()` with dual particle streams

### Original C++ Particle System
The original uses a more complex gravity-well system:
- Max gravity lookup table: 2500 entries
- Universal gravity constant: 6.52
- Particle properties include mass, gravity flags, vector components
- Rendered as 33×33 textured quads (texture[0] = Particle.bmp) with additive blending

### Explosion Rendering (from GL_Handler.cpp)
- **Sprite animation:** 16 frames, 20ms per frame
- **GL overlay glow:** `glColor4f(5.0, 2.0, 0.0, 0.15)` — **overbright** red-orange with additive blending
  - Values > 1.0 cause HDR-like cumulative brightness
  - Creates intense fire-like glow behind sprite frames
- **Quad size:** 49×49 pixels (±24.5 from center)
- **Web implementation:** Radial gradient glow behind each sprite frame
  - Inner: bright orange-yellow, outer: fading red
  - Uses `globalCompositeOperation = 'lighter'`

### Global Blending Mode
The original GL renderer uses **additive blending globally**: `glBlendFunc(GL_SRC_ALPHA, GL_ONE)`
This affects ALL rendered effects:
- Shield bubbles glow and brighten what's behind them
- Overlapping projectiles create cumulative brightness
- Explosions produce intense flash effects
- Engine particles create warm glow halos
- Web equivalent: `ctx.globalCompositeOperation = 'lighter'`

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
Background: `console` sprite at (SCREEN_WIDTH − CONSOLE_WIDTH, 0) = (650, 0)  
Console width: 150 pixels

### Font System
5 font variants loaded from resources:
- `fnt_clansoft` — main menu font
- `fnt_large` — large titles (notifications like "NEW!")
- `fnt_inactive` — dimmed/greyed-out text
- `fnt_ingame` — active in-game HUD text (green)
- `fnt_ingame_1` — inactive in-game HUD text (dimmed)

### In-Game HUD Element Positions

| Element | Position | Font | Notes |
|---------|----------|------|-------|
| Rank | centered at (725, 0) | `ingame_font` | e.g., "TEST PILOT" |
| Kills label | (660, 130) | `ingame_font` | "Kills" |
| Kills count | right-aligned (790, 130) | `ingame_font` | Integer |
| Speed setting 'Q' | (660, 190) | green/dimmed | Green when active |
| Power setting 'W' | (660, 220) | green/dimmed | Green when active |
| Armor setting 'E' | (660, 250) | green/dimmed | Green when active |
| RU's label | (660, 280) | `ingame_font` | "RU's" |
| RU's count | (700, 280) | `ingame_font` | Integer |
| "Shields" header | centered (688, 335) | `ingame_font` | Column label |
| "Armor" header | centered (760, 335) | `ingame_font` | Column label |

### Power Setting Display
- Active setting uses **green font** (`ingame_font`)
- Inactive settings use **dimmed font** (`ingame_font_1`)
- Settings cycle with Q/W/E hotkeys
- Text format: `"speed setting 'Q'"`, `"power setting 'W'"`, `"armor setting 'E'"`

### Weapon Power Cell Bars (in HUD)

| System | Rate X | Power X | Y |
|--------|-------:|--------:|--:|
| Nose Blaster | 719 | 729 | 52 |
| Left Turret | 668 | 678 | 80 |
| Right Turret | 768 | 778 | 80 |
| Left Missile | 698 | 708 | 83 |
| Right Missile | 738 | 748 | 83 |
| Ship Shield/Engine | 668 / 678 | — | 122 |

- Bar dimensions: width 4, height 4 pixels per cell
- All bars rendered in pure green `(0.0, 1.0, 0.0)`
- Bars draw upward from Y position

### Shield & Armor Bars (Main Health Display)

| Bar | X | Y | Width | Notes |
|-----|--:|--:|------:|-------|
| Shields | 667 | 565 | 45 | Draws upward |
| Armor | 740 | 565 | 45 | Draws upward |

**Dynamic color based on depletion level:**

**When value ≥ 150 (healthy → depleting):**
- Red = `(value × −0.015) + 4.5` — transitions from ~0 (green) at 300 to ~2.25 at 150
- Green = 1.0 (constant)
- Blue = 0.0
- **Effect:** Pure green at full → yellow-green as it depletes

**When 0 < value < 150 (critical):**
- Red = 1.0 (constant)
- Green = `value × 0.0066` — transitions from ~1.0 at 150 to 0 at 0
- Blue = 0.0
- **Effect:** Yellow at 150 → pure red at 0

Bar height = `value × 0.666` pixels (300 HP = 200 pixels tall)

### Speed Ship Animation
`speed_ship` sprite displayed in console, animates based on engine power level.

### Customization Screen Bars
- Bar dimensions: width 14, height 10 pixels per cell
- All bars rendered in pure green `(0.0, 1.0, 0.0)`

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

**Level Start Animations** (GameAnimation class, 100ms per frame):
- Level 1: `level_anim_1` through `level_anim_8` (8 frames)
- Level 2: `level_anim_1` through `level_anim_7` + `level_anim_2_start`
- Level 3: `level_anim_1` through `level_anim_7` + `level_anim_3_start`

**Level End/In-Game Overlays:**
- Level start overlays: `in_game_start2`, `in_game_start3`
- Level end: `in_game_end2`
- In-game text frames: `in_game_1` through `in_game_22`, `in_game_empty`

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

| Difficulty | Level | Wave Modifier | Boss Armor Modifier | Description |
|-----------|:-----:|:------------:|:-------------------:|-------------|
| Easy | 0 | −2 | −200 | Fewer enemies, weaker boss |
| Medium | 1 | 0 | 0 | Standard difficulty |
| Hard | 2 | +2 | +200 | More enemies, tougher boss |
| Extremely Hard | 3 | +5 | +1000 | Maximum difficulty |

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
