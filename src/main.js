/**
 * Main Game Loop & Keyboard Controller for Forest of Savior (Yamada-kun Lv999 RPG).
 * 100% Pure JavaScript (Vanilla JS, HTML5 Canvas, Web Audio API, Modern DOM HUD).
 * Zero TypeScript/TSX code for optimal execution purity and speed.
 */

import { sound } from './sound.js';
import { GameWorld } from './world.js';
import { Player } from './player.js';
import { NPCManager } from './npcs.js';
import { ParticleSystem, CombatTextSystem } from './particles.js';
import { GameRenderer } from './renderer.js';
import { UIManager } from './ui.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.uiContainer = document.getElementById('game-ui');

    // Input state
    this.input = {
      keys: {},
      mouseScreen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      mouseWorld: { x: 1380, y: 1420 }
    };

    // Subsystems
    this.world = new GameWorld();
    this.player = new Player();
    this.npcManager = new NPCManager(this.world);
    this.particleSystem = new ParticleSystem();
    this.particleSystem.setPlayerRef(this.player);
    this.combatTextSystem = new CombatTextSystem();
    this.renderer = new GameRenderer(this.canvas);
    this.ui = new UIManager(
      this.uiContainer,
      this.player,
      this.world,
      this.npcManager,
      this.renderer,
      this.particleSystem,
      this.combatTextSystem
    );

    // Loop timing
    this.lastTime = performance.now();
    this.running = true;

    this.initKeyboardControls();
    this.initMouseControls();
    this.start();
  }

  initKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      // If user is typing in chat input, don't trigger game hotkeys
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      this.input.keys[e.code] = true;

      // Handle Emote Selection shortcuts when Emote modal is active
      if (this.ui.activeModal === 'emotes') {
        if (e.code === 'KeyE' || e.code === 'Escape') {
          this.ui.closeModal();
          return;
        }

        const emoteKeyMap = {
          'Digit1': { symbol: '❤️', label: 'Heart' },
          'Digit2': { symbol: '✨', label: 'Sparkle' },
          'Digit3': { symbol: '💧', label: 'Sweatdrop' },
          'Digit4': { symbol: '💢', label: 'Angry' },
          'Digit5': { symbol: '💤', label: 'Sleepy' },
          'Digit6': { symbol: '❓', label: 'Question' },
          'Digit7': { symbol: '🍫', label: 'Chocolate' },
          'Digit8': { symbol: '⚔️', label: 'Battle Ready' },
          'Digit9': { symbol: '🎉', label: 'Celebrate' },
          'Digit0': { symbol: '🍵', label: 'Cozy Tea' },
          'Minus': { symbol: '🥦', label: 'Yamada Afro' },
          'Equal': { symbol: '💬', label: 'Greeting' }
        };

        if (emoteKeyMap[e.code]) {
          const item = emoteKeyMap[e.code];
          this.ui.triggerPlayerEmote(item.symbol, item.label);
          this.ui.closeModal();
          return;
        }
      }

      // Handle hotkeys
      if (e.code === 'KeyE') {
        this.ui.toggleEmotePanel();
      } else if (e.code === 'KeyF') {
        this.ui.handleInteract();
      } else if (e.code === 'Digit1') {
        this.player.useSkill(1, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
      } else if (e.code === 'Digit2') {
        this.player.useSkill(2, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
      } else if (e.code === 'Digit3') {
        this.player.useSkill(3, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
      } else if (e.code === 'Digit4') {
        this.player.useSkill(4, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
      } else if (e.code === 'Digit5') {
        this.player.useSkill(5, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
      } else if (e.code === 'KeyC') {
        if (this.ui.activeModal === 'customizer') this.ui.closeModal();
        else this.ui.openCustomizerModal();
      } else if (e.code === 'KeyI') {
        if (this.ui.activeModal === 'inventory') this.ui.closeModal();
        else this.ui.openInventoryModal();
      } else if (e.code === 'KeyQ') {
        if (this.ui.activeModal === 'quests') this.ui.closeModal();
        else this.ui.openQuestsModal();
      } else if (e.code === 'KeyM') {
        if (this.ui.activeModal === 'worldmap') this.ui.closeModal();
        else this.ui.openWorldMapModal();
      } else if (e.code === 'Escape') {
        if (this.player.aimingSkill) {
          this.player.cancelAiming();
        } else {
          this.ui.closeModal();
        }
      } else if (e.code === 'Enter') {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
          chatInput.focus();
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Initialize audio on first user touch/keypress
    const resumeAudio = () => {
      sound.ensureContext();
      window.removeEventListener('pointerdown', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
    window.addEventListener('pointerdown', resumeAudio);
    window.addEventListener('keydown', resumeAudio);
  }

  initMouseControls() {
    // Track mouse world coordinates for aim reticle & precision attacks
    window.addEventListener('mousemove', (e) => {
      this.input.mouseScreen = { x: e.clientX, y: e.clientY };
      this.input.mouseWorld = this.renderer.screenToWorld(e.clientX, e.clientY);
    });

    // Mouse click for attack or skill casting
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        if (this.player.aimingSkill) {
          this.player.castAimingSkill(this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
        } else {
          this.player.performBasicAttack(this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
        }
      } else if (e.button === 2) { // Right click to cancel aiming
        if (this.player.aimingSkill) {
          this.player.cancelAiming();
        }
      }
    });

    // Prevent context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Zoom with mouse scroll wheel
    window.addEventListener('wheel', (e) => {
      if (e.deltaY < 0) {
        this.renderer.setZoom(this.renderer.camera.targetZoom + 0.1);
      } else if (e.deltaY > 0) {
        this.renderer.setZoom(this.renderer.camera.targetZoom - 0.1);
      }
    }, { passive: true });
  }

  checkInteractionProximity() {
    const px = this.player.x;
    const py = this.player.y;
    let closestTarget = null;
    let minDistance = 55; // interaction radius

    // 1. Check NPCs
    for (const npc of this.npcManager.npcs) {
      const d = Math.hypot(npc.x - px, npc.y - py);
      if (d < minDistance) {
        minDistance = d;
        closestTarget = { type: 'npc', data: npc };
      }
    }

    // 2. Check Gathering Nodes
    for (const node of this.world.gatheringNodes) {
      if (node.available) {
        const d = Math.hypot(node.x - px, node.y - py);
        if (d < minDistance) {
          minDistance = d;
          closestTarget = { type: node.type, data: node };
        }
      }
    }

    // 3. Check Chests
    for (const chest of this.world.chests) {
      if (!chest.opened) {
        const d = Math.hypot(chest.x - px, chest.y - py);
        if (d < minDistance) {
          minDistance = d;
          closestTarget = { type: 'chest', data: chest };
        }
      }
    }

    // 4. Check Campfire
    for (const camp of this.world.campfires) {
      const d = Math.hypot(camp.x - px, camp.y - py);
      if (d < camp.radius + 30 && d < minDistance) {
        minDistance = d;
        closestTarget = { type: 'campfire', data: camp };
      }
    }

    this.ui.setInteractPrompt(closestTarget);
  }

  update(dt) {
    // 1. Update Player
    this.player.update(dt, this.input, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);

    // 2. Update NPCs & Enemies (Autonomous lifecycles and leveling)
    this.npcManager.update(dt, this.player, this.particleSystem, this.combatTextSystem, this.ui);

    // 3. Update World (gathering respawns)
    this.world.update(dt);

    // 4. Check Proximity Prompts
    this.checkInteractionProximity();

    // 5. Update Particles & Floating Text (with distance-attenuated shake)
    this.particleSystem.update(dt, this.player);
    this.combatTextSystem.update(dt);

    // 6. Update Camera position (target player)
    this.renderer.updateCamera(this.player.x, this.player.y, dt, this.particleSystem.screenShake);

    // 7. Update UI HUD
    this.ui.updateHUD();
  }

  render() {
    this.renderer.render(
      this.world,
      this.player,
      this.npcManager,
      this.particleSystem,
      this.combatTextSystem
    );
  }

  loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.running) {
      this.update(dt);
      this.render();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
