/**
 * Collapsible, Ultra-Responsive MMORPG HUD & Modals for Forest of Savior.
 * Highly space-efficient, zero screen obstruction, glassmorphic styling.
 * 100% pure JavaScript.
 */

import { sound } from './sound.js';

export class UIManager {
  constructor(container, player, world, npcManager, renderer, particleSystem, combatTextSystem) {
    this.container = container;
    this.player = player;
    this.world = world;
    this.npcManager = npcManager;
    this.renderer = renderer;
    this.particleSystem = particleSystem;
    this.combatTextSystem = combatTextSystem;

    // Collapsible Panel States
    this.playerFrameCollapsed = false;
    this.partyFrameCollapsed = false;
    this.minimapCollapsed = false;
    this.chatCollapsed = false;

    // Active UI states
    this.activeModal = null; // 'customizer', 'inventory', 'quests', 'worldmap', 'dialogue'
    this.dialogueData = null;
    this.chatMessages = [
      { sender: 'System', channel: 'system', text: 'Welcome to Forest of Savior (FOS) v2026. Enjoy your adventure!' },
      { sender: 'Rurihime', channel: 'guild', text: 'Welcome to the Chocolate Everyday guild campsite, everyone~☆' },
      { sender: 'Yamada', channel: 'party', text: '...I am solo grinding nearby. Let me know if you need carries.' },
      { sender: 'Akane', channel: 'all', text: 'Hunting slimes and gathering Moonblooms! Lv.19 soon!' }
    ];
    this.activeChatTab = 'all';

    // Near interactable target
    this.interactTarget = null;

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <!-- Top Left: Player Status Frame & Party (Collapsible) -->
      <div class="pointer-events-auto absolute top-3 left-3 flex flex-col gap-1.5 z-20">
        <!-- Player Plate -->
        <div id="player-frame-wrapper" class="rpg-panel rounded-xl p-2.5 flex flex-col gap-1.5 w-64 shadow-xl border border-slate-700/60 backdrop-blur-md transition-all">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div id="player-avatar-preview" class="relative w-9 h-9 rounded-full bg-slate-800 border-2 border-amber-400/90 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer shadow-inner hover:scale-105 transition-transform" title="Click to Customize Character [C]">
                <span class="text-base" id="hud-avatar-icon">🧙</span>
                <div id="hud-level-badge" class="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-slate-950 text-[9px] font-black px-1 py-0.2 rounded-full">Lv.1</div>
              </div>
              <div class="min-w-0">
                <span id="hud-player-name" class="font-bold text-xs text-slate-100 truncate block">Rookie Traveler</span>
                <span class="text-[9px] text-amber-300 font-medium block truncate">&lt;Chocolate Everyday&gt;</span>
              </div>
            </div>
            <!-- Collapse Button -->
            <button id="toggle-player-frame-btn" class="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold flex items-center justify-center border border-slate-700" title="Collapse/Expand Player Frame">
              −
            </button>
          </div>

          <!-- Detailed Bars (Collapsible Area) -->
          <div id="player-frame-details" class="flex flex-col gap-1 mt-0.5 transition-all">
            <!-- HP Bar -->
            <div class="w-full bg-slate-900/90 rounded-full h-2.5 p-0.5 border border-slate-700/80 overflow-hidden relative">
              <div id="hud-hp-fill" class="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all duration-100" style="width: 100%"></div>
              <span id="hud-hp-text" class="absolute inset-0 text-[8px] font-bold text-white flex items-center justify-center tracking-wider drop-shadow">250/250 HP</span>
            </div>
            <!-- MP Bar -->
            <div class="w-full bg-slate-900/90 rounded-full h-2.5 p-0.5 border border-slate-700/80 overflow-hidden relative">
              <div id="hud-mp-fill" class="bg-gradient-to-r from-sky-600 to-cyan-400 h-full rounded-full transition-all duration-100" style="width: 100%"></div>
              <span id="hud-mp-text" class="absolute inset-0 text-[8px] font-bold text-white flex items-center justify-center tracking-wider drop-shadow">150/150 MP</span>
            </div>
            <!-- Stamina Bar -->
            <div class="w-full bg-slate-900/80 rounded-full h-1 overflow-hidden">
              <div id="hud-stamina-fill" class="bg-emerald-400 h-full rounded-full transition-all duration-75" style="width: 100%"></div>
            </div>
          </div>
        </div>

        <!-- Party Frames Header & Container -->
        <div id="party-wrapper" class="flex flex-col gap-1">
          <div class="flex items-center justify-between px-1">
            <span id="party-count-label" class="text-[10px] font-bold text-slate-400 tracking-wider">PARTY</span>
            <button id="toggle-party-frame-btn" class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
              Fold ▾
            </button>
          </div>
          <div id="party-frames" class="flex flex-col gap-1"></div>
        </div>
      </div>

      <!-- Top Right: Minimap Radar & Camera Controls (Collapsible) -->
      <div class="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1.5 z-20">
        <!-- Minimap Panel -->
        <div id="minimap-panel" class="rpg-panel rounded-xl p-2 shadow-xl border border-slate-700/60 flex flex-col items-center transition-all">
          <div class="flex items-center justify-between w-full mb-1">
            <div class="text-[10px] font-bold text-amber-200 tracking-wide flex items-center gap-1 truncate max-w-[120px]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span id="hud-zone-name" class="truncate">Camp</span>
            </div>
            <button id="toggle-minimap-btn" class="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold flex items-center justify-center border border-slate-700 ml-1" title="Collapse/Expand Radar">
              −
            </button>
          </div>

          <div id="minimap-canvas-container" class="relative w-36 h-36 rounded-lg bg-slate-900/90 border border-slate-700 overflow-hidden">
            <canvas id="minimap-canvas" width="144" height="144" class="block w-full h-full"></canvas>
          </div>

          <!-- Camera Controls Bar -->
          <div class="flex items-center gap-1 mt-1.5 w-full justify-between">
            <div class="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded border border-slate-700">
              <button id="cam-iso-btn" class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-600 text-white" title="2.5D Isometric Tilt">2.5D</button>
              <button id="cam-top-btn" class="px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-300 hover:text-white" title="Top-Down 90° View">90°</button>
              <button id="cam-act-btn" class="px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-300 hover:text-white" title="Action 60° Angle">60°</button>
            </div>
            <div class="flex items-center gap-1">
              <button id="zoom-out-btn" class="w-5 h-5 rounded bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 hover:bg-slate-700">-</button>
              <button id="zoom-in-btn" class="w-5 h-5 rounded bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 hover:bg-slate-700">+</button>
              <button id="audio-toggle-btn" class="w-5 h-5 rounded bg-slate-800 text-amber-300 text-[11px] font-bold border border-slate-700 hover:bg-slate-700" title="Toggle Sound">🔊</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Interaction Prompt (Center Bottom - Doesn't overlap hotbar) -->
      <div id="interact-prompt" class="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-20 hidden">
        <div class="rpg-panel rpg-panel-gold rounded-full px-4 py-1.5 flex items-center gap-2 shadow-2xl animate-bounce">
          <span class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">E</span>
          <span id="interact-text" class="text-xs font-bold text-amber-100">Talk to Yamada</span>
        </div>
      </div>

      <!-- Bottom Center: Skill Hotbar & Quick Menus -->
      <div class="pointer-events-auto absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-20">
        <!-- Hotbar Slots -->
        <div class="rpg-panel rounded-2xl p-1.5 px-2.5 flex items-center gap-1.5 shadow-2xl border border-slate-700/60 backdrop-blur-md">
          <!-- Space: Basic Slash -->
          <div class="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-all group" id="slot-space">
            <span class="text-lg">⚔️</span>
            <span class="absolute -top-1.5 left-0.5 bg-slate-800 text-slate-300 text-[8px] font-bold px-1 rounded border border-slate-600">SPC</span>
            <span class="absolute bottom-0 text-[7px] text-slate-400 font-semibold group-hover:text-amber-300">Slash</span>
          </div>

          <!-- 1: Fire Spiral -->
          <div class="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-all group overflow-hidden" id="slot-1">
            <span class="text-lg">🔥</span>
            <span class="absolute -top-1.5 left-0.5 bg-slate-800 text-amber-300 text-[8px] font-bold px-1 rounded border border-slate-600">1</span>
            <span class="absolute bottom-0 text-[7px] text-slate-400 font-semibold group-hover:text-amber-300">Fire</span>
            <div id="slot-1-cd" class="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-[10px] font-black text-amber-300 hidden"></div>
          </div>

          <!-- 2: Absolute Frost (Yamada's spell) -->
          <div class="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-all group overflow-hidden" id="slot-2">
            <span class="text-lg">❄️</span>
            <span class="absolute -top-1.5 left-0.5 bg-slate-800 text-sky-300 text-[8px] font-bold px-1 rounded border border-slate-600">2</span>
            <span class="absolute bottom-0 text-[7px] text-slate-400 font-semibold group-hover:text-amber-300">Frost</span>
            <div id="slot-2-cd" class="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-[10px] font-black text-sky-300 hidden"></div>
          </div>

          <!-- 3: Meteor Cataclysm -->
          <div class="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-all group overflow-hidden" id="slot-3">
            <span class="text-lg">☄️</span>
            <span class="absolute -top-1.5 left-0.5 bg-slate-800 text-rose-300 text-[8px] font-bold px-1 rounded border border-slate-600">3</span>
            <span class="absolute bottom-0 text-[7px] text-slate-400 font-semibold group-hover:text-amber-300">Meteor</span>
            <div id="slot-3-cd" class="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-[10px] font-black text-rose-300 hidden"></div>
          </div>

          <!-- 4: Sakura Blessing -->
          <div class="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-all group overflow-hidden" id="slot-4">
            <span class="text-lg">🌸</span>
            <span class="absolute -top-1.5 left-0.5 bg-slate-800 text-emerald-300 text-[8px] font-bold px-1 rounded border border-slate-600">4</span>
            <span class="absolute bottom-0 text-[7px] text-slate-400 font-semibold group-hover:text-amber-300">Heal</span>
            <div id="slot-4-cd" class="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-[10px] font-black text-emerald-300 hidden"></div>
          </div>

          <!-- 5: Phantom Dash -->
          <div class="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-all group overflow-hidden" id="slot-5">
            <span class="text-lg">⚡</span>
            <span class="absolute -top-1.5 left-0.5 bg-slate-800 text-purple-300 text-[8px] font-bold px-1 rounded border border-slate-600">5</span>
            <span class="absolute bottom-0 text-[7px] text-slate-400 font-semibold group-hover:text-amber-300">Blink</span>
            <div id="slot-5-cd" class="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-[10px] font-black text-purple-300 hidden"></div>
          </div>

          <div class="w-px h-7 bg-slate-700 mx-0.5"></div>

          <!-- Quick Menus -->
          <button id="btn-custom" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 transition-all" title="Character Profile [C]">
            <span>👤</span>
            <span class="hidden lg:inline">[C]</span>
          </button>
          <button id="btn-inventory" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 transition-all" title="Inventory Bag [I]">
            <span>🎒</span>
            <span class="hidden lg:inline">[I]</span>
          </button>
          <button id="btn-quests" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 transition-all" title="Guild Quests [Q]">
            <span>📜</span>
            <span class="hidden lg:inline">[Q]</span>
          </button>
          <button id="btn-map" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 transition-all" title="World Map [M]">
            <span>🗺️</span>
            <span class="hidden lg:inline">[M]</span>
          </button>
        </div>

        <!-- Controls Guide (Compact, doesn't wrap awkwardly) -->
        <div class="text-[9px] text-slate-400 font-medium tracking-wide drop-shadow bg-slate-950/70 px-2.5 py-0.5 rounded-full border border-slate-800">
          WASD Move · Shift Sprint · Space Attack · 1-5 Skills · E Interact · C Profile · I Bag · Q Quest · M Map
        </div>
      </div>

      <!-- Bottom Left: MMORPG Chat Box & Emotes (Collapsible) -->
      <div class="pointer-events-auto absolute bottom-2.5 left-3 w-72 md:w-80 flex flex-col gap-1 z-20">
        <!-- Emote & Chat Collapse Header -->
        <div class="flex items-center justify-between pl-1 pr-1">
          <div class="flex items-center gap-1">
            <button class="emote-btn px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-[10px] border border-slate-700 text-white" data-emote="❤️">❤️</button>
            <button class="emote-btn px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-[10px] border border-slate-700 text-white" data-emote="✨">✨</button>
            <button class="emote-btn px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-[10px] border border-slate-700 text-white" data-emote="💧">💧</button>
            <button class="emote-btn px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-[10px] border border-slate-700 text-white" data-emote="💢">💢</button>
            <button class="emote-btn px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-[10px] border border-slate-700 text-white" data-emote="💤">💤</button>
          </div>
          <button id="toggle-chat-panel-btn" class="text-[9px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 flex items-center gap-1 font-bold">
            Chat ▾
          </button>
        </div>

        <!-- Chat Panel (Can be minimized) -->
        <div id="chat-panel" class="rpg-panel rounded-xl p-2 shadow-xl border border-slate-700/60 flex flex-col h-36 backdrop-blur-md transition-all">
          <!-- Channel Tabs -->
          <div class="flex items-center gap-1 border-b border-slate-700/60 pb-1 mb-1">
            <button class="chat-tab-btn px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-amber-300" data-channel="all">All</button>
            <button class="chat-tab-btn px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-400 hover:text-white" data-channel="guild">Guild</button>
            <button class="chat-tab-btn px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-400 hover:text-white" data-channel="party">Party</button>
            <button class="chat-tab-btn px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-400 hover:text-white" data-channel="system">System</button>
          </div>

          <!-- Messages stream -->
          <div id="chat-messages" class="flex-1 overflow-y-auto space-y-0.5 text-[11px] pr-1 font-sans"></div>

          <!-- Input -->
          <div class="mt-1 flex items-center gap-1 pt-1 border-t border-slate-800">
            <input id="chat-input" type="text" placeholder="Press Enter to chat..." class="flex-1 bg-slate-900/90 text-[11px] text-white px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:border-amber-400 font-sans" maxlength="70" />
            <button id="chat-send-btn" class="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded transition-colors">Send</button>
          </div>
        </div>
      </div>

      <!-- Modals Container (Centered Overlay) -->
      <div id="modal-overlay" class="pointer-events-auto absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center hidden">
        <div id="modal-content" class="rpg-panel rounded-2xl p-5 shadow-2xl border border-slate-700 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"></div>
      </div>
    `;

    this.bindEvents();
    this.renderChatMessages();
    this.updateHUD();
  }

  bindEvents() {
    // Collapsible Player Frame
    document.getElementById('toggle-player-frame-btn')?.addEventListener('click', (e) => {
      this.playerFrameCollapsed = !this.playerFrameCollapsed;
      const details = document.getElementById('player-frame-details');
      if (details) {
        details.style.display = this.playerFrameCollapsed ? 'none' : 'flex';
      }
      e.target.textContent = this.playerFrameCollapsed ? '+' : '−';
      sound.playClick();
    });

    // Collapsible Party Frames
    document.getElementById('toggle-party-frame-btn')?.addEventListener('click', (e) => {
      this.partyFrameCollapsed = !this.partyFrameCollapsed;
      const partyFrames = document.getElementById('party-frames');
      if (partyFrames) {
        partyFrames.style.display = this.partyFrameCollapsed ? 'none' : 'flex';
      }
      e.target.textContent = this.partyFrameCollapsed ? 'Open ▸' : 'Fold ▾';
      sound.playClick();
    });

    // Collapsible Minimap
    document.getElementById('toggle-minimap-btn')?.addEventListener('click', (e) => {
      this.minimapCollapsed = !this.minimapCollapsed;
      const c = document.getElementById('minimap-canvas-container');
      if (c) {
        c.style.display = this.minimapCollapsed ? 'none' : 'block';
      }
      e.target.textContent = this.minimapCollapsed ? '+' : '−';
      sound.playClick();
    });

    // Collapsible Chat Panel
    document.getElementById('toggle-chat-panel-btn')?.addEventListener('click', (e) => {
      this.chatCollapsed = !this.chatCollapsed;
      const panel = document.getElementById('chat-panel');
      if (panel) {
        panel.style.display = this.chatCollapsed ? 'none' : 'flex';
      }
      e.target.textContent = this.chatCollapsed ? 'Chat ▸' : 'Chat ▾';
      sound.playClick();
    });

    // Camera angle controls
    document.getElementById('cam-iso-btn')?.addEventListener('click', () => {
      this.renderer.setCameraMode('isometric');
      this.updateCamButtons('cam-iso-btn');
      sound.playClick();
    });
    document.getElementById('cam-top-btn')?.addEventListener('click', () => {
      this.renderer.setCameraMode('topdown');
      this.updateCamButtons('cam-top-btn');
      sound.playClick();
    });
    document.getElementById('cam-act-btn')?.addEventListener('click', () => {
      this.renderer.setCameraMode('action');
      this.updateCamButtons('cam-act-btn');
      sound.playClick();
    });

    // Zoom controls
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
      this.renderer.setZoom(this.renderer.camera.targetZoom + 0.2);
      sound.playClick();
    });
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
      this.renderer.setZoom(this.renderer.camera.targetZoom - 0.2);
      sound.playClick();
    });

    // Audio mute toggle
    document.getElementById('audio-toggle-btn')?.addEventListener('click', (e) => {
      const isMuted = sound.toggleMute();
      e.target.textContent = isMuted ? '🔇' : '🔊';
    });

    // Hotbar click events
    document.getElementById('slot-space')?.addEventListener('click', () => {
      this.player.performBasicAttack(this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
    });
    [1, 2, 3, 4, 5].forEach(num => {
      document.getElementById(`slot-${num}`)?.addEventListener('click', () => {
        this.player.useSkill(num, this.world, this.particleSystem, this.combatTextSystem, this.npcManager);
      });
    });

    // Modal buttons
    document.getElementById('player-avatar-preview')?.addEventListener('click', () => this.openCustomizerModal());
    document.getElementById('btn-custom')?.addEventListener('click', () => this.openCustomizerModal());
    document.getElementById('btn-inventory')?.addEventListener('click', () => this.openInventoryModal());
    document.getElementById('btn-quests')?.addEventListener('click', () => this.openQuestsModal());
    document.getElementById('btn-map')?.addEventListener('click', () => this.openWorldMapModal());

    // Emote buttons
    document.querySelectorAll('.emote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const em = btn.getAttribute('data-emote');
        this.player.triggerEmote(em);
      });
    });

    // Chat tabs
    document.querySelectorAll('.chat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chat-tab-btn').forEach(b => {
          b.className = 'chat-tab-btn px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-400 hover:text-white';
        });
        btn.className = 'chat-tab-btn px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-amber-300';
        this.activeChatTab = btn.getAttribute('data-channel');
        this.renderChatMessages();
        sound.playClick();
      });
    });

    // Chat send
    const sendChat = () => {
      const input = document.getElementById('chat-input');
      if (input && input.value.trim()) {
        const text = input.value.trim();
        this.chatMessages.push({
          sender: this.player.name,
          channel: 'all',
          text
        });
        this.player.triggerEmote('💬');
        input.value = '';
        this.renderChatMessages();

        // Intelligent NPC reaction to chat
        this.triggerNPCChatReaction(text);
      }
    };

    document.getElementById('chat-send-btn')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendChat();
      }
      e.stopPropagation();
    });

    // Close modal on outside click
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.closeModal();
      }
    });
  }

  updateCamButtons(activeId) {
    ['cam-iso-btn', 'cam-top-btn', 'cam-act-btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === activeId) {
          el.className = 'px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-600 text-white';
        } else {
          el.className = 'px-1.5 py-0.5 text-[9px] font-bold rounded text-slate-300 hover:text-white';
        }
      }
    });
  }

  updateHUD() {
    const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
    const mpPct = Math.max(0, (this.player.mp / this.player.maxMp) * 100);
    const stamPct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);

    const hpFill = document.getElementById('hud-hp-fill');
    if (hpFill) hpFill.style.width = `${hpPct}%`;
    const hpText = document.getElementById('hud-hp-text');
    if (hpText) hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp} HP`;

    const mpFill = document.getElementById('hud-mp-fill');
    if (mpFill) mpFill.style.width = `${mpPct}%`;
    const mpText = document.getElementById('hud-mp-text');
    if (mpText) mpText.textContent = `${Math.ceil(this.player.mp)} / ${this.player.maxMp} MP`;

    const stamFill = document.getElementById('hud-stamina-fill');
    if (stamFill) stamFill.style.width = `${stamPct}%`;

    const lvlBadge = document.getElementById('hud-level-badge');
    if (lvlBadge) lvlBadge.textContent = `Lv.${this.player.level}`;

    const nameText = document.getElementById('hud-player-name');
    if (nameText) nameText.textContent = this.player.name;

    const avatarIcon = document.getElementById('hud-avatar-icon');
    if (avatarIcon) {
      if (this.player.custom.hair === 'afro' || this.player.custom.headAccessory === 'afro') avatarIcon.textContent = '🥦';
      else if (this.player.custom.outfit === 'archmage') avatarIcon.textContent = '🧙';
      else if (this.player.custom.outfit === 'paladin') avatarIcon.textContent = '🛡️';
      else avatarIcon.textContent = '⚔️';
    }

    const zoneName = document.getElementById('hud-zone-name');
    if (zoneName) {
      zoneName.textContent = this.world.getCurrentZone(this.player.x, this.player.y);
    }

    this.player.skills.forEach(s => {
      const cdEl = document.getElementById(`slot-${s.id}-cd`);
      if (cdEl) {
        if (s.currentCd > 0) {
          cdEl.classList.remove('hidden');
          cdEl.textContent = s.currentCd.toFixed(1) + 's';
        } else {
          cdEl.classList.add('hidden');
        }
      }
    });

    this.updatePartyHUD();
    this.drawMinimap();
  }

  updatePartyHUD() {
    const container = document.getElementById('party-frames');
    const label = document.getElementById('party-count-label');
    if (!container) return;

    const inPartyNpcs = this.npcManager.npcs.filter(n => n.inParty);
    if (label) {
      label.textContent = inPartyNpcs.length > 0 ? `PARTY (${inPartyNpcs.length})` : 'PARTY (SOLO)';
    }

    if (inPartyNpcs.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = inPartyNpcs.map(npc => `
      <div class="rpg-panel rounded-lg p-1.5 flex items-center gap-2 w-60 border border-slate-700/60 shadow">
        <div class="w-7 h-7 rounded-full bg-slate-800 border border-amber-400 overflow-hidden flex items-center justify-center text-xs shrink-0">
          ${npc.id === 'yamada' ? (npc.hair === 'afro' ? '🥦' : '🧙') : (npc.id === 'akane' ? '🎀' : '✨')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between text-[10px]">
            <span class="font-bold text-slate-200 truncate">${npc.name} (Lv.${npc.level})</span>
            <span class="text-amber-300 font-medium text-[9px]">${npc.id === 'yamada' ? 'DPS' : 'Healer'}</span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-0.5">
            <div class="bg-red-500 h-full rounded-full transition-all" style="width: ${(npc.hp / npc.maxHp) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  drawMinimap() {
    if (this.minimapCollapsed) return;
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const scale = w / this.world.width;

    // Camp center
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(1400 * scale, 1400 * scale, 10, 0, Math.PI * 2);
    ctx.fill();

    // Gathering nodes
    ctx.fillStyle = '#ec4899';
    for (const n of this.world.gatheringNodes) {
      if (n.available) {
        ctx.fillRect(n.x * scale - 1, n.y * scale - 1, 2.5, 2.5);
      }
    }

    // Chests
    ctx.fillStyle = '#fbbf24';
    for (const c of this.world.chests) {
      if (!c.opened) {
        ctx.fillRect(c.x * scale - 1, c.y * scale - 1, 2.5, 2.5);
      }
    }

    // Enemies (Red dots)
    ctx.fillStyle = '#ef4444';
    for (const e of this.npcManager.enemies) {
      if (!e.dead) {
        const sz = e.isBoss ? 4 : 2;
        ctx.fillRect(e.x * scale - sz / 2, e.y * scale - sz / 2, sz, sz);
      }
    }

    // NPCs (Yellow dots)
    ctx.fillStyle = '#fde047';
    for (const n of this.npcManager.npcs) {
      ctx.fillRect(n.x * scale - 1.5, n.y * scale - 1.5, 3, 3);
    }

    // Player (Bright Cyan pulse dot)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.player.x * scale, this.player.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  renderChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const filtered = this.chatMessages.filter(m => {
      if (this.activeChatTab === 'all') return true;
      return m.channel === this.activeChatTab;
    });

    container.innerHTML = filtered.map(m => {
      let colorClass = 'text-slate-300';
      if (m.channel === 'system') colorClass = 'text-amber-400 font-semibold';
      else if (m.channel === 'guild') colorClass = 'text-emerald-300';
      else if (m.channel === 'party') colorClass = 'text-sky-300';

      return `
        <div class="leading-tight break-words">
          <span class="text-[9px] text-slate-500 font-mono">[${m.channel.toUpperCase()}]</span>
          <span class="font-bold ${colorClass}">${m.sender}:</span>
          <span class="text-slate-200">${m.text}</span>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  triggerNPCChatReaction(playerText) {
    const textLower = playerText.toLowerCase();
    setTimeout(() => {
      if (textLower.includes('yamada') || textLower.includes('afro') || textLower.includes('help')) {
        const yamada = this.npcManager.npcs.find(n => n.id === 'yamada');
        if (yamada) {
          yamada.emote = '❓';
          yamada.emoteTimer = 1.5;
          this.chatMessages.push({
            sender: 'Yamada',
            channel: 'party',
            text: textLower.includes('afro') ? "...My afro is optimal equipment. Mind your own build." : "...Understood. I am on my way to assist."
          });
          this.renderChatMessages();
          sound.playEmote();
        }
      } else if (textLower.includes('chocolate') || textLower.includes('guild') || textLower.includes('cake')) {
        const ruri = this.npcManager.npcs.find(n => n.id === 'rurihime');
        if (ruri) {
          ruri.emote = '✨';
          ruri.emoteTimer = 1.8;
          this.chatMessages.push({
            sender: 'Rurihime',
            channel: 'guild',
            text: "Yay! Chocolate gives everyone extra stamina! Enjoy the sweets, traveler~☆"
          });
          this.renderChatMessages();
          sound.playEmote();
        }
      } else if (textLower.includes('hi') || textLower.includes('halo') || textLower.includes('hello')) {
        const akane = this.npcManager.npcs.find(n => n.id === 'akane');
        if (akane) {
          akane.emote = '❤️';
          akane.emoteTimer = 1.8;
          this.chatMessages.push({
            sender: 'Akane',
            channel: 'all',
            text: "Hello! Let's do our best today in Forest of Savior!"
          });
          this.renderChatMessages();
          sound.playEmote();
        }
      }
    }, 600);
  }

  setInteractPrompt(target) {
    this.interactTarget = target;
    const prompt = document.getElementById('interact-prompt');
    const text = document.getElementById('interact-text');
    if (!prompt || !text) return;

    if (target) {
      prompt.classList.remove('hidden');
      if (target.type === 'npc') {
        text.textContent = `Talk to ${target.data.name}`;
      } else if (target.type === 'herb') {
        text.textContent = `Gather ${target.data.name}`;
      } else if (target.type === 'crystal') {
        text.textContent = `Harvest ${target.data.name}`;
      } else if (target.type === 'chest') {
        text.textContent = 'Open Treasure Chest';
      } else if (target.type === 'campfire') {
        text.textContent = 'Rest by Guild Campfire';
      }
    } else {
      prompt.classList.add('hidden');
    }
  }

  handleInteract() {
    if (!this.interactTarget) return;

    const t = this.interactTarget;
    if (t.type === 'npc') {
      this.openDialogueModal(t.data);
    } else if (t.type === 'herb' || t.type === 'crystal') {
      const node = t.data;
      if (node.available) {
        node.available = false;
        node.respawnTimer = 25;
        sound.playPickup();
        this.particleSystem.addHealAura(node.x, node.y);
        this.combatTextSystem.addText(node.x, node.y - 20, `+1 ${node.name}`, '#4ade80');

        const existing = this.player.inventory.find(i => i.id === node.itemReward.id);
        if (existing) {
          existing.count += 1;
        } else {
          this.player.inventory.push({ ...node.itemReward });
        }

        if (node.type === 'herb' && this.player.quests.herbs) {
          this.player.quests.herbs.progress = Math.min(this.player.quests.herbs.total, this.player.quests.herbs.progress + 1);
        }

        this.chatMessages.push({
          sender: 'System',
          channel: 'system',
          text: `Harvested [${node.name}] successfully!`
        });
        this.renderChatMessages();
      }
    } else if (t.type === 'chest') {
      const chest = t.data;
      if (!chest.opened) {
        chest.opened = true;
        sound.playLevelUp();
        this.particleSystem.addFireRing(chest.x, chest.y);
        this.combatTextSystem.addText(chest.x, chest.y - 25, `Obtained ${chest.reward.name}!`, '#fbbf24', 1.8);

        if (chest.reward.type === 'gold') {
          this.player.gold += chest.reward.count;
        } else {
          const ex = this.player.inventory.find(i => i.id === chest.reward.id);
          if (ex) ex.count += chest.reward.count;
          else this.player.inventory.push({ ...chest.reward });
        }

        this.chatMessages.push({
          sender: 'System',
          channel: 'system',
          text: `Opened Treasure Chest! Received: [${chest.reward.name} x${chest.reward.count}]`
        });
        this.renderChatMessages();
      }
    } else if (t.type === 'campfire') {
      sound.playHeal();
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.player.stamina = this.player.maxStamina;
      this.combatTextSystem.addText(this.player.x, this.player.y - 30, 'Rested! Full HP & MP restored!', '#4ade80');
      this.player.triggerEmote('❤️');
    }
  }

  // --- MODALS ---

  closeModal() {
    this.activeModal = null;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    sound.playClick();
  }

  openCustomizerModal() {
    this.activeModal = 'customizer';
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    sound.playClick();
    overlay.classList.remove('hidden');

    const p = this.player;

    content.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">👤</span>
          <div>
            <h2 class="text-base font-bold text-slate-100">Character Profile & Customization</h2>
            <p class="text-[11px] text-slate-400">Design your avatar and title in Forest of Savior</p>
          </div>
        </div>
        <button id="modal-close-btn" class="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs">✕</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Character Name</label>
            <input id="input-name" type="text" value="${p.name}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 font-sans" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Hairstyle (Including Yamada's Afro!)</label>
            <div class="grid grid-cols-2 gap-1.5 text-xs">
              <button class="hair-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.hair === 'afro' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-hair="afro">🥦 Yamada Afro</button>
              <button class="hair-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.hair === 'anime_bangs' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-hair="anime_bangs">✨ Cool Bangs</button>
              <button class="hair-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.hair === 'twintails' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-hair="twintails">🎀 Twintails</button>
              <button class="hair-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.hair === 'long_bangs' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-hair="long_bangs">👑 Princess Locks</button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Hair Color</label>
            <div class="flex items-center gap-1.5">
              ${['#1e293b', '#38bdf8', '#f472b6', '#fde047', '#a855f7', '#ef4444', '#10b981'].map(color => `
                <button class="hair-color-btn w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${p.custom.hairColor === color ? 'border-white scale-110 ring-2 ring-amber-400' : 'border-transparent'}" style="background-color: ${color}" data-color="${color}"></button>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Class Outfit</label>
            <div class="grid grid-cols-2 gap-1.5 text-xs">
              <button class="outfit-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.outfit === 'archmage' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-outfit="archmage">🧙 Archmage Robe</button>
              <button class="outfit-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.outfit === 'paladin' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-outfit="paladin">🛡️ Paladin Steel</button>
              <button class="outfit-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.outfit === 'chocolate_tunic' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-outfit="chocolate_tunic">🍫 Chocolate Guild</button>
              <button class="outfit-opt px-2.5 py-1.5 rounded-lg border text-left ${p.custom.outfit === 'adventurer' ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}" data-outfit="adventurer">⚔️ Adventurer</button>
            </div>
          </div>
        </div>

        <div class="bg-slate-900/80 rounded-xl p-3.5 border border-slate-700/80 flex flex-col justify-between">
          <div>
            <h3 class="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">Attributes & Guild Record</h3>
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between border-b border-slate-800 pb-1">
                <span class="text-slate-400">Level</span>
                <span class="font-bold text-white">Lv. ${p.level}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800 pb-1">
                <span class="text-slate-400">Total EXP</span>
                <span class="font-bold text-sky-400">${p.exp} / ${p.expToNext}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800 pb-1">
                <span class="text-slate-400">Attack Power</span>
                <span class="font-bold text-rose-400">${p.attack} ATK</span>
              </div>
              <div class="flex justify-between border-b border-slate-800 pb-1">
                <span class="text-slate-400">Defense</span>
                <span class="font-bold text-amber-400">${p.defense} DEF</span>
              </div>
              <div class="flex justify-between border-b border-slate-800 pb-1">
                <span class="text-slate-400">Magic Aptitude</span>
                <span class="font-bold text-purple-400">${p.magicPower} MATK</span>
              </div>
              <div class="flex justify-between border-b border-slate-800 pb-1">
                <span class="text-slate-400">Guild</span>
                <span class="font-bold text-amber-300">&lt;Chocolate Everyday&gt;</span>
              </div>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-800">
            <button id="save-custom-btn" class="w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-all">
              Save Character
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('input-name')?.addEventListener('input', (e) => {
      p.name = e.target.value.trim() || 'Traveler';
      this.updateHUD();
    });

    content.querySelectorAll('.hair-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        p.custom.hair = btn.getAttribute('data-hair');
        sound.playClick();
        this.openCustomizerModal();
      });
    });

    content.querySelectorAll('.hair-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        p.custom.hairColor = btn.getAttribute('data-color');
        sound.playClick();
        this.openCustomizerModal();
      });
    });

    content.querySelectorAll('.outfit-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        p.custom.outfit = btn.getAttribute('data-outfit');
        sound.playClick();
        this.openCustomizerModal();
      });
    });

    document.getElementById('save-custom-btn')?.addEventListener('click', () => {
      this.closeModal();
      this.combatTextSystem.addText(p.x, p.y - 30, 'Character Saved!', '#4ade80');
    });
  }

  openInventoryModal() {
    this.activeModal = 'inventory';
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    sound.playClick();
    overlay.classList.remove('hidden');

    content.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">🎒</span>
          <div>
            <h2 class="text-base font-bold text-slate-100">Adventurer's Inventory</h2>
            <p class="text-[11px] text-slate-400">Pouch Gold: <span class="text-amber-400 font-bold">${this.player.gold} Gold</span></p>
          </div>
        </div>
        <button id="modal-close-btn" class="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs">✕</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        ${this.player.inventory.map((item, idx) => `
          <div class="bg-slate-900/90 rounded-xl p-2.5 border border-slate-700 flex items-center justify-between">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-sm shrink-0">
                ${item.type === 'consumable' ? '🧪' : (item.type === 'material' ? '🌸' : (item.type === 'weapon' ? '🪄' : '💍'))}
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-slate-100 truncate">${item.name} <span class="text-amber-400 font-mono">x${item.count}</span></h4>
                <p class="text-[10px] text-slate-400 truncate">${item.desc}</p>
              </div>
            </div>
            ${item.type === 'consumable' ? `
              <button class="use-item-btn px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded transition-colors ml-1 shrink-0" data-idx="${idx}">Use</button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
    content.querySelectorAll('.use-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        this.player.useItem(idx, this.combatTextSystem);
        this.openInventoryModal();
      });
    });
  }

  openQuestsModal() {
    this.activeModal = 'quests';
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    sound.playClick();
    overlay.classList.remove('hidden');

    const quests = this.player.quests;

    content.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">📜</span>
          <div>
            <h2 class="text-base font-bold text-slate-100">Chocolate Everyday Guild Quests</h2>
            <p class="text-[11px] text-slate-400">Accept bounties from Akane, Rurihime, and Takezo</p>
          </div>
        </div>
        <button id="modal-close-btn" class="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs">✕</button>
      </div>

      <div class="space-y-2.5">
        <div class="bg-slate-900/90 rounded-xl p-3 border ${quests.herbs.completed ? 'border-emerald-500/50' : 'border-slate-700'}">
          <div class="flex justify-between items-center">
            <h4 class="text-xs font-bold text-pink-300">🌸 ${quests.herbs.name}</h4>
            <span class="text-[11px] font-bold ${quests.herbs.completed ? 'text-emerald-400' : 'text-amber-400'}">
              ${quests.herbs.completed ? 'Completed' : `${quests.herbs.progress} / ${quests.herbs.total}`}
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${quests.herbs.desc}</p>
          <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div class="bg-pink-500 h-full rounded-full" style="width: ${(quests.herbs.progress / quests.herbs.total) * 100}%"></div>
          </div>
        </div>

        <div class="bg-slate-900/90 rounded-xl p-3 border ${quests.wolves.completed ? 'border-emerald-500/50' : 'border-slate-700'}">
          <div class="flex justify-between items-center">
            <h4 class="text-xs font-bold text-amber-300">🐺 ${quests.wolves.name}</h4>
            <span class="text-[11px] font-bold ${quests.wolves.completed ? 'text-emerald-400' : 'text-amber-400'}">
              ${quests.wolves.completed ? 'Completed' : `${quests.wolves.progress} / ${quests.wolves.total}`}
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${quests.wolves.desc}</p>
          <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div class="bg-amber-500 h-full rounded-full" style="width: ${(quests.wolves.progress / quests.wolves.total) * 100}%"></div>
          </div>
        </div>

        <div class="bg-slate-900/90 rounded-xl p-3 border ${quests.golem.completed ? 'border-emerald-500/50' : 'border-slate-700'}">
          <div class="flex justify-between items-center">
            <h4 class="text-xs font-bold text-purple-300">🗿 ${quests.golem.name}</h4>
            <span class="text-[11px] font-bold ${quests.golem.completed ? 'text-emerald-400' : 'text-purple-400'}">
              ${quests.golem.completed ? 'Completed' : `${quests.golem.progress} / ${quests.golem.total}`}
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${quests.golem.desc}</p>
          <div class="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div class="bg-purple-500 h-full rounded-full" style="width: ${(quests.golem.progress / quests.golem.total) * 100}%"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  openWorldMapModal() {
    this.activeModal = 'worldmap';
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    sound.playClick();
    overlay.classList.remove('hidden');

    content.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">🗺️</span>
          <div>
            <h2 class="text-base font-bold text-slate-100">Forest of Savior - Continent Map</h2>
            <p class="text-[11px] text-slate-400">Open-world territories and boss arenas</p>
          </div>
        </div>
        <button id="modal-close-btn" class="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs">✕</button>
      </div>

      <div class="relative rounded-xl overflow-hidden border border-amber-900/50 shadow-2xl bg-amber-950/20">
        <img src="/src/assets/images/fos_world_map_1791727794259.jpg" alt="Forest of Savior World Map" class="w-full h-auto object-cover max-h-[55vh]" />
        <div class="absolute bottom-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-amber-200">
          📍 Current Location: <span class="font-bold text-white">${this.world.getCurrentZone(this.player.x, this.player.y)}</span>
        </div>
      </div>
    `;

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  openDialogueModal(npc) {
    this.activeModal = 'dialogue';
    this.dialogueData = npc;
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    sound.playClick();
    overlay.classList.remove('hidden');

    const d = npc.dialogues[npc.dialogueIndex || 0];
    const isYamada = npc.id === 'yamada';

    content.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3 border-b border-slate-700/80 pb-2.5">
          <div class="w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-400 overflow-hidden shrink-0 shadow-lg">
            ${isYamada ? `
              <img src="/src/assets/images/fos_yamada_avatar_1791727806371.jpg" alt="Yamada" class="w-full h-full object-cover" />
            ` : `
              <div class="w-full h-full flex items-center justify-center text-2xl">
                ${npc.id === 'akane' ? '🎀' : (npc.id === 'rurihime' ? '👑' : '🛡️')}
              </div>
            `}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-white">${npc.name}</h3>
              <span class="text-[10px] text-amber-300 font-semibold">&lt;${npc.guild}&gt;</span>
            </div>
            <p class="text-[10px] text-slate-400 font-mono">${npc.title}</p>
            <p class="text-[9px] text-sky-400 mt-0.5">Goal: ${npc.personalGoal}</p>
          </div>
        </div>

        <div class="bg-slate-900/90 rounded-xl p-3 border border-slate-700 text-xs text-slate-100 font-sans leading-relaxed min-h-[55px]">
          "${d.text}"
        </div>

        <div class="flex flex-col gap-1.5 pt-1">
          ${d.options.map((opt) => `
            <button class="dialogue-opt-btn w-full py-2 px-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-left text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all flex items-center justify-between" data-action="${opt.action}">
              <span>➤ ${opt.text}</span>
              <span class="text-slate-500 text-[10px]">Select</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    content.querySelectorAll('.dialogue-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.handleDialogueAction(npc, action);
      });
    });
  }

  handleDialogueAction(npc, action) {
    sound.playClick();

    if (action === 'close') {
      this.closeModal();
    } else if (action === 'join_party') {
      npc.inParty = true;
      npc.emote = '✨';
      npc.emoteTimer = 2.0;
      sound.playLevelUp();
      this.chatMessages.push({
        sender: 'System',
        channel: 'party',
        text: `${npc.name} joined your party!`
      });
      this.renderChatMessages();
      this.closeModal();
      this.combatTextSystem.addText(npc.x, npc.y - 30, `${npc.name} Joined Party!`, '#4ade80', 1.8);
    } else if (action === 'set_solo_hunt') {
      npc.inParty = false;
      this.combatTextSystem.addText(npc.x, npc.y - 30, `${npc.name} is solo hunting!`, '#38bdf8');
      this.closeModal();
    } else if (action === 'ask_afro') {
      npc.dialogueIndex = 1;
      this.openDialogueModal(npc);
    } else if (action === 'toggle_afro') {
      this.npcManager.toggleYamadaAfro();
      this.closeModal();
    } else if (action === 'quest_herbs') {
      npc.dialogueIndex = 1;
      this.openDialogueModal(npc);
    } else if (action === 'accept_herb_quest') {
      this.player.quests.herbs.active = true;
      this.chatMessages.push({
        sender: 'System',
        channel: 'system',
        text: 'Accepted Quest: [Moonbloom for Akane]!'
      });
      this.renderChatMessages();
      this.closeModal();
    } else if (action === 'turn_in_herbs') {
      if (this.player.quests.herbs.progress >= this.player.quests.herbs.total) {
        this.player.quests.herbs.completed = true;
        this.player.gainExp(this.player.quests.herbs.rewardExp, this.combatTextSystem);
        this.player.gold += this.player.quests.herbs.rewardGold;
        sound.playLevelUp();
        this.chatMessages.push({
          sender: 'Akane',
          channel: 'all',
          text: 'Thank you so much! Here is your reward from the guild!'
        });
        this.renderChatMessages();
        this.closeModal();
      } else {
        this.combatTextSystem.addText(this.player.x, this.player.y - 25, 'Still need more herbs!', '#ef4444');
      }
    } else if (action === 'buff_chocolate') {
      sound.playHeal();
      this.player.attack += 15;
      this.combatTextSystem.addText(this.player.x, this.player.y - 30, '+15 ATK Chocolatier Buff!', '#fbbf24', 2.0);
      this.player.triggerEmote('✨');
      this.closeModal();
    } else if (action === 'quest_wolves') {
      npc.dialogueIndex = 1;
      this.openDialogueModal(npc);
    } else if (action === 'accept_wolf_quest') {
      this.player.quests.wolves.active = true;
      this.closeModal();
    } else if (action === 'golem_tips') {
      npc.dialogueIndex = 1;
      this.openDialogueModal(npc);
    }
  }
}
