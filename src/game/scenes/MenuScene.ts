import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { Scene } from '../../engine/scene';
import { GAME_HEIGHT, GAME_WIDTH } from '../../engine/constants';
import { Input } from '../../engine/input';
import { startMusic, stopMusic } from '../../engine/audio';
import type { Atlas } from '../art/atlas';
import type { Audio } from '../world';
import { Background } from '../background/Background';
import { GameScene } from './GameScene';

export class MenuScene extends Scene {
  atlas: Atlas;
  audio: Audio;
  background: Background | null = null;
  shipSprite!: Sprite;
  blinkTimer = 0;
  prompt!: Text;
  scrollTime = 0;
  // Demo enemies for visual flair
  demoSprites: Array<{ s: Sprite; vy: number; vx: number; phase: number }> = [];
  demoTimer = 0;

  constructor(atlas: Atlas, audio: Audio) {
    super();
    this.atlas = atlas;
    this.audio = audio;
  }

  override enter(): void {
    Input.clearAll();
    const layers = {
      bgFar: new Container(),
      bgMid: new Container(),
      bgNear: new Container(),
    };
    this.stage.addChild(layers.bgFar);
    this.stage.addChild(layers.bgMid);
    this.stage.addChild(layers.bgNear);

    this.background = new Background(this.atlas, layers);
    this.background.loadLevel(1, {
      planets: [{ planetIndex: 0, speed: 30, x: GAME_WIDTH - 220, spawnAt: 0 }, { planetIndex: 7, speed: 25, x: 200, spawnAt: 6 }],
      bases: [],
    });

    // Title text
    const titleStyle = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 96,
      fontWeight: '900',
      letterSpacing: 6,
      fill: 0xfff5a3,
      stroke: { color: 0x6b3010, width: 6 },
      dropShadow: { color: 0x000000, alpha: 0.7, blur: 8, distance: 0 },
    });
    const title = new Text({ text: 'SPACE WARRIOR', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(GAME_WIDTH / 2, 220);
    this.stage.addChild(title);

    const subStyle = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 22,
      fontWeight: 'bold',
      letterSpacing: 4,
      fill: 0xa3c8ff,
    });
    const sub = new Text({ text: 'STELLAR DEFENSE FORCE  ·  CAMPAIGN 01', style: subStyle });
    sub.anchor.set(0.5);
    sub.position.set(GAME_WIDTH / 2, 280);
    this.stage.addChild(sub);

    // Player ship demo
    this.shipSprite = new Sprite(this.atlas.player);
    this.shipSprite.anchor.set(0.5);
    this.shipSprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.62);
    this.shipSprite.scale.set(1.4);
    this.stage.addChild(this.shipSprite);

    // Prompt
    const promptStyle = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 28,
      fontWeight: 'bold',
      fill: 0xffffff,
      letterSpacing: 3,
    });
    this.prompt = new Text({ text: 'PRESS ENTER TO START', style: promptStyle });
    this.prompt.anchor.set(0.5);
    this.prompt.position.set(GAME_WIDTH / 2, GAME_HEIGHT - 160);
    this.stage.addChild(this.prompt);

    // Controls hint
    const ctrlStyle = new TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0x6a93c4,
      letterSpacing: 2,
    });
    const ctrl = new Text({
      text: 'WASD / Arrows : MOVE      SPACE : FIRE      X / Shift : BOMB      ESC : PAUSE      GAMEPAD : STICK + Ⓐ FIRE · Ⓑ BOMB · ☰ PAUSE',
      style: ctrlStyle,
    });
    ctrl.anchor.set(0.5);
    ctrl.position.set(GAME_WIDTH / 2, GAME_HEIGHT - 50);
    this.stage.addChild(ctrl);

    startMusic('earth');
  }

  override exit(): void {
    stopMusic();
    if (this.background) this.background.destroy();
    this.stage.destroy({ children: true });
  }

  override update(dt: number): void {
    if (this.background) this.background.update(dt);
    this.scrollTime += dt;
    // Bob ship
    this.shipSprite.position.y = GAME_HEIGHT * 0.62 + Math.sin(this.scrollTime * 1.5) * 12;
    this.shipSprite.rotation = Math.sin(this.scrollTime * 1.1) * 0.06;

    // Prompt blink
    this.blinkTimer += dt;
    this.prompt.alpha = 0.7 + 0.3 * Math.sin(this.blinkTimer * 3);

    if (Input.wasPressed('confirm') || Input.wasPressed('fire')) {
      this.audio.play('ui_select');
      this.manager.switchTo(new GameScene(this.atlas, this.audio, 1));
    }

    Input.endFrame();
  }
}
