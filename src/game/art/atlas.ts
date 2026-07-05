import { Application, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { ANTIALIAS, BAKE_RESOLUTION } from '../../engine/quality';
import { Forge } from './forge';
import {
  drawBomber,
  drawDrone,
  drawFighter,
  drawHeavy,
  drawInterceptor,
  drawKamikaze,
  drawMiner,
  drawPlayer,
  drawScout,
  drawSniper,
  drawStealth,
  drawTesla,
  drawTurret,
} from './ships';
import { BOSS_DRAWERS } from './bossArt';
import {
  drawEnemyBomb,
  drawEnemyBullet,
  drawEnemyHeavy,
  drawEnemyPlasma,
  drawMine,
  drawPlayerLaserSeg,
  drawPlayerLightning,
  drawPlayerMissile,
  drawPlayerPlasma,
  drawPlayerPulse,
  drawPlayerSpread,
  drawPlayerWave,
} from './projectiles';
import {
  drawBomb,
  drawDamage,
  drawExtraLife,
  drawGem,
  drawHealthL,
  drawHealthS,
  drawShield,
  drawSpeed,
  drawWeaponLightning,
  drawWeaponMissiles,
  drawWeaponPlasma,
  drawWeaponPulse,
  drawWeaponSpread,
  drawWeaponWave,
} from './drops';
import {
  drawAsteroid,
  drawCapitalWreck,
  drawDebrisCluster,
  drawDerelictShip,
  drawDistantShip,
  drawDyingStar,
  drawExplosionRing,
  drawNebula,
  drawNormalStar,
  drawParticleHard,
  drawParticleSoft,
  drawPlanet,
  drawRuinedBase,
  drawSatellite,
  drawSpaceBase,
  drawStar,
  drawStarSystem,
} from './space';
import { THEMES } from '../palette';

export interface Atlas {
  player: Texture;
  enemies: Record<EnemyKey, Texture>;
  bosses: Texture[];   // index 0..19 for levels 1..20
  proj: {
    pulse: Texture;
    spread: Texture;
    plasma: Texture;
    laser: Texture;
    missile: Texture;
    wave: Texture;
    lightning: Texture;
    enemyBullet: Texture;
    enemyHeavy: Texture;
    enemyPlasma: Texture;
    enemyBomb: Texture;
    mine: Texture;
  };
  drops: Record<string, Texture>;
  stars: Texture[];     // [small, medA, medB, big]
  /** Seamless star-field tile for the scrolling background layer. */
  starfields: { main: Texture };
  nebulae: Record<string, Texture>; // by theme key
  planets: Texture[];
  bases: { normal: Texture; burning: Texture };
  satellites: Texture[];
  derelicts: Texture[];
  capitalWrecks: Texture[];
  debrisClusters: Texture[];
  ruinedBases: Texture[];
  normalStars: Texture[];
  dyingStars: Texture[];
  starSystems: Texture[];
  distantShips: Texture[];
  asteroids: Texture[];
  particles: {
    softWhite: Texture;
    softOrange: Texture;
    softCyan: Texture;
    softRed: Texture;
    softPurple: Texture;
    hardWhite: Texture;
    hardOrange: Texture;
  };
  explosions: Texture[];
}

export type EnemyKey =
  | 'scout'
  | 'fighter'
  | 'bomber'
  | 'interceptor'
  | 'drone'
  | 'turret'
  | 'miner'
  | 'sniper'
  | 'kamikaze'
  | 'heavy'
  | 'stealth'
  | 'tesla';

export function buildAtlas(app: Application): Atlas {
  const forge = new Forge(app);

  const enemies: Record<EnemyKey, Texture> = {
    scout: forge.bakeCentered(56, 56, drawScout),
    fighter: forge.bakeCentered(64, 64, drawFighter),
    bomber: forge.bakeCentered(88, 80, drawBomber),
    interceptor: forge.bakeCentered(56, 72, drawInterceptor),
    drone: forge.bakeCentered(48, 48, drawDrone),
    turret: forge.bakeCentered(64, 72, drawTurret),
    miner: forge.bakeCentered(64, 64, drawMiner),
    sniper: forge.bakeCentered(56, 84, drawSniper),
    kamikaze: forge.bakeCentered(56, 56, drawKamikaze),
    heavy: forge.bakeCentered(88, 88, drawHeavy),
    stealth: forge.bakeCentered(72, 56, drawStealth),
    tesla: forge.bakeCentered(64, 56, drawTesla),
  };

  // Each boss has its own draw function with unique silhouette and weapons.
  // Canvases sized to fit the most-extended outline (legs, claws, wings, runes).
  const bossSizes: Array<[number, number, number]> = [
    [240, 240, 1.0],    // 1 Patrol Cruiser
    [280, 280, 1.0],    // 2 Asteroid Hauler — towed asteroid extends above
    [280, 220, 1.0],    // 3 Cyber Crab — long forward claws
    [240, 240, 1.0],    // 4 Lunar Sentinel — diagonal stabilizer wings
    [280, 240, 1.0],    // 5 Hive Carrier
    [260, 260, 1.05],   // 6 Wreck Behemoth
    [240, 240, 1.0],    // 7 Mine Mother
    [220, 280, 1.0],    // 8 Ghost Sniper — long sniper barrel
    [240, 220, 1.0],    // 9 Kamikaze Queen — spider legs spread wide
    [280, 320, 1.1],    // 10 Saturn Dreadnought — spinal lance + 5 engines
    [240, 280, 1.0],    // 11 Phantom — top spire + trailing tendril
    [240, 240, 1.0],    // 12 Storm Sphere — 8 tesla coils radial
    [280, 260, 1.1],    // 13 Blazing Citadel — wide bottom tier
    [280, 280, 1.0],    // 14 Gravity Lord — orbital rings + distortion
    [260, 240, 1.0],    // 15 Hive Mind
    [240, 280, 1.0],    // 16 Event Horizon — vortex tail
    [260, 260, 1.0],    // 17 Factory Core
    [300, 340, 1.1],    // 18 Imperial Flagship — spinal cannon + hangar
    [240, 320, 1.0],    // 19 Citadel Guardian — barrel-wing arms up + membrane wings down
    [280, 320, 1.05],   // 20 The Architect — orbiting runes + apex cannon
  ];
  const bosses: Texture[] = [];
  for (let i = 0; i < 20; i++) {
    const [w, h, S] = bossSizes[i];
    const drawer = BOSS_DRAWERS[i];
    bosses.push(forge.bakeCentered(w, h, (root) => drawer(root, S)));
  }

  const proj = {
    pulse: forge.bakeCentered(22, 26, drawPlayerPulse),
    spread: forge.bakeCentered(20, 22, drawPlayerSpread),
    plasma: forge.bakeCentered(28, 28, drawPlayerPlasma),
    laser: forge.bakeCentered(20, 22, drawPlayerLaserSeg),
    missile: forge.bakeCentered(28, 56, drawPlayerMissile),
    wave: forge.bakeCentered(28, 22, drawPlayerWave),
    lightning: forge.bakeCentered(22, 22, drawPlayerLightning),
    enemyBullet: forge.bakeCentered(20, 22, drawEnemyBullet),
    enemyHeavy: forge.bakeCentered(24, 24, drawEnemyHeavy),
    enemyPlasma: forge.bakeCentered(26, 26, drawEnemyPlasma),
    enemyBomb: forge.bakeCentered(32, 36, drawEnemyBomb),
    mine: forge.bakeCentered(64, 64, drawMine),
  };

  // Drop icons baked at 56×56 so each weapon's silhouette reads at a glance.
  const D = 56;
  const drops: Record<string, Texture> = {
    health_s: forge.bakeCentered(D, D, drawHealthS),
    health_l: forge.bakeCentered(D, D, drawHealthL),
    w_pulse: forge.bakeCentered(D, D, drawWeaponPulse),
    w_spread: forge.bakeCentered(D, D, drawWeaponSpread),
    w_plasma: forge.bakeCentered(D, D, drawWeaponPlasma),
    w_missiles: forge.bakeCentered(D, D, drawWeaponMissiles),
    w_wave: forge.bakeCentered(D, D, drawWeaponWave),
    w_lightning: forge.bakeCentered(D, D, drawWeaponLightning),
    shield: forge.bakeCentered(D, D, drawShield),
    speed: forge.bakeCentered(D, D, drawSpeed),
    damage: forge.bakeCentered(D, D, drawDamage),
    bomb: forge.bakeCentered(D, D, drawBomb),
    extra_life: forge.bakeCentered(D, D, drawExtraLife),
    gem_sm: forge.bakeCentered(32, 32, (r) => drawGem(r, 'sm')),
    gem_md: forge.bakeCentered(36, 36, (r) => drawGem(r, 'md')),
    gem_lg: forge.bakeCentered(40, 40, (r) => drawGem(r, 'lg')),
  };

  const stars: Texture[] = [
    forge.bakeCentered(6, 6, (r) => drawStar(r, 0xffffff, false)),
    forge.bakeCentered(8, 8, (r) => drawStar(r, 0xcfe0ff, false)),
    forge.bakeCentered(10, 10, (r) => drawStar(r, 0xffe2c8, false)),
    forge.bakeCentered(14, 14, (r) => drawStar(r, 0x6cf, true)),
    forge.bakeCentered(14, 14, (r) => drawStar(r, 0xffa166, true)),
  ];

  // Far/mid star layers as seamless tiles: 170 individual star sprites used
  // to be walked and quad-packed by the renderer every frame; a TilingSprite
  // costs one node. Stars near an edge are wrap-duplicated so tiling shows
  // no seams. Baked at resolution 1 — these are 6-14 px dots.
  const bakeStarfield = (count: number, texs: Texture[]): Texture => {
    const SIZE = 512;
    const MARGIN = 16;
    const root = new Container();
    const place = (x: number, y: number, t: Texture, alpha: number, scale: number): void => {
      const s = new Sprite(t);
      s.anchor.set(0.5);
      s.position.set(x, y);
      s.alpha = alpha;
      s.scale.set(scale);
      root.addChild(s);
    };
    for (let i = 0; i < count; i++) {
      const t = texs[i % texs.length];
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const alpha = 0.5 + Math.random() * 0.5;
      const scale = 0.5 + Math.random() * 0.8;
      place(x, y, t, alpha, scale);
      if (x < MARGIN) place(x + SIZE, y, t, alpha, scale);
      if (x > SIZE - MARGIN) place(x - SIZE, y, t, alpha, scale);
      if (y < MARGIN) place(x, y + SIZE, t, alpha, scale);
      if (y > SIZE - MARGIN) place(x, y - SIZE, t, alpha, scale);
    }
    // No MSAA here: the resolve can leave a bright 1px edge on the render
    // target, and tiling repeats that edge as a line across the screen.
    const rt = RenderTexture.create({ width: SIZE, height: SIZE, resolution: 1, antialias: false });
    app.renderer.render({ container: root, target: rt, clear: true });
    root.destroy({ children: true });
    rt.source.style.addressMode = 'repeat';
    return rt;
  };
  // One combined tile, not far+mid separately: every fullscreen translucent
  // TilingSprite is a whole extra screen of overdraw per frame, and the Mali
  // fill rate turned out to be the binding constraint on TV boxes.
  const starfields = {
    main: bakeStarfield(47, [stars[0], stars[1], stars[2]]),
  };

  const nebulae: Record<string, Texture> = {};
  Object.entries(THEMES).forEach(([key, theme], i) => {
    nebulae[key] = forge.bakeCentered(640, 380, (r) => drawNebula(r, 1000 + i, theme.nebula));
  });

  // Planets: per-theme variations. Some have rings or moons for extra detail.
  const planetSpecs: Array<{ R: number; accent: number; secondary: number; seed: number; rings?: boolean; moons?: number; planetoids?: number; type?: 'gas' | 'rocky' | 'cratered' }> = [
    { R: 90, accent: 0x4eaaff, secondary: 0x2a4a78, seed: 11, type: 'rocky', moons: 1 },
    { R: 130, accent: 0xff9c4a, secondary: 0x6a3a18, seed: 22, type: 'gas', rings: true },
    { R: 100, accent: 0xc66bff, secondary: 0x3a1a4a, seed: 33, type: 'gas' },
    { R: 140, accent: 0x66ffcb, secondary: 0x1a4a3a, seed: 44, type: 'gas', rings: true, moons: 2 },
    { R: 80, accent: 0xfff066, secondary: 0x6a6a18, seed: 55, type: 'cratered' },
    { R: 150, accent: 0xff5544, secondary: 0x4a1a18, seed: 66, type: 'gas', moons: 1 },
    { R: 110, accent: 0xa0a0d0, secondary: 0x3a3a55, seed: 77, type: 'rocky' },
    { R: 130, accent: 0x88c4ff, secondary: 0x1a3a6a, seed: 88, type: 'gas', rings: true },
    { R: 92, accent: 0x98e6ff, secondary: 0x12344f, seed: 99, type: 'rocky', moons: 2, planetoids: 6 },
    { R: 122, accent: 0xd6b072, secondary: 0x3a2b1f, seed: 111, type: 'cratered', planetoids: 12 },
    { R: 108, accent: 0xff7ad8, secondary: 0x321a46, seed: 122, type: 'gas', rings: true, moons: 1, planetoids: 5 },
    { R: 88, accent: 0x7aff9f, secondary: 0x173c28, seed: 133, type: 'rocky', moons: 3 },
    { R: 145, accent: 0xffd166, secondary: 0x46301a, seed: 144, type: 'gas', rings: true, moons: 2, planetoids: 8 },
    { R: 96, accent: 0xb4c2ff, secondary: 0x2a2f52, seed: 155, type: 'cratered', moons: 1, planetoids: 10 },
    { R: 116, accent: 0xff8066, secondary: 0x4b1e1a, seed: 166, type: 'rocky', planetoids: 7 },
    { R: 132, accent: 0x5ef2d6, secondary: 0x173d44, seed: 177, type: 'gas', rings: true, moons: 3 },
  ];
  const planets = planetSpecs.map((p) => {
    // Ringed planets need a wide canvas (rings extend to ~2.2×R horizontally).
    // Moons add a bit on both axes.
    const moonPad = p.moons || p.planetoids ? p.R * 0.75 : 0;
    const w = Math.ceil(p.rings ? p.R * 5.0 + moonPad : p.R * 2 + 60 + moonPad);
    const h = Math.ceil(p.rings ? p.R * 2.6 + moonPad : p.R * 2 + 60 + moonPad);
    return forge.bakeCentered(w, h, (r) =>
      drawPlanet(r, p.seed, p.R, p.accent, p.secondary, { rings: p.rings, moons: p.moons, planetoids: p.planetoids, type: p.type }),
    );
  });

  const bases = {
    normal: forge.bakeCentered(540, 540, (r) => drawSpaceBase(r, 1, false)),
    burning: forge.bakeCentered(540, 540, (r) => drawSpaceBase(r, 2, true)),
  };

  const satellites: Texture[] = [
    forge.bakeCentered(80, 60, (r) => drawSatellite(r, 1)),
    forge.bakeCentered(80, 60, (r) => drawSatellite(r, 2)),
    forge.bakeCentered(80, 60, (r) => drawSatellite(r, 3)),
  ];

  const derelicts: Texture[] = [
    forge.bakeCentered(220, 80, (r) => drawDerelictShip(r, 1)),
    forge.bakeCentered(220, 80, (r) => drawDerelictShip(r, 2)),
  ];

  const distantShips: Texture[] = [
    forge.bakeCentered(28, 28, (r) => drawDistantShip(r, 11)),
    forge.bakeCentered(28, 28, (r) => drawDistantShip(r, 22)),
    forge.bakeCentered(28, 28, (r) => drawDistantShip(r, 33)),
  ];

  // 16 distinct capital-ship wreck variants — each with its own silhouette
  // and architecture (battleship, dreadnought bow/stern, carrier deck, cruiser
  // midsection, cargo barge, alien hull, mining processor, ...).
  // Canvas size per variant is tuned to the wreck's bounding box.
  const WRECK_CANVAS: Array<[number, number]> = [
    [420, 160], // 0  battleship hull
    [220, 200], // 1  dreadnought bow
    [220, 100], // 2  dreadnought stern
    [460, 100], // 3  carrier flight deck
    [240, 100], // 4  cruiser midsection
    [340, 120], // 5  cargo barge
    [240, 140], // 6  alien organic hull
    [320, 120], // 7  mining processor
    [260, 120], // 8  frigate inverted
    [260, 100], // 9  catamaran twins
    [320, 120], // 10 command tower
    [320, 120], // 11 spine exposed
    [160, 140], // 12 wedge
    [240, 110], // 13 saucer disc
    [120, 220], // 14 antenna relay
    [220, 140], // 15 boomerang
  ];
  const capitalWrecks: Texture[] = WRECK_CANVAS.map(([w, h], i) =>
    forge.bakeCentered(w, h, (root) => drawCapitalWreck(root, 100 + i, i)),
  );

  // 12 distinct debris variants
  const debrisClusters: Texture[] = [];
  for (let i = 0; i < 12; i++) {
    debrisClusters.push(forge.bakeCentered(180, 130, (root) => drawDebrisCluster(root, 400 + i, i)));
  }

  // Ruined bases — heavier damage than normal burning bases
  const ruinedBases: Texture[] = [
    forge.bakeCentered(520, 520, (r) => drawRuinedBase(r, 500)),
    forge.bakeCentered(520, 520, (r) => drawRuinedBase(r, 501)),
  ];

  // Ordinary stable stars. These appear more often than dying stars.
  const normalStars: Texture[] = [
    forge.bakeCentered(180, 180, (r) => drawNormalStar(r, 610, 52, { core: 0xfff4c0, flare: 0xffd166, halo: 0xffaa44 })),
    forge.bakeCentered(170, 170, (r) => drawNormalStar(r, 611, 46, { core: 0xd8f4ff, flare: 0x88d8ff, halo: 0x4eaaff })),
    forge.bakeCentered(190, 190, (r) => drawNormalStar(r, 612, 58, { core: 0xffe6dc, flare: 0xff9a66, halo: 0xff6a44 })),
    forge.bakeCentered(170, 170, (r) => drawNormalStar(r, 613, 48, { core: 0xf4f0ff, flare: 0xc6b8ff, halo: 0x8c78ff })),
    forge.bakeCentered(200, 200, (r) => drawNormalStar(r, 614, 62, { core: 0xf8ffe0, flare: 0xc8ff88, halo: 0x77dd88 })),
  ];

  // Dying stars (red giants)
  const dyingStars: Texture[] = [
    forge.bakeCentered(420, 420, (r) => drawDyingStar(r, 600, 120, { core: 0xff5522, flare: 0xff8833, halo: 0xffaa33 })),
    forge.bakeCentered(420, 420, (r) => drawDyingStar(r, 601, 100, { core: 0xff3322, flare: 0xff7744, halo: 0xff6633 })),
    forge.bakeCentered(380, 380, (r) => drawDyingStar(r, 602, 90, { core: 0xff7755, flare: 0xffaa66, halo: 0xffd166 })),
    forge.bakeCentered(440, 440, (r) => drawDyingStar(r, 603, 116, { core: 0xffdd66, flare: 0xfff0a0, halo: 0xffc45a })),
    forge.bakeCentered(400, 400, (r) => drawDyingStar(r, 604, 92, { core: 0x88d8ff, flare: 0xd8f2ff, halo: 0x6aa8ff })),
    forge.bakeCentered(460, 460, (r) => drawDyingStar(r, 605, 126, { core: 0xff66c4, flare: 0xffa8e0, halo: 0xbb66ff })),
  ];

  const starSystems: Texture[] = [
    forge.bakeCentered(760, 460, (r) => drawStarSystem(r, 700, { star: 0xffd166, corona: 0xff8833, planetA: 0x4eaaff, planetB: 0xff9c4a })),
    forge.bakeCentered(760, 460, (r) => drawStarSystem(r, 701, { star: 0x9fe8ff, corona: 0x4eaaff, planetA: 0x66ffcb, planetB: 0xc66bff })),
    forge.bakeCentered(760, 460, (r) => drawStarSystem(r, 702, { star: 0xff8066, corona: 0xff4433, planetA: 0xffd166, planetB: 0x88c4ff })),
    forge.bakeCentered(760, 460, (r) => drawStarSystem(r, 703, { star: 0xf8f0ff, corona: 0xb48cff, planetA: 0xff7ad8, planetB: 0x7aff9f })),
    forge.bakeCentered(760, 460, (r) => drawStarSystem(r, 704, { star: 0xfff0a0, corona: 0xffaa44, planetA: 0xb4c2ff, planetB: 0xd6b072 })),
    forge.bakeCentered(760, 460, (r) => drawStarSystem(r, 705, { star: 0x88d8ff, corona: 0x3366ff, planetA: 0xff8066, planetB: 0x5ef2d6 })),
  ];

  const asteroids: Texture[] = [];
  for (let i = 0; i < 5; i++) {
    const R = 24 + i * 12;
    asteroids.push(forge.bakeCentered(R * 2 + 8, R * 2 + 8, (r) => drawAsteroid(r, 100 + i, R)));
  }

  // All particle glyphs live on ONE texture page: the ParticleContainer fast
  // path batches per texture source, and Mali GPUs only expose 8 texture
  // units — 10 separate particle RenderTextures used to force batch flushes.
  const PPAD = 4;
  const pageDefs: Array<{ w: number; h: number; draw: (c: Container) => void }> = [
    { w: 200, h: 200, draw: (r) => drawExplosionRing(r, 0xffd166, 80) },
    { w: 120, h: 120, draw: (r) => drawExplosionRing(r, 0xff8044, 48) },
    { w: 80, h: 80, draw: (r) => drawExplosionRing(r, 0xffce66, 32) },
    { w: 24, h: 24, draw: (r) => drawParticleSoft(r, 0xffffff) },
    { w: 24, h: 24, draw: (r) => drawParticleSoft(r, 0xff9a3a) },
    { w: 24, h: 24, draw: (r) => drawParticleSoft(r, 0x6cdfff) },
    { w: 24, h: 24, draw: (r) => drawParticleSoft(r, 0xff5050) },
    { w: 24, h: 24, draw: (r) => drawParticleSoft(r, 0xc066ff) },
    { w: 6, h: 6, draw: (r) => drawParticleHard(r, 0xffffff) },
    { w: 6, h: 6, draw: (r) => drawParticleHard(r, 0xffaa66) },
  ];
  const PAGE_W = 512;
  const PAGE_H = 256;
  const pageRoot = new Container();
  const frames: Rectangle[] = [];
  {
    let px = PPAD;
    let py = PPAD;
    let rowH = 0;
    for (const def of pageDefs) {
      if (px + def.w + PPAD > PAGE_W) {
        px = PPAD;
        py += rowH + PPAD;
        rowH = 0;
      }
      const inner = new Container();
      inner.position.set(px + def.w / 2, py + def.h / 2);
      def.draw(inner);
      pageRoot.addChild(inner);
      frames.push(new Rectangle(px, py, def.w, def.h));
      px += def.w + PPAD;
      rowH = Math.max(rowH, def.h);
    }
  }
  const particlePage = RenderTexture.create({
    width: PAGE_W,
    height: PAGE_H,
    resolution: BAKE_RESOLUTION,
    antialias: ANTIALIAS,
  });
  app.renderer.render({ container: pageRoot, target: particlePage, clear: true });
  pageRoot.destroy({ children: true });
  const sub = frames.map((f) => new Texture({ source: particlePage.source, frame: f }));

  const explosions: Texture[] = [sub[2], sub[1], sub[0]];
  const particles = {
    softWhite: sub[3],
    softOrange: sub[4],
    softCyan: sub[5],
    softRed: sub[6],
    softPurple: sub[7],
    hardWhite: sub[8],
    hardOrange: sub[9],
  };

  return {
    player: forge.bakeCentered(96, 100, drawPlayer),
    enemies,
    bosses,
    proj,
    drops,
    stars,
    starfields,
    nebulae,
    planets,
    bases,
    satellites,
    derelicts,
    capitalWrecks,
    debrisClusters,
    ruinedBases,
    normalStars,
    dyingStars,
    starSystems,
    distantShips,
    asteroids,
    particles,
    explosions,
  };
}
