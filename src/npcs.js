/**
 * Enhanced Intelligent Autonomous NPCs & Monster AI Engine for Forest of Savior.
 * Features:
 * - Tactical formation & role-based behavior (Nuker, Skirmisher, Tank, Commander)
 * - Emergency rescue coordination: Yamada rushes to save Akane when she is endangered
 * - Cozy campfire guild banter & real-time chat between NPCs
 * - Autonomous herb harvesting, monster hunting, potion usage, and real-time level progression
 * 100% pure JavaScript.
 */

import { sound } from './sound.js';

export class NPCManager {
  constructor(world) {
    this.world = world;
    this.npcs = [];
    this.enemies = [];
    this.drops = []; // floating loot / exp orbs
    this.banterTimer = 15.0; // cozy guild campfire banter interval

    this.initNPCs();
    this.initEnemies();
  }

  initNPCs() {
    // 1. Akito Yamada (Lv. 999 Archmage - "Akito Yamada")
    this.npcs.push({
      id: 'yamada',
      name: 'Yamada',
      title: 'Lv. 999 Archmage',
      guild: 'Chocolate Everyday',
      x: 1280,
      y: 1320,
      spawnX: 1280,
      spawnY: 1320,
      vx: 0,
      vy: 0,
      speed: 135,
      hair: 'afro', // iconic anime afro
      hairColor: '#1e293b',
      afroToggle: true,
      skinColor: '#fde047',
      outfit: 'archmage',
      weapon: 'staff',
      level: 999,
      maxHp: 9999,
      hp: 9999,
      maxMp: 9999,
      mp: 9999,
      exp: 0,
      expToNext: 99999,
      inParty: false,
      attackCooldown: 0,
      castTimer: 0,
      state: 'AUTONOMOUS_HUNT', // 'AUTONOMOUS_HUNT', 'COMBAT', 'RESCUE_AKANE', 'MEDITATE', 'PARTY_FOLLOW'
      targetEnemy: null,
      aiTimer: 2.0,
      potions: 5,
      personalGoal: 'Grinding High-Tier Mobs & Guarding Guild',
      dialogueIndex: 0,
      dialogues: [
        {
          text: "...What is it? You're staring. I'm currently clearing out monsters in the forest.",
          options: [
            { text: "Can you join my party?", action: 'join_party' },
            { text: "Why do you have an afro?", action: 'ask_afro' },
            { text: "Go solo grind on your own!", action: 'set_solo_hunt' },
            { text: "Just passing by, Yamada-kun.", action: 'close' }
          ]
        },
        {
          text: "My afro? Eita gave me this cosmetic helmet. I don't really care about appearance as long as the stats are decent.",
          options: [
            { text: "Can you switch to normal hair?", action: 'toggle_afro' },
            { text: "It actually looks pretty cool!", action: 'close' }
          ]
        },
        {
          text: "...Fine. I'll join your party for a bit. Just stay behind me and don't pull aggro from everything.",
          options: [
            { text: "Awesome! Let's go!", action: 'close' }
          ]
        }
      ],
      emote: null,
      emoteTimer: 0
    });

    // 2. Akane Kinoshita (Lv. 18 Paladin - "Akane Kinoshita")
    this.npcs.push({
      id: 'akane',
      name: 'Akane',
      title: 'Lv. 18 Rookie Paladin',
      guild: 'Chocolate Everyday',
      x: 1480,
      y: 1360,
      spawnX: 1480,
      spawnY: 1360,
      vx: 0,
      vy: 0,
      speed: 115,
      hair: 'twintails',
      hairColor: '#f472b6',
      skinColor: '#fde047',
      outfit: 'paladin',
      weapon: 'sword',
      level: 18,
      maxHp: 520,
      hp: 520,
      maxMp: 240,
      mp: 240,
      exp: 45,
      expToNext: 120,
      inParty: false,
      healCooldown: 0,
      attackCooldown: 0,
      state: 'GATHER_HERBS', // 'GATHER_HERBS', 'FIGHT_SLIMES', 'FLEE_CAMP', 'REST_CAMP', 'PARTY_FOLLOW'
      targetHerb: null,
      targetEnemy: null,
      aiTimer: 1.5,
      herbsCollected: 0,
      potions: 3,
      personalGoal: 'Harvesting Moonblooms & Leveling Up',
      dialogueIndex: 0,
      dialogues: [
        {
          text: "Wah! Hello there! Are you new in Forest of Savior too? I'm Akane! I'm trying to gather Moonbloom herbs for the guild, but monsters keep ambushing me!",
          options: [
            { text: "Need help with herbs?", action: 'quest_herbs' },
            { text: "Join my party, let's explore together!", action: 'join_party' },
            { text: "Keep leveling up, Akane!", action: 'close' }
          ]
        },
        {
          text: "Really?! Could you help me gather 3 Moonbloom Herbs in the woods? You can pick them up with [E]!",
          options: [
            { text: "I'll get them for you! (Accept Quest)", action: 'accept_herb_quest' },
            { text: "I already have them!", action: 'turn_in_herbs' },
            { text: "Maybe later.", action: 'close' }
          ]
        }
      ],
      emote: null,
      emoteTimer: 0
    });

    // 3. Princess Rurihime / Eita Sasaki (Lv. 88 Guildmaster)
    this.npcs.push({
      id: 'rurihime',
      name: 'Rurihime (Eita)',
      title: 'Lv. 88 Guildmaster',
      guild: 'Chocolate Everyday',
      x: 1350,
      y: 1470,
      spawnX: 1350,
      spawnY: 1470,
      vx: 0,
      vy: 0,
      speed: 105,
      hair: 'long_bangs',
      hairColor: '#fde047',
      skinColor: '#fde047',
      outfit: 'princess',
      weapon: 'staff',
      level: 88,
      maxHp: 2600,
      hp: 2600,
      maxMp: 3400,
      mp: 3400,
      exp: 1200,
      expToNext: 4000,
      inParty: false,
      state: 'PATROL_CAMP',
      aiTimer: 3.0,
      attackCooldown: 0,
      potions: 4,
      personalGoal: 'Guild Leader Patrol & Slaying Glade Wolves',
      dialogueIndex: 0,
      dialogues: [
        {
          text: "Welcome to Chocolate Everyday, darling~!☆ I am Princess Rurihime! (Whispers: Haha, actually I'm Eita Sasaki, nice to meet you!). Here, take this Guild Chocolate cake!",
          options: [
            { text: "Receive Chocolate Buff (+25% ATK)", action: 'buff_chocolate' },
            { text: "Any guild bounties available?", action: 'quest_wolves' },
            { text: "Join my party, Rurihime-sama!", action: 'join_party' },
            { text: "Your avatar is super cute!", action: 'close' }
          ]
        },
        {
          text: "Aha! Glade Wolves are prowling the western woods. Defeat 3 of them and I'll reward you with guild coins and rare equipment!",
          options: [
            { text: "Consider it done! (Accept Quest)", action: 'accept_wolf_quest' },
            { text: "I've defeated them!", action: 'turn_in_wolves' },
            { text: "Understood!", action: 'close' }
          ]
        }
      ],
      emote: null,
      emoteTimer: 0
    });

    // 4. Takezo Kamota (Lv. 72 Guardian)
    this.npcs.push({
      id: 'takezo',
      name: 'Takezo',
      title: 'Lv. 72 Guardian',
      guild: 'Chocolate Everyday',
      x: 1450,
      y: 1460,
      spawnX: 1450,
      spawnY: 1460,
      vx: 0,
      vy: 0,
      speed: 95,
      hair: 'short',
      hairColor: '#78716c',
      skinColor: '#fde047',
      outfit: 'paladin',
      weapon: 'sword',
      level: 72,
      maxHp: 4600,
      hp: 4600,
      maxMp: 1400,
      mp: 1400,
      exp: 800,
      expToNext: 3500,
      inParty: false,
      state: 'GUARD_CAMPFIRE',
      aiTimer: 4.0,
      attackCooldown: 0,
      potions: 5,
      personalGoal: 'Defending Campfire & Chopping Wood',
      dialogueIndex: 0,
      dialogues: [
        {
          text: "Hahaha! Rest up by the campfire, young adventurer. The warmth of the hearth recovers HP and MP rapidly. Deep in the southeast ruins lies the Ancient Forest Golem.",
          options: [
            { text: "Have any tips for fighting the Golem?", action: 'golem_tips' },
            { text: "Join my party!", action: 'join_party' },
            { text: "Thanks, Takezo-san!", action: 'close' }
          ]
        },
        {
          text: "The Golem slams the ground with earthquake waves! Watch for the red telegraph circle and dodge with [Shift] or [5: Blink]. Also, bringing Yamada along turns it into child's play!",
          options: [
            { text: "Good to know, thank you!", action: 'close' }
          ]
        }
      ],
      emote: null,
      emoteTimer: 0
    });
  }

  initEnemies() {
    this.enemies = [];

    // Green Slimes (Lv 3-6)
    const slimeSpawns = [
      { x: 1050, y: 1150, lvl: 3 }, { x: 950, y: 1250, lvl: 4 }, { x: 1150, y: 1300, lvl: 3 },
      { x: 1250, y: 1050, lvl: 5 }, { x: 850, y: 950, lvl: 4 }, { x: 1000, y: 850, lvl: 3 },
      { x: 1550, y: 1100, lvl: 4 }, { x: 1700, y: 1000, lvl: 5 }, { x: 1850, y: 900, lvl: 6 },
      { x: 1100, y: 1450, lvl: 4 }
    ];
    slimeSpawns.forEach((s, idx) => {
      this.enemies.push(this.createEnemy(`slime_${idx}`, 'Forest Slime', 'slime', s.x, s.y, s.lvl));
    });

    // Glade Wolves (Lv 12-16)
    const wolfSpawns = [
      { x: 650, y: 1850, lvl: 12 }, { x: 750, y: 1950, lvl: 14 },
      { x: 550, y: 2050, lvl: 15 }, { x: 800, y: 2150, lvl: 16 },
      { x: 900, y: 1900, lvl: 13 }, { x: 700, y: 1750, lvl: 14 }
    ];
    wolfSpawns.forEach((w, idx) => {
      this.enemies.push(this.createEnemy(`wolf_${idx}`, 'Glade Wolf', 'wolf', w.x, w.y, w.lvl));
    });

    // Whispering Treants (Lv 25-30)
    const treantSpawns = [
      { x: 1850, y: 1850, lvl: 25 }, { x: 1950, y: 1950, lvl: 28 },
      { x: 1750, y: 2050, lvl: 26 }, { x: 2250, y: 1850, lvl: 30 },
      { x: 2050, y: 1750, lvl: 27 }
    ];
    treantSpawns.forEach((t, idx) => {
      this.enemies.push(this.createEnemy(`treant_${idx}`, 'Whispering Treant', 'treant', t.x, t.y, t.lvl));
    });

    // BOSS: Ancient Forest Golem (Lv 75 Boss)
    this.enemies.push(this.createEnemy('boss_golem', 'Ancient Forest Golem', 'golem', 2100, 2100, 75, true));
  }

  createEnemy(id, name, type, x, y, level, isBoss = false) {
    const hpMultiplier = isBoss ? 500 : (type === 'treant' ? 65 : (type === 'wolf' ? 32 : 16));
    const maxHp = level * hpMultiplier;
    return {
      id,
      name,
      type,
      x,
      y,
      spawnX: x,
      spawnY: y,
      level,
      isBoss,
      maxHp,
      hp: maxHp,
      speed: isBoss ? 60 : (type === 'wolf' ? 140 : (type === 'slime' ? 85 : 55)),
      radius: isBoss ? 45 : (type === 'treant' ? 26 : (type === 'wolf' ? 18 : 14)),
      attackPower: level * (isBoss ? 8 : (type === 'wolf' ? 4 : 2)),
      attackRange: isBoss ? 90 : (type === 'wolf' ? 45 : 35),
      attackCooldown: 0,
      state: 'patrol',
      patrolTimer: Math.random() * 3,
      targetX: x,
      targetY: y,
      respawnTimer: 0,
      dead: false,
      flashHurt: 0,
      bounceOffset: 0,
      knockbackX: 0,
      knockbackY: 0
    };
  }

  update(dt, player, particleSystem, combatTextSystem, uiManager) {
    // Campfire Guild Banter Timer
    this.banterTimer -= dt;
    if (this.banterTimer <= 0) {
      this.banterTimer = 22 + Math.random() * 15;
      this.triggerCozyCampfireBanter(uiManager);
    }

    // 1. Update Autonomous NPCs
    for (const npc of this.npcs) {
      if (npc.emoteTimer > 0) {
        npc.emoteTimer -= dt;
        if (npc.emoteTimer <= 0) npc.emote = null;
      }
      if (npc.attackCooldown > 0) npc.attackCooldown -= dt;
      if (npc.healCooldown > 0) npc.healCooldown -= dt;

      // Potion usage when critically injured
      if (npc.hp < npc.maxHp * 0.35 && npc.potions > 0 && npc.healCooldown <= 0) {
        npc.potions -= 1;
        npc.healCooldown = 4.0;
        sound.playHeal();
        npc.hp = Math.min(npc.maxHp, npc.hp + 150);
        particleSystem.addHealAura(npc.x, npc.y);
        combatTextSystem.addText(npc.x, npc.y - 25, '+150 HP (Potion)', '#4ade80');
      }

      // Natural recovery near campfire or over time
      if (Math.hypot(npc.x - 1400, npc.y - 1400) < 180) {
        npc.hp = Math.min(npc.maxHp, npc.hp + 60 * dt);
        npc.mp = Math.min(npc.maxMp, npc.mp + 50 * dt);
      } else {
        npc.hp = Math.min(npc.maxHp, npc.hp + 8 * dt);
        npc.mp = Math.min(npc.maxMp, npc.mp + 15 * dt);
      }

      if (npc.inParty) {
        this.updatePartyMemberAI(npc, dt, player, particleSystem, combatTextSystem);
      } else {
        this.updateAutonomousNPCAI(npc, dt, player, particleSystem, combatTextSystem, uiManager);
      }
    }

    // 2. Update Enemies (Attacking, chasing, patrolling)
    for (const enemy of this.enemies) {
      if (enemy.dead) {
        enemy.respawnTimer -= dt;
        if (enemy.respawnTimer <= 0) {
          enemy.dead = false;
          enemy.hp = enemy.maxHp;
          enemy.x = enemy.spawnX;
          enemy.y = enemy.spawnY;
        }
        continue;
      }

      if (enemy.flashHurt > 0) enemy.flashHurt -= dt;
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;

      // Knockback damping
      if (Math.abs(enemy.knockbackX) > 0.1 || Math.abs(enemy.knockbackY) > 0.1) {
        enemy.x += enemy.knockbackX * dt;
        enemy.y += enemy.knockbackY * dt;
        enemy.knockbackX *= 0.85;
        enemy.knockbackY *= 0.85;
      }

      // Slime bounce animation
      if (enemy.type === 'slime') {
        enemy.bounceOffset = Math.abs(Math.sin(performance.now() * 0.008 + enemy.spawnX)) * 8;
      }

      // Check aggro on Player OR Nearby Autonomous NPCs
      let aggroTarget = null;
      let minAggroDist = enemy.isBoss ? 350 : 220;

      const dPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dPlayer <= minAggroDist && player.hp > 0) {
        aggroTarget = player;
        minAggroDist = dPlayer;
      }

      for (const npc of this.npcs) {
        const dNpc = Math.hypot(npc.x - enemy.x, npc.y - enemy.y);
        if (dNpc <= minAggroDist && npc.hp > 0) {
          aggroTarget = npc;
          minAggroDist = dNpc;
        }
      }

      if (aggroTarget) {
        enemy.state = 'chase';
        if (minAggroDist <= enemy.attackRange) {
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = enemy.isBoss ? 2.2 : 1.2;
            sound.playHit();
            const dmg = Math.max(6, Math.floor(enemy.attackPower - (aggroTarget.defense || 10) * 0.5));
            aggroTarget.hp = Math.max(0, aggroTarget.hp - dmg);
            aggroTarget.flashHurt = 0.25;

            combatTextSystem.addText(aggroTarget.x, aggroTarget.y - 25, `-${dmg}`, '#ef4444');
            particleSystem.addHitSpark(aggroTarget.x, aggroTarget.y);

            if (enemy.isBoss) {
              particleSystem.addGroundSlam(enemy.x, enemy.y);
            }
          }
        } else {
          const angle = Math.atan2(aggroTarget.y - enemy.y, aggroTarget.x - enemy.x);
          const nextX = enemy.x + Math.cos(angle) * enemy.speed * dt;
          const nextY = enemy.y + Math.sin(angle) * enemy.speed * dt;
          if (!this.world.checkCollision(nextX, nextY, enemy.radius)) {
            enemy.x = nextX;
            enemy.y = nextY;
          }
        }
      } else {
        enemy.state = 'patrol';
        enemy.patrolTimer -= dt;
        if (enemy.patrolTimer <= 0) {
          enemy.patrolTimer = 2.5 + Math.random() * 3;
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 80;
          enemy.targetX = enemy.spawnX + Math.cos(angle) * r;
          enemy.targetY = enemy.spawnY + Math.sin(angle) * r;
        }

        const dTarget = Math.hypot(enemy.targetX - enemy.x, enemy.targetY - enemy.y);
        if (dTarget > 6) {
          const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
          const nextX = enemy.x + Math.cos(angle) * (enemy.speed * 0.5) * dt;
          const nextY = enemy.y + Math.sin(angle) * (enemy.speed * 0.5) * dt;
          if (!this.world.checkCollision(nextX, nextY, enemy.radius)) {
            enemy.x = nextX;
            enemy.y = nextY;
          }
        }
      }
    }

    // 3. Update Floating Loot / EXP Orbs
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life -= dt;
      if (drop.life <= 0) {
        this.drops.splice(i, 1);
        continue;
      }

      const recipient = drop.recipient || player;
      const d = Math.hypot(recipient.x - drop.x, recipient.y - drop.y);
      if (d < 25) {
        if (recipient === player) {
          player.gainExp(drop.exp, combatTextSystem);
          player.gold += drop.gold;
          sound.playPickup();
        } else {
          this.npcGainExp(recipient, drop.exp, combatTextSystem, uiManager);
        }
        this.drops.splice(i, 1);
      } else {
        const angle = Math.atan2(recipient.y - drop.y, recipient.x - drop.x);
        drop.x += Math.cos(angle) * 220 * dt;
        drop.y += Math.sin(angle) * 220 * dt;
      }
    }
  }

  // --- AUTONOMOUS NPC INDEPENDENT BEHAVIOR ---
  updateAutonomousNPCAI(npc, dt, player, particleSystem, combatTextSystem, uiManager) {
    npc.aiTimer -= dt;

    if (npc.id === 'yamada') {
      // Check if Akane is screaming for help (Emergency Rescue!)
      const akane = this.npcs.find(n => n.id === 'akane');
      if (akane && akane.state === 'FLEE_CAMP' && Math.hypot(akane.x - npc.x, akane.y - npc.y) < 600) {
        // Yamada rushes to rescue Akane!
        npc.state = 'RESCUE_AKANE';
        const dAkane = Math.hypot(akane.x - npc.x, akane.y - npc.y);
        if (dAkane > 70) {
          const angle = Math.atan2(akane.y - npc.y, akane.x - npc.x);
          npc.x += Math.cos(angle) * (npc.speed * 1.5) * dt;
          npc.y += Math.sin(angle) * (npc.speed * 1.5) * dt;
        }

        // Frost freeze attackers near Akane!
        const threatNearAkane = this.findNearestHostile(akane.x, akane.y, 160);
        if (threatNearAkane && npc.attackCooldown <= 0) {
          npc.attackCooldown = 2.0;
          sound.playFrost();
          particleSystem.addIceNova(threatNearAkane.x, threatNearAkane.y);
          threatNearAkane.hp -= 600;
          threatNearAkane.flashHurt = 0.35;
          combatTextSystem.addText(threatNearAkane.x, threatNearAkane.y - 25, '600! FROST (Yamada Rescue)', '#38bdf8');
          npc.emote = '✨';
          npc.emoteTimer = 1.5;

          if (threatNearAkane.hp <= 0 && !threatNearAkane.dead) {
            this.killEnemyByEntity(threatNearAkane, npc, particleSystem, combatTextSystem, uiManager);
          }
        }
        return;
      }

      // Solo Grinding High-Tier Mobs (Treants, Wolves, Boss)
      const nearestMonster = this.findNearestHostile(npc.x, npc.y, 450);

      if (nearestMonster) {
        npc.state = 'COMBAT';
        const dist = Math.hypot(nearestMonster.x - npc.x, nearestMonster.y - npc.y);

        if (dist > 160) {
          const angle = Math.atan2(nearestMonster.y - npc.y, nearestMonster.x - npc.x);
          npc.x += Math.cos(angle) * npc.speed * dt;
          npc.y += Math.sin(angle) * npc.speed * dt;
        }

        if (npc.attackCooldown <= 0) {
          npc.attackCooldown = 2.0;
          const useFrost = Math.random() < 0.6;

          if (useFrost) {
            sound.playFrost();
            particleSystem.addIceNova(nearestMonster.x, nearestMonster.y);
            const dmg = 480 + Math.floor(Math.random() * 150);
            nearestMonster.hp -= dmg;
            nearestMonster.flashHurt = 0.3;
            combatTextSystem.addText(nearestMonster.x, nearestMonster.y - 25, `${dmg} FROST (Yamada)`, '#38bdf8');
            npc.emote = '✨';
            npc.emoteTimer = 1.2;
          } else {
            sound.playMeteor();
            particleSystem.addMeteor(nearestMonster.x, nearestMonster.y);
            const dmg = 999;
            nearestMonster.hp -= dmg;
            nearestMonster.flashHurt = 0.5;
            combatTextSystem.addText(nearestMonster.x, nearestMonster.y - 30, '999! METEOR (Yamada)', '#f43f5e');
            npc.emote = '✨';
            npc.emoteTimer = 1.5;
          }

          if (nearestMonster.hp <= 0 && !nearestMonster.dead) {
            this.killEnemyByEntity(nearestMonster, npc, particleSystem, combatTextSystem, uiManager);
          }
        }
      } else {
        npc.state = 'AUTONOMOUS_HUNT';
        if (npc.aiTimer <= 0) {
          npc.aiTimer = 5 + Math.random() * 4;
          const patrolSpots = [
            { x: 900, y: 1100 }, { x: 750, y: 1900 }, { x: 1950, y: 1900 }, { x: 1300, y: 1350 }
          ];
          const dest = patrolSpots[Math.floor(Math.random() * patrolSpots.length)];
          npc.targetX = dest.x;
          npc.targetY = dest.y;
        }

        if (npc.targetX) {
          const d = Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y);
          if (d > 10) {
            const angle = Math.atan2(npc.targetY - npc.y, npc.targetX - npc.x);
            npc.x += Math.cos(angle) * (npc.speed * 0.7) * dt;
            npc.y += Math.sin(angle) * (npc.speed * 0.7) * dt;
          }
        }
      }
    } else if (npc.id === 'akane') {
      // AKANE: Gathers Moonbloom herbs & grinds low-level slimes to level up!
      if (npc.hp < npc.maxHp * 0.4) {
        npc.state = 'FLEE_CAMP';
        const dCamp = Math.hypot(1400 - npc.x, 1400 - npc.y);
        if (dCamp > 30) {
          const angle = Math.atan2(1400 - npc.y, 1400 - npc.x);
          npc.x += Math.cos(angle) * (npc.speed * 1.2) * dt;
          npc.y += Math.sin(angle) * (npc.speed * 1.2) * dt;
          if (npc.emote !== '💧') {
            npc.emote = '💧';
            npc.emoteTimer = 2.0;
          }
        } else {
          npc.state = 'REST_CAMP';
        }
        return;
      }

      // Check nearest available herb
      let nearestHerb = null;
      let minHerbDist = 500;
      for (const node of this.world.gatheringNodes) {
        if (node.available && node.type === 'herb') {
          const d = Math.hypot(node.x - npc.x, node.y - npc.y);
          if (d < minHerbDist) {
            minHerbDist = d;
            nearestHerb = node;
          }
        }
      }

      if (nearestHerb) {
        npc.state = 'GATHER_HERBS';
        const d = Math.hypot(nearestHerb.x - npc.x, nearestHerb.y - npc.y);
        if (d > 25) {
          const angle = Math.atan2(nearestHerb.y - npc.y, nearestHerb.x - npc.x);
          npc.x += Math.cos(angle) * npc.speed * dt;
          npc.y += Math.sin(angle) * npc.speed * dt;
        } else {
          nearestHerb.available = false;
          nearestHerb.respawnTimer = 25;
          npc.herbsCollected += 1;
          sound.playPickup();
          particleSystem.addHealAura(npc.x, npc.y);
          combatTextSystem.addText(npc.x, npc.y - 25, '+1 Moonbloom (Akane)', '#f472b6');
          npc.emote = '🌸';
          npc.emoteTimer = 1.8;
          this.npcGainExp(npc, 35, combatTextSystem, uiManager);
        }
      } else {
        const nearestSlime = this.findNearestHostileByType(npc.x, npc.y, 300, 'slime');
        if (nearestSlime) {
          npc.state = 'FIGHT_SLIMES';
          const d = Math.hypot(nearestSlime.x - npc.x, nearestSlime.y - npc.y);
          if (d > 30) {
            const angle = Math.atan2(nearestSlime.y - npc.y, nearestSlime.x - npc.x);
            npc.x += Math.cos(angle) * npc.speed * dt;
            npc.y += Math.sin(angle) * npc.speed * dt;
          } else if (npc.attackCooldown <= 0) {
            npc.attackCooldown = 0.8;
            sound.playSlash();
            particleSystem.addSlashArc(nearestSlime.x, nearestSlime.y, 'right');
            const dmg = 45 + Math.floor(Math.random() * 20);
            nearestSlime.hp -= dmg;
            nearestSlime.flashHurt = 0.2;
            combatTextSystem.addText(nearestSlime.x, nearestSlime.y - 20, `${dmg} (Akane)`, '#ffffff');
            if (nearestSlime.hp <= 0 && !nearestSlime.dead) {
              this.killEnemyByEntity(nearestSlime, npc, particleSystem, combatTextSystem, uiManager);
            }
          }
        } else {
          if (npc.aiTimer <= 0) {
            npc.aiTimer = 4 + Math.random() * 3;
            npc.targetX = 1400 + (Math.random() - 0.5) * 300;
            npc.targetY = 1200 + (Math.random() - 0.5) * 300;
          }
          if (npc.targetX) {
            const d = Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y);
            if (d > 10) {
              const angle = Math.atan2(npc.targetY - npc.y, npc.targetX - npc.x);
              npc.x += Math.cos(angle) * (npc.speed * 0.6) * dt;
              npc.y += Math.sin(angle) * (npc.speed * 0.6) * dt;
            }
          }
        }
      }
    } else if (npc.id === 'rurihime') {
      const nearestWolf = this.findNearestHostileByType(npc.x, npc.y, 350, 'wolf');
      if (nearestWolf) {
        npc.state = 'HUNT_WOLVES';
        const d = Math.hypot(nearestWolf.x - npc.x, nearestWolf.y - npc.y);
        if (d > 120) {
          const angle = Math.atan2(nearestWolf.y - npc.y, nearestWolf.x - npc.x);
          npc.x += Math.cos(angle) * npc.speed * dt;
          npc.y += Math.sin(angle) * npc.speed * dt;
        } else if (npc.attackCooldown <= 0) {
          npc.attackCooldown = 1.4;
          sound.playFireball();
          particleSystem.addFireRing(nearestWolf.x, nearestWolf.y);
          const dmg = 220 + Math.floor(Math.random() * 80);
          nearestWolf.hp -= dmg;
          nearestWolf.flashHurt = 0.25;
          combatTextSystem.addText(nearestWolf.x, nearestWolf.y - 25, `${dmg} (Rurihime)`, '#fbbf24');
          if (nearestWolf.hp <= 0 && !nearestWolf.dead) {
            this.killEnemyByEntity(nearestWolf, npc, particleSystem, combatTextSystem, uiManager);
          }
        }
      } else {
        if (npc.aiTimer <= 0) {
          npc.aiTimer = 6;
          const campPoints = [
            { x: 1330, y: 1470 }, { x: 1470, y: 1470 }, { x: 1470, y: 1330 }, { x: 1330, y: 1330 }
          ];
          const dest = campPoints[Math.floor(Math.random() * campPoints.length)];
          npc.targetX = dest.x;
          npc.targetY = dest.y;
        }
        if (npc.targetX) {
          const d = Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y);
          if (d > 8) {
            const angle = Math.atan2(npc.targetY - npc.y, npc.targetX - npc.x);
            npc.x += Math.cos(angle) * (npc.speed * 0.5) * dt;
            npc.y += Math.sin(angle) * (npc.speed * 0.5) * dt;
          }
        }
      }
    } else if (npc.id === 'takezo') {
      const enemyNearCamp = this.findNearestHostile(1400, 1400, 260);
      if (enemyNearCamp) {
        const d = Math.hypot(enemyNearCamp.x - npc.x, enemyNearCamp.y - npc.y);
        if (d > 35) {
          const angle = Math.atan2(enemyNearCamp.y - npc.y, enemyNearCamp.x - npc.x);
          npc.x += Math.cos(angle) * npc.speed * dt;
          npc.y += Math.sin(angle) * npc.speed * dt;
        } else if (npc.attackCooldown <= 0) {
          npc.attackCooldown = 1.0;
          sound.playSlash();
          particleSystem.addSlashArc(enemyNearCamp.x, enemyNearCamp.y, 'down');
          const dmg = 120 + Math.floor(Math.random() * 40);
          enemyNearCamp.hp -= dmg;
          enemyNearCamp.flashHurt = 0.2;
          combatTextSystem.addText(enemyNearCamp.x, enemyNearCamp.y - 20, `${dmg} (Takezo)`, '#fbbf24');
          if (enemyNearCamp.hp <= 0 && !enemyNearCamp.dead) {
            this.killEnemyByEntity(enemyNearCamp, npc, particleSystem, combatTextSystem, uiManager);
          }
        }
      } else {
        const dHome = Math.hypot(npc.spawnX - npc.x, npc.spawnY - npc.y);
        if (dHome > 20) {
          const angle = Math.atan2(npc.spawnY - npc.y, npc.spawnX - npc.x);
          npc.x += Math.cos(angle) * (npc.speed * 0.5) * dt;
          npc.y += Math.sin(angle) * (npc.speed * 0.5) * dt;
        }
      }
    }
  }

  // --- PARTY MEMBER AI (FOLLOWS AND ASSISTS PLAYER) ---
  updatePartyMemberAI(npc, dt, player, particleSystem, combatTextSystem) {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 85) {
      const moveAngle = Math.atan2(dy, dx);
      const moveDist = npc.speed * dt;
      const nextX = npc.x + Math.cos(moveAngle) * moveDist;
      const nextY = npc.y + Math.sin(moveAngle) * moveDist;
      if (!this.world.checkCollision(nextX, nextY, 14)) {
        npc.x = nextX;
        npc.y = nextY;
      }
    }

    if (npc.id === 'yamada') {
      if (npc.attackCooldown <= 0) {
        const target = this.findNearestHostile(npc.x, npc.y, 350);
        if (target) {
          npc.attackCooldown = 2.2;
          const spellType = Math.random() > 0.4 ? 'frost' : 'meteor';
          if (spellType === 'frost') {
            sound.playFrost();
            particleSystem.addIceNova(target.x, target.y);
            const dmg = 450 + Math.floor(Math.random() * 200);
            target.hp -= dmg;
            target.flashHurt = 0.3;
            combatTextSystem.addText(target.x, target.y - 30, `${dmg} CRITICAL!`, '#67e8f9');
            npc.emote = '✨';
            npc.emoteTimer = 1.2;
          } else {
            sound.playMeteor();
            particleSystem.addMeteor(target.x, target.y);
            target.hp -= 999;
            target.flashHurt = 0.4;
            combatTextSystem.addText(target.x, target.y - 35, '999!! METEOR', '#f43f5e');
            npc.emote = '✨';
            npc.emoteTimer = 1.5;
          }
          if (target.hp <= 0 && !target.dead) {
            this.killEnemy(target, player, combatTextSystem);
          }
        }
      }
    }

    if (npc.id === 'akane') {
      if (player.hp < player.maxHp * 0.7 && npc.healCooldown <= 0) {
        npc.healCooldown = 5.0;
        sound.playHeal();
        player.hp = Math.min(player.maxHp, player.hp + 140);
        particleSystem.addHealAura(player.x, player.y);
        combatTextSystem.addText(player.x, player.y - 30, '+140 HP (Akane)', '#4ade80');
        npc.emote = '❤️';
        npc.emoteTimer = 2.0;
      }
    }
  }

  // Autonomous NPC gains EXP and levels up independently!
  npcGainExp(npc, amount, combatTextSystem, uiManager) {
    npc.exp += amount;
    combatTextSystem.addText(npc.x, npc.y - 15, `+${amount} EXP (${npc.name})`, '#67e8f9');

    if (npc.exp >= npc.expToNext) {
      npc.level += 1;
      npc.exp -= npc.expToNext;
      npc.expToNext = Math.floor(npc.expToNext * 1.5);
      npc.maxHp += 40;
      npc.hp = npc.maxHp;
      npc.maxMp += 20;
      npc.mp = npc.maxMp;

      sound.playLevelUp();
      combatTextSystem.addText(npc.x, npc.y - 40, `LEVEL UP! Lv.${npc.level}`, '#fbbf24', 2.0);
      npc.emote = '✨';
      npc.emoteTimer = 2.0;

      if (uiManager) {
        uiManager.chatMessages.push({
          sender: npc.name,
          channel: 'guild',
          text: `I just leveled up to Lv.${npc.level}! Feeling stronger now!`
        });
        uiManager.renderChatMessages();
      }
    }
  }

  triggerCozyCampfireBanter(uiManager) {
    if (!uiManager) return;
    const banters = [
      { sender: 'Rurihime', text: 'Yamada-kun, try this special strawberry chocolate cake! It gives +20% magic casting speed!' },
      { sender: 'Yamada', text: '...Too sweet. But thank you.' },
      { sender: 'Akane', text: 'Eita-san! Look, I gathered 3 more Moonbloom herbs! The slimes couldn\'t stop me this time!' },
      { sender: 'Takezo', text: 'Hahaha! Well done, Akane-chan! The guild cauldron has plenty of healing potion now!' },
      { sender: 'Yamada', text: 'Remember to check equipment durability before the Golem raid.' },
      { sender: 'Akane', text: 'Yamada-kun, your afro is glowing again under the campfire light, haha!' }
    ];

    const chosen = banters[Math.floor(Math.random() * banters.length)];
    uiManager.chatMessages.push({
      sender: chosen.sender,
      channel: 'guild',
      text: chosen.text
    });
    uiManager.renderChatMessages();

    // Emote on speaking NPC
    const speaker = this.npcs.find(n => n.name.includes(chosen.sender));
    if (speaker) {
      speaker.emote = '💬';
      speaker.emoteTimer = 2.0;
    }
  }

  findNearestHostile(x, y, maxRadius) {
    let nearest = null;
    let minD = maxRadius;
    for (const e of this.enemies) {
      if (!e.dead) {
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < minD) {
          minD = d;
          nearest = e;
        }
      }
    }
    return nearest;
  }

  findNearestHostileByType(x, y, maxRadius, type) {
    let nearest = null;
    let minD = maxRadius;
    for (const e of this.enemies) {
      if (!e.dead && e.type === type) {
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < minD) {
          minD = d;
          nearest = e;
        }
      }
    }
    return nearest;
  }

  killEnemyByEntity(enemy, killer, particleSystem, combatTextSystem, uiManager) {
    enemy.dead = true;
    enemy.respawnTimer = enemy.isBoss ? 45 : 12;
    const expGained = enemy.level * (enemy.isBoss ? 200 : 25);
    const goldGained = enemy.level * (enemy.isBoss ? 150 : 10);

    this.drops.push({
      x: enemy.x,
      y: enemy.y,
      exp: expGained,
      gold: goldGained,
      recipient: killer,
      life: 6.0
    });

    combatTextSystem.addText(enemy.x, enemy.y - 15, `+${goldGained} Gold`, '#fbbf24');
  }

  killEnemy(enemy, player, combatTextSystem) {
    enemy.dead = true;
    enemy.respawnTimer = enemy.isBoss ? 45 : 12;
    const expGained = enemy.level * (enemy.isBoss ? 200 : 25);
    const goldGained = enemy.level * (enemy.isBoss ? 150 : 10);

    player.gainExp(expGained, combatTextSystem);
    player.gold += goldGained;
    combatTextSystem.addText(enemy.x, enemy.y - 15, `+${goldGained} Gold`, '#fbbf24');

    if (enemy.type === 'wolf' && player.quests.wolves) {
      player.quests.wolves.progress = Math.min(player.quests.wolves.total, player.quests.wolves.progress + 1);
    }
    if (enemy.isBoss && player.quests.golem) {
      player.quests.golem.progress = 1;
    }
  }

  toggleYamadaAfro() {
    const yamada = this.npcs.find(n => n.id === 'yamada');
    if (yamada) {
      yamada.hair = (yamada.hair === 'afro') ? 'cool_bangs' : 'afro';
      sound.playEmote();
      yamada.emote = (yamada.hair === 'afro') ? '💢' : '✨';
      yamada.emoteTimer = 1.5;
    }
  }
}
