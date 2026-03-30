# Original Game Reference Screenshots

Screenshots captured from the original Codename: XenoHammer binary (C++/ClanLib, ~2000).
Used as visual reference for both `web/` and `classic/` implementations.

---

## 01_ready_room_default.png
**Screen:** Ready Room — initial state after start screen  
**Key Details:**
- Background: `room.png` — 3D-rendered sci-fi room with two CRT monitors and a glowing door
- Upper monitor: "Mission Log... Save and Exit Game" — shows briefing/mission text (green CRT text)
- Lower-left monitor: "Customize Your Ship Settings" — shows ship diagram with green wireframe
- **"New Level Briefing Available!"** label in green, above upper monitor
- Bottom text: **"Click on a screen or the door opening"** — instruction bar in large green font
- Door (right side): Glowing white/bright opening — click to launch into the level
- No green CRT overlay on the room itself (that appears only in Options_GUI)

## 02_ready_room_briefing_hover.png
**Screen:** Ready Room — mouse hovering over the upper (briefing) monitor  
**Key Details:**
- **"Briefing Area and Options"** label appears in green over the upper monitor area
- Bottom text changes to: **"Click here to See Briefings, Save, Load, or Quit"**
- Dynamic tooltip system: bottom text changes based on which zone the mouse hovers over

## 03_ready_room_briefing_hover_alt.png
**Screen:** Same as 02 but without window title bar (fullscreen or earlier capture)  
**Key Details:**
- Identical hover state to 02
- Also shows **"NEW!"** label in red/green near the customization monitor (lower-left)

## 04_ready_room_customize_hover.png
**Screen:** Ready Room — mouse hovering over the lower (customization) monitor  
**Key Details:**
- **"Ship Customization"** label appears in green over the lower monitor
- **"New Level Briefing Available!"** text still visible above upper monitor
- Bottom text changes to: **"Click here to customize your ship."**
- Window title: "Codename: XenoHammer"

## 05_briefing_options_menu.png
**Screen:** Options/Briefing Menu (Options_GUI) — accessed by clicking the upper monitor  
**Key Details:**
- **Green CRT scanline overlay** (`room_screen.png`) composited over `room.png`
- This is the green-tinted screen — NOT the default ready room
- **Six menu buttons** (dark gray bars with centered green text, vertically stacked):
  1. "Briefing Area"
  2. "Save Your Game"
  3. "Load Your Game"
  4. "Set Difficulty"
  5. "Quit to the Ready Room"
  6. "Quit to System"
- Buttons are ~60% screen width, centered horizontally
- Background is the room image showing through the green overlay

## 06_briefing_lore_text.png
**Screen:** Briefing Area — story/lore text display  
**Key Details:**
- **Full-screen starfield background** (no HUD, no room)
- Green text at bottom of screen, appearing to scroll up or display line-by-line:
  - "2066 – December 7 - First alien contact is made with Earth by the Crystalline race."
  - '"Earth: We, the Sylgan, of the Universal Protectorate, have been watching you'
- Text uses the game's green monospace/pixel font
- This is the narrative briefing that tells the backstory between levels
- Text appears animated (typewriter or scroll effect)

## 07_ship_specifications.png
**Screen:** Ship Specifications briefing page  
**Key Details:**
- Title: **"XenoHammer Ship Specifications"** in large green text
- Ship diagram (same as customization) with labeled weapon positions:
  - Nose Blaster (top center)
  - Left Turret / Right Turret (sides)
  - Left Photon Torpedo / Right Photon Torpedo (inner sides)
  - Ship Power Plant (bottom center)
- **Weapons Systems descriptions:**
  - **Nose Blaster:** "An ionized plasma cannon made possible by technology the Sylgan collected from a now extinct race of Humanoids from the planet Htrae."
  - **Turrets:** "Our own modification on the ionized plasma cannon, we are currently looking into allowing you to alter the direction of these turrets."
  - **Photon Torpedoes:** "With a hollow silicon center these Silicoid energy weapons may allow us to integrate our semi-conductor technology to add some sort of guidance system to them."
- **Power Plant descriptions:**
  - **Shield Generator:** "The Sylgan's provided us with an energy dispersion shield generator..."
  - **Maneuverability:** "The XenoHammer's Engine is a hybrid of the Sylgan cold-fusion technology and our own experimental radiation ion propulsion."
  - **Emergency Escape:** "This allows you to get out of an impossible situation. It works by using all your collected Resource Units to launch you into hyper-light speed..."
- **"Done"** button at bottom-right

## 08_ship_customization.png
**Screen:** Ship Customization (Cust_GUI) — full weapon/power management  
**Key Details:**
- **Top bar:** "RU's: 10" (left), "Test Pilot" (center), "Kills: 0" (right)
- **Ship diagram** (center-left): Large ship silhouette with 6 clickable zones:
  - Nose Blaster, Left Turret, Right Turret
  - Left Photon Torpedo, Right Photon Torpedo
  - Ship Power Plant
- Each weapon zone is a green-bordered rectangle
- **"Select All Systems"** button below diagram
- **"System Selected: All"** label
- **Ship Customization instructions** (left side, below diagram):
  - "Click on a system to Buy power for it or to do research concerning it"
  - "You can also modify it's internal power settings"
  - Weapon subsystems: "Shot Rate vs. Shot Power"
  - Ship's power plant: "Maneuverability vs. Shield Recharge Rate"
  - "Also click on a user setting or press a HOTKEY to modify that setting for in game use"
- **Right panel — "User Settings":**
  - "speed setting (HOTKEY 'Q')" — highlighted green (active)
  - "power setting (HOTKEY 'W')"
  - "armor setting (HOTKEY 'E')"
- **Right panel — Ship Preview:**
  - Small ship sprite with green dots marking turret/weapon positions
  - "Shields" label with shield bubble visualization
- **Bottom-right:** Yellow rectangle (possibly power cell visualization or UI element)
- **"Exit Ship Customization"** button at very bottom-right

## 09_level1_intro.png
**Screen:** Level 1 start — in-game with level title  
**Key Details:**
- **"LEVEL 1_"** text — actually a **sprite frame animation** (GameAnimation class)
  - 8 pre-rendered bitmap frames (`level_anim_1` through `level_anim_8`) played at 100ms per frame
  - The typewriter/cursor effect is baked into the sprite frames, NOT procedural text
  - Displayed at position (253, 200) in the play area
  - Starts at 600ms into level, plays through 4000ms
- **Player ship** at center-bottom:
  - Blue shield bubble visible — OpenGL textured quad using `Shield.bmp`, color (0.3, 0.6, 0.9), alpha = shields/300
  - Red/pink engine flame — **particle system effect** from `make_engine()`, not a sprite
  - Particles: R=1.0, G/B=random 0–2, angle ~175° (downward), at position (ship_x+38, ship_y+47)
  - Ship is the XenoHammer with wing details visible
- **HUD (right 150px panel):**
  - **"TEST PILOT"** — rank title centered at (725, 0) using `ingame_font`
  - **Ship power cell bars** — green bars showing weapon/engine allocation (4×4 px each)
  - **"Kills: 0"** — at (660, 130) + right-aligned count at (790, 130)
  - **Power settings** (3 lines):
    - "speed setting 'Q'" at y=190 (highlighted green when active via `ingame_font`)
    - "power setting 'W'" at y=220 (dimmed via `ingame_font_1` when inactive)
    - "armor setting 'E'" at y=250
  - **"RU's 10"** — at (660, 280) + count at (700, 280)
  - **Shields bar** — at x=667, y=565, width 45, green (full at 300)
  - **Armor bar** — at x=740, y=565, width 45, green (full at 300)
  - Bar color formula: green→yellow→red as value depletes (see SPEC.md §13)
  - HUD background: `console` sprite (brownish/metallic texture)
- **Starfield background** with Earth (large, lower portion) and Moon (upper left)
  - Earth/Moon only visible when `near_earth=true` (gameplay levels)
- Play area is clearly 650px wide

## 10_gameplay_combat.png
**Screen:** Active gameplay — combat with enemy wave  
**Key Details:**
- **Player ship** (center-bottom):
  - Blue shield bubble still visible
  - Red projectile/engine flame visible
  - Ship is firing (pink/red blaster shot visible below the ship? or near it)
- **Enemy fighters** — wave of ~6 light fighters in formation:
  - Flying in a diagonal line formation (upper-right to lower-left)
  - Each fighter is the small angular sprite, properly oriented in their movement direction
  - Tight formation with ~32px spacing between each ship
  - They appear to be in the FLYBY or TARGETING state
- **Gunship** visible at top — larger ship, appears to be entering screen
- **HUD** showing:
  - "Kills: 0" — no kills yet (just entered combat)
  - Shields bar: green, slightly reduced
  - Armor bar: **yellow** (was green when full — color changes as it depletes!)
  - Same power settings layout
- **Moon** visible at bottom-left corner (parallax scrolled)
- No visible projectile sprites from enemies yet
- The shield glow around the player is the most prominent visual effect

---

## Key Visual Differences from Web Version

### Must-Fix (gameplay-affecting):
1. **Shield bubble effect** — OpenGL textured quad using `Shield.bmp`, blue (0.3, 0.6, 0.9), alpha=shields/300. Web version has no shield visualization. Size: 129×89 quad at player center + (38, -24).
2. **Engine flame** — Particle system effect (`make_engine()`), red/pink particles (R=1.0, G/B=random) at ~175° angle, spawned at (ship_x+38, ship_y+47). Web version has no engine effect.
3. **Armor/Shield bar color** — Dynamic formula: green at full → yellow at half → red at empty. Web version uses static colors.
4. **Level intro animation** — Pre-rendered sprite frame animation (8 frames at 100ms, NOT typewriter text). Frames: `level_anim_1`–`level_anim_8`. Web version shows text instantly.

### Important (UI/UX):
5. **Ready Room dynamic tooltips** — 3 hover zones with labels + bottom bar text that changes per zone. Code: `Room_GUI()` in `GUI.cpp` lines 80-222. Web version lacks dynamic tooltips.
6. **Options/Briefing menu** — 6 dark greenish-gray (0.2, 0.25, 0.2) button bars, width 400px centered. Code: `Options_GUI()` lines 335-483. Web version doesn't implement this.
7. **Ship Customization screen** — Complex UI with weapon diagram (6 clickable zones), power cells, research, user settings. Code: `Cust_GUI()` lines 228-333, `what_system()` lines 1995-2086. Web version doesn't implement this.
8. **Briefing scrolling images** — `backstory` scrolls at 1px/60ms, level briefings at 1px/40ms over starfield (`near_earth=false`). Code: `Backstory_GUI()` / `Level_Briefing_GUI()`. Web version doesn't implement this.
9. **Ship Specifications page** — Static bitmap `ship_specs` with "Done" button at x:680-800, y:540-600. Web version doesn't implement this.
10. **HUD power cell bars** — Small 4×4px green bars showing weapon power allocation on ship diagram. Code: `console_GUI()` lines 768-802. Web version may use a simpler HUD.
11. **HUD background texture** — `console` sprite (brownish/metallic texture), not a flat color.

### Nice-to-have (polish):
12. **"NEW!" label** — Appears near customization screen when new content is available
13. **"New Level Briefing Available!"** — Notification text on ready room
14. **Power setting highlighting** — Active setting is highlighted green, others are plain text
15. **Enemy formation patterns** — Tight diagonal line formations visible in combat screenshot
