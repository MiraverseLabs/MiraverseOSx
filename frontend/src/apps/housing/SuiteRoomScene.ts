import Phaser from 'phaser';
import { SUITE_AREAS, SUITE_ART, SUITE_HEIGHT, SUITE_LIGHTING, SUITE_WIDTH, type SuiteSceneState } from './suiteSceneModel';
import type { HomeArea } from '../../gameplay/Housing';

export function createSuiteRoom(
  parent: HTMLElement,
  initial: SuiteSceneState,
  onSelect: (area: HomeArea) => void,
  onReady: () => void,
  onError: () => void,
) {
  let current = initial;
  let scene: Room | undefined;
  let stopped = false;
  let paused = false;

  class Room extends Phaser.Scene {
    artwork!: Phaser.GameObjects.Image;
    shade!: Phaser.GameObjects.Rectangle;
    colorWash!: Phaser.GameObjects.Rectangle;
    windowLight!: Phaser.GameObjects.Image;
    lampLight!: Phaser.GameObjects.Image;
    selection!: Phaser.GameObjects.Graphics;
    dust: { sprite: Phaser.GameObjects.Ellipse; phase: number; baseY: number }[] = [];
    hovered: HomeArea | null = null;

    preload() {
      this.load.image('suite-room', SUITE_ART);
      this.load.once('loaderror', () => { if (!stopped) onError(); });
    }

    create() {
      if (stopped || !this.textures.exists('suite-room')) return;
      scene = this;
      this.artwork = this.add.image(0, 0, 'suite-room').setOrigin(0).setDisplaySize(SUITE_WIDTH, SUITE_HEIGHT);
      for (const [key, rgb] of [['suite-window-light', '190,217,255'], ['suite-lamp-light', '255,196,112']]) {
        const glow = this.textures.createCanvas(key, 256, 256);
        if (glow) {
          const context = glow.context;
          const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
          gradient.addColorStop(0, `rgba(${rgb},.75)`);
          gradient.addColorStop(.35, `rgba(${rgb},.22)`);
          gradient.addColorStop(1, `rgba(${rgb},0)`);
          context.fillStyle = gradient;
          context.fillRect(0, 0, 256, 256);
          glow.refresh();
        }
      }
      this.shade = this.add.rectangle(0, 0, SUITE_WIDTH, SUITE_HEIGHT, 0x101c30).setOrigin(0);
      this.colorWash = this.add.rectangle(0, 0, SUITE_WIDTH, SUITE_HEIGHT).setOrigin(0);
      this.windowLight = this.add.image(1120, 200, 'suite-window-light').setDisplaySize(780, 710);
      this.lampLight = this.add.image(170, 345, 'suite-lamp-light').setDisplaySize(380, 330);
      this.selection = this.add.graphics();
      for (let index = 0; index < 18; index++) {
        const x = 790 + (index * 71 % 500), y = 250 + (index * 43 % 390);
        this.dust.push({ sprite: this.add.ellipse(x, y, 2 + index % 2, 2 + index % 2, 0xffedca, .18), phase: index * 1.7, baseY: y });
      }
      for (const area of SUITE_AREAS) {
        this.add.zone(area.x * SUITE_WIDTH, area.y * SUITE_HEIGHT, area.width * SUITE_WIDTH, area.height * SUITE_HEIGHT)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => { this.hovered = area.id; this.drawSelection(); })
          .on('pointerout', () => { this.hovered = null; this.drawSelection(); })
          .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.event.target === this.game.canvas) onSelect(area.id);
          });
      }
      this.applyState();
      // Scene readiness is later than Game's ready event: textures and input are now available.
      onReady();
      if (paused) this.game.pause();
    }

    drawSelection() {
      this.selection.clear();
      const target = SUITE_AREAS.find(area => area.id === (this.hovered ?? current.area))!;
      const x = (target.x - target.width / 2) * SUITE_WIDTH;
      const y = (target.y - target.height / 2) * SUITE_HEIGHT;
      const right = x + target.width * SUITE_WIDTH, bottom = y + target.height * SUITE_HEIGHT;
      const length = 23;
      this.selection.lineStyle(2, 0xffefd0, this.hovered ? .9 : .5);
      for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [right, y, -1, 1], [x, bottom, 1, -1], [right, bottom, -1, -1]]) {
        this.selection.lineBetween(cx, cy + length * sy, cx, cy);
        this.selection.lineBetween(cx, cy, cx + length * sx, cy);
      }
    }

    applyState() {
      const lighting = SUITE_LIGHTING[current.ambiance];
      this.colorWash.setFillStyle(lighting.tint, current.ambiance === 'starlight' ? .13 : .045);
      this.shade.setAlpha(lighting.shade);
      this.windowLight.setAlpha(current.ambiance === 'morning' ? .22 : .09);
      this.lampLight.setAlpha(lighting.glow + (current.installed.includes('aura_lamp') ? .15 : 0));
      this.dust.forEach(item => item.sprite.setVisible(!current.reducedMotion));
      const frameLimit = current.reducedMotion ? 12 : 24;
      if (this.game.loop.started && this.game.loop.fpsLimit !== frameLimit) this.game.loop.setFPSLimit(frameLimit);
      this.drawSelection();
    }

    update(time: number) {
      if (current.reducedMotion) return;
      for (const mote of this.dust) {
        mote.sprite.y = mote.baseY + Math.sin(time / 6500 + mote.phase) * 18;
        mote.sprite.setAlpha(.09 + (Math.sin(time / 3000 + mote.phase) + 1) * .06);
      }
    }
  }

  const game = new Phaser.Game({
    // This illustrated scene needs no WebGL shaders; Canvas also works on software-rendered devices.
    type: Phaser.CANVAS, parent, width: SUITE_WIDTH, height: SUITE_HEIGHT,
    backgroundColor: '#242d2c', transparent: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: SUITE_WIDTH, height: SUITE_HEIGHT },
    fps: { target: 24, limit: initial.reducedMotion ? 12 : 24 }, audio: { noAudio: true }, scene: Room,
    // Phaser lives inside a scrollable application: DOM controls must never select room zones.
    input: { windowEvents: false, mouse: { preventDefaultWheel: false }, touch: { capture: false } },
    render: { antialias: true, pixelArt: false },
  });
  const refreshBounds = () => { if (!stopped && game.isBooted) game.scale.updateBounds(); };
  window.addEventListener('scroll', refreshBounds, true);
  parent.addEventListener('pointerdown', refreshBounds, true);

  return {
    update(state: SuiteSceneState) { current = state; scene?.applyState(); },
    setPaused(value: boolean) {
      paused = value;
      if (!scene || stopped) return;
      if (value) game.pause(); else game.resume();
    },
    destroy() {
      stopped = true;
      window.removeEventListener('scroll', refreshBounds, true);
      parent.removeEventListener('pointerdown', refreshBounds, true);
      game.destroy(true); scene = undefined;
    },
  };
}
