# Space Warrior

Space Warrior is a vertical 2D scrolling shooter inspired by early-2000s arcade shooters. It is built with TypeScript, PixiJS 8, and Vite.

## Game Concept

- 20 levels with escalating difficulty.
- 12 enemy archetypes plus 5 elite variants, each with its own movement, weapons, and visual style.
- 20 unique bosses across 5 silhouette families: dreadnought, sphere, crab, carrier, and citadel.
- 7 player weapons with upgrade levels. Weapon drops either upgrade the current weapon or replace it with a different one.
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

HTML releases are published manually through GitHub Actions:

1. Open `Actions` -> `Release HTML`.
2. Click `Run workflow`.
3. Enter a SemVer version without `v`, for example `0.1.1`.
4. The workflow creates tag `v0.1.1`, a GitHub Release, and attaches `space-warrior-v0.1.1.html`.

Versioning is intentionally simple: `MAJOR.MINOR.PATCH`. Use `PATCH` for small fixes, `MINOR` for notable gameplay changes, and `MAJOR` for large or incompatible releases.

## Controls

| Key | Action |
|---|---|
| W/A/S/D or arrows | Move |
| Space | Fire while held |
| X / Shift | Bomb |
| Esc / P | Pause / resume |
| Enter | Confirm menu action |

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
