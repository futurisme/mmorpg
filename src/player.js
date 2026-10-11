/**
 * Player Entity & State Management for Forest of Savior RPG.
 * Responsive keyboard controls, stats, skills, inventory, leveling.
 * Enhanced Combat 2026:
 * - Smart Auto-Aim on Basic Slash (rotates directly toward nearest enemy, guaranteed hit)
 * - Skill Targeting Reticle & Aiming System (Aim with mouse/keys, snap to enemies, directional casting)
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
    this.attackAngle = 0;

    // Movement speeds
    this.baseSpeed = 160;
    this.sprintSpeed = 260;
    this.speed = this.baseSpeed;
    this.isSprinting = false;

    // Customization
    this.custom = {
      hair: 'anime_bangs', // anime_bangs, afro, twintails, long_bangs
      hairColor: '#38bdf8', // sky cyan
      skinColor: '#fde047',
      outfit: 'adventurer', // adventurer, archmage, paladin, chocolate_tunic
      weapon: 'sword', // sword, staff, daggers
      headAccessory: 'none'
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

    // Skill Aiming & Reticle System
    this.aimingSkill = null; // Currently aiming skill
    this.aimX = 1380;
    this.aimY = 1420;
    this.aimSnappedEnemy = null;

    // Skills
    this.skills = [
      { id: 1, name: 'Fire Spiral', key: '1', cd: 2.2, currentCd: 0, mpCost: 15, range: 160, aoeRadius: 110, color: '#f97316', desc: 'Release an explosive flame wave towards target.' },
      { id: 2, name: 'Absolute Frost', key: '2', cd: 4.5, currentCd: 0, mpCost: 25, range: 240, aoeRadius: 150, color: '#38bdf8', desc: 'Yamada-kun\'s signature ice ring, freezes area with glacial crystals.' },
      { id: 3, name: 'Meteor Cataclysm', key: '3', cd: 9.0, currentCd: 0, mpCost: 50, range: 380, aoeRadius: 210, color: '#f43f5e', desc: 'Summon an ancient cosmic meteor crashing onto designated location!' },
      { id: 4, name: 'Sakura Blessing', key: '4', cd: 6.0, currentCd: 0, mpCost: 30, range: 0, aoeRadius: 80, color: '#4ade80', desc: 'Summon healing cherry blossom petals to restore 120 HP & full Stamina.' },
      { id: 5, name: 'Phantom Dash', key: '5', cd: 3.0, currentCd: 0, mpCost: 10, range: 170, aoeRadius: 40, color: '#a855f7', desc: 'Aim and instantly warp through shadows to target location.' }
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

      if (!this.aimingSkill) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.facing = dx > 0 ? 'right' : 'left';
        } else {
          this.facing = dy > 0 ? 'down' : 'up';
        }
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

    // 4. Update Aim Reticle if aiming skill
    if (this.aimingSkill && input.mouseWorld) {
      this.updateSkillAim(input.mouseWorld, npcManager);
    }

    // 5. Combat - Basic Attack (Spacebar) with Auto-Aim
    if (input.keys['Space'] && this.attackCooldown <= 0) {
      if (this.aimingSkill) {
        // If aiming, space confirms cast!
        this.castAimingSkill(world, particleSystem, combatTextSystem, npcManager);
      } else {
        this.performBasicAttack(world, particleSystem, combatTextSystem, npcManager);
      }
    }
  }

  /**
   * Find nearest living enemy within a specific radius
   */
  findNearestEnemy(npcManager, maxRadius = 240) {
    let nearest = null;
    let minDist = maxRadius;

    for (const enemy of npcManager.enemies) {
      if (enemy.dead) continue;
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  /**
   * Basic Attack with Auto-Aim & Guaranteed Hit
   */
  performBasicAttack(world, particleSystem, combatTextSystem, npcManager) {
    this.attackCooldown = 0.28;
    this.attackSwingTimer = 0.22;
    sound.playSlash();

    // 1. Check for Auto-Aim target within comfortable radius (240px)
    const targetEnemy = this.findNearestEnemy(npcManager, 240);

    let attackAngle = 0;
    let hx = this.x;
    let hy = this.y;

    if (targetEnemy) {
      // Calculate exact angle to enemy
      attackAngle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x);
      this.attackAngle = attackAngle;

      // Automatically rotate player to face the locked enemy
      if (Math.abs(Math.cos(attackAngle)) > Math.abs(Math.sin(attackAngle))) {
        this.facing = Math.cos(attackAngle) > 0 ? 'right' : 'left';
      } else {
        this.facing = Math.sin(attackAngle) > 0 ? 'down' : 'up';
      }

      // Responsive combat micro-lunge towards enemy if distance is between 35 and 150px
      const dist = Math.hypot(targetEnemy.x - this.x, targetEnemy.y - this.y);
      if (dist > 35 && dist < 160) {
        const lungeDist = Math.min(26, dist - 25);
        const lungeX = this.x + Math.cos(attackAngle) * lungeDist;
        const lungeY = this.y + Math.sin(attackAngle) * lungeDist;
        if (!world.checkCollision(lungeX, lungeY, this.radius)) {
          this.x = lungeX;
          this.y = lungeY;
        }
      }

      // Hitbox is directly centered between player and enemy (guaranteed reach)
      hx = targetEnemy.x;
      hy = targetEnemy.y;
    } else {
      // No enemy nearby: attack in front of current facing
      const reach = 44;
      if (this.facing === 'right') { hx += reach; attackAngle = 0; }
      else if (this.facing === 'left') { hx -= reach; attackAngle = Math.PI; }
      else if (this.facing === 'down') { hy += reach; attackAngle = Math.PI / 2; }
      else if (this.facing === 'up') { hy -= reach; attackAngle = -Math.PI / 2; }
      this.attackAngle = attackAngle;
    }

    // Spawn directional slash arc aligned precisely with auto-aim angle
    particleSystem.addSlashArc(hx, hy, this.facing, attackAngle);

    // Damage enemies in reach (if locked enemy exists, guaranteed hit!)
    let hitCount = 0;
    for (const enemy of npcManager.enemies) {
      if (enemy.dead) continue;

      const dToHitbox = Math.hypot(enemy.x - hx, enemy.y - hy);
      const isTarget = targetEnemy && enemy === targetEnemy;

      if (isTarget || dToHitbox < (enemy.radius + 36)) {
        hitCount++;
        const isCrit = Math.random() < 0.28;
        const damage = isCrit ? Math.floor(this.attack * 1.85) : this.attack;
        enemy.hp -= damage;
        enemy.flashHurt = 0.22;

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

  /**
   * Initiate Skill Aiming Mode
   */
  startAimingSkill(skillNumber, npcManager) {
    const skill = this.skills.find(s => s.id === skillNumber);
    if (!skill) return false;

    if (skill.currentCd > 0) {
      sound.playClick();
      return false;
    }

    if (this.mp < skill.mpCost) {
      sound.playClick();
      return false;
    }

    // Skill 4 is Sakura Blessing (Instant self-heal, no manual aim needed)
    if (skillNumber === 4) {
      return this.executeSkill(4, this.x, this.y, null, null, null, null);
    }

    this.aimingSkill = skill;
    sound.playClick();

    // Default aim position towards current facing or auto-target enemy
    const nearest = this.findNearestEnemy(npcManager, skill.range || 200);
    if (nearest) {
      this.aimX = nearest.x;
      this.aimY = nearest.y;
      this.aimSnappedEnemy = nearest;
    } else {
      let offset = Math.min(skill.range || 120, 100);
      this.aimX = this.x + (this.facing === 'right' ? offset : (this.facing === 'left' ? -offset : 0));
      this.aimY = this.y + (this.facing === 'down' ? offset : (this.facing === 'up' ? -offset : 0));
      this.aimSnappedEnemy = null;
    }

    return true;
  }

  cancelAiming() {
    if (this.aimingSkill) {
      this.aimingSkill = null;
      this.aimSnappedEnemy = null;
      sound.playClick();
    }
  }

  /**
   * Update aiming reticle based on mouse coordinates in world space
   */
  updateSkillAim(mouseWorld, npcManager) {
    if (!this.aimingSkill) return;

    let targetX = mouseWorld.x;
    let targetY = mouseWorld.y;

    // Check magnetic auto-snap to nearby enemy within 80px
    let snapped = null;
    let minDist = 80;
    for (const enemy of npcManager.enemies) {
      if (enemy.dead) continue;
      const d = Math.hypot(enemy.x - targetX, enemy.y - targetY);
      if (d < minDist) {
        minDist = d;
        snapped = enemy;
      }
    }

    if (snapped) {
      targetX = snapped.x;
      targetY = snapped.y;
      this.aimSnappedEnemy = snapped;
    } else {
      this.aimSnappedEnemy = null;
    }

    // Clamp distance to skill max range
    const maxRange = this.aimingSkill.range || 200;
    const distFromPlayer = Math.hypot(targetX - this.x, targetY - this.y);
    if (distFromPlayer > maxRange) {
      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      targetX = this.x + Math.cos(angle) * maxRange;
      targetY = this.y + Math.sin(angle) * maxRange;
    }

    this.aimX = targetX;
    this.aimY = targetY;

    // Orient player towards aim point
    const faceAngle = Math.atan2(this.aimY - this.y, this.aimX - this.x);
    if (Math.abs(Math.cos(faceAngle)) > Math.abs(Math.sin(faceAngle))) {
      this.facing = Math.cos(faceAngle) > 0 ? 'right' : 'left';
    } else {
      this.facing = Math.sin(faceAngle) > 0 ? 'down' : 'up';
    }
  }

  /**
   * Cast the currently aimed skill
   */
  castAimingSkill(world, particleSystem, combatTextSystem, npcManager) {
    if (!this.aimingSkill) return false;

    const skill = this.aimingSkill;
    const tx = this.aimX;
    const ty = this.aimY;
    this.aimingSkill = null;
    this.aimSnappedEnemy = null;

    return this.executeSkill(skill.id, tx, ty, world, particleSystem, combatTextSystem, npcManager);
  }

  /**
   * Direct Skill Invocation or Trigger Aiming Mode
   */
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

    // Skill 4 is instant self-buff
    if (skillNumber === 4) {
      return this.executeSkill(4, this.x, this.y, world, particleSystem, combatTextSystem, npcManager);
    }

    // If currently aiming this exact skill, cast it!
    if (this.aimingSkill && this.aimingSkill.id === skillNumber) {
      return this.castAimingSkill(world, particleSystem, combatTextSystem, npcManager);
    }

    // Otherwise, start aiming
    return this.startAimingSkill(skillNumber, npcManager);
  }

  /**
   * Execute skill logic at target position
   */
  executeSkill(skillNumber, tx, ty, world, particleSystem, combatTextSystem, npcManager) {
    const skill = this.skills.find(s => s.id === skillNumber);
    if (!skill) return false;

    // Deduct MP and apply cooldown
    this.mp -= skill.mpCost;
    skill.currentCd = skill.cd;

    if (skillNumber === 1) {
      // 1. Fire Spiral (Aimable flame burst)
      sound.playFireball();
      particleSystem.addFireRing(tx, ty);

      for (const enemy of npcManager.enemies) {
        if (!enemy.dead && Math.hypot(enemy.x - tx, enemy.y - ty) < 130) {
          const dmg = Math.floor(this.magicPower * 1.55);
          enemy.hp -= dmg;
          enemy.flashHurt = 0.25;
          combatTextSystem.addText(enemy.x, enemy.y - 25, `${dmg} FIRE`, '#f97316');
          particleSystem.addHitSpark(enemy.x, enemy.y);
          if (enemy.hp <= 0 && !enemy.dead) npcManager.killEnemy(enemy, this, combatTextSystem);
        }
      }
    } else if (skillNumber === 2) {
      // 2. Absolute Frost (Aimable icy rune field)
      sound.playFrost();
      particleSystem.addIceNova(tx, ty);

      for (const enemy of npcManager.enemies) {
        if (!enemy.dead && Math.hypot(enemy.x - tx, enemy.y - ty) < 180) {
          const dmg = Math.floor(this.magicPower * 2.3);
          enemy.hp -= dmg;
          enemy.flashHurt = 0.35;
          combatTextSystem.addText(enemy.x, enemy.y - 25, `${dmg} FROST!`, '#38bdf8');
          if (enemy.hp <= 0 && !enemy.dead) npcManager.killEnemy(enemy, this, combatTextSystem);
        }
      }
    } else if (skillNumber === 3) {
      // 3. Meteor Cataclysm (Aimable celestial meteor drop)
      sound.playMeteor();
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
      // 4. Sakura Blessing (Instant self heal & party aura)
      sound.playHeal();
      this.hp = Math.min(this.maxHp, this.hp + 120);
      this.stamina = this.maxStamina;
      particleSystem.addHealAura(this.x, this.y);
      combatTextSystem.addText(this.x, this.y - 30, '+120 HP BLESSING', '#4ade80');
    } else if (skillNumber === 5) {
      // 5. Phantom Dash (Aimable shadow teleport)
      sound.playDash();
      particleSystem.addDashShadow(this.x, this.y);

      if (!world.checkCollision(tx, ty, this.radius)) {
        this.x = tx;
        this.y = ty;
      }
      particleSystem.addDashShadow(this.x, this.y);
      sound.playHit();
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
