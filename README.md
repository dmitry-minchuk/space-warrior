# Space Warrior

Space Warrior is a vertical 2D scrolling shooter inspired by early-2000s arcade shooters. It is built with TypeScript, PixiJS 8, and Vite.

## Game Concept

- 20 levels with escalating difficulty.
- 12 core enemy archetypes plus elite and tactical variants, each with its own movement, weapons, and visual style.
- 20 unique bosses across 5 silhouette families: dreadnought, sphere, crab, carrier, and citadel.
- 6 player weapons with 5 upgrade levels. Weapon drops either upgrade the current weapon or replace it with a different one.
- Health, shield, speed, bomb, and score drops.
- 3 lives per run. There are no saves; each run starts from the beginning, with pause support.
- Multi-layer parallax backgrounds with procedural planets, star systems, asteroid fields, nebulae, and space structures.
- Web Audio sound effects and music synthesis, with no external audio assets.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to dist/
npx vite preview # previews the build
```

Single-file HTML build:

```bash
npm run build:single # outputs to dist-single/index.html
```

The game runs in modern browsers and Safari on macOS.

## Releases

HTML releases are published through GitHub Actions:

1. Open `Actions` -> `Release HTML`.
2. Click `Run workflow`.
3. Enter a SemVer version without `v`, for example `0.1.1`.
4. The workflow creates tag `v0.1.1`, a GitHub Release, and attaches `space-warrior-v0.1.1.html`.
5. Non-prerelease builds are also automatically deployed to GitHub Pages.

Versioning is intentionally simple: `MAJOR.MINOR.PATCH`. Use `PATCH` for small fixes, `MINOR` for notable gameplay changes, and `MAJOR` for large or incompatible releases.

## Balance Reference

These tables document the current gameplay numbers used as the starting point for tuning. Weapon DPS is idealized and assumes every projectile or lightning chain hits. `LV5+bonus` includes the level-5 bonus homing missile: 28.75 damage every 0.5 seconds, or 57.5 extra ideal DPS.

### Player

| Stat | Value |
|---|---:|
| Max HP | 100 |
| Starting lives | 3 |
| Starting bombs | 2 |
| Max bombs | 5 |
| Hit radius | 14 |
| Max speed | 430 |
| Acceleration | 3600 |
| Friction | 16 |
| Spawn invulnerability | 1.5s |
| Hit invulnerability | 1.0s |
| Shield pickup HP | 100 |
| Shield decay | 8 HP/s |
| Speed boost | 1.55x for 18s |
| Damage boost | 2x for 10s |
| Bomb damage | 200 |
| Max lives | 9 |

### Weapons

| Weapon | Rate L1-L5 | Volley damage L1-L5 | Ideal DPS L1-L5 | LV5+bonus |
|---|---|---|---|---:|
| Pulse | 6.4 / 6.4 / 6.4 / 6.8 / 7.2 | 20 / 24 / 28 / 35 / 39 | 128 / 153.6 / 179.2 / 238 / 280.8 | 338.3 |
| Spread | 4 / 4 / 4.4 / 4.4 / 4.8 | 24 / 28 / 35 / 39 / 45.5 | 96 / 112 / 154 / 171.6 / 218.4 | 275.9 |
| Plasma | 2.4 / 2.4 / 2.8 / 2.8 / 3.2 | 32 / 44 / 52 / 66 / 72 | 76.8 / 105.6 / 145.6 / 184.8 / 230.4 | 287.9 |
| Missiles | 1.0625 / 1.0625 / 1.19 / 1.19 / 1.275 | 36.4 / 46.8 / 57.2 / 70.2 / 78 | 38.7 / 49.7 / 68.1 / 83.5 / 99.4 | 156.9 |
| Wave | 3.2 / 3.2 / 3.6 / 3.6 / 4 | 32 / 39 / 42 / 52 / 56 | 102.4 / 124.8 / 151.2 / 187.2 / 224 | 281.5 |
| Lightning | 4.8 / 4.8 / 5.2 / 5.2 / 5.6 | 14 / 18 / 22 / 27 / 30 | 67.2 / 86.4 / 114.4 / 140.4 / 168 | 225.5 |

### Enemy Archetypes

Enemy speed includes the global `ENEMY_SPEED_MUL = 0.8`.

| Enemy | HP | Speed | Contact damage | Score |
|---|---:|---:|---:|---:|
| Scout | 20 | 176 | 8 | 50 |
| Scout Shooter | 24 | 160 | 8 | 80 |
| Scout Ambusher | 26 | 184 | 9 | 90 |
| Fighter | 45 | 120 | 10 | 120 |
| Fighter Pincer | 55 | 160 | 12 | 160 |
| Bomber | 100 | 72 | 14 | 250 |
| Bomber Captain | 120 | 76 | 15 | 300 |
| Interceptor | 40 | 224 | 12 | 180 |
| Interceptor Ace | 48 | 244 | 14 | 220 |
| Drone | 12 | 128 | 6 | 30 |
| Drone Shooter | 16 | 112 | 6 | 60 |
| Drone Cross | 18 | 116 | 7 | 70 |
| Drone Lane | 18 | 88 | 7 | 80 |
| Turret | 130 | 64 | 10 | 220 |
| Turret Crossfire | 115 | 68 | 10 | 260 |
| Miner | 60 | 88 | 10 | 160 |
| Sniper | 55 | 64 | 10 | 220 |
| Kamikaze | 30 | 192 | 30 | 90 |
| Heavy | 220 | 56 | 18 | 400 |
| Heavy Breaker | 190 | 60 | 19 | 460 |
| Heavy Suppressor | 200 | 48 | 18 | 420 |
| Stealth | 80 | 128 | 12 | 240 |
| Tesla | 85 | 96 | 12 | 220 |
| Tesla Weaver | 90 | 108 | 13 | 270 |
| Elite Scout | 45 | 256 | 12 | 150 |
| Elite Fighter | 75 | 152 | 14 | 220 |
| Elite Bomber | 155 | 88 | 18 | 400 |
| Elite Interceptor | 65 | 288 | 16 | 300 |
| Elite Heavy | 320 | 72 | 24 | 800 |
| Scout Bouncer | 28 | 144 | 8 | 80 |

### Enemy Projectile Interception

| Projectile | Interceptible | Hits to destroy | Notes |
|---|---|---:|---|
| Enemy Bullet | Yes | 1 | Standard weak projectile |
| Enemy Plasma | Yes | 3 | Regular enemy plasma only |
| Enemy Heavy | Yes | 5 | Regular enemy heavy only |
| Enemy Bomb | Yes | 2 | Explodes when destroyed |
| Mine | Yes | 2 | Explodes when destroyed |
| Boss special plasma/heavy/bomb/mine | No | N/A | Boss special attacks bypass interception |

### Enemy Combat Patterns

| Pattern | Projectile output | Cycle | Approx. incoming DPS |
|---|---|---:|---:|
| Alternating Lanes | 2 x 6 diagonal lane shots, side flips each beat | 0.85s | 14.1 |
| Suppressive Wave | 7 x 5 slow wide fan | 4.0s | 8.8 |
| Forward Single | 1 x 6 damage | 1.4-2.0s | 3.5 |
| Forward Burst | 3 x 6 damage | 2.4s | 7.5 |
| Spread 5 | 5 x 8 damage | 2.4s | 16.7 |
| Aimed | 1 x 6 damage | 1.6-2.0s | 3.3 |
| Predictive Aimed | 1 x 6 damage | 1.8-2.2s | 3.0 |
| Twin Burst | 2 x 6 damage | 2.2s | 5.5 |
| Scout Ambush | 2 diagonal shots, then 1 aimed shot | About 2.8s | 5.7 |
| Fighter Angles | 3 aimed shots, then 3 diagonal lane shots | About 2.9s | 13.1 |
| Drone Cross | Alternating 2-shot diagonal cross | 1.65-1.9s | 5.3-6.1 |
| Lob Bomb | 1 x 12 damage | 3.0s | 4.0 |
| Mine | 1 x 14 damage | 2.4s | 5.8 |
| Mine Arc Pressure | 3 x 12 mines, then 1 x 7 shot | About 3.45s | 12.5 |
| Laser Charge | 1 x 22 damage | About 4.2s | 5.2 |
| Sniper Ace | 4 x 5 side bullets, then 1 x 20 plasma | About 3.65s | 11.0 |
| Chain Lightning | 1 x 14 damage | 1.4s when close | 10.0 |
| Sweep | 7 x 8 damage | 3.0s | 18.7 |
| Rapid Aimed | 1 x 6 damage | 0.8-1.0s | 6.7 |
| Mixed Fire | 2 x 6 damage, then 1 x 10 plasma | About 2.85s | 7.7 |
| Bomb Fan Pressure | 1 x 12 bomb, then 5 x 5 fan | About 3.05s | 12.1 |
| Commander Fighter | Aimed triple, diagonal lanes, plasma lead | About 4.1s | 12.2 |
| Interceptor Backshot | Aimed shot plus optional rear fan | 1.0-1.25s | 5.6-20.0 |
| Turret Crossfire | 6 alternating lane shots | 2.6s | 16.2 |
| Tesla Weaver | Aimed plasma plus plasma fans | 1.45-1.85s | 18.9-23.0 |
| Heavy Breaker | 7 x 8 heavy fan, then 1 x 14 plasma | About 3.2s | 21.9 |

### Bosses

Boss HP follows a linear curve from **1300** (boss 1) to **7000** (boss 20), +300 HP per boss. Late-game difficulty leans on phase complexity, destructible parts, and attack-pattern density rather than raw HP — boss 20 was previously 15 370 HP and turning into a sponge marathon.

Phase counts per boss: bosses 1-5 use 2-3 phases (teaching their signature attack, then adding a second angle or faster rhythm), bosses 6-12 use 3 phases (base / mixed / desperation), bosses 13-19 use 4 phases (armor break, rhythm shift, multi-pattern, overload), and boss 20 is a 4-form fight (outer shell → exposed core → transformed → last stand) with visual transformation cues — colour shifts, scale pulses, and screen flashes at each transition.

#### Destructible Parts

Every boss exposes 2-4 destructible modules. Damage to a projectile is routed: if the projectile lands inside a blocking part (S/A) all damage goes there; otherwise it splits 60/40 between the closest optional part and the hull; if no part is in range, the hull eats it all.

| Slot | Type | Effect on break |
|---|---|---|
| **T** | Turret pod | Disables one attack stream (cannon, fan, sweep) |
| **S** | Shield generator | While alive: hull takes 0.7× damage. On break: 4 s open-core window with 1.5× hull damage |
| **A** | Armor plate | Blocks hull damage in its zone. On break: hull permanently takes 1.5× damage |
| **E** | Engine module | Boss freezes in place — weaving stops |
| **M** | Missile pod | Disables a missile salvo or a gravity-pull mechanic |
| **P** | Sensor / scope | Disables aimed/predictive attacks; boss falls back to blind fire |
| **H** | Hatch / spawner | Stops minion production immediately |

| Level | Boss | Parts |
|---:|---|---|
| 1 | Patrol Cruiser | T forward battery, E rear thruster |
| 2 | Asteroid Hauler | A towed asteroid, T launcher pair |
| 3 | Cyber Crab | T left claw, T right claw (both → forced desperation phase) |
| 4 | Lunar Sentinel | S dorsal shield, T chin gun |
| 5 | Hive Carrier | H drone hatch, T deck gun |
| 6 | Wreck Behemoth | T×2 cannons, A damaged plate |
| 7 | Mine Mother | T drill core, H×2 mine launchers |
| 8 | Ghost Sniper | P scope, T×2 sub-cannons |
| 9 | Kamikaze Queen | H×2 egg pods, T forward fan |
| 10 | Saturn Dreadnought | T spinal lance, M×2 missile pods |
| 11 | Phantom | S phase generator, T forward emitter |
| 12 | Storm Sphere | P lightning emitter, S energy shell, T tesla aimer |
| 13 | Blazing Citadel | T×2 mortar bays, A front armor, E engine ring |
| 14 | Gravity Lord | M gravity well, T×2 platforms, A central core |
| 15 | Hive Mind | H spawner, P neural beam, T spore launcher, A carapace |
| 16 | Event Horizon | M gravity emitter, T×2 cannons, S event shield |
| 17 | Factory Core | H factory hatch, T×2 corners, A belly armor |
| 18 | Imperial Flagship | M×2 missile pods, T turret cluster mast, E engine bank |
| 19 | Citadel Guardian | S citadel shield, T×2 perimeter pairs, P central eye |
| 20 | The Architect | Form 0: A×4 quadrant plates. Form 1: P×2 ring emitters. Form 2: T spiral + H cradle. Form 3: no parts (exposed core) |

| Level | Boss | HP | Radius | Score |
|---:|---|---:|---:|---:|
| 1 | Patrol Cruiser | 1300 | 70 | 2000 |
| 2 | Asteroid Hauler | 1600 | 80 | 2500 |
| 3 | Cyber Crab | 1900 | 80 | 3000 |
| 4 | Lunar Sentinel | 2200 | 80 | 3500 |
| 5 | Hive Carrier | 2500 | 85 | 4000 |
| 6 | Wreck Behemoth | 2800 | 90 | 4500 |
| 7 | Mine Mother | 3100 | 90 | 5000 |
| 8 | Ghost Sniper | 3400 | 80 | 5500 |
| 9 | Kamikaze Queen | 3700 | 90 | 6000 |
| 10 | Saturn Dreadnought | 4000 | 100 | 7000 |
| 11 | Phantom | 4300 | 90 | 7500 |
| 12 | Storm Sphere | 4600 | 95 | 8000 |
| 13 | Blazing Citadel | 4900 | 100 | 9000 |
| 14 | Gravity Lord | 5200 | 100 | 10000 |
| 15 | Hive Mind | 5500 | 105 | 11000 |
| 16 | Event Horizon | 5800 | 110 | 12000 |
| 17 | Factory Core | 6100 | 115 | 13500 |
| 18 | Imperial Flagship | 6400 | 120 | 15000 |
| 19 | Citadel Guardian | 6700 | 125 | 17500 |
| 20 | The Architect | 7000 | 130 | 25000 |

### Scripted Level Load

This table counts scripted waves only. Passive filler enemies can add extra load when the playfield has fewer than 4 enemies.

| Level | Name | Duration | Scripted waves | Scripted enemies | Scripted enemy HP | HP/s |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Earth Patrol | 100 | 9 | 46 | 1329 | 13.3 |
| 2 | Orbital Defense | 110 | 9 | 50 | 1674 | 15.2 |
| 3 | Asteroid Belt | 120 | 10 | 45 | 2246 | 18.7 |
| 4 | Lunar Base | 130 | 16 | 81 | 2894 | 22.3 |
| 5 | Belt Outskirts | 130 | 11 | 80 | 1919 | 14.8 |
| 6 | Abandoned Station | 130 | 11 | 38 | 2874 | 22.1 |
| 7 | Mine Fields | 130 | 11 | 43 | 2642 | 20.3 |
| 8 | Dark Sector | 135 | 11 | 37 | 2302 | 17.1 |
| 9 | Blockade | 135 | 11 | 51 | 2312 | 17.1 |
| 10 | Saturn Wreckage | 140 | 11 | 35 | 3057 | 21.8 |
| 11 | Ghost Nebula | 140 | 11 | 37 | 2740 | 19.6 |
| 12 | Energy Storm | 140 | 11 | 42 | 3380 | 24.1 |
| 13 | Blazing Outpost | 145 | 11 | 58 | 3865 | 26.7 |
| 14 | Gravity Anomalies | 145 | 11 | 46 | 5063 | 34.9 |
| 15 | Alien Hive | 150 | 12 | 115 | 3495 | 23.3 |
| 16 | Event Horizon | 150 | 11 | 48 | 5310 | 35.4 |
| 17 | Enemy Factories | 155 | 12 | 60 | 5380 | 34.7 |
| 18 | Imperial Fleet | 160 | 11 | 67 | 6890 | 43.1 |
| 19 | Citadel Perimeter | 165 | 13 | 72 | 5935 | 36.0 |
| 20 | Final Battle | 175 | 14 | 96 | 8350 | 47.7 |

### Drop Rules

| Rule | Value |
|---|---:|
| Minimum kills before health drop is allowed | 4 |
| Minimum kills before weapon drop is allowed | 5 |
| Forced weapon pity threshold | 14 kills |
| Forced health pity threshold | 12 kills |
| Boss drop lifetime | 45s |
| Boss drop blink start | 38s |
| Small health pickup | 15 HP |
| Large health pickup | 40 HP |
| Small gem | 100 score |
| Medium gem | 500 score |
| Large gem | 2000 score |
| Extra life base chance | 0.6% per qualifying kill (score ≥120, only when a gem would have dropped) |
| Extra life pity ramp | +0.08%/kill above 220 kills without a 1-up |
| Boss extra life | Guaranteed on bosses 5/10/15/20, 25% otherwise (capped at 9 lives) |

### Loot Weights

Weights are raw roll probabilities before drop smoothing, pity rules, and weapon rerolling.

| Loot table | Entries |
|---|---|
| Scout | gem_sm 0.24, gem_md 0.06, health_s 0.10, w_pulse 0.10 |
| Fighter | gem_sm 0.16, gem_md 0.09, health_s 0.13, w_pulse 0.11, w_spread 0.11, bomb 0.03 |
| Bomber | health_l 0.19, health_s 0.18, gem_md 0.14, gem_lg 0.07, w_plasma 0.15, w_missiles 0.15, damage 0.05, bomb 0.04 |
| Interceptor | gem_sm 0.18, gem_md 0.08, health_s 0.13, speed 0.06, w_spread 0.11, w_missiles 0.10 |
| Drone | gem_sm 0.38, gem_md 0.04, health_s 0.05, w_pulse 0.06 |
| Turret | health_s 0.18, health_l 0.06, gem_md 0.12, w_wave 0.11, shield 0.06, bomb 0.06, damage 0.04 |
| Miner | gem_md 0.14, health_s 0.15, w_missiles 0.14, bomb 0.05 |
| Sniper | gem_md 0.16, w_missiles 0.15, damage 0.06, health_s 0.15, shield 0.05 |
| Kamikaze | gem_sm 0.30, health_s 0.08, speed 0.04, w_pulse 0.06 |
| Heavy | health_l 0.23, health_s 0.18, gem_lg 0.14, w_plasma 0.15, w_missiles 0.15, w_lightning 0.11, shield 0.06, bomb 0.05, damage 0.05 |
| Stealth | gem_md 0.16, w_wave 0.15, speed 0.06, health_s 0.13, shield 0.05 |
| Tesla | gem_md 0.14, health_s 0.13, w_lightning 0.20, shield 0.07 |

## Roadmap

This roadmap is focused on balance quality rather than raw feature count. The goal is to move difficulty away from simple HP inflation and toward readable enemy behavior, clear counterplay, controlled screen density, and measurable time-to-kill targets.

### Roadmap Status

| Area | Status | Notes |
|---|---|---|
| 1. Instrument the Balance Loop | Done | Per-run telemetry tracks weapon usage, survival pressure, economy, and encounter load. Debug snapshots are saved to `telemetry/` in development builds. |
| 2. Rebalance Weapon Roles | Partial | Missile handling, plasma lightning reach, and global non-missile rate of fire were adjusted, but full weapon role tuning is still open. |
| 3. Rework Weapon Progression | Not started | LV5 identity and upgrade pacing are unchanged. |
| 4. Rebalance Drops and Economy | Partial | Drop smoothing and pity rules were improved, but HP-aware economy tuning is still open. |
| 5. Redesign Enemy Families Around Roles | Done, first pass | Core enemy families now have clearer tactical roles and reduced late-game HP inflation. |
| 6. Add Multi-Pattern Enemy Variants | Done, first pass | Added Scout Ambusher, Bomber Captain, Interceptor Ace, Drone Cross, Drone Lane, Turret Crossfire, Heavy Breaker, Heavy Suppressor, and Tesla Weaver. |
| 7. Improve Attack Angles and Patterns | Done, first pass | Added side pincers, diagonal lanes, rear shots, mine arcs, bomb fans, crossfire, plasma fan pressure, alternating lanes, and slow suppressive waves. |
| 8. Rebuild Bosses Around Phases | Done, first pass | All 20 bosses now have explicit phase scripts — 1-5 stay 2-3 phases (teaching), 6-12 go to 3 phases, 13-19 escalate to 4 phases, and the Architect is a 4-form fight with visual transformation cues. Boss parts/destructible systems remain future work. |
| 9. Add Boss Parts and Transformations | Done, first pass | Every boss now exposes 2-4 destructible modules (7 slot types: T/S/A/E/M/P/H) that gate specific attacks. Damage is routed: blocking parts (S/A) absorb 100%, optional parts (T/E/M/P/H) take 60% with 40% bleeding to the hull. Shields halve hull damage while alive and open a 4 s core-burst window on break. The Architect swaps its parts roster per form. |
| 10. Smooth Level Difficulty | Done, first pass | All 20 level scripts now introduce tactical variants progressively, with reduced late HP spikes. |
| 11. Manage Screen Readability | Partial | Background clutter and projectile interception clarity were improved, but combat readability still needs playtest tuning. |
| 12. Define Playtest Targets | Done | Target metrics are documented below; telemetry collection is implemented (item 1). |
| 13. Suggested Implementation Order | Done | The implementation order is documented below. |
| 14. Gamepad Support | Not started | Add Gamepad API input so the game is playable with controllers (Xbox, PlayStation, generic HID). |
| 15. Android APK Build | Not started | Wrap the single-file HTML build into an installable APK via TWA or Capacitor for Android TV and mobile. |

### 1. Instrument the Balance Loop

Lightweight per-run telemetry is implemented in `src/game/telemetry.ts`. It accumulates counters and time-series samples in memory and periodically POSTs snapshots to the Vite dev server, which saves them to `telemetry/`. All hooks are no-ops in production builds.

| Task | Status |
|---|---|
| Track weapon usage | Done — time equipped, shots fired, hits, kills, boss damage, projectile interception count |
| Track survival pressure | Done — damage taken per minute, deaths by level, shield damage absorbed, bomb usage |
| Track economy | Done — drops rolled per type, pity triggers for health and weapons, rerolls |
| Track encounter load | Done — enemies alive over time, enemy bullets alive over time, boss phase durations |
| Add debug export | Done — JSON snapshots saved to `telemetry/` per run in development builds |

Balance decisions should be based on `time-to-kill`, `damage taken per minute`, `projectiles on screen`, and `boss phase duration`, not only on single values like damage or HP.

### 2. Rebalance Weapon Roles

The current ideal DPS table shows large gaps: Pulse is much stronger than most weapons, while Missiles are far below the rest even after the recent damage increase. Each weapon should have a role and a predictable drawback.

| Weapon | Current issue | Target role | Proposed direction |
|---|---|---|---|
| Pulse | Too efficient as a default all-purpose weapon | Reliable baseline | Lower LV4-LV5 damage or projectile count so it does not dominate upgraded weapons |
| Spread | Good coverage, moderate DPS | Close-range crowd control | Keep DPS below Pulse on single targets, improve side coverage and close-range feel |
| Plasma | Good piercing, high burst | Elite and boss pressure | Keep slower rate, make piercing and lightning arcs the main value rather than raw DPS |
| Missiles | Homing utility is good, ideal DPS is too low | Safe target access, backline cleanup | Raise direct damage or add small splash, but keep lower rate of fire |
| Wave | Strong coverage and piercing | Area denial and formations | Keep DPS near Plasma but limit repeated hits on bosses through cooldown tuning |
| Lightning | Excellent auto-targeting, low precision demand | Chain control and cleanup | Keep lower single-target DPS, improve chain behavior against grouped enemies |

Target rule: by level 5, no weapon should be more than about 25-30% stronger than another in its best realistic scenario, and no weapon should be more than about 35-40% weaker in its intended role.

### 3. Rework Weapon Progression

Weapon progression should create meaningful upgrades without turning the screen into visual noise.

| Task | Target |
|---|---|
| Normalize level growth | Each weapon should gain roughly 15-20% practical power per level |
| Avoid pure projectile spam | Prefer pattern changes, utility, splash, chain count, or piercing behavior over only adding bullets |
| Make LV5 special per weapon | Replace the universal bonus missile with weapon-specific final upgrades later |
| Add weapon identity tests | Each enemy family should have at least one weapon that feels strong and one that feels acceptable |

The universal LV5 bonus missile is useful for now, but it blurs weapon identity. Long term, each weapon should get its own final mechanic.

### 4. Rebalance Drops and Economy

Drop smoothing is already better than pure random, but the economy should react to player state and level pacing.

| Area | Proposed change |
|---|---|
| Health drops | Make pity depend on current HP: faster pity below 40 HP, slower pity above 75 HP |
| Weapon drops | Guarantee first non-Pulse weapon by level 2 or early level 3 |
| Upgrade pacing | Target one meaningful weapon upgrade every 1-2 levels, not several at once |
| Damage boosts | Reduce duration or drop chance if boss burst damage becomes too volatile |
| Shields | Consider partial shield drops of 40-60 HP instead of always 100 HP |
| Bombs | Use bombs as rare recovery tools; avoid frequent bomb drops in already defensive levels |

Drop tuning should aim for stable recovery opportunities without removing the consequences of repeated hits.

### 5. Redesign Enemy Families Around Roles

Enemy balance should be based on tactical purpose. HP and damage should support the behavior, not replace it.

| Family | Current role | Roadmap role |
|---|---|---|
| Scouts | Intro targets | Teach basic aim, movement, and weak projectile interception |
| Fighters | General attackers | Use mild evasive movement and two-angle pressure |
| Bombers | Slow heavy targets | Create delayed area denial with bombs, not just more HP |
| Interceptors | Fast divers | Force lateral dodging and punish tunnel vision |
| Drones | Swarm filler | Create formation pressure without high damage |
| Turrets | Stationary pressure | Control lanes with predictable sweeping fire |
| Miners | Hazard makers | Build temporary mine fields with clear escape routes |
| Snipers | Telegraph attackers | Teach charge-line reading and last-second dodging |
| Kamikaze | Collision threat | Force repositioning, but keep HP low and deaths readable |
| Heavy | Tank pressure | Combine slow body threat with limited but dangerous barrages |
| Stealth | Disruptor | Use short cloak windows and flank angles, not invisible damage |
| Tesla | Close-range punisher | Threaten the player for staying too close or moving too predictably |

Each enemy should be identifiable by silhouette, movement, and attack rhythm before it becomes dangerous.

### 6. Add Multi-Pattern Enemy Variants

Later levels should introduce enemies with two or three attack modes instead of only higher stats.

| Variant | Behavior plan |
|---|---|
| Fighter Commander | Alternates between aimed twin shots and diagonal suppressive bursts |
| Bomber Captain | Drops slow bombs, then fires a weak fan to push the player toward the bomb zone |
| Shielded Heavy | Opens with shielded frontal armor, then exposes weak points during attack recovery |
| Tesla Weaver | Fires close-range plasma, then relocates sideways before the next attack |
| Sniper Ace | Telegraphs a main shot while releasing slow side bullets that limit dodge lanes |
| Mine Layer Elite | Drops mines in arcs, then fires a low-damage shot that pressures the safe route |

These variants should appear sparingly at first. The player should meet the simple archetype before meeting the mixed-mode version.

### 7. Improve Attack Angles and Patterns

Most enemy fire currently points down or directly at the player. The next step is to shape the screen with deliberate angles.

| Pattern type | Use case |
|---|---|
| Narrow aimed shot | Punish standing still |
| Wide fan | Force broad movement, especially in open space |
| Delayed bomb arc | Create a future danger zone |
| Side pincer | Push the player out of the bottom-center comfort zone |
| Alternating diagonal lanes | Create readable weaving patterns |
| Slow dense wave | Create temporary area denial without instant damage |
| Fast telegraphed lance | High danger, but only after clear warning |

Pattern density should rise and fall in waves. Avoid keeping maximum bullet pressure active for an entire level.

### 8. Rebuild Bosses Around Phases

Bosses should not rely mainly on high HP. Each boss needs clear phase changes, attack identity, and escalation. A good target is 2-4 phases per boss, with each phase lasting about 15-30 seconds depending on level and weapon state.

| Boss group | Phase roadmap |
|---|---|
| Early bosses 1-5 | 2 phases: teach one signature attack, then add a second angle or faster rhythm below 50% HP |
| Mid bosses 6-12 | 3 phases: base pattern, mixed pattern, desperation pattern with a clear recovery window |
| Late bosses 13-19 | 3-4 phases: armor break, weapon swap, minion summon, final overload |
| Final boss 20 | Multi-form fight: outer shell, exposed core, transformed final form, last stand |

Phase changes should include visual feedback: armor plates breaking, color shifts, exposed weak points, engine damage, detached modules, or a transformation animation.

### 9. Add Boss Parts and Transformations

Boss danger should come from systems the player can read and sometimes disable.

| System | Gameplay purpose |
|---|---|
| Turret parts | Destroying them reduces one attack pattern |
| Shield generators | Force target priority before core damage becomes efficient |
| Missile pods | Create intermittent high-threat salvos |
| Armor plates | Reduce damage until broken, then reveal weak points |
| Engine modules | Change boss movement when destroyed |
| Core exposure | Short high-damage window after a dangerous attack |

Avoid making every part mandatory. Optional parts are better when they give the player a tactical choice: shorten the fight by hitting the core, or reduce danger by disabling weapons.

### 10. Smooth Level Difficulty

Scripted HP per second jumps sharply in later levels. Level 16, 18, and 20 are especially high. The difficulty curve should climb, but not by doubling pressure suddenly.

| Level range | Target adjustment |
|---|---|
| Levels 1-4 | Keep simple and readable; teach movement, shooting, and basic interception |
| Levels 5-8 | Introduce swarms, mines, turrets, and snipers one at a time |
| Levels 9-12 | Mix two threats at once, but include recovery waves |
| Levels 13-16 | Introduce elites with multi-pattern behavior; reduce raw HP spikes |
| Levels 17-20 | Combine elite behavior, boss transformations, and denser patterns with deliberate breaks |

Use rest beats after high-pressure waves. The player should feel the difficulty curve, not a constant wall.

### 11. Manage Screen Readability

Balance fails if the player cannot read the screen.

| Area | Target |
|---|---|
| Player projectiles | Keep strong effects, but reduce opacity/noise when many are active |
| Enemy projectiles | Maintain distinct colors by danger type and interceptibility |
| Background | Keep rare large scenery; avoid multiple large systems in the same viewport |
| Drops | Make pickups visible but not visually louder than enemy bullets |
| Boss warnings | Telegraph high-damage attacks with shape, sound, and color, not only speed |

The game should prioritize enemy bullets, player position, drops, and boss telegraphs over decorative detail during combat.

### 12. Define Playtest Targets

Use these targets as first-pass goals, then adjust after real runs.

| Metric | Early game | Mid game | Late game |
|---|---:|---:|---:|
| Average level deaths for skilled player | 0-0.2 | 0.2-0.6 | 0.6-1.2 |
| Boss fight duration | 20-35s | 30-50s | 45-75s |
| Health pickups per level | 2-4 | 3-5 | 4-6 |
| Weapon pickups per level | 1-2 | 1-3 | 2-3 |
| Average enemy bullets on screen | 4-12 | 8-20 | 14-32 |
| Peak enemy bullets on screen | 12-24 | 24-42 | 36-60 |
| Recovery beats per level | 2-3 | 2-3 | 1-2 |

These are tuning targets, not hard rules. If a level has fewer bullets but stronger mines or more kamikazes, it can still be difficult.

### 14. Gamepad Support

Add Gamepad API input so the game is fully playable with a controller on desktop browsers and Android.

| Task | Target |
|---|---|
| Poll `navigator.getGamepads()` each frame | Read left stick / D-pad for movement, face buttons for fire and bomb, start for pause |
| Map common layouts | Xbox (A/B/X/Y), PlayStation (Cross/Circle/Square/Triangle), generic HID |
| Dead-zone and analog-to-digital | Configurable stick dead zone; analog stick controls ship speed proportionally |
| Hot-plug detection | `gamepadconnected` / `gamepaddisconnected` events; seamless switch between keyboard and gamepad |
| On-screen button hints | Show gamepad glyphs in menus and HUD when a gamepad is the last active input |

The Gamepad API is supported in all modern browsers including Android Chrome and WebView.

### 15. Android APK Build

Package the single-file HTML build as an installable APK for Android TV set-top boxes and mobile devices.

| Approach | Pros | Cons |
|---|---|---|
| TWA (Trusted Web Activity) | Lightweight, uses Chrome engine, no bridge overhead | Requires a hosted origin or `asset_links.json` for offline |
| Capacitor / Cordova | Full offline APK, access to native APIs if needed | Adds a build toolchain (Android SDK, Gradle) |
| PWA + Bubblewrap | CLI-driven TWA wrapper, minimal config | Still needs Chrome on device |

| Task | Target |
|---|---|
| Choose packaging approach | TWA via Bubblewrap for minimal overhead, or Capacitor if native features are needed later |
| Add Web App Manifest | `manifest.json` with icons, `display: fullscreen`, landscape orientation |
| Gamepad in WebView | Verify Gamepad API works inside the chosen WebView/TWA container |
| Android TV launcher | `android.intent.category.LEANBACK_LAUNCHER` in manifest; provide banner icon |
| Build pipeline | GitHub Actions job that produces a signed APK alongside the HTML release |
| Test on physical device | Verify input, performance, and fullscreen on at least one Android TV box |

### 13. Suggested Implementation Order

| Step | Work |
|---:|---|
| 1 | Add telemetry and debug run summaries |
| 2 | Normalize weapon DPS and role identity |
| 3 | Tune health, shield, bomb, and weapon drop pacing |
| 4 | Rework enemy combat patterns and attack angles |
| 5 | Add multi-pattern elite variants |
| 6 | Rebalance level HP/s and add recovery waves |
| 7 | Convert bosses to explicit phase scripts |
| 8 | Add boss parts, weak points, and transformation visuals |
| 9 | Run playtests and adjust from metrics |
| 10 | Add gamepad support (Gamepad API) |
| 11 | Package as Android APK (TWA or Capacitor) |
| 12 | Publish a balanced HTML release and APK |

Do not tune all values at once. Change one layer, playtest, record metrics, then move to the next layer.

## Controls

| Key | Action |
|---|---|
| W/A/S/D or arrows | Move |
| Space | Fire while held |
| X / Shift | Bomb |
| Esc / P | Pause / resume |
| Enter | Confirm menu action |

Gamepad support is planned (see roadmap item 14).

## Project Structure

- `src/engine/` - window, input, game loop, scenes, and audio.
- `src/game/art/` - procedural graphics and texture atlas generation.
- `src/game/entities/` - Player, Enemy, Boss, Projectile, Drop, and Particle pools.
- `src/game/enemies/` - enemy archetypes plus movement and combat behavior.
- `src/game/weapons/` - player weapon definitions.
- `src/game/levels/` - level data and level runner.
- `src/game/bosses/` - boss behavior patterns.
- `src/game/background/` - parallax space background.
- `src/game/vfx/` - particles, explosions, and screen effects.
- `src/game/hud/` - in-game HUD.
- `src/game/scenes/` - MenuScene and GameScene.

## Technical Notes

- Logical resolution is 1280x720 with 16:9 letterboxing.
- The game loop uses a fixed 60 Hz simulation step with an accumulator and up to 4 catch-up steps per frame.
- Sprites are generated as Pixi RenderTextures during startup, so the repository does not need external sprite PNG assets.
- Collision checks use circles and simple direct pair checks, which are enough for the current game scale.
- Projectile, Particle, Enemy, and Drop entities use object pools.
