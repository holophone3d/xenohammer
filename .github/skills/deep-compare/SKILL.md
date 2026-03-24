---
name: deep-compare
description: >
  Deep comparative audit between original C++ XenoHammer game code and the
  TypeScript/Canvas web rewrite. Use this skill when asked to compare, audit,
  port, verify, or debug differences between the C++ and web implementations.
  Also use when fixing gameplay bugs that may stem from porting inaccuracies.
---

# Deep Compare — C++ ↔ Web Audit Skill

## Purpose

This skill performs a systematic, line-by-line comparison between the original
C++ XenoHammer source (`E:\Source\xenohammer\`) and the web TypeScript rewrite
(`web/src/`). It produces authoritative findings with exact values, identifies
discrepancies, and recommends fixes.

## Source Locations

| Track | Path | Language | Notes |
|-------|------|----------|-------|
| Original C++ | `E:\Source\xenohammer\` | C++ / ClanLib | READ-ONLY reference |
| Web rewrite | `E:\Source\xenohammer_2026\web\src\` | TypeScript / Canvas | Active development |
| Shared assets | `E:\Source\xenohammer_2026\assets\` | PNG, WAV, OGG | Converted from PCX |
| Game spec | `E:\Source\xenohammer_2026\SPEC.md` | Markdown | Authoritative reference |

## Key C++ Source Files

| File | Contents |
|------|----------|
| `Boss.cpp` | Boss constructor (all 38 components), state machine, collision, destruction, turret firing |
| `GL_Handler.cpp` | Shield bubble, energy beams/glows, particles, boss energy effects, OpenGL rendering |
| `GameManager.cpp` | Game loop, state machine, `make_engine()`, level animations, entity management |
| `PlayerShip.cpp` | Player update, banking frames, weapon offsets, shield regen |
| `GameObject.cpp` | Base `show()` with VELOCITY_DIVISOR scaling |
| `Projectile.cpp` | Velocity lookup table (8-angle), homing logic, projectile update |
| `TurretAI.cpp` | Turret AI types: NORMAL, RANDOM, SWEEPING, FIXED; `CalculateHeading()`, `Think()` |
| `Weapon.cpp` | `fire()` method (2-param and 4-param overloads), weapon damage, spawn position |
| `Sound.cpp` | Music/SFX mapping |
| `GUI.cpp` | ALL menu/UI screens, HUD, customization, briefing |
| `Console.h` | HUD bar position constants |
| `GameAnimation.h` | Level intro frame animation (100ms/frame) |
| `Ship.cpp` / `CapitalShip.cpp` | Base ship classes, component management |
| `ShipComponent.cpp` | Component collision, damage, visibility, damageable flag |
| `explosionGenerator.cpp` | `MakeExplosions()` — particle + sprite explosion creation |

## Web Source Structure

| File | Contents |
|------|----------|
| `game/Boss.ts` | Boss fight (~1600 lines) — all components, state machine, rendering, energy effects |
| `game/GameManager.ts` | Game loop, entity management, collision dispatch |
| `game/Player.ts` | Player ship, banking, weapons |
| `game/Enemy.ts` | Enemy types, AI |
| `game/Projectile.ts` | Projectile movement, velocity scaling |
| `game/Weapon.ts` | Weapon types, fire logic |
| `game/Collision.ts` | Collision detection |
| `game/HUD.ts` | HUD rendering |
| `data/ships.ts` | Ship configs, VELOCITY_DIVISOR |
| `engine/Sprite.ts` | Sprite rendering, animation |
| `engine/Particles.ts` | Particle system |

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

## Critical C++ Patterns to Understand

### 1. Velocity Scaling (VELOCITY_DIVISOR = 32)

ALL movement in C++: `actual_px = (velocity × dt_ms) / 32`

```cpp
// From GameObject::show()
x += (int)((float)dx * (float)(frameTic - lastFrameTic)) / 32;
y += (int)((float)dy * (float)(frameTic - lastFrameTic)) / 32;
```

Web equivalent: `moveScale = dt * 1000 / 32`

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
- `get_x()` / `get_y()` return absolute screen position
- Component offsets are relative to parent ship origin
- `set_visible(false)` = component is not drawn AND not collision-checked

### 4. Component Offset Pattern

```cpp
Component = new ShipComponent(x_offset, y_offset, damageable, shields, armor, parent, manager);
```

Screen position = `parent.get_x() + component.get_x_offset()`,
                  `parent.get_y() + component.get_y_offset()`

### 5. Weapon Fire Position

```cpp
// Weapon::fire() adds its own stored offset to the passed position
fire_x = _x + offset_x;  // offset_x set in Weapon constructor
fire_y = _y + offset_y;
```

For boss turrets: weapon offset = `turret_offset + 16` (NOT center of turret).
C++ fires from `(boss_x + direction_offset + weapon_offset)`.

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

The web version uses `Math.PI` (correct value). This causes a ~0.01 radian
difference (~0.57°) which is negligible but worth noting.

### 8. Collision Detection

C++ `ShipComponent::collision_update()` checks:
1. Component is not NULL
2. Component is damageable (`set_damageable(true)`)
3. Projectile overlaps component bounds (sprite-level collision in original)
4. If hit: apply damage to shields first, then armor; return true

Priority order = the order components are checked in `collision_update()`.
First match wins (returns true, stops further checks).

### 9. Cascade Destruction Pattern

When a component is destroyed, related components are:
- `set_visible(false)` — stop drawing entirely (do NOT draw destroyed frame)
- `set_damageable(false)` — stop accepting damage
- Counter decremented (e.g., `orbCount--`)

### 10. GL_Handler Visual Effects

GL effects are drawn in a SEPARATE pass from sprites. They use:
- Additive blending (`GL_SRC_ALPHA, GL_ONE`)
- `createTriangleStrip(x, y, x1, y1, offset_x, offset_y)` draws a textured quad
- Colors are `(R, G, B, Alpha)` with alpha often tied to game state variables
- Positions are absolute screen coordinates (boss position + component offset)

**Important:** GL_Handler uses inverted Y for OpenGL: `y = -tempCap->get_y()-offset`

## Common Discrepancy Categories

### Positions (Most Common)
- Off-by-one in offsets (e.g., +31 vs +32)
- Missing sub-offsets (e.g., weapon at turret+16 vs turret+32)
- GL_Handler Y inversion mistakes

### Timing
- Using wrong interval (ms vs frames)
- Missing accumulated time drift effects
- `if` vs `while` for tick processing

### State Machine
- Missing or wrong transition conditions
- Wrong order of checks within a frame
- Missing state-specific behavior (e.g., U-turrets only fire in FINAL)

### Rendering
- Wrong draw order (components drawn over each other incorrectly)
- Missing visibility checks (`get_visible()` before drawing)
- Missing GL effects (energy beams, glows, shield effects)
- Wrong alpha/color values for effects

### Collision
- Wrong priority order (which component absorbs hit first)
- Missing damageable flag checks
- Bounding box vs sprite-level collision differences

### Destruction
- Drawing destroyed sprites instead of hiding (`set_visible(false)`)
- Not setting `damageable = false` on cascade-destroyed components
- Wrong explosion positions or counts
- Missing sound effects

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

## Lessons Learned (from prior audits)

1. **Always read the ACTUAL C++ code** — don't rely on assumptions or documentation.
   The C++ code IS the spec.

2. **Trace the full call chain** — e.g., `Boss::FireTurret()` → `Weapon::fire()` →
   `Projectile()`. Each step may add offsets or transformations.

3. **Check for accumulated time drift** — the `nLastMove -= interval` pattern with
   `if` (not `while`) can cause speeds to differ from what the interval suggests.

4. **Verify weapon fire position** — C++ `Weapon::fire()` adds `offset_x/offset_y`
   to the passed position. For boss turrets, this offset is `turret_position + 16`,
   NOT the turret center (+32).

5. **Component visibility** — C++ uses `set_visible(false)` to hide destroyed
   components. They are NOT drawn at all. Do not render destroyed frame sprites.

6. **Shield vs component collision order matters** — C++ checks bossShield LAST
   (lowest priority). The web checks shield FIRST with sprite-level masks.
   This is an intentional design difference.

7. **U-turrets only fire in BOSS_FINAL** — not during morph phases.

8. **Connector damageable flag** — C++ creates connectors with `damageable=false`
   then immediately calls `set_damageable(true)`. Easy to miss.

9. **GL_Handler effects use INVERTED Y** for OpenGL — `y = -tempCap->get_y()-offset`.
   Canvas Y is normal (increases downward). Must convert correctly.

10. **Outer orb Y offset is +31, not +32** — a real off-by-one in the original code.
