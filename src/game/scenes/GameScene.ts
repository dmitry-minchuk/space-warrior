import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Scene } from '../../engine/scene';
import { GAME_HEIGHT, GAME_WIDTH } from '../../engine/constants';
import { Input } from '../../engine/input';
import { startMusic, stopMusic } from '../../engine/audio';
import type { Atlas, EnemyKey } from '../art/atlas';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import type { Projectile } from '../entities/Projectile';
import type { Enemy } from '../entities/Enemy';
import { Background } from '../background/Background';
import { Hud } from '../hud/Hud';
import { buildArchetypes, rollLoot } from '../enemies/archetypes';
import { LEVELS } from '../levels/levels';
import { LevelRunner } from '../levels/LevelRunner';
import { buildBossSpecs } from '../bosses/bosses';
import type { BossSpec } from '../entities/Boss';
import type { GameState } from '../state';
import { createInitialState, resetToLevelStart, resetWeaponsOnDeath } from '../state';
import type { Audio, World } from '../world';
import { makeEmptyWorld } from '../world';
import { WEAPONS, fireBonusMissile } from '../weapons/weapons';
import { WEAPON_LABELS, type WeaponId } from '../weapons/types';
import { bigHit, bombFlash, emitEngineTrail, emitEnemyEngine, explosion, hitSpark, pickupFlash } from '../vfx/Vfx';
import { FloatingText } from '../vfx/FloatingText';
import { themeForLevel } from '../palette';

interface CollisionResult { hit: boolean; }

function projectileHitColor(visual: string): number {
  switch (visual) {
    case 'pulse': return 0x6cdfff;
    case 'spread': return 0xffd166;
    case 'plasma': return 0xb8ffb0;
    case 'missile': return 0xff8a3d;
    case 'wave': return 0xc066ff;
    case 'lightning': return 0xfff066;
    default: return 0xffd166;
  }
}

export class GameScene extends Scene {
  atlas: Atlas;
  audio: Audio;
  state: GameState;
  world!: World;
  background!: Background;
  hud!: Hud;
  archetypes!: ReturnType<typeof buildArchetypes>;
  bossSpecs!: BossSpec[];
  runner!: LevelRunner;
  gameRoot!: Container;
  shakeRoot!: Container;
  paused = false;
  pauseOverlay!: Container;
  endOverlay: Container | null = null;
  startLevel = 1;
  // Deferred level transition
  pendingNextLevel = -1;
  pendingNextDelay = 0;
  // Deferred game over
  pendingGameOver = false;
  pendingGameOverDelay = 0;
  // Lives respawn
  respawnDelay = 0;
  // Pity counter: when we go too long without a health drop, force one.
  killsSinceHealth = 0;
  // Same idea for weapons, with a small cooldown to avoid front-loaded clumps.
  killsSinceWeapon = 0;
  // Extra-life pity: tracks total enemies killed since the last 1-up dropped,
  // so the rare-roll path does not stack into a 1-up famine across a whole run.
  killsSinceLife = 0;
  // Game-time scheduled actions (replaces setTimeout, so timing stays
  // in sync with the boss dying animation regardless of frame hiccups).
  deferredActions: Array<{ at: number; fn: () => void }> = [];
  // Persistent Graphics used to draw flickering arcs between active wave-gun
  // projectiles each frame. Cleared and redrawn every update.
  waveArcGfx!: Graphics;

  constructor(atlas: Atlas, audio: Audio, startLevel = 1) {
    super();
    this.atlas = atlas;
    this.audio = audio;
    this.state = createInitialState();
    this.state.level = startLevel;
    this.startLevel = startLevel;
  }

  override enter(): void {
    Input.clearAll();
    this.gameRoot = new Container();
    this.stage.addChild(this.gameRoot);
    this.shakeRoot = new Container();
    this.gameRoot.addChild(this.shakeRoot);

    // Build layers
    const layers = {
      bgFar: new Container(),
      bgMid: new Container(),
      bgNear: new Container(),
      effectsUnder: new Container(),
      entities: new Container(),
      projectiles: new Container(),
      effectsOver: new Container(),
      hud: new Container(),
    };
    this.shakeRoot.addChild(layers.bgFar);
    this.shakeRoot.addChild(layers.bgMid);
    this.shakeRoot.addChild(layers.bgNear);
    this.shakeRoot.addChild(layers.effectsUnder);
    this.shakeRoot.addChild(layers.entities);
    this.shakeRoot.addChild(layers.projectiles);
    this.shakeRoot.addChild(layers.effectsOver);
    this.stage.addChild(layers.hud);

    this.archetypes = buildArchetypes(this.atlas);
    this.bossSpecs = buildBossSpecs(this.atlas);

    const player = new Player(this.atlas);

    const worldBase = makeEmptyWorld();
    this.world = {
      ...(worldBase as Required<typeof worldBase>),
      state: this.state,
      atlas: this.atlas,
      archetypes: this.archetypes,
      layers,
      player,
      onLevelClear: () => this.onLevelClear(),
      onPlayerDeath: () => this.onPlayerDeath(),
      onBossSpawned: (b) => this.onBossSpawned(b),
      onEnemyKilled: (e) => this.onEnemyDeath(e),
      onBossKilled: (b) => this.onBossDeath(b),
      audio: this.audio,
    } as World;

    this.background = new Background(this.atlas, layers);
    this.hud = new Hud(layers.hud, this.atlas);

    // Wave-arc overlay — drawn on top of projectiles each frame.
    this.waveArcGfx = new Graphics();
    layers.projectiles.addChild(this.waveArcGfx);

    this.startLevelFlow(this.state.level);

    player.spawn(layers.entities);

    // Pause overlay
    this.pauseOverlay = this.buildPauseOverlay();
    this.pauseOverlay.visible = false;
    this.stage.addChild(this.pauseOverlay);
  }

  override exit(): void {
    stopMusic();
    this.background.destroy();
    this.gameRoot.destroy({ children: true });
    if (this.endOverlay) this.endOverlay.destroy({ children: true });
    this.pauseOverlay.destroy({ children: true });
  }

  private startLevelFlow(level: number): void {
    this.state.level = level;
    resetToLevelStart(this.state);
    const data = LEVELS[level - 1];
    if (!data) {
      // Campaign complete
      this.onCampaignComplete();
      return;
    }
    this.background.loadLevel(level, data.background);
    this.runner = new LevelRunner(data, this.bossSpecs[data.bossIndex]);
    this.world.boss = null;
    this.world.bossArrivedAt = -1;
    this.world.time = 0;
    this.hud.showAnnouncement(`LEVEL ${level}`, data.name.toUpperCase(), 3.0);
    const theme = themeForLevel(level).name;
    startMusic((level <= 3 ? 'earth' : level <= 7 ? 'industrial' : level <= 10 ? 'darksector' : level <= 14 ? 'anomaly' : level <= 17 ? 'hive' : 'final'));
  }

  override update(dt: number): void {
    if (this.endOverlay) {
      this.handleEndInput();
      Input.endFrame();
      return;
    }
    if (this.paused) {
      // While paused only handle un-pause input.
      if (Input.wasPressed('pause') || Input.wasPressed('cancel')) {
        this.setPaused(false);
      }
      Input.endFrame();
      return;
    }
    if (Input.wasPressed('pause')) {
      this.setPaused(true);
      Input.endFrame();
      return;
    }
    // Dev cheat: backquote cycles weapons (LV5) — handy for testing.
    if (Input.wasPressed('debug')) {
      const order: WeaponId[] = ['pulse', 'spread', 'plasma', 'missiles', 'wave', 'lightning'];
      const idx = order.indexOf(this.state.weapon);
      this.state.weapon = order[(idx + 1) % order.length];
      this.state.levels[this.state.weapon] = 5;
    }

    this.world.time += dt;

    // Run any deferred actions scheduled against game-time.
    if (this.deferredActions.length) {
      for (let i = this.deferredActions.length - 1; i >= 0; i--) {
        const a = this.deferredActions[i];
        if (this.world.time >= a.at) {
          try { a.fn(); } catch (e) { console.warn('deferred action threw', e); }
          this.deferredActions.splice(i, 1);
        }
      }
    }

    // Clear telegraph at start of each frame — combat updaters re-draw it.
    if (this.world.telegraphGfx) this.world.telegraphGfx.clear();

    // Update background
    this.background.update(dt);

    // Update player
    const speedMul = this.state.speedBoostT > 0 ? 1.55 : 1;
    if (this.world.player.alive) {
      this.world.player.update(dt, speedMul);
      this.handlePlayerFire(dt);
      this.handlePlayerBomb();
      // Engine trail — cap rate and skip when the particle pool is busy so a
      // dense fight doesn't drown the GPU in tiny additive sprites. While the
      // speed boost is active we emit twice as often and add a third central
      // jet so the afterburn reads as visibly stronger.
      this.world.player.trailTimer -= dt;
      if (this.world.player.trailTimer <= 0) {
        const boosting = this.state.speedBoostT > 0;
        this.world.player.trailTimer = boosting ? 0.014 : 0.028;
        if (this.world.particles.length < 280) {
          emitEngineTrail(this.world, this.world.player.x - 10, this.world.player.y + 24);
          emitEngineTrail(this.world, this.world.player.x + 10, this.world.player.y + 24);
          if (boosting) {
            emitEngineTrail(this.world, this.world.player.x, this.world.player.y + 28);
          }
        }
      }
    }

    // Update enemies
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      e.age += dt;
      e.archetype.movementUpdate(e, dt, this.world);
      e.archetype.combatUpdate(e, dt, this.world);
      e.postUpdateVisual(dt);
      // Stealth ship invisibility cycle
      if (e.archetype.visualKey === 'stealth') {
        const cyc = (e.age % 2.6) / 2.6;
        if (cyc < 0.6) e.sprite.alpha = 1;
        else if (cyc < 0.7) e.sprite.alpha = 1 - (cyc - 0.6) / 0.1;
        else if (cyc < 0.95) e.sprite.alpha = 0.12;
        else e.sprite.alpha = 0.12 + (cyc - 0.95) / 0.05;
      }
      // Engine trail — cap rate per enemy + skip when the particle layer is busy.
      if (this.world.particles.length < 320 && Math.random() < dt * 8 && e.y > 0 && e.y < GAME_HEIGHT && e.archetype.visualKey !== 'turret' && e.archetype.visualKey !== 'tesla' && e.archetype.visualKey !== 'drone') {
        emitEnemyEngine(this.world, e.x, e.y - 8);
      }
      // Despawn if went too far down or off screen edges
      if (e.y > GAME_HEIGHT + 80 || e.x < -120 || e.x > GAME_WIDTH + 120) {
        e.alive = false;
      }
    }

    // Update boss
    if (this.world.boss) {
      const b = this.world.boss;
      if (b.entering) {
        b.y += b.vy * dt;
        if (b.y >= b.spec.entryY) {
          b.entering = false;
          this.world.bossArrivedAt = this.world.time;
        }
      } else if (b.alive && !b.dying) {
        b.age += dt;
        b.spec.update(b, dt, this.world);
      }
      b.postUpdateVisual(dt);
      if (b.dying && !b.deathHandled) this.onBossDeath(b);
    }

    // Update projectiles
    for (const p of this.world.projectiles) {
      if (!p.alive) continue;
      // Homing target — cached on the projectile and only re-scanned every
      // ~0.06s so a swarm of missiles doesn't compound O(P*E) per frame.
      let tx = 0, ty = 0, has = false;
      if (p.homing) {
        p.homingRetargetT -= dt;
        if (p.homingRetargetT <= 0) {
          p.homingRetargetT = 0.06;
          let best = Infinity;
          let foundX = 0, foundY = 0, found = false;
          for (const e of this.world.enemies) {
            if (!e.alive) continue;
            const d2 = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
            if (d2 < best) { best = d2; foundX = e.x; foundY = e.y; found = true; }
          }
          if (this.world.boss && this.world.boss.alive && !this.world.boss.entering) {
            const b = this.world.boss;
            const d2 = (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y);
            if (d2 < best) { best = d2; foundX = b.x; foundY = b.y; found = true; }
          }
          p.homingTx = foundX;
          p.homingTy = foundY;
          p.hasHomingTarget = found;
        }
        tx = p.homingTx;
        ty = p.homingTy;
        has = p.hasHomingTarget;
      }
      p.update(dt, tx, ty, has);
      // Missile exhaust trail — smoke + flame puffs spawned behind the missile
      if (p.alive && p.visual === 'missile') {
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const backX = p.x - (p.vx / speed) * 10;
        const backY = p.y - (p.vy / speed) * 10;
        // Flame puff (frequent)
        if (Math.random() < dt * 60) {
          const pa = this.world.particlePool.spawn({
            texture: this.world.atlas.particles.softOrange,
            x: backX + (Math.random() - 0.5) * 2,
            y: backY + (Math.random() - 0.5) * 2,
            vx: -p.vx * 0.05 + (Math.random() - 0.5) * 30,
            vy: -p.vy * 0.05 + (Math.random() - 0.5) * 30,
            life: 0.22,
            scale: 0.5,
            endScale: 0.05,
            blend: 'add',
            tint: 0xffce66,
            alpha: 0.9,
          }, this.world.layers.effectsUnder);
          this.world.particles.push(pa);
        }
        // Smoke trail (less frequent, longer life)
        if (Math.random() < dt * 24) {
          const pa = this.world.particlePool.spawn({
            texture: this.world.atlas.particles.softOrange,
            x: backX + (Math.random() - 0.5) * 4,
            y: backY + (Math.random() - 0.5) * 4,
            vx: -p.vx * 0.02,
            vy: -p.vy * 0.02,
            life: 0.7,
            scale: 0.45,
            endScale: 1.2,
            blend: 'normal',
            tint: 0x4a4a4a,
            alpha: 0.5,
          }, this.world.layers.effectsUnder);
          this.world.particles.push(pa);
        }
      }
      // Plasma arc — orbs zap multiple nearby enemies. Throttled per orb.
      if (p.alive && p.visual === 'plasma' && p.owner === 'player') {
        p.arcCooldownT -= dt;
        if (p.arcCooldownT <= 0) {
          const targets = this.findArcTargets(p.x, p.y, 150, 3);
          if (targets.length > 0) {
            for (const target of targets) this.plasmaArcTo(p.x, p.y, target);
            p.arcCooldownT = 0.32 + Math.random() * 0.1;
          } else {
            p.arcCooldownT = 0.1;     // re-check soon
          }
        }
      }
    }

    // Wave-arc overlay — crackle between active wave charges in flight.
    this.renderWaveArcs();

    // Update drops
    for (const d of this.world.drops) {
      if (!d.alive) continue;
      d.update(dt);
    }

    // Update particles
    for (const p of this.world.particles) {
      if (!p.alive) continue;
      p.update(dt);
    }

    // Beam visual timer
    if (this.world.beamGfx && this.world.beamLifetime > 0) {
      this.world.beamLifetime -= dt;
      if (this.world.beamLifetime <= 0) this.world.beamGfx.clear();
    }

    // Floating pickup texts
    for (const f of this.world.floats) {
      if (!f.alive) continue;
      f.update(dt);
    }

    // Boosts decay
    if (this.state.speedBoostT > 0) this.state.speedBoostT -= dt;
    if (this.state.damageBoostT > 0) this.state.damageBoostT -= dt;
    if (this.state.shieldHp > 0) {
      // Shield bleeds slowly
      this.state.shieldHp -= dt * 8;
      if (this.state.shieldHp < 0) this.state.shieldHp = 0;
    }
    this.world.player.updateShield(this.state.shieldHp, this.world.time);

    // Collisions
    this.runCollisions(dt);

    // Level runner
    this.runner.update(dt, this.world);

    // Cull dead
    this.cullDead();

    // HUD
    this.hud.update(dt, this.world);

    // Screen shake
    const sh = this.world.screenShake;
    if (sh > 0) {
      this.shakeRoot.position.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      this.world.screenShake = Math.max(0, sh - dt * 60);
    } else {
      this.shakeRoot.position.set(0, 0);
    }

    // Deferred transitions
    if (this.pendingNextDelay > 0) {
      this.pendingNextDelay -= dt;
      if (this.pendingNextDelay <= 0) {
        this.advanceToLevel(this.pendingNextLevel);
        this.pendingNextLevel = -1;
      }
    }
    if (this.pendingGameOverDelay > 0) {
      this.pendingGameOverDelay -= dt;
      if (this.pendingGameOverDelay <= 0) {
        this.showGameOver();
      }
    }
    if (this.respawnDelay > 0) {
      this.respawnDelay -= dt;
      if (this.respawnDelay <= 0 && this.state.lives > 0) {
        this.world.player.spawn(this.world.layers.entities);
      }
    }

    Input.endFrame();
  }

  // ----- player firing / bomb -----
  private handlePlayerFire(dt: number): void {
    const p = this.world.player;
    if (!Input.isDown('fire')) return;
    const dmgMul = this.state.damageBoostT > 0 ? 2 : 1;
    const def = WEAPONS[this.state.weapon];
    const level = this.state.levels[this.state.weapon];
    // LV5 bonus: each weapon also fires a homing missile (~2/sec).
    if (level === 5 && p.bonusMissileTimer <= 0) {
      fireBonusMissile(this.world, p, dmgMul);
      p.bonusMissileTimer = 0.5;
    }
    if (def.continuous) {
      def.continuous(this.world, p, level, dmgMul, dt);
      return;
    }
    if (p.fireTimer > 0) return;
    def.fire(this.world, p, level, dmgMul);
    p.fireTimer = 1 / def.rate(level);
  }

  private handlePlayerBomb(): void {
    if (!Input.wasPressed('bomb')) return;
    if (this.state.bombs <= 0) return;
    this.state.bombs--;
    bombFlash(this.world);
    // Clear enemy projectiles
    for (const pr of this.world.projectiles) {
      if (pr.owner === 'enemy') pr.alive = false;
    }
    // Damage all visible enemies + boss
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      const died = e.damage(80);
      if (died) this.onEnemyDeath(e);
    }
    if (this.world.boss && this.world.boss.alive && !this.world.boss.entering) {
      // Bomb is AoE: full hull damage + a smaller share to every alive part
      // so destructible modules still feel reactive to bomb usage.
      const boss = this.world.boss;
      boss.damageAllParts(80);
      const died = boss.damage(200);
      if (died) this.onBossDeath(boss);
    }
    this.hud.triggerScreenFlash(0xffffff, 0.5);
  }

  // ----- collisions -----
  private runCollisions(_dt: number): void {
    const now = this.world.time;
    // Wave projectiles use cooldown-per-target (re-hit every 0.5s); other
    // piercing projectiles use one-hit-per-target lock via hitIds.
    const COOLDOWN = 0.5;

    // Player projectile vs enemies / boss
    for (const p of this.world.projectiles) {
      if (!p.alive || p.owner !== 'player') continue;
      const useCooldown = p.piercing && p.visual === 'wave';

      // Player shots can intercept weaker enemy projectiles; boss specials can opt out.
      for (const ep of this.world.projectiles) {
        if (!ep.alive || ep.owner !== 'enemy' || !ep.interceptible) continue;
        const dx = ep.x - p.x;
        const dy = ep.y - p.y;
        const r = ep.radius + p.radius;
        if (dx * dx + dy * dy < r * r) {
          ep.interceptHp -= 1;
          hitSpark(this.world, ep.x, ep.y, ep.visual === 'mine' ? 0xff8a3d : 0xc4e2ff);
          if (ep.interceptHp <= 0) {
            ep.alive = false;
            if (ep.visual === 'mine' || ep.visual === 'enemyBomb') explosion(this.world, ep.x, ep.y, 'sm');
          }
          if (!p.piercing) p.alive = false;
          break;
        }
      }
      if (!p.alive) continue;

      // Boss check
      const b = this.world.boss;
      if (b && b.alive && !b.entering && !b.dying) {
        let canHit = true;
        if (p.piercing) {
          if (useCooldown) {
            const last = p.hitCooldown.get(b.id) ?? -Infinity;
            canHit = (now - last) >= COOLDOWN;
          } else {
            canHit = !p.hitIds.has(b.id);
          }
        }
        if (canHit) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const r = b.radius + p.radius;
          let hit = dx * dx + dy * dy < r * r;
          // Parts can stick out past the hull (claws, missile pods, etc.) —
          // so a hit on any alive part also counts as a hit on the boss.
          if (!hit) {
            for (const part of b.parts) {
              if (!part.alive) continue;
              const pdx = (b.x + part.ox) - p.x;
              const pdy = (b.y + part.oy) - p.y;
              const pr = part.radius + p.radius;
              if (pdx * pdx + pdy * pdy < pr * pr) { hit = true; break; }
            }
          }
          if (hit) {
            const died = b.damageAt(p.x, p.y, p.damage);
            bigHit(this.world, p.x, p.y, 0xffd166);
            if (p.visual === 'plasma') this.plasmaShockwave(p.x, p.y, p.damage * 0.6, b.id);
            if (p.piercing) {
              if (useCooldown) p.hitCooldown.set(b.id, now);
              else p.hitIds.add(b.id);
            } else {
              p.alive = false;
            }
            if (died) this.onBossDeath(b);
          }
        }
      }
      if (!p.alive) continue;
      for (const e of this.world.enemies) {
        if (!e.alive) continue;
        if (p.piercing) {
          if (useCooldown) {
            const last = p.hitCooldown.get(e.id) ?? -Infinity;
            if ((now - last) < COOLDOWN) continue;
          } else if (p.hitIds.has(e.id)) {
            continue;
          }
        }
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const r = e.archetype.radius + p.radius;
        if (dx * dx + dy * dy < r * r) {
          const died = e.damage(p.damage);
          hitSpark(this.world, p.x, p.y, projectileHitColor(p.visual));
          if (p.visual === 'plasma') this.plasmaShockwave(p.x, p.y, p.damage * 0.6, e.id);
          if (p.piercing) {
            if (useCooldown) p.hitCooldown.set(e.id, now);
            else p.hitIds.add(e.id);
          } else {
            p.alive = false;
          }
          if (died) this.onEnemyDeath(e);
          if (!p.piercing) break;
        }
      }
    }
    // Enemy projectile vs player
    if (this.world.player.alive && this.world.player.iframes <= 0) {
      for (const p of this.world.projectiles) {
        if (!p.alive || p.owner !== 'enemy') continue;
        const dx = this.world.player.x - p.x;
        const dy = this.world.player.y - p.y;
        const r = this.world.player.hitRadius + p.radius;
        if (dx * dx + dy * dy < r * r) {
          this.damagePlayer(p.damage);
          hitSpark(this.world, p.x, p.y, 0xff6644);
          if (p.visual === 'mine') {
            explosion(this.world, p.x, p.y, 'sm');
          }
          p.alive = false;
          break;
        }
      }
    }
    // Enemy contact vs player
    if (this.world.player.alive && this.world.player.iframes <= 0) {
      for (const e of this.world.enemies) {
        if (!e.alive) continue;
        const dx = this.world.player.x - e.x;
        const dy = this.world.player.y - e.y;
        const r = this.world.player.hitRadius + e.archetype.radius;
        if (dx * dx + dy * dy < r * r) {
          this.damagePlayer(e.archetype.contactDamage);
          // Kamikaze obliterates self
          if (e.archetype.visualKey === 'kamikaze') {
            e.damage(9999);
            this.onEnemyDeath(e);
          }
          break;
        }
      }
      // Boss contact
      const b = this.world.boss;
      if (b && b.alive && !b.entering) {
        const dx = this.world.player.x - b.x;
        const dy = this.world.player.y - b.y;
        const r = this.world.player.hitRadius + b.radius * 0.6;
        if (dx * dx + dy * dy < r * r) {
          this.damagePlayer(20);
        }
      }
    }
    // Drops vs player
    if (this.world.player.alive) {
      const pickRadius = 28;
      for (const d of this.world.drops) {
        if (!d.alive) continue;
        const dx = this.world.player.x - d.x;
        const dy = this.world.player.y - d.y;
        if (dx * dx + dy * dy < (pickRadius + d.radius) * (pickRadius + d.radius)) {
          this.applyDropPickup(d.key, d.x, d.y);
          pickupFlash(this.world, d.x, d.y, 0xffdca8);
          d.alive = false;
        }
      }
    }
  }

  private damagePlayer(amount: number): void {
    const before = this.world.player.hp;
    const res = this.world.player.damage(amount, this.state.shieldHp);
    this.state.shieldHp = res.shieldRemain;
    if (res.took > 0) {
      this.audio.play('player_hit', { volume: 0.4 });
      this.hud.triggerDamageFlash();
      this.world.screenShake = Math.max(this.world.screenShake, 10);
    }
    if (res.died) {
      this.onPlayerDeath();
    }
  }

  private applyDropPickup(key: string, x: number, y: number): void {
    const s = this.state;
    let text = '';
    let color = 0xffffff;
    switch (key) {
      case 'health_s':
        this.world.player.heal(15); this.hud.triggerHealFlash();
        text = '+15 HP'; color = 0x6bff8a; break;
      case 'health_l':
        this.world.player.heal(40); this.hud.triggerHealFlash();
        text = '+40 HP'; color = 0xa7ffb8; break;
      case 'w_pulse':
        text = this.applyWeaponPickup('pulse'); color = 0x6cdfff; break;
      case 'w_spread':
        text = this.applyWeaponPickup('spread'); color = 0xffd166; break;
      case 'w_plasma':
        text = this.applyWeaponPickup('plasma'); color = 0xff8af0; break;
      case 'w_missiles':
        text = this.applyWeaponPickup('missiles'); color = 0xff8a3d; break;
      case 'w_wave':
        text = this.applyWeaponPickup('wave'); color = 0xc066ff; break;
      case 'w_lightning':
        text = this.applyWeaponPickup('lightning'); color = 0xfff066; break;
      case 'shield':
        s.shieldHp = 100; this.hud.triggerScreenFlash(0x4eaaff, 0.3);
        text = 'SHIELD'; color = 0x4eaaff; break;
      case 'speed':
        s.speedBoostT = 18; this.hud.triggerScreenFlash(0x6cff7a, 0.3);
        text = '+SPEED 1.55× 18s'; color = 0x6bff8a; break;
      case 'damage':
        s.damageBoostT = 10; this.hud.triggerScreenFlash(0xff5050, 0.25);
        text = '2× DAMAGE 10s'; color = 0xff5050; break;
      case 'bomb':
        s.bombs = Math.min(5, s.bombs + 1);
        text = '+1 BOMB'; color = 0xffd166; break;
      case 'extra_life':
        s.lives = Math.min(9, s.lives + 1);
        this.hud.triggerScreenFlash(0xffd166, 0.5);
        this.audio.play('extra_life');
        this.killsSinceLife = 0;
        text = '+1 LIFE'; color = 0xffd166; break;
      case 'gem_sm': s.score += 100; text = '+100'; color = 0x66ffe8; break;
      case 'gem_md': s.score += 500; text = '+500'; color = 0xc566ff; break;
      case 'gem_lg': s.score += 2000; text = '+2000'; color = 0xffd166; break;
    }
    if (text) {
      const ft = new FloatingText({ text, color, size: 22, bold: true });
      ft.spawn(x, y - 24, this.world.layers.effectsOver);
      this.world.floats.push(ft);
    }
  }

  /** Switch to the picked-up weapon and apply progression rules.
   *  Returns a short, user-readable string describing what happened. */
  private applyWeaponPickup(id: WeaponId): string {
    const s = this.state;
    s.weapon = id;
    const label = WEAPON_LABELS[id].toUpperCase();
    if (s.levels[id] === 0) {
      // First pickup ever — instantly LV1 (no banking required).
      s.levels[id] = 1;
      s.pickupProgress[id] = 0;
      return `${label} LV 1 ★ NEW!`;
    }
    if (s.levels[id] >= 5) {
      // Already capped — no further progress possible.
      return `${label} LV 5 ★ MAX`;
    }
    // Bank a pickup; every 2 banked = +1 level.
    s.pickupProgress[id] = (s.pickupProgress[id] ?? 0) + 1;
    if (s.pickupProgress[id] >= 2) {
      s.levels[id] = Math.min(5, s.levels[id] + 1);
      s.pickupProgress[id] = 0;
      return `${label} LV ${s.levels[id]} ★ UP`;
    }
    return `${label} LV ${s.levels[id]} (${s.pickupProgress[id]}/2)`;
  }

  /** Find the closest alive enemies within `range` px of (x,y). Used by plasma
   *  arcs and other in-flight effects. Boss counts as a target too. */
  private findArcTargets(x: number, y: number, range: number, limit: number): Array<{ x: number; y: number; id: number; damage: (n: number) => boolean }> {
    const candidates: Array<{ target: { x: number; y: number; id: number; damage: (n: number) => boolean }; d2: number }> = [];
    const maxD2 = range * range;
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < maxD2) candidates.push({ target: e as any, d2 });
    }
    const b = this.world.boss;
    if (b && b.alive && !b.entering && !b.dying) {
      const dx = b.x - x, dy = b.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < maxD2) candidates.push({ target: b as any, d2 });
    }
    candidates.sort((a, b) => a.d2 - b.d2);
    return candidates.slice(0, limit).map((c) => c.target);
  }

  // Re-used scratch buffers for renderWaveArcs() to avoid per-frame allocations.
  private _waveXs: number[] = [];
  private _waveYs: number[] = [];
  private _wavePair: Int32Array = new Int32Array(0);

  /** Each frame: redraw the wave-arc overlay. Wave projectiles in flight
   *  crackle with violet/cyan arcs between nearby charges. Visual only —
   *  no damage (wave already pierces). Pairs each charge with its nearest
   *  neighbour and dedupes via a numeric "this index pairs to i" array. */
  private renderWaveArcs(): void {
    const g = this.waveArcGfx;
    g.clear();
    const xs = this._waveXs;
    const ys = this._waveYs;
    xs.length = 0;
    ys.length = 0;
    const projs = this.world.projectiles;
    for (let k = 0; k < projs.length; k++) {
      const p = projs[k];
      if (p.alive && p.visual === 'wave' && p.owner === 'player') {
        xs.push(p.x);
        ys.push(p.y);
      }
    }
    const n = xs.length;
    if (n < 2) return;
    if (this._wavePair.length < n) this._wavePair = new Int32Array(n + 8);
    const pair = this._wavePair;
    const RANGE2 = 170 * 170;
    for (let i = 0; i < n; i++) {
      let bestJ = -1;
      let bestD = RANGE2;
      const xi = xs[i], yi = ys[i];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dx = xs[j] - xi;
        const dy = ys[j] - yi;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { bestD = d2; bestJ = j; }
      }
      pair[i] = bestJ;
    }
    // Draw each pair once: when i's nearest is j and i < j, OR when i is the
    // nearest of j (mutual) draw with the lower index first.
    for (let i = 0; i < n; i++) {
      const j = pair[i];
      if (j < 0 || j <= i) continue;
      this.drawWaveArc(g, xs[i], ys[i], xs[j], ys[j]);
    }
  }

  // Single scratch buffer for the path vertices in drawWaveArc — reset and
  // reused so each arc costs zero array allocations.
  private _arcPathBuf: number[] = [];

  /** Render a jagged 3-layer arc between two wave charges. */
  private drawWaveArc(g: Graphics, ax: number, ay: number, bx: number, by: number): void {
    const steps = 6;
    const dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy) || 1;
    const ox = -dy / dist, oy = dx / dist;
    const buf = this._arcPathBuf;
    const fillBuf = (jit: number): void => {
      buf.length = 0;
      buf.push(ax, ay);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        const off = (Math.random() - 0.5) * jit;
        buf.push(ax + dx * t + ox * off, ay + dy * t + oy * off);
      }
      buf.push(bx, by);
    };
    const strokePath = (color: number, width: number, alpha: number): void => {
      g.moveTo(buf[0], buf[1]);
      for (let k = 2; k < buf.length; k += 2) g.lineTo(buf[k], buf[k + 1]);
      g.stroke({ color, width, alpha });
    };
    const jit = 6 + dist * 0.04;
    // Outer halo
    fillBuf(jit);
    strokePath(0x9b9bff, 5, 0.35);
    // Mid violet path — also reused for the bright core
    fillBuf(jit * 0.55);
    strokePath(0xc4c4ff, 2.2, 0.7);
    strokePath(0xffffff, 1, 0.95);
    // Endpoint sparkles
    g.circle(ax, ay, 4).fill({ color: 0x9b9bff, alpha: 0.45 });
    g.circle(bx, by, 4).fill({ color: 0x9b9bff, alpha: 0.45 });
    g.circle(ax, ay, 1.8).fill(0xffffff);
    g.circle(bx, by, 1.8).fill(0xffffff);
    // Mid-path random side spark
    if (Math.random() < 0.5) {
      const t = 0.3 + Math.random() * 0.4;
      const sx = ax + dx * t + ox * (Math.random() - 0.5) * jit * 1.4;
      const sy = ay + dy * t + oy * (Math.random() - 0.5) * jit * 1.4;
      g.circle(sx, sy, 1.2).fill(0xffffff);
    }
  }

  /** Draw a small lightning arc from a plasma orb to a target + damage. */
  private plasmaArcTo(fromX: number, fromY: number, target: { x: number; y: number; id: number; damage: (n: number) => boolean }): void {
    const dmgMul = this.state.damageBoostT > 0 ? 2 : 1;
    const dmg = 4 * dmgMul;
    const died = target.damage(dmg);
    if (died) {
      const b = this.world.boss;
      if (b && target.id === b.id) {
        this.onBossDeath(b);
      } else {
        const e = this.world.enemies.find((enemy) => enemy.id === target.id);
        if (e) this.onEnemyDeath(e);
      }
    }
    // Visual: short-lived Graphics overlay drawing a jagged arc.
    const g = new Graphics();
    const steps = 6;
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const ox = -dy / dist, oy = dx / dist;
    const make = (jit: number): Array<[number, number]> => {
      const pts: Array<[number, number]> = [[fromX, fromY]];
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const offs = (Math.random() - 0.5) * jit;
        pts.push([fromX + dx * t + ox * offs, fromY + dy * t + oy * offs]);
      }
      pts.push([target.x, target.y]);
      return pts;
    };
    const outer = make(8);
    const inner = make(4);
    // Outer glow
    g.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length; i++) g.lineTo(outer[i][0], outer[i][1]);
    g.stroke({ color: 0xb8ffb0, width: 5, alpha: 0.35 });
    // Mid
    g.moveTo(inner[0][0], inner[0][1]);
    for (let i = 1; i < inner.length; i++) g.lineTo(inner[i][0], inner[i][1]);
    g.stroke({ color: 0xb8ffb0, width: 2.5, alpha: 0.65 });
    // Core
    g.moveTo(inner[0][0], inner[0][1]);
    for (let i = 1; i < inner.length; i++) g.lineTo(inner[i][0], inner[i][1]);
    g.stroke({ color: 0xffffff, width: 1, alpha: 0.95 });
    // Endpoint sparkle
    g.circle(target.x, target.y, 6).fill({ color: 0xb8ffb0, alpha: 0.4 });
    g.circle(target.x, target.y, 3).fill(0xffffff);
    this.world.layers.projectiles.addChild(g);
    // Schedule destroy 0.1s later via deferred queue (game-time).
    const at = this.world.time + 0.1;
    this.deferredActions.push({ at, fn: () => {
      g.parent?.removeChild(g);
      g.destroy();
    }});
  }

  /** Plasma hit shockwave — visual ring + AoE damage to nearby enemies
   *  (excluding the primary target so the boss isn't double-dipped). */
  private plasmaShockwave(x: number, y: number, dmg: number, primaryId: number): void {
    const a = this.world.atlas.particles;
    // Visual ring
    const ring = this.world.particlePool.spawn({
      texture: this.world.atlas.explosions[0],
      x, y,
      vx: 0, vy: 0,
      life: 0.32,
      scale: 0.3,
      endScale: 1.0,
      blend: 'add',
      tint: 0xb8ffb0,
      alpha: 0.95,
    }, this.world.layers.effectsOver);
    this.world.particles.push(ring);
    // Bright flash core
    const flash = this.world.particlePool.spawn({
      texture: a.softWhite,
      x, y,
      vx: 0, vy: 0,
      life: 0.18,
      scale: 1.5,
      endScale: 0.4,
      blend: 'add',
      tint: 0xb8ffb0,
      alpha: 0.9,
    }, this.world.layers.effectsOver);
    this.world.particles.push(flash);
    // AoE damage to nearby enemies
    const R = 42;
    for (const e of this.world.enemies) {
      if (!e.alive || e.id === primaryId) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const reach = R + e.archetype.radius;
      if (dx * dx + dy * dy < reach * reach) {
        const died = e.damage(dmg);
        if (died) this.onEnemyDeath(e);
      }
    }
  }

  /** Smaller, localised debris (used during cascade so each sub-explosion
   *  also flings chunks). */
  private spawnDebrisChunks(cx: number, cy: number, radius: number, count: number): void {
    const a = this.world.atlas.particles;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      const big = Math.random() < 0.3;
      const p = this.world.particlePool.spawn({
        texture: big ? a.softOrange : a.hardOrange,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.6,
        scale: big ? 1.2 : 0.9,
        endScale: 0.2,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 5,
        tint: big ? 0xff7733 : 0xffaa55,
        drag: 1.5,
        blend: 'add',
      }, this.world.layers.effectsOver);
      this.world.particles.push(p);
    }
    void radius;  // reserved for future scaling
  }

  /** Spawn chunky debris radiating outward from the boss centre. */
  private spawnBossDebris(cx: number, cy: number, radius: number): void {
    const a = this.world.atlas.particles;
    const N = 22;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 120 + Math.random() * 220;
      const big = i % 3 === 0;
      const p = this.world.particlePool.spawn({
        texture: big ? a.softOrange : a.hardOrange,
        x: cx + Math.cos(angle) * radius * 0.3,
        y: cy + Math.sin(angle) * radius * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.6,
        scale: big ? 1.6 : 1.0,
        endScale: 0.2,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 4,
        tint: big ? 0xff7733 : 0xffaa55,
        drag: 1.2,
        blend: 'add',
      }, this.world.layers.effectsOver);
      this.world.particles.push(p);
    }
    // Bright smoke ring
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const p = this.world.particlePool.spawn({
        texture: a.softOrange,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        life: 1.6,
        scale: 1.2,
        endScale: 3.0,
        tint: 0x2a1a14,
        alpha: 0.6,
        drag: 0.8,
      }, this.world.layers.effectsOver);
      this.world.particles.push(p);
    }
  }

  /** Choose which weapon to drop, weighted inversely to its current level so
   *  rarely-seen weapons fall more often and maxed-out ones almost never. */
  private pickWeightedWeaponDrop(): string {
    const weapons: WeaponId[] = ['pulse', 'spread', 'plasma', 'missiles', 'wave', 'lightning'];
    const weights = weapons.map((w) => Math.max(0.4, 5 - this.state.levels[w]));
    let total = 0;
    for (const w of weights) total += w;
    let r = Math.random() * total;
    for (let i = 0; i < weapons.length; i++) {
      r -= weights[i];
      if (r <= 0) return `w_${weapons[i]}`;
    }
    return `w_${weapons[0]}`;
  }

  private isHealthDrop(key: string | null): boolean {
    return key === 'health_s' || key === 'health_l';
  }

  private isWeaponDrop(key: string | null): boolean {
    return key !== null && key.startsWith('w_');
  }

  // ----- death handlers -----
  private onEnemyDeath(e: Enemy): void {
    explosion(this.world, e.x, e.y, e.archetype.radius >= 30 ? 'md' : 'sm');
    this.state.score += e.archetype.scoreValue;
    this.killsSinceHealth++;
    this.killsSinceWeapon++;
    let key = rollLoot(e.archetype.loot);
    if (this.isHealthDrop(key) && this.killsSinceHealth < 4) key = 'gem_sm';
    if (this.isWeaponDrop(key) && this.killsSinceWeapon < 5) key = 'gem_md';
    if (this.killsSinceWeapon >= 14 && !this.isWeaponDrop(key)) key = this.pickWeightedWeaponDrop();
    // Guaranteed-something fallback: late-game enemies have more HP, so per
    // minute kill counts are lower. Forcing at least a small gem on every
    // kill keeps the visible drop rate flat across all 20 game levels.
    if (!key) key = 'gem_sm';
    // Re-roll any weapon drop through the inverse-level pool — variety.
    if (key.startsWith('w_')) key = this.pickWeightedWeaponDrop();
    // Pity health — guarantee a health pickup every ~12 kills regardless of
    // which archetype died (so drone-heavy levels don't starve the player).
    if (this.killsSinceHealth >= 12 && key !== 'health_s' && key !== 'health_l') {
      key = 'health_s';
    }
    if (key === 'health_s' || key === 'health_l') this.killsSinceHealth = 0;
    if (key.startsWith('w_')) this.killsSinceWeapon = 0;
    // Rare 1-up substitution. Only swaps a gem (never a health/weapon/utility
    // drop), only on enemies that scored ≥120 (drone/scout/kamikaze excluded
    // so the 1-up rate doesn't pile up on swarm levels), and only if the
    // player isn't already capped at 9 lives. Probability ramps with the pity
    // counter so a 1-up turns up at least once per ~3–4 levels of dense play.
    this.killsSinceLife++;
    if (
      this.state.lives < 9 &&
      e.archetype.scoreValue >= 120 &&
      (key === 'gem_sm' || key === 'gem_md' || key === 'gem_lg')
    ) {
      const base = 0.006; // ≈1 per ~170 qualifying kills
      const pity = Math.max(0, this.killsSinceLife - 220) * 0.0008; // soft ramp
      if (Math.random() < base + pity) {
        key = 'extra_life';
      }
    }
    if (this.atlas.drops[key]) {
      const drift = (Math.random() - 0.5) * 30;
      const drop = this.world.dropPool.spawn(key as any, e.x, e.y, this.atlas.drops[key], this.world.layers.entities, drift);
      this.world.drops.push(drop);
    }
  }

  private onBossDeath(b: Boss): void {
    if (b.deathHandled) return;
    b.deathHandled = true;
    const bx = b.x, by = b.y, r = b.radius;
    const now = this.world.time;

    // INSTANT explosion — three overlapping large blasts + huge debris cloud +
    // screen flash + max shake. The boss sprite snaps invisible at the same
    // moment (Boss.postUpdateVisual sets alpha=0 once dying flag fires).
    explosion(this.world, bx, by, 'lg');
    explosion(this.world, bx - r * 0.4, by - r * 0.3, 'lg');
    explosion(this.world, bx + r * 0.4, by + r * 0.3, 'lg');
    this.hud.triggerScreenFlash(0xffd166, 0.85);
    this.world.screenShake = Math.max(this.world.screenShake, 42);
    this.spawnBossDebris(bx, by, r);
    this.spawnDebrisChunks(bx, by, r, 12);

    // Short reverb tail — a handful of smaller secondary blasts spread over
    // ~0.6s for "the dust settling". No long cascade, no boss visible.
    for (let i = 0; i < 6; i++) {
      const at = now + 0.08 + i * 0.1;
      const dx = (Math.random() - 0.5) * r * 1.8;
      const dy = (Math.random() - 0.5) * r * 1.8;
      const size: 'sm' | 'md' = i % 2 === 0 ? 'md' : 'sm';
      this.deferredActions.push({ at, fn: () => {
        explosion(this.world, bx + dx, by + dy, size);
        this.spawnDebrisChunks(bx + dx, by + dy, r, 2);
      }});
    }

    this.state.score += b.spec.scoreValue;
    // Boss 1-up policy: milestone bosses (levels 5/10/15/20) always grant a
    // 1-up; other bosses roll for it at ~25%. Either way, capped at lives < 9.
    const lvl = this.state.level;
    const milestone = lvl === 5 || lvl === 10 || lvl === 15 || lvl === 20;
    const loot = b.spec.loot ? b.spec.loot.slice() : [];
    if (this.state.lives < 9 && (milestone || Math.random() < 0.25)) {
      loot.push('extra_life');
    }
    // Drops — slow drift so they linger on screen ~3× longer than before.
    // Boost both `life` and `blinkFrom` so age-cap doesn't trim the slow fall.
    if (loot.length > 0) {
      for (let i = 0; i < loot.length; i++) {
        let k = loot[i];
        if (k.startsWith('w_')) k = this.pickWeightedWeaponDrop();
        const tex = this.atlas.drops[k];
        if (!tex) continue;
        const drop = this.world.dropPool.spawn(k as any, b.x + (i - loot.length / 2) * 36, b.y + 20, tex, this.world.layers.entities, (Math.random() - 0.5) * 30);
        drop.vy = 55 + Math.random() * 20;   // ~1/3 of the prior boss-drop fall speed
        drop.life = 45;                       // 3× default 15s
        drop.blinkFrom = 38;                  // 3× default 12s
        this.world.drops.push(drop);
      }
    }
    this.world.boss = b; // keep until dying animation finishes; cullDead handles it
  }

  private onLevelClear(): void {
    this.hud.showAnnouncement('LEVEL CLEARED', `Score ${this.state.score}`, 3.0);
    this.audio.play('level_clear');
    // Slow down briefly, then advance
    this.pendingNextLevel = this.state.level + 1;
    this.pendingNextDelay = 4.0;
  }

  private onPlayerDeath(): void {
    if (this.pendingGameOver) return;
    explosion(this.world, this.world.player.x, this.world.player.y, 'lg');
    this.world.player.detach();
    this.state.lives = Math.max(0, this.state.lives - 1);
    // All weapon levels reset on death — fresh start for the next life.
    resetWeaponsOnDeath(this.state);
    if (this.state.lives > 0) {
      this.world.player.alive = false;
      this.respawnDelay = 1.6;
      return;
    }
    this.pendingGameOver = true;
    this.pendingGameOverDelay = 2.5;
  }

  private onBossSpawned(_b: Boss): void {
    this.hud.showAnnouncement('!!! BOSS !!!', _b.spec.name, 2.5);
  }

  private onCampaignComplete(): void {
    this.showVictory();
  }

  // ----- cleanup -----
  private cullDead(): void {
    for (let i = this.world.projectiles.length - 1; i >= 0; i--) {
      const p = this.world.projectiles[i];
      if (!p.alive) {
        this.world.projectilePool.release(p);
        this.world.projectiles.splice(i, 1);
      }
    }
    for (let i = this.world.enemies.length - 1; i >= 0; i--) {
      const e = this.world.enemies[i];
      if (!e.alive) {
        this.world.enemyPool.release(e);
        this.world.enemies.splice(i, 1);
      }
    }
    for (let i = this.world.drops.length - 1; i >= 0; i--) {
      const d = this.world.drops[i];
      if (!d.alive) {
        this.world.dropPool.release(d);
        this.world.drops.splice(i, 1);
      }
    }
    for (let i = this.world.particles.length - 1; i >= 0; i--) {
      const p = this.world.particles[i];
      if (!p.alive) {
        this.world.particlePool.release(p);
        this.world.particles.splice(i, 1);
      }
    }
    for (let i = this.world.floats.length - 1; i >= 0; i--) {
      const f = this.world.floats[i];
      if (!f.alive) {
        f.detach();
        this.world.floats.splice(i, 1);
      }
    }
    if (this.world.boss && !this.world.boss.alive) {
      this.world.boss.detach();
      this.world.boss = null;
    }
  }

  private advanceToLevel(level: number): void {
    if (level > 20) {
      this.onCampaignComplete();
      return;
    }
    // Clear residue from previous level. Drops are KEPT so any still-falling
    // boss loot can still be picked up after the transition.
    for (const e of this.world.enemies) { e.alive = false; }
    for (const p of this.world.projectiles) { p.alive = false; }
    this.deferredActions.length = 0;  // pending boss-death actions are stale now
    this.cullDead();
    // Score bonus
    this.state.score += 1000;
    this.startLevelFlow(level);
  }

  // ----- pause and end overlays -----
  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.pauseOverlay.visible = paused;
  }

  private buildPauseOverlay(): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.65 });
    c.addChild(bg);
    const title = makeText('PAUSED', 64, 0xffffff, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, true);
    c.addChild(title);
    const hint = makeText('Press ESC to resume', 22, 0xa3c8ff, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, true);
    c.addChild(hint);
    const ctrl = makeText('WASD/Arrows  Move    Space  Fire    X/Shift  Bomb', 18, 0x6a93c4, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, true);
    c.addChild(ctrl);
    return c;
  }

  private showGameOver(): void {
    if (this.endOverlay) return;
    stopMusic();
    this.audio.play('game_over');
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.7 });
    c.addChild(bg);
    c.addChild(makeText('GAME OVER', 78, 0xff6644, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, true));
    c.addChild(makeText(`Final Score: ${this.state.score}`, 26, 0xffffff, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, true));
    c.addChild(makeText('Press ENTER to retry — ESC for menu', 20, 0xa3c8ff, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, true));
    this.stage.addChild(c);
    this.endOverlay = c;
    this.handleEndInput = (): void => {
      if (Input.wasPressed('confirm')) {
        this.manager.switchTo(new GameScene(this.atlas, this.audio, 1));
      } else if (Input.wasPressed('cancel') || Input.wasPressed('pause')) {
        // Need MenuScene to be imported lazily to avoid cycle
        import('./MenuScene').then(({ MenuScene }) => {
          this.manager.switchTo(new MenuScene(this.atlas, this.audio));
        });
      }
    };
  }

  private showVictory(): void {
    if (this.endOverlay) return;
    stopMusic();
    this.audio.play('level_clear');
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.75 });
    c.addChild(bg);
    c.addChild(makeText('CAMPAIGN COMPLETE', 64, 0xffd166, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, true));
    c.addChild(makeText(`Final Score: ${this.state.score}`, 26, 0xffffff, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, true));
    c.addChild(makeText('Press ENTER to play again — ESC for menu', 20, 0xa3c8ff, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, true));
    this.stage.addChild(c);
    this.endOverlay = c;
    this.handleEndInput = (): void => {
      if (Input.wasPressed('confirm')) {
        this.manager.switchTo(new GameScene(this.atlas, this.audio, 1));
      } else if (Input.wasPressed('cancel') || Input.wasPressed('pause')) {
        import('./MenuScene').then(({ MenuScene }) => {
          this.manager.switchTo(new MenuScene(this.atlas, this.audio));
        });
      }
    };
  }

  // End-screen input dispatcher (set by showGameOver/showVictory)
  private handleEndInput: () => void = () => {};
}

// Helper to make a centered text quickly.
function makeText(text: string, size: number, color: number, x: number, y: number, bold = false): Text {
  const style = new TextStyle({
    fontFamily: 'sans-serif',
    fontSize: size,
    fill: color,
    fontWeight: bold ? 'bold' : 'normal',
    stroke: { color: 0x000000, width: 3 },
  });
  const t = new Text({ text, style });
  t.anchor.set(0.5);
  t.position.set(x, y);
  return t;
}
