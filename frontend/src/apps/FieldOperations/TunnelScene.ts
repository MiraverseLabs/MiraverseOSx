import Phaser from 'phaser';
import { FIELD_TARGETS, type FieldSession } from '../../gameplay/FieldOperations';
import { TUNNEL_ART, targetLocked, targetRecorded } from './fieldPresentation';

const SCENE_WIDTH = 960;
const SCENE_HEIGHT = 600;

interface TargetMarker {
  id: string;
  x: number;
  y: number;
  number: string;
  label: string;
  pillBg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  reticle: Phaser.GameObjects.Graphics;
  beacon: Phaser.GameObjects.Arc;
}

export function createTunnelGame(
  parent: HTMLElement,
  initial: FieldSession,
  onMove: (x: number, y: number) => void,
  onInspect: (id: string) => void,
  onReady: () => void,
  onError: () => void,
  initialReducedMotion: boolean,
  initialSelected = 'relay',
) {
  let scene: TunnelScene | undefined;
  let current = initial;
  let selectedId = initialSelected;
  let reducedMotion = initialReducedMotion;
  let stopped = false;
  let paused = false;

  class TunnelScene extends Phaser.Scene {
    avatar!: Phaser.GameObjects.Container;
    lamp!: Phaser.GameObjects.Triangle;
    bodyGroup!: Phaser.GameObjects.Container;
    destination: { x: number; y: number; id?: string } | null = null;
    keys = new Set<string>();
    markers: TargetMarker[] = [];
    hoveredId: string | null = null;
    elapsed = 0;
    walkPhase = 0;
    facingAngle = 0;
    path!: Phaser.GameObjects.Graphics;
    sealOverlay!: Phaser.GameObjects.Graphics;
    dust: { sprite: Phaser.GameObjects.Ellipse; baseY: number; phase: number }[] = [];
    artLoaded = false;

    preload() {
      this.load.image('tunnel-environment', TUNNEL_ART);
      this.load.on('filecomplete-image-tunnel-environment', () => {
        this.artLoaded = true;
      });
      this.load.once('loaderror', () => {
        this.artLoaded = false;
      });
    }

    create() {
      if (stopped) return;
      scene = this;

      if (this.artLoaded && this.textures.exists('tunnel-environment')) {
        this.add.image(0, 0, 'tunnel-environment').setOrigin(0).setDisplaySize(SCENE_WIDTH, SCENE_HEIGHT);
        this.add.rectangle(0, 0, SCENE_WIDTH, SCENE_HEIGHT, 0x08171a, 0.16).setOrigin(0);
      } else {
        this.drawProceduralFallback();
      }

      // Soft radial ambient pools at key stations
      this.createGlowTexture('field-glow-amber', '238, 192, 120');
      this.createGlowTexture('field-glow-teal', '128, 224, 198');
      this.add.image(210, 190, 'field-glow-amber').setDisplaySize(230, 230).setAlpha(0.18).setDepth(2);
      this.add.image(720, 190, 'field-glow-teal').setDisplaySize(240, 240).setAlpha(0.22).setDepth(2);
      this.add.image(470, 120, 'field-glow-teal').setDisplaySize(260, 200).setAlpha(0.16).setDepth(2);
      this.add.image(650, 465, 'field-glow-amber').setDisplaySize(210, 190).setAlpha(0.14).setDepth(2);

      // Containment seal barrier overlay (shown once containment is deployed)
      this.sealOverlay = this.add.graphics().setDepth(3);

      // Navigation path & waypoint indicator
      this.path = this.add.graphics().setDepth(5);

      // Station markers and interactive hit zones
      FIELD_TARGETS.forEach((target, index) => {
        const number = String(index + 1).padStart(2, '0');
        const beacon = this.add.circle(target.x, target.y, 18, 0xe8d8b0, 0.14).setDepth(6);
        const reticle = this.add.graphics().setDepth(7);
        const pillBg = this.add.graphics().setDepth(11);
        const text = this.add
          .text(target.x, target.y - 38, `${number}  ${target.label}`, {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '13px',
            color: '#f5f0db',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setDepth(12);

        this.markers.push({
          id: target.id,
          x: target.x,
          y: target.y,
          number,
          label: target.label,
          pillBg,
          text,
          reticle,
          beacon,
        });

        this.add
          .zone(target.x, target.y, 110, 96)
          .setDepth(13)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            this.hoveredId = target.id;
            this.syncMarkers();
          })
          .on('pointerout', () => {
            if (this.hoveredId === target.id) {
              this.hoveredId = null;
              this.syncMarkers();
            }
          });
      });

      // Investigator avatar with directional headlamp
      this.lamp = this.add.triangle(0, 0, 8, 0, 108, -36, 108, 36, 0xefe9c4, 0.11);
      const shadow = this.add.ellipse(0, 14, 34, 13, 0x000000, 0.52);
      const figure = this.add.graphics();
      // Boots
      figure.fillStyle(0x162224).fillRoundedRect(-10, 9, 8, 15, 2).fillRoundedRect(2, 9, 8, 15, 2);
      // Field coat
      figure.fillStyle(0xc8be9e).fillRoundedRect(-13, -12, 26, 32, 5);
      // Harness & vest
      figure.fillStyle(0x2f494b).fillRect(-12, -3, 24, 7).fillRoundedRect(-7, -15, 14, 21, 3);
      // Head & cap
      figure.fillStyle(0xecdcc0).fillEllipse(0, -21, 15, 17);
      figure.fillStyle(0x2e4244).fillRoundedRect(-9, -27, 18, 8, 3);
      // Scanner badge accent
      figure.fillStyle(0x9ee2be).fillRect(9, -9, 5, 7);

      this.bodyGroup = this.add.container(0, 0, [figure]);
      this.avatar = this.add.container(current.x, current.y, [this.lamp, shadow, this.bodyGroup]).setDepth(10);

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.event.target !== this.game.canvas) return;
        const target = FIELD_TARGETS.find(item => Math.hypot(item.x - pointer.x, item.y - pointer.y) < 68);
        this.destination = {
          x: Phaser.Math.Clamp(target ? target.x : pointer.x, 70, 890),
          y: Phaser.Math.Clamp(target ? target.y : pointer.y, 110, 510),
          id: target?.id,
        };
      });

      // Subtle drifting atmospheric dust motes
      for (let i = 0; i < 14; i++) {
        const x = 75 + ((i * 89) % 810);
        const y = 130 + ((i * 61) % 360);
        const mote = this.add.ellipse(x, y, 2 + (i % 2), 2 + (i % 2), 0xe9dfc8, 0.18).setDepth(9);
        this.dust.push({ sprite: mote, baseY: y, phase: i * 1.4 });
      }

      this.syncMarkers();
      this.applyMotionPreference();
      onReady();
      if (paused) this.game.pause();
    }

    createGlowTexture(key: string, rgb: string) {
      if (this.textures.exists(key)) return;
      const canvas = this.textures.createCanvas(key, 256, 256);
      if (!canvas) return;
      const ctx = canvas.context;
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, `rgba(${rgb}, 0.72)`);
      grad.addColorStop(0.4, `rgba(${rgb}, 0.2)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      canvas.refresh();
    }

    drawProceduralFallback() {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(0x101c1f).fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      // Floor slate grid
      g.lineStyle(1, 0x1c2f33, 0.7);
      for (let x = 40; x < SCENE_WIDTH; x += 48) g.lineBetween(x, 60, x, SCENE_HEIGHT - 50);
      for (let y = 60; y < SCENE_HEIGHT - 40; y += 48) g.lineBetween(40, y, SCENE_WIDTH - 40, y);
      // Tunnel bulkhead walls
      g.fillStyle(0x18292c).fillRect(0, 0, SCENE_WIDTH, 76);
      g.fillStyle(0x152427).fillRect(0, SCENE_HEIGHT - 70, SCENE_WIDTH, 70);
      g.lineStyle(2, 0x3b5853, 0.9).strokeRect(48, 76, SCENE_WIDTH - 96, SCENE_HEIGHT - 146);
      // Sealed platform strip along lower left
      g.fillStyle(0x1f3539, 0.85).fillRoundedRect(130, 470, 320, 48, 6);
      g.lineStyle(2, 0x6ba092, 0.6).strokeRoundedRect(130, 470, 320, 48, 6);
      // Conduit trench on lower right
      g.fillStyle(0x1a1d19, 0.9).fillRoundedRect(560, 442, 180, 46, 6);
      g.lineStyle(1.5, 0xb88652, 0.7).strokeRoundedRect(560, 442, 180, 46, 6);
    }

    applyMotionPreference() {
      this.dust.forEach(item => item.sprite.setVisible(!reducedMotion));
      const limit = reducedMotion ? 15 : 30;
      if (this.game.loop.started && this.game.loop.fpsLimit !== limit) {
        this.game.loop.setFPSLimit(limit);
      }
    }

    syncMarkers() {
      // Containment barrier visual
      this.sealOverlay.clear();
      if (current.sealed) {
        this.sealOverlay.lineStyle(2, 0x86cfa5, 0.55);
        this.sealOverlay.lineBetween(90, 504, 480, 504);
        this.sealOverlay.fillStyle(0x6ec596, 0.08);
        this.sealOverlay.fillRect(90, 480, 390, 26);
      }

      for (const marker of this.markers) {
        const done = targetRecorded(current, marker.id);
        const locked = targetLocked(current, marker.id);
        const active = this.hoveredId === marker.id || selectedId === marker.id;

        const prefix = done ? '✓' : marker.number;
        marker.text.setText(`${prefix}  ${marker.label}`);
        marker.text.setColor(done ? '#b9f0ce' : locked ? '#9fb0ac' : active ? '#fff8e7' : '#f1ebd8');

        const bounds = marker.text.getBounds();
        const padX = 6;
        const padY = 3;
        const bgColor = done ? 0x133329 : locked ? 0x172225 : active ? 0x1d3b3e : 0x102327;
        const borderColor = done ? 0x77c99a : locked ? 0x45585c : active ? 0xeed9a6 : 0x5c756d;

        marker.pillBg.clear();
        marker.pillBg.fillStyle(bgColor, 0.92);
        marker.pillBg.fillRoundedRect(
          bounds.x - padX,
          bounds.y - padY,
          bounds.width + padX * 2,
          bounds.height + padY * 2,
          7,
        );
        marker.pillBg.lineStyle(active ? 1.5 : 1, borderColor, active ? 0.95 : 0.72);
        marker.pillBg.strokeRoundedRect(
          bounds.x - padX,
          bounds.y - padY,
          bounds.width + padX * 2,
          bounds.height + padY * 2,
          7,
        );

        // Tactical corner brackets around the station
        const rx = marker.x;
        const ry = marker.y;
        const hw = active ? 24 : 20;
        const hh = active ? 18 : 15;
        const arm = 8;
        marker.reticle.clear();
        marker.reticle.lineStyle(active ? 2 : 1.5, borderColor, locked ? 0.45 : active ? 0.98 : 0.78);
        for (const [cx, cy, sx, sy] of [
          [rx - hw, ry - hh, 1, 1],
          [rx + hw, ry - hh, -1, 1],
          [rx - hw, ry + hh, 1, -1],
          [rx + hw, ry + hh, -1, -1],
        ]) {
          marker.reticle.lineBetween(cx, cy + arm * sy, cx, cy);
          marker.reticle.lineBetween(cx, cy, cx + arm * sx, cy);
        }

        marker.beacon.setFillStyle(done ? 0x86cfa5 : locked ? 0x63767a : 0xeed9a6, locked ? 0.05 : active ? 0.22 : 0.12);
      }
    }

    update(time: number, delta: number) {
      if (!this.avatar) return;

      if (!reducedMotion) {
        for (const mote of this.dust) {
          mote.sprite.y = mote.baseY + Math.sin(time / 5500 + mote.phase) * 16;
          mote.sprite.setAlpha(0.08 + (Math.sin(time / 2800 + mote.phase) + 1) * 0.06);
        }
        const pulse = 1 + Math.sin(time / 700) * 0.12;
        for (const marker of this.markers) {
          const locked = targetLocked(current, marker.id);
          const done = targetRecorded(current, marker.id);
          marker.beacon.setScale(!locked && !done ? pulse : 1);
        }
      }

      const dx =
        Number(this.keys.has('d') || this.keys.has('ArrowRight')) -
        Number(this.keys.has('a') || this.keys.has('ArrowLeft'));
      const dy =
        Number(this.keys.has('s') || this.keys.has('ArrowDown')) -
        Number(this.keys.has('w') || this.keys.has('ArrowUp'));

      if (dx || dy) this.destination = null;
      const destination = this.destination;
      const vx = destination ? destination.x - this.avatar.x : dx;
      const vy = destination ? destination.y - this.avatar.y : dy;
      const distance = Math.hypot(vx, vy);
      const step = Math.min((225 * Math.min(delta, 50)) / 1000, destination ? distance : Infinity);

      this.path.clear();
      if (destination) {
        this.path.lineStyle(1.5, 0xead9a8, 0.55);
        this.path.lineBetween(this.avatar.x, this.avatar.y, destination.x, destination.y);
        this.path.lineStyle(1.5, 0xead9a8, 0.78);
        this.path.strokeCircle(destination.x, destination.y, reducedMotion ? 8 : 7 + Math.sin(time / 220) * 2.5);
      }

      if (distance > 1) {
        const nx = vx / distance;
        const ny = vy / distance;
        this.avatar.x = Phaser.Math.Clamp(this.avatar.x + nx * step, 70, 890);
        this.avatar.y = Phaser.Math.Clamp(this.avatar.y + ny * step, 110, 510);

        const targetAngle = Math.atan2(ny, nx);
        this.facingAngle = Phaser.Math.Angle.RotateTo(this.facingAngle, targetAngle, 0.22);
        this.lamp.setRotation(this.facingAngle);

        if (!reducedMotion) {
          this.walkPhase += delta * 0.014;
          this.bodyGroup.y = Math.sin(this.walkPhase) * 1.8;
        } else {
          this.bodyGroup.y = 0;
        }

        this.elapsed += delta;
        if (this.elapsed > 350) {
          onMove(this.avatar.x, this.avatar.y);
          this.elapsed = 0;
        }
      } else {
        this.bodyGroup.y = 0;
      }

      if (destination && distance < (destination.id ? 56 : 4)) {
        this.destination = null;
        onMove(this.avatar.x, this.avatar.y);
        if (destination.id) onInspect(destination.id);
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    backgroundColor: '#0f1c1f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
    },
    fps: { target: 30, limit: initialReducedMotion ? 15 : 30 },
    audio: { noAudio: true },
    input: {
      windowEvents: false,
      mouse: { preventDefaultWheel: false },
      touch: { capture: false },
    },
    render: { antialias: true, pixelArt: false },
    scene: TunnelScene,
    callbacks: {
      postBoot: booted => {
        booted.events.on('destroy', () => {
          stopped = true;
        });
      },
    },
  });

  const refreshBounds = () => {
    if (!stopped && game.isBooted) game.scale.updateBounds();
  };
  window.addEventListener('scroll', refreshBounds, true);
  parent.addEventListener('pointerdown', refreshBounds, true);

  return {
    game,
    travel(id: string) {
      const target = FIELD_TARGETS.find(item => item.id === id);
      if (scene && target) {
        selectedId = id;
        scene.destination = { x: target.x, y: target.y, id: target.id };
        scene.syncMarkers();
      }
    },
    key(key: string, down: boolean) {
      if (scene) {
        if (down) scene.keys.add(key);
        else scene.keys.delete(key);
      }
    },
    sync(session: FieldSession, nextSelected?: string, nextReducedMotion?: boolean) {
      current = session;
      if (nextSelected !== undefined) selectedId = nextSelected;
      if (nextReducedMotion !== undefined && nextReducedMotion !== reducedMotion) {
        reducedMotion = nextReducedMotion;
        scene?.applyMotionPreference();
      }
      scene?.syncMarkers();
    },
    setPaused(nextPaused: boolean) {
      paused = nextPaused;
      if (!game.isBooted || stopped) return;
      if (nextPaused) {
        if (scene?.avatar) {
          scene.keys.clear();
          scene.destination = null;
          scene.path.clear();
          onMove(scene.avatar.x, scene.avatar.y);
        }
        game.pause();
      } else {
        game.resume();
      }
    },
    stop() {
      if (scene?.avatar) {
        scene.keys.clear();
        scene.destination = null;
        scene.path.clear();
        onMove(scene.avatar.x, scene.avatar.y);
      }
    },
    destroy() {
      stopped = true;
      window.removeEventListener('scroll', refreshBounds, true);
      parent.removeEventListener('pointerdown', refreshBounds, true);
      if (scene?.avatar) {
        scene.keys.clear();
        scene.destination = null;
        onMove(scene.avatar.x, scene.avatar.y);
      }
      game.destroy(true);
    },
  };
}
