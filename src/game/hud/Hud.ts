import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import type { Atlas } from '../art/atlas';
import { GAME_HEIGHT, GAME_WIDTH } from '../../engine/constants';
import type { World } from '../world';
import { WEAPON_LABELS } from '../weapons/types';

const labelStyle = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 14,
  fill: 0xcde5ff,
  letterSpacing: 1,
  fontWeight: 'bold',
});
const valueStyle = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 18,
  fill: 0xffffff,
  fontWeight: 'bold',
});
const announceStyle = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 52,
  fill: 0xffffff,
  align: 'center',
  fontWeight: 'bold',
  stroke: { color: 0x000000, width: 4 },
  dropShadow: { color: 0x000000, alpha: 0.6, blur: 6, distance: 0 },
});
const subAnnounce = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 22,
  fill: 0xa3c8ff,
  fontWeight: 'bold',
});

export class Hud {
  layer: Container;
  hpBarFill: Graphics;
  hpBarBg: Graphics;
  hpText: Text;
  scoreText: Text;
  levelText: Text;
  timeText: Text;
  weaponIcon: Sprite;
  weaponLabel: Text;
  weaponLevel: Text;
  weaponPips: Graphics;
  bombText: Text;
  livesText: Text;
  bossBarBg: Graphics;
  bossBarFill: Graphics;
  bossName: Text;
  announceText: Text;
  announceSub: Text;
  damageFlash: Graphics;
  laserHeatBar: Graphics;
  atlas: Atlas;

  constructor(layer: Container, atlas: Atlas) {
    this.layer = layer;
    this.atlas = atlas;

    this.damageFlash = new Graphics();
    layer.addChild(this.damageFlash);

    // HP
    this.hpBarBg = new Graphics();
    this.hpBarBg.roundRect(0, 0, 240, 18, 4).fill({ color: 0x000000, alpha: 0.55 });
    this.hpBarBg.position.set(20, 22);
    layer.addChild(this.hpBarBg);
    this.hpBarFill = new Graphics();
    this.hpBarFill.position.set(20, 22);
    layer.addChild(this.hpBarFill);
    const hpLabel = new Text({ text: 'HULL', style: labelStyle });
    hpLabel.position.set(20, 4);
    layer.addChild(hpLabel);
    this.hpText = new Text({ text: '100', style: valueStyle });
    this.hpText.position.set(270, 18);
    layer.addChild(this.hpText);

    this.laserHeatBar = new Graphics();
    this.laserHeatBar.position.set(20, 44);
    layer.addChild(this.laserHeatBar);

    // Score / Level / Time (top-right)
    this.scoreText = new Text({ text: 'SCORE  0', style: valueStyle });
    this.scoreText.anchor.set(1, 0);
    this.scoreText.position.set(GAME_WIDTH - 20, 4);
    layer.addChild(this.scoreText);
    this.levelText = new Text({ text: 'LEVEL 1', style: labelStyle });
    this.levelText.anchor.set(1, 0);
    this.levelText.position.set(GAME_WIDTH - 20, 30);
    layer.addChild(this.levelText);
    this.timeText = new Text({ text: '00:00', style: labelStyle });
    this.timeText.anchor.set(1, 0);
    this.timeText.position.set(GAME_WIDTH - 20, 48);
    layer.addChild(this.timeText);

    // Weapon (bottom-left)
    this.weaponIcon = new Sprite(atlas.drops.w_pulse);
    this.weaponIcon.anchor.set(0.5);
    this.weaponIcon.position.set(38, GAME_HEIGHT - 30);
    layer.addChild(this.weaponIcon);
    this.weaponLabel = new Text({ text: 'PULSE GUN', style: labelStyle });
    this.weaponLabel.position.set(62, GAME_HEIGHT - 42);
    layer.addChild(this.weaponLabel);
    this.weaponLevel = new Text({ text: 'LV 1', style: valueStyle });
    this.weaponLevel.position.set(62, GAME_HEIGHT - 24);
    layer.addChild(this.weaponLevel);
    // Pickup-progress pips: 2 small circles shown next to LV text
    this.weaponPips = new Graphics();
    this.weaponPips.position.set(115, GAME_HEIGHT - 13);
    layer.addChild(this.weaponPips);

    // Bombs / Lives (bottom-right)
    this.bombText = new Text({ text: 'BOMB 2', style: valueStyle });
    this.bombText.anchor.set(1, 0);
    this.bombText.position.set(GAME_WIDTH - 20, GAME_HEIGHT - 42);
    layer.addChild(this.bombText);
    this.livesText = new Text({ text: 'LIVES 3', style: valueStyle });
    this.livesText.anchor.set(1, 0);
    this.livesText.position.set(GAME_WIDTH - 20, GAME_HEIGHT - 22);
    layer.addChild(this.livesText);

    // Boss bar
    this.bossBarBg = new Graphics();
    this.bossBarBg.position.set(GAME_WIDTH / 2 - 300, 70);
    layer.addChild(this.bossBarBg);
    this.bossBarFill = new Graphics();
    this.bossBarFill.position.set(GAME_WIDTH / 2 - 300, 70);
    layer.addChild(this.bossBarFill);
    this.bossName = new Text({ text: '', style: labelStyle });
    this.bossName.anchor.set(0.5, 1);
    this.bossName.position.set(GAME_WIDTH / 2, 66);
    layer.addChild(this.bossName);
    this.setBossBarVisible(false);

    // Announce text (center)
    this.announceText = new Text({ text: '', style: announceStyle });
    this.announceText.anchor.set(0.5);
    this.announceText.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    this.announceText.alpha = 0;
    layer.addChild(this.announceText);
    this.announceSub = new Text({ text: '', style: subAnnounce });
    this.announceSub.anchor.set(0.5);
    this.announceSub.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
    this.announceSub.alpha = 0;
    layer.addChild(this.announceSub);
  }

  setBossBarVisible(v: boolean): void {
    this.bossBarBg.visible = v;
    this.bossBarFill.visible = v;
    this.bossName.visible = v;
  }

  showAnnouncement(big: string, small = '', duration = 2.5): void {
    this.announceText.text = big;
    this.announceSub.text = small;
    this.announceState = { t: 0, duration };
  }

  private announceState: { t: number; duration: number } | null = null;
  private flashState: { t: number; max: number; color: number } | null = null;

  triggerDamageFlash(intensity = 1): void {
    this.flashState = { t: 0, max: 0.4, color: 0xff3344 };
  }

  triggerHealFlash(): void {
    this.flashState = { t: 0, max: 0.3, color: 0x44ff77 };
  }

  triggerScreenFlash(color = 0xffffff, max = 0.5): void {
    this.flashState = { t: 0, max, color };
  }

  // Dirty-tracking: HUD Graphics used to be cleared and rebuilt every frame
  // even when nothing changed — each rebuild re-tessellates and re-uploads.
  private lastHpPct = -1;
  private lastPipsKey = '';
  private lastBossPct = -1;

  update(dt: number, world: World): void {
    // HP bar — redraw only when the visible width would change (~1px steps).
    const pct = Math.max(0, world.player.hp / world.player.maxHp);
    const qpct = Math.round(pct * 240) / 240;
    if (qpct !== this.lastHpPct) {
      this.lastHpPct = qpct;
      this.hpBarFill.clear();
      const w = 240 * qpct;
      const col = qpct > 0.5 ? 0x44ffa4 : qpct > 0.25 ? 0xffd166 : 0xff5050;
      this.hpBarFill.roundRect(0, 0, w, 18, 4).fill({ color: col, alpha: 0.95 });
      this.hpBarFill.roundRect(0, 0, w, 6, 4).fill({ color: 0xffffff, alpha: 0.18 });
    }
    this.hpText.text = `${Math.ceil(world.player.hp)} / 100`;

    // Score / level / time
    this.scoreText.text = `SCORE  ${world.state.score}`;
    this.levelText.text = `LEVEL ${world.state.level}`;
    const t = Math.floor(world.time);
    this.timeText.text = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

    // Weapon
    const wkey = `w_${world.state.weapon}`;
    if (this.weaponIcon.texture !== this.atlas.drops[wkey]) {
      this.weaponIcon.texture = this.atlas.drops[wkey];
    }
    this.weaponLabel.text = WEAPON_LABELS[world.state.weapon].toUpperCase();
    const lv = world.state.levels[world.state.weapon];
    this.weaponLevel.text = `LV ${lv}`;
    // Pickup progress pips — 2 circles. Hidden at MAX (LV5).
    const pipsKey = `${lv}-${world.state.pickupProgress[world.state.weapon] ?? 0}`;
    if (pipsKey !== this.lastPipsKey) {
      this.lastPipsKey = pipsKey;
      this.weaponPips.clear();
      if (lv > 0 && lv < 5) {
        const filled = world.state.pickupProgress[world.state.weapon] ?? 0;
        for (let i = 0; i < 2; i++) {
          const x = i * 10;
          this.weaponPips.circle(x, 0, 3).stroke({ color: 0xc4e2ff, width: 1.4, alpha: 0.85 });
          if (i < filled) {
            this.weaponPips.circle(x, 0, 2.4).fill(0xc4e2ff);
          }
        }
      } else if (lv >= 5) {
        // Show a small "MAX" dot
        this.weaponPips.circle(0, 0, 3).fill(0xffd166);
        this.weaponPips.circle(5, 0, 3).fill(0xffd166);
      }
    }

    // Bombs / lives
    this.bombText.text = `BOMB ${world.state.bombs}`;
    this.livesText.text = `LIVES ${world.state.lives}`;

    // Boss bar
    if (world.boss && world.boss.alive) {
      this.setBossBarVisible(true);
      const bpct = Math.round(Math.max(0, world.boss.hp / world.boss.maxHp) * 600) / 600;
      if (bpct !== this.lastBossPct) {
        this.lastBossPct = bpct;
        this.bossBarBg.clear();
        this.bossBarBg.roundRect(0, 0, 600, 14, 4).fill({ color: 0x000000, alpha: 0.55 });
        this.bossBarFill.clear();
        this.bossBarFill.roundRect(0, 0, 600 * bpct, 14, 4).fill({ color: 0xff6644 });
        this.bossBarFill.roundRect(0, 0, 600 * bpct, 4, 4).fill({ color: 0xffffff, alpha: 0.25 });
      }
      this.bossName.text = world.boss.spec.name.toUpperCase();
    } else {
      this.setBossBarVisible(false);
    }

    // Announce fade
    if (this.announceState) {
      this.announceState.t += dt;
      const t = this.announceState.t / this.announceState.duration;
      let a = 1;
      if (t < 0.2) a = t / 0.2;
      else if (t > 0.7) a = Math.max(0, 1 - (t - 0.7) / 0.3);
      this.announceText.alpha = a;
      this.announceSub.alpha = a * 0.9;
      if (t >= 1) {
        this.announceState = null;
        this.announceText.alpha = 0;
        this.announceSub.alpha = 0;
      }
    }

    // Damage flash full-screen
    this.damageFlash.clear();
    if (this.flashState) {
      this.flashState.t += dt;
      const t = this.flashState.t / this.flashState.max;
      if (t >= 1) {
        this.flashState = null;
      } else {
        const a = (1 - t) * 0.45;
        this.damageFlash.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: this.flashState.color, alpha: a });
      }
    }
  }
}
