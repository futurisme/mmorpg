/**
 * Player Entity & State Management for Forest of Savior RPG.
 * Responsive keyboard controls, stats, skills, inventory, leveling.
 * 100% pure JavaScript.
 */

import { sound } from './sound.js';

export class Player {
  constructor() {
    this.name = 'Rookie Traveler';
    this.title = 'Apprentice of Savior';
    this.guild = 'Chocolate Everyday';

    // World coordinates (Start at campfire)
    this.x = 1380;
    this.y = 1420;
    this.vx = 0;
    this.vy = 0;
    this.radius = 14;
    this.facing = 'down'; // down, up, left, right

    // Movement speeds
    this.baseSpeed = 160;
    this.sprintSpeed = 260;
    this.speed = this.baseSpeed;
    this.isSprinting = false;

    // Customization
    this.custom = {
      hair: 'anime_bangs', // anime_bangs, afro, twintails, samurai, hood
      hairColor: '#38bdf8', // sky cyan
      skinColor: '#fde047',
      outfit: 'adventurer', // adventurer, archmage, paladin, chocolate_tunic
      weapon: 'sword', // sword, staff, daggers, bow
      headAccessory: 'none' // none, afro, ribbon, cat_ears, wizard_hat
    };

    // RPG Stats & Progression
    this.level = 1;
    this.exp = 0;
    this.expToNext = 100;
    this.gold = 150;

    this.maxHp = 250;
    this.hp = 250;
    this.maxMp = 150;
    this.mp = 150;
    this.maxStamina = 100;
    this.stamina = 100;

    this.attack = 35;
    this.defense = 12;
    this.magicPower = 40;

    // Combat & Cooldowns
    this.attackCooldown = 0;
    this.flashHurt = 0;
    this.isAttacking = false;
    this.attackSwingTimer = 0;

    // Skills
    this.skills = [
      { id: 1, name: 'Fire Spiral', key: '1', cd: 2.2, currentCd: 0, mpCost: 15, desc: 'Release an explosive flame wave that burns nearby enemies.' },
      { id: 2, name: 'Absolute Frost', key: '2', cd: 4.5, currentCd: 0, mpCost: 25, desc: 'Yamada-kun\'s signature ice ring, deals heavy magic damage and freezes.' },
      { id: 3, name: 'Meteor Cataclysm', key: '3', cd: 9.0, currentCd: 0, mpCost: 50, desc: 'Summon an ancient anime meteor crashing down from the cosmos!' },
      { id: 4, name: 'Sakura Blessing', key: '4', cd: 6.0, currentCd: 0, mpCost: 30, desc: 'Summon healing cherry blossom petals to restore 90 HP & full Stamina.' },
      { id: 5, name: 'Phantom Dash', key: '5', cd: 3.0, currentCd: 0, mpCost: 10, desc: 'Instantly warp forward 140px through shadows.' }
    ];

    // Inventory & Equipment
    this.inventory = [
      { id: 'potion_hp', name: 'Cherry HP Potion', count: 5, type: 'consumable', heal: 80, desc: 'Sweet cherry potion, restores 80 HP.' },
      { id: 'potion_mp', name: 'Mana Soda', count: 5, type: 'consumable', mana: 60, desc: 'Fizzy ramune soda, restores 60 MP.' },
      { id: 'choco_cake', name: 'Chocolate Slice', count: 3, type: 'consumable', buff: 'atk', desc: 'Baked by Eita. Temporarily increases ATK by 20%!' }
    ];

    // Active Quests
    this.quests = {
      herbs: {
        active: false,
        name: 'Moonbloom for Akane',
        desc: 'Gather 3 Moonbloom Herbs in the woods for Akane.',
        progress: 0,
        total: 3,
        rewardExp: 150,
        rewardGold: 100,
        completed: false
      },
      wolves: {
        active: false,
        name: 'Clear the Glade Wolves',
        desc: 'Defeat 3 Glade Wolves in the southwest den for Rurihime.',
        progress: 0,
        total: 3,
        rewardExp: 350,
        rewardGold: 250,
        completed: false
      },
      golem: {
        active: false,
        name: 'Guardian of the Ruins',
        desc: 'Defeat the Ancient Forest Golem with your party.',
        progress: 0,
        total: 1,
        rewardExp: 1200,
        rewardGold: 800,
        completed: false
      }
    };

    // Chat / Emotes
    this.emote = null;
    this.emoteTimer = 0;
  }

  update(dt, input, world, particleSystem, combatTextSystem, npcManager) {
    // 1. Cooldown updates
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.attackSwingTimer > 0) this.attackSwingTimer -= dt;
    if (this.flashHurt > 0) this.flashHurt -= dt;
    if (this.emoteTimer > 0) {
      this.emoteTimer -= dt;
      if (this.emoteTimer <= 0) this.emote = null;
    }

    for (const s of this.skills) {
      if (s.currentCd > 0) {
        s.currentCd = Math.max(0, s.currentCd - dt);
      }
    }

    // 2. Stamina & MP natural regeneration
    if (this.isSprinting && (input.keys['KeyW'] || input.keys['KeyS'] || input.keys['KeyA'] || input.keys['KeyD'] || input.keys['ArrowUp'] || input.keys['ArrowDown'] || input.keys['ArrowLeft'] || input.keys['ArrowRight'])) {
      this.stamina = Math.max(0, this.stamina - 28 * dt);
      if (this.stamina <= 0) {
        this.isSprinting = false;
      }
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 20 * dt);
    }

    // Campfire health/mana aura
    let nearCampfire = false;
    for (const c of world.campfires) {
      if (Math.hypot(this.x - c.x, this.y - c.y) < c.healRadius) {
        nearCampfire = true;
        this.hp = Math.min(this.maxHp, this.hp + 25 * dt);
        this.mp = Math.min(this.maxMp, this.mp + 20 * dt);
        break;
      }
    }

    if (!nearCampfire) {
      this.mp = Math.min(this.maxMp, this.mp + 4 * dt);
    }

    // 3. Responsive Movement
    let dx = 0;
    let dy = 0;

    if (input.keys['KeyW'] || input.keys['ArrowUp']) dy -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) dy += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) dx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) dx += 1;

    this.isSprinting = !!input.keys['ShiftLeft'] || !!input.keys['ShiftRight'];
    if (this.stamina <= 5) this.isSprinting = false;

    this.speed = this.isSprinting ? this.sprintSpeed : this.baseSpeed;

    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal speed
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx > 0 ? 'right' : 'left';
      } else {
        this.facing = dy > 0 ? 'down' : 'up';
      }

      // Try moving on X
      const nextX = this.x + dx * this.speed * dt;
      if (!world.checkCollision(nextX, this.y, this.radius)) {
        this.x = nextX;
      }

      // Try moving on Y
      const nextY = this.y + dy * this.speed * dt;
      if (!world.checkCollision(this.x, nextY, this.radius)) {
        this.y = nextY;
      }

      // Sprint motion particles
      if (this.isSprinting && Math.random() < 0.3) {
        particleSystem.addFootstepDust(this.x, this.y + 10);
      }
    }

    // 4. Combat - Basic Attack (Spacebar)
    if (input.keys['Space'] && this.attackCooldown <= 0) {
      this.performBasicAttack(world, particleSystem, combatTextSystem, npcManager);
    }
  }

  performBasicAttack(world, particleSystem, combatTextSystem, npcManager) {
    this.attackCooldown = 0.32;
    this.attackSwingTimer = 0.22;
    sound.playSlash();

    // Hitbox in front of player
    let hx = this.x;
    let hy = this.y;
    const reach = 42;
    if (this.facing === 'right') hx += reach;
    else if (this.facing === 'left') hx -= reach;
    else if (this.facing === 'down') hy += reach;
    else if (this.facing === 'up') hy -= reach;

    particleSystem.addSlashArc(hx, hy, this.facing);

    // Damage enemies in reach
    for (const enemy of npcManager.enemies) {
      if (!enemy.dead && Math.hypot(enemy.x - hx, enemy.y - hy) < (enemy.radius + 30)) {
        const isCrit = Math.random() < 0.25;
        const damage = isCrit ? Math.floor(this.attack * 1.8) : this.attack;
        enemy.hp -= damage;
        enemy.flashHurt = 0.2;

        if (isCrit) {
          sound.playCritical();
          combatTextSystem.addText(enemy.x, enemy.y - 25, `${damage} CRIT!`, '#fbbf24');
        } else {
          sound.playHit();
          combatTextSystem.addText(enemy.x, enemy.y - 20, `${damage}`, '#ffffff');
        }

        particleSystem.addHitSpark(enemy.x, enemy.y);

        if (enemy.hp <= 0 && !enemy.dead) {
          npcManager.killEnemy(enemy, this, combatTextSystem);
        }
      }
    }
  }

  useSkill(skillNumber, world, particleSystem, combatTextSystem, npcManager) {
    const skill = this.skills.find(s => s.id === skillNumber);
    if (!skill) return false;

    if (skill.currentCd > 0) {
      sound.playClick();
      combatTextSystem.addText(this.x, this.y - 30, 'Skill on Cooldown!', '#94a3b8');
      return false;
    }

    if (this.mp < skill.mpCost) {
      sound.playClick();
      combatTextSystem.addText(this.x, this.y - 30, 'Not enough Mana!', '#38bdf8');
      return false;
    }

    // Deduct MP and set CD
    this.mp -= skill.mpCost;
    skill.currentCd = skill.cd;

    if (skillNumber === 1) {
      // 1. Fire Spiral (AoE burst around player)
      sound.playFireball();
      particleSystem.addFireRing(this.x, this.y);
      for (const enemy of npcManager.enemies) {
        if (!enemy.dead && Math.hypot(enemy.x - this.x, enemy.y - this.y) < 130) {
          const dmg = Math.floor(this.magicPower * 1.4);
          enemy.hp -= dmg;
          enemy.flashHurt = 0.25;
          combatTextSystem.addText(enemy.x, enemy.y - 25, `${dmg} FIRE`, '#f97316');
          particleSystem.addHitSpark(enemy.x, enemy.y);
          if (enemy.hp <= 0 && !enemy.dead) npcManager.killEnemy(enemy, this, combatTextSystem);
        }
      }
    } else if (skillNumber === 2) {
      // 2. Absolute Frost (Yamada's spell)
      sound.playFrost();
      particleSystem.addIceNova(this.x, this.y);
      for (const enemy of npcManager.enemies) {
        if (!enemy.dead && Math.hypot(enemy.x - this.x, enemy.y - this.y) < 180) {
          const dmg = Math.floor(this.magicPower * 2.2);
          enemy.hp -= dmg;
          enemy.flashHurt = 0.35;
          combatTextSystem.addText(enemy.x, enemy.y - 25, `${dmg} FROST!`, '#38bdf8');
          if (enemy.hp <= 0 && !enemy.dead) npcManager.killEnemy(enemy, this, combatTextSystem);
        }
      }
    } else if (skillNumber === 3) {
      // 3. Meteor Cataclysm (Huge Lv999 Arcane Meteor)
      sound.playMeteor();
      let tx = this.x;
      let ty = this.y;
      if (this.facing === 'right') tx += 120;
      else if (this.facing === 'left') tx -= 120;
      else if (this.facing === 'down') ty += 120;
      else if (this.facing === 'up') ty -= 120;

      particleSystem.addMeteor(tx, ty);
      setTimeout(() => {
        for (const enemy of npcManager.enemies) {
          if (!enemy.dead && Math.hypot(enemy.x - tx, enemy.y - ty) < 220) {
            const dmg = 999;
            enemy.hp -= dmg;
            enemy.flashHurt = 0.5;
            combatTextSystem.addText(enemy.x, enemy.y - 35, '999! METEOR', '#f43f5e');
            if (enemy.hp <= 0 && !enemy.dead) npcManager.killEnemy(enemy, this, combatTextSystem);
          }
        }
      }, 250);
    } else if (skillNumber === 4) {
      // 4. Sakura Blessing (Heal)
      sound.playHeal();
      this.hp = Math.min(this.maxHp, this.hp + 120);
      this.stamina = this.maxStamina;
      particleSystem.addHealAura(this.x, this.y);
      combatTextSystem.addText(this.x, this.y - 30, '+120 HP', '#4ade80');
    } else if (skillNumber === 5) {
      // 5. Phantom Dash
      sound.playDash();
      particleSystem.addDashShadow(this.x, this.y);
      let dashDist = 130;
      let dirX = 0, dirY = 0;
      if (this.facing === 'right') dirX = 1;
      else if (this.facing === 'left') dirX = -1;
      else if (this.facing === 'down') dirY = 1;
      else if (this.facing === 'up') dirY = -1;

      const targetX = this.x + dirX * dashDist;
      const targetY = this.y + dirY * dashDist;
      if (!world.checkCollision(targetX, targetY, this.radius)) {
        this.x = targetX;
        this.y = targetY;
      }
      particleSystem.addDashShadow(this.x, this.y);
    }

    return true;
  }

  gainExp(amount, combatTextSystem) {
    this.exp += amount;
    combatTextSystem.addText(this.x, this.y - 20, `+${amount} EXP`, '#38bdf8');

    while (this.exp >= this.expToNext) {
      this.levelUp(combatTextSystem);
    }
  }

  levelUp(combatTextSystem) {
    this.level += 1;
    this.exp -= this.expToNext;
    this.expToNext = Math.floor(this.expToNext * 1.5);

    // Stat bonuses
    this.maxHp += 45;
    this.hp = this.maxHp;
    this.maxMp += 25;
    this.mp = this.maxMp;
    this.attack += 8;
    this.defense += 4;
    this.magicPower += 10;

    sound.playLevelUp();
    combatTextSystem.addText(this.x, this.y - 45, `LEVEL UP! Lv.${this.level}`, '#fbbf24', 2.0);
    this.emote = '✨';
    this.emoteTimer = 2.0;
  }

  useItem(itemIndex, combatTextSystem) {
    const item = this.inventory[itemIndex];
    if (!item) return;

    if (item.type === 'consumable') {
      if (item.heal) {
        sound.playHeal();
        this.hp = Math.min(this.maxHp, this.hp + item.heal);
        combatTextSystem.addText(this.x, this.y - 25, `+${item.heal} HP`, '#4ade80');
      } else if (item.mana) {
        sound.playPickup();
        this.mp = Math.min(this.maxMp, this.mp + item.mana);
        combatTextSystem.addText(this.x, this.y - 25, `+${item.mana} MP`, '#38bdf8');
      } else if (item.buff === 'atk') {
        sound.playCritical();
        this.attack += 15;
        combatTextSystem.addText(this.x, this.y - 25, '+15 ATK Buff!', '#fbbf24');
      }

      item.count -= 1;
      if (item.count <= 0) {
        this.inventory.splice(itemIndex, 1);
      }
    }
  }

  triggerEmote(emoteSymbol) {
    this.emote = emoteSymbol;
    this.emoteTimer = 2.5;
    sound.playEmote();
  }
}
