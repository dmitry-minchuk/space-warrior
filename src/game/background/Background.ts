import { Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../engine/constants';
import type { Atlas } from '../art/atlas';
import { themeForLevel } from '../palette';
import type { BackgroundDef } from '../levels/types';

interface ScrollSprite {
  sprite: Sprite;
  speed: number;
  active: boolean;
  spawnAt: number;
  kind?: string;
}

interface AsteroidEntry {
  sprite: Sprite;
  speed: number;
  vx: number;
  spin: number;
  y: number;
}

interface SatelliteEntry {
  sprite: Sprite;
  speed: number;
  vx: number;
  spin: number;
}

interface CometEntry {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  color: number;
}

interface DistantShipEntry {
  sprite: Sprite;
  vx: number;
  vy: number;
}

class StarLayer {
  stars: Sprite[] = [];
  speed: number;
  constructor(textures: any[], count: number, speed: number, layer: Container) {
    this.speed = speed;
    for (let i = 0; i < count; i++) {
      const s = new Sprite(textures[i % textures.length]);
      s.anchor.set(0.5);
      s.x = Math.random() * GAME_WIDTH;
      s.y = Math.random() * GAME_HEIGHT;
      s.alpha = 0.5 + Math.random() * 0.5;
      s.scale.set(0.5 + Math.random() * 0.8);
      layer.addChild(s);
      this.stars.push(s);
    }
  }
  update(dt: number): void {
    for (const s of this.stars) {
      s.y += this.speed * dt;
      if (s.y > GAME_HEIGHT + 10) {
        s.y = -10;
        s.x = Math.random() * GAME_WIDTH;
      }
    }
  }
  destroy(): void {
    for (const s of this.stars) s.parent?.removeChild(s);
    this.stars.length = 0;
  }
}

/** Dense far/mid layers as one scrolling tile each — a single scene-graph
 *  node instead of 110/60 individual star sprites walked every frame. */
class TiledStarLayer {
  sprite: TilingSprite;
  speed: number;
  constructor(texture: Texture, speed: number, layer: Container) {
    this.speed = speed;
    this.sprite = new TilingSprite({ texture, width: GAME_WIDTH, height: GAME_HEIGHT });
    layer.addChild(this.sprite);
  }
  update(dt: number): void {
    this.sprite.tilePosition.y += this.speed * dt;
  }
  destroy(): void {
    this.sprite.parent?.removeChild(this.sprite);
  }
}

export class Background {
  atlas: Atlas;
  bgFar: Container;
  bgMid: Container;
  bgNear: Container;
  starFar: TiledStarLayer;
  starMid: TiledStarLayer;
  starNear: StarLayer;
  nebula: TilingSprite | null = null;
  scrolls: ScrollSprite[] = [];
  asteroids: AsteroidEntry[] = [];
  satellites: SatelliteEntry[] = [];
  comets: CometEntry[] = [];
  distantShips: DistantShipEntry[] = [];
  scenery: ScrollSprite[] = [];
  asteroidTimer = 0;
  satelliteTimer = 0;
  cometTimer = 6;
  distantShipTimer = 18;
  sceneryTimer = 8;
  levelId = 1;
  def: BackgroundDef | null = null;
  time = 0;

  constructor(atlas: Atlas, layers: { bgFar: Container; bgMid: Container; bgNear: Container }) {
    this.atlas = atlas;
    this.bgFar = layers.bgFar;
    this.bgMid = layers.bgMid;
    this.bgNear = layers.bgNear;
    const sTex = atlas.stars;
    this.starFar = new TiledStarLayer(atlas.starfields.far, 18, this.bgFar);
    this.starMid = new TiledStarLayer(atlas.starfields.mid, 45, this.bgFar);
    // Near stars stay individual sprites: there are only 20 and they twinkle.
    this.starNear = new StarLayer([sTex[3], sTex[4]], 20, 90, this.bgMid);
  }

  loadLevel(level: number, def: BackgroundDef): void {
    this.clearLevelArt();
    this.def = def;
    this.levelId = level;
    this.sceneryTimer = 4 + Math.random() * 4;
    const theme = themeForLevel(level);
    const themeKey = (def.nebula?.themeKey ?? (level <= 3 ? 'earth' : level <= 7 ? 'industrial' : level <= 10 ? 'darksector' : level <= 14 ? 'anomaly' : level <= 17 ? 'hive' : 'final'));
    const nebulaTex = this.atlas.nebulae[themeKey];
    if (nebulaTex) {
      this.nebula = new TilingSprite({ texture: nebulaTex, width: GAME_WIDTH, height: GAME_HEIGHT * 2 });
      this.nebula.position.set(0, -GAME_HEIGHT);
      this.nebula.alpha = 0.7;
      this.nebula.tint = theme.fog;
      this.bgFar.addChildAt(this.nebula, 0);
    }

    // Planets
    for (const p of def.planets) {
      const tex = this.atlas.planets[p.planetIndex] ?? this.atlas.planets[0];
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.position.set(p.x, -tex.height);
      s.alpha = 1;
      this.scrolls.push({ sprite: s, speed: p.speed, active: false, spawnAt: p.spawnAt });
    }
    // Bases
    for (const b of def.bases) {
      const tex = b.burning ? this.atlas.bases.burning : this.atlas.bases.normal;
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.alpha = 1;
      s.position.set(b.x, -tex.height);
      this.scrolls.push({ sprite: s, speed: b.speed, active: false, spawnAt: b.spawnAt });
    }

    // Derelict ships
    if (def.derelicts) {
      for (const d of def.derelicts) {
        const tex = this.atlas.derelicts[d.variant ?? 0] ?? this.atlas.derelicts[0];
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.alpha = 1;
        s.rotation = (Math.random() - 0.5) * 0.4;
        s.position.set(d.x, -tex.height);
        this.scrolls.push({ sprite: s, speed: d.speed, active: false, spawnAt: d.spawnAt });
      }
    }

    this.time = 0;
  }

  clearLevelArt(): void {
    if (this.nebula) {
      this.nebula.parent?.removeChild(this.nebula);
      this.nebula.destroy();
      this.nebula = null;
    }
    for (const s of this.scrolls) {
      s.sprite.parent?.removeChild(s.sprite);
    }
    this.scrolls.length = 0;
    for (const a of this.asteroids) a.sprite.parent?.removeChild(a.sprite);
    this.asteroids.length = 0;
    for (const s of this.satellites) s.sprite.parent?.removeChild(s.sprite);
    this.satellites.length = 0;
    for (const c of this.comets) c.g.parent?.removeChild(c.g);
    this.comets.length = 0;
    for (const s of this.distantShips) s.sprite.parent?.removeChild(s.sprite);
    this.distantShips.length = 0;
    for (const s of this.scenery) s.sprite.parent?.removeChild(s.sprite);
    this.scenery.length = 0;
  }

  update(dt: number): void {
    this.time += dt;
    this.starFar.update(dt);
    this.starMid.update(dt);
    this.starNear.update(dt);
    if (this.nebula) {
      this.nebula.tilePosition.y += 12 * dt;
      // Subtle pulsing of nebula intensity to give it life
      this.nebula.alpha = 0.6 + 0.12 * Math.sin(this.time * 0.6);
    }
    // Pulsing twinkle of brightest stars
    for (const s of this.starNear.stars) {
      s.alpha = 0.6 + 0.4 * Math.sin(this.time * 2 + s.x * 0.013);
    }

    // Spawn-on-time scrolls
    for (const s of this.scrolls) {
      if (!s.active && this.time >= s.spawnAt) {
        s.active = true;
        this.bgMid.addChild(s.sprite);
      }
      if (s.active) {
        s.sprite.y += s.speed * dt;
        if (s.sprite.y - s.sprite.height / 2 > GAME_HEIGHT) {
          s.sprite.parent?.removeChild(s.sprite);
          s.active = false;
        }
      }
    }

    // Asteroid stream
    if (this.def?.asteroids) {
      this.asteroidTimer -= dt;
      if (this.asteroidTimer <= 0) {
        this.asteroidTimer = 1 / this.def.asteroids.rate;
        this.spawnAsteroid(this.def.asteroids.speed);
      }
      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const a = this.asteroids[i];
        a.sprite.y += a.speed * dt;
        a.sprite.x += a.vx * dt;
        a.sprite.rotation += a.spin * dt;
        if (a.sprite.y - a.sprite.height / 2 > GAME_HEIGHT + 40) {
          a.sprite.parent?.removeChild(a.sprite);
          this.asteroids.splice(i, 1);
        }
      }
    }

    // Satellite drift
    if (this.def?.satellites) {
      this.satelliteTimer -= dt;
      if (this.satelliteTimer <= 0) {
        this.satelliteTimer = 1 / this.def.satellites.rate;
        this.spawnSatellite(this.def.satellites.speed);
      }
      for (let i = this.satellites.length - 1; i >= 0; i--) {
        const s = this.satellites[i];
        s.sprite.y += s.speed * dt;
        s.sprite.x += s.vx * dt;
        s.sprite.rotation += s.spin * dt;
        if (s.sprite.y - s.sprite.height / 2 > GAME_HEIGHT + 40) {
          s.sprite.parent?.removeChild(s.sprite);
          this.satellites.splice(i, 1);
        }
      }
    }

    // Comet streaks (always on — feels organic)
    this.cometTimer -= dt;
    if (this.cometTimer <= 0) {
      this.cometTimer = 5 + Math.random() * 6;
      this.spawnComet();
    }
    for (let i = this.comets.length - 1; i >= 0; i--) {
      const c = this.comets[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      this.drawComet(c);
      if (c.age >= c.life) {
        c.g.parent?.removeChild(c.g);
        c.g.destroy();
        this.comets.splice(i, 1);
      }
    }

    // Distant ship traffic
    this.distantShipTimer -= dt;
    if (this.distantShipTimer <= 0) {
      this.distantShipTimer = 12 + Math.random() * 18;
      this.spawnDistantShip();
    }
    for (let i = this.distantShips.length - 1; i >= 0; i--) {
      const s = this.distantShips[i];
      s.sprite.x += s.vx * dt;
      s.sprite.y += s.vy * dt;
      if (
        s.sprite.x < -40 || s.sprite.x > GAME_WIDTH + 40 ||
        s.sprite.y < -40 || s.sprite.y > GAME_HEIGHT + 40
      ) {
        s.sprite.parent?.removeChild(s.sprite);
        this.distantShips.splice(i, 1);
      }
    }

    // Passive scenery spawner — keep background readable. Large set pieces
    // should be occasional, not stacked over gameplay.
    this.sceneryTimer -= dt;
    if (this.sceneryTimer <= 0 && this.scenery.length < 1) {
      this.sceneryTimer = 18 + Math.random() * 14;
      this.spawnScenery();
    } else if (this.sceneryTimer <= 0) {
      this.sceneryTimer = 8;
    }
    for (let i = this.scenery.length - 1; i >= 0; i--) {
      const s = this.scenery[i];
      s.sprite.y += s.speed * dt;
      // Subtle drift left/right on dying stars (atmospheric)
      if ((s.sprite as any)._driftX) {
        s.sprite.x += (s.sprite as any)._driftX * dt;
      }
      if (s.sprite.y - s.sprite.height / 2 > GAME_HEIGHT + 60) {
        s.sprite.parent?.removeChild(s.sprite);
        this.scenery.splice(i, 1);
      }
    }
  }

  private spawnScenery(): void {
    // Pick a scenery type weighted by level theme.
    const level = this.levelId;
    type Kind = 'wreck' | 'debris' | 'ruined' | 'normalStar' | 'dyingStar' | 'system' | 'derelict' | 'planet';
    const pool: Kind[] = [];
    const hasActiveSystem = this.scenery.some((s) => s.kind === 'system');
    // Always allow solid scenery; star systems are rare, large set-pieces.
    pool.push('wreck', 'debris', 'derelict', 'planet');
    // Ordinary stars are more common than dying stars, but both are rare large
    // scenery so the background does not crowd the playfield.
    if (Math.random() < 0.10) pool.push('normalStar');
    if (level >= 8 && Math.random() < 0.025) pool.push('dyingStar');
    if (level >= 4 && level <= 7) pool.push('ruined');
    if (level >= 8 && level <= 10) pool.push('ruined');
    if (level >= 11 && level <= 14 && Math.random() < 0.06) pool.push('normalStar');
    if (level >= 15 && level <= 17) pool.push('ruined', 'wreck');
    if (level >= 18) pool.push('ruined', 'wreck');
    if (level >= 18 && Math.random() < 0.04) pool.push('dyingStar');
    if (!hasActiveSystem && Math.random() < (level >= 11 ? 0.05 : 0.025)) pool.push('system');
    if (Math.random() < 0.12) pool.push('planet');

    const kind = pool[Math.floor(Math.random() * pool.length)];
    let tex;
    let baseSpeed = 50;
    let layer: Container = this.bgFar;
    let driftX = 0;
    switch (kind) {
      case 'wreck':
        tex = this.atlas.capitalWrecks[Math.floor(Math.random() * this.atlas.capitalWrecks.length)];
        baseSpeed = 50;
        layer = this.bgMid;
        break;
      case 'debris':
        tex = this.atlas.debrisClusters[Math.floor(Math.random() * this.atlas.debrisClusters.length)];
        baseSpeed = 70;
        layer = this.bgMid;
        break;
      case 'ruined':
        tex = this.atlas.ruinedBases[Math.floor(Math.random() * this.atlas.ruinedBases.length)];
        baseSpeed = 55;
        layer = this.bgMid;
        break;
      case 'normalStar':
        tex = this.atlas.normalStars[Math.floor(Math.random() * this.atlas.normalStars.length)];
        baseSpeed = 24;
        layer = this.bgFar;
        driftX = (Math.random() - 0.5) * 4;
        break;
      case 'dyingStar':
        tex = this.atlas.dyingStars[Math.floor(Math.random() * this.atlas.dyingStars.length)];
        baseSpeed = 28;
        layer = this.bgFar;
        driftX = (Math.random() - 0.5) * 6;
        break;
      case 'system':
        tex = this.atlas.starSystems[Math.floor(Math.random() * this.atlas.starSystems.length)];
        baseSpeed = 24;
        layer = this.bgFar;
        driftX = (Math.random() - 0.5) * 4;
        break;
      case 'derelict':
        tex = this.atlas.derelicts[Math.floor(Math.random() * this.atlas.derelicts.length)];
        baseSpeed = 65;
        layer = this.bgMid;
        break;
      case 'planet':
        tex = this.atlas.planets[Math.floor(Math.random() * this.atlas.planets.length)];
        baseSpeed = 30;
        layer = this.bgFar;
        break;
    }
    if (!tex) return;
    // Distance scale: 0.5 (very distant) up to 3.0 (very close).
    // Closer objects scroll faster (parallax) and go on a nearer layer.
    let scale: number;
    const roll = Math.random();
    if (roll < 0.45) {
      scale = 0.55 + Math.random() * 0.6;       // distant
    } else if (roll < 0.85) {
      scale = 1.15 + Math.random() * 0.7;       // mid-distance
      layer = this.bgMid;
    } else {
      scale = 2.0 + Math.random() * 1.2;        // close, BIG
      layer = this.bgNear;
    }
    // Planets/stars/systems stay backgrounded — cap their close scale.
    if ((kind === 'planet' || kind === 'dyingStar' || kind === 'system') && scale > 1.6) scale = 1.0 + Math.random() * 0.6;
    if (kind === 'normalStar') scale = 0.45 + Math.random() * 0.35;
    const speed = baseSpeed * scale * (0.7 + Math.random() * 0.4);

    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.scale.set(scale);
    s.alpha = 1;
    // For wrecks/debris, give a tumbling angle.
    s.rotation = (kind === 'wreck' || kind === 'debris') ? (Math.random() - 0.5) * 0.7 : 0;
    const scaledW = tex.width * scale;
    const scaledH = tex.height * scale;
    // Allow large objects to enter partially off the side
    const margin = scaledW > GAME_WIDTH ? -scaledW * 0.2 : 40;
    s.x = margin + Math.random() * (GAME_WIDTH - margin * 2);
    s.y = -scaledH / 2 - 20;
    (s as any)._driftX = driftX;
    layer.addChild(s);
    this.scenery.push({ sprite: s, speed, active: true, spawnAt: 0, kind });
  }

  private spawnComet(): void {
    // Streak diagonally across the screen
    const g = new Graphics();
    this.bgFar.addChild(g);
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -40 : GAME_WIDTH + 40;
    const y = Math.random() * GAME_HEIGHT * 0.6;
    const speed = 480 + Math.random() * 220;
    const angle = (Math.random() * 0.3 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
    const vx = (fromLeft ? 1 : -1) * speed * Math.cos(angle);
    const vy = speed * 0.55;
    const colors = [0xc4e2ff, 0xffe2a0, 0xffaaff, 0xb8ffaa];
    this.comets.push({
      g,
      x,
      y,
      vx,
      vy,
      life: 3.0,
      age: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  private drawComet(c: CometEntry): void {
    c.g.clear();
    const tx = c.x - c.vx * 0.18;
    const ty = c.y - c.vy * 0.18;
    // Tail (fading line)
    c.g.moveTo(tx, ty).lineTo(c.x, c.y).stroke({ color: c.color, width: 4, alpha: 0.18 });
    c.g.moveTo(tx + (c.x - tx) * 0.3, ty + (c.y - ty) * 0.3).lineTo(c.x, c.y).stroke({ color: c.color, width: 2.5, alpha: 0.55 });
    c.g.moveTo(tx + (c.x - tx) * 0.6, ty + (c.y - ty) * 0.6).lineTo(c.x, c.y).stroke({ color: 0xffffff, width: 1.4, alpha: 0.9 });
    // Head glow
    c.g.circle(c.x, c.y, 4).fill({ color: c.color, alpha: 0.6 });
    c.g.circle(c.x, c.y, 2).fill(0xffffff);
  }

  private spawnDistantShip(): void {
    const tex = this.atlas.distantShips[Math.floor(Math.random() * this.atlas.distantShips.length)];
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    const dir = Math.random() < 0.5 ? 1 : -1;
    s.x = dir === 1 ? -20 : GAME_WIDTH + 20;
    s.y = 60 + Math.random() * (GAME_HEIGHT - 200);
    s.alpha = 1;
    s.scale.set(0.7 + Math.random() * 0.4);
    s.rotation = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    this.bgFar.addChild(s);
    const speed = 40 + Math.random() * 30;
    this.distantShips.push({ sprite: s, vx: dir * speed, vy: 0 });
  }

  private spawnSatellite(speed: number): void {
    const tex = this.atlas.satellites[Math.floor(Math.random() * this.atlas.satellites.length)];
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.x = Math.random() * GAME_WIDTH;
    s.y = -tex.height / 2 - 10;
    s.alpha = 1;
    s.rotation = (Math.random() - 0.5) * 1.2;
    this.bgMid.addChild(s);
    this.satellites.push({
      sprite: s,
      speed: speed + Math.random() * 20,
      vx: (Math.random() - 0.5) * 12,
      spin: (Math.random() - 0.5) * 0.4,
    });
  }

  private spawnAsteroid(speed: number): void {
    const tex = this.atlas.asteroids[Math.floor(Math.random() * this.atlas.asteroids.length)];
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.x = Math.random() * GAME_WIDTH;
    s.y = -tex.height / 2 - 10;
    s.alpha = 1;
    this.bgNear.addChild(s);
    this.asteroids.push({
      sprite: s,
      speed: speed + Math.random() * 40,
      vx: (Math.random() - 0.5) * 30,
      spin: (Math.random() - 0.5) * 1.5,
      y: s.y,
    });
  }

  destroy(): void {
    this.starFar.destroy();
    this.starMid.destroy();
    this.starNear.destroy();
    this.clearLevelArt();
  }
}
