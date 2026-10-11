/**
 * Advanced Particle Effects & Spell VFX for Forest of Savior RPG.
 * Anime aesthetics with falling celestial meteors, rotating runic summon circles,
 * crystalline ice spikes, shockwaves, drifting sakura petals, and floating combat text.
 * Distance-attenuated screen shake engine (no screen shake for distant impacts).
 * 100% pure JavaScript.
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.sakuraPetals = [];
    this.runicCircles = [];
    this.fallingMeteors = [];
    this.iceSpikes = [];
    this.maxSakura = 45;
    this.screenShake = 0;
    this.shakeDecay = 14;
    this.playerRef = null;

    this.initSakura();
  }

  setPlayerRef(player) {
    this.playerRef = player;
  }

  initSakura() {
    for (let i = 0; i < this.maxSakura; i++) {
      this.sakuraPetals.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        size: 3 + Math.random() * 4,
        speedX: 15 + Math.random() * 25,
        speedY: 20 + Math.random() * 30,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2,
        opacity: 0.4 + Math.random() * 0.5
      });
    }
  }

  update(dt, player = null) {
    if (player) this.playerRef = player;

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - this.shakeDecay * dt);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.friction) {
        p.vx *= p.friction;
        p.vy *= p.friction;
      }
      p.opacity = Math.max(0, p.life / p.maxLife);
    }

    // Update Runic Summon Circles
    for (let i = this.runicCircles.length - 1; i >= 0; i--) {
      const rc = this.runicCircles[i];
      rc.life -= dt;
      rc.rot += rc.rotSpeed * dt;
      if (rc.life <= 0) {
        this.runicCircles.splice(i, 1);
      }
    }

    // Update Falling Meteors
    for (let i = this.fallingMeteors.length - 1; i >= 0; i--) {
      const m = this.fallingMeteors[i];
      m.progress += dt / m.duration;
      m.curX = m.startX + (m.targetX - m.startX) * m.progress;
      m.curY = m.startY + (m.targetY - m.startY) * m.progress;

      // Trailing flame particles
      if (Math.random() < 0.6) {
        this.particles.push({
          x: m.curX + (Math.random() - 0.5) * 16,
          y: m.curY + (Math.random() - 0.5) * 16,
          vx: -(m.targetX - m.startX) * 0.05 + (Math.random() - 0.5) * 30,
          vy: -(m.targetY - m.startY) * 0.05 + (Math.random() - 0.5) * 30,
          size: 6 + Math.random() * 6,
          color: Math.random() < 0.5 ? '#f43f5e' : '#fbbf24',
          life: 0.35,
          maxLife: 0.35,
          type: 'fire'
        });
      }

      if (m.progress >= 1) {
        // Impact with distance attenuation!
        this.addScreenShake(15, m.targetX, m.targetY, this.playerRef, 650);
        this.createMeteorImpactCrater(m.targetX, m.targetY);
        this.fallingMeteors.splice(i, 1);
      }
    }

    // Update Ice Spikes
    for (let i = this.iceSpikes.length - 1; i >= 0; i--) {
      const is = this.iceSpikes[i];
      is.life -= dt;
      if (is.life <= 0) {
        // Shatter
        for (let s = 0; s < 4; s++) {
          this.particles.push({
            x: is.x,
            y: is.y,
            vx: (Math.random() - 0.5) * 100,
            vy: -40 - Math.random() * 60,
            size: 3 + Math.random() * 3,
            color: '#e0f2fe',
            life: 0.3,
            maxLife: 0.3,
            gravity: 120,
            type: 'ice'
          });
        }
        this.iceSpikes.splice(i, 1);
      }
    }

    // Update ambient Sakura petals
    for (const petal of this.sakuraPetals) {
      petal.x += petal.speedX * dt;
      petal.y += petal.speedY * dt;
      petal.angle += petal.rotSpeed * dt;

      // Wrap around world
      if (petal.x > 2900) petal.x = -50;
      if (petal.y > 2900) petal.y = -50;
    }
  }

  /**
   * Distance-attenuated Screen Shake:
   * When source coordinates are provided, shake falls off with distance.
   * If player is beyond maxRadius (e.g. 500-600px), intensity is 0 (no shake felt).
   */
  addScreenShake(amount = 8, sourceX = null, sourceY = null, player = null, maxRadius = 550) {
    const p = player || this.playerRef;
    if (sourceX !== null && sourceY !== null && p) {
      const dist = Math.hypot(p.x - sourceX, p.y - sourceY);
      if (dist >= maxRadius) {
        return; // Zero shake when player is far away!
      }
      const factor = Math.max(0, 1 - (dist / maxRadius));
      // Quadratic attenuation for realistic physical shockwave dropoff
      const attenuatedAmount = amount * (factor * factor);
      if (attenuatedAmount < 0.4) return;
      this.screenShake = Math.max(this.screenShake, attenuatedAmount);
    } else {
      // Direct shake (e.g. player hit, self skill)
      this.screenShake = Math.max(this.screenShake, amount);
    }
  }

  addHitSpark(x, y) {
    for (let i = 0; i < 9; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2.5,
        color: '#fef08a',
        life: 0.25,
        maxLife: 0.25,
        type: 'spark'
      });
    }
  }

  addSlashArc(x, y, facing, angle = null) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      facing,
      angle,
      life: 0.24,
      maxLife: 0.24,
      type: 'slash_arc',
      color: '#38bdf8'
    });

    // Add bright dynamic blade sparks along slash direction
    const baseAngle = angle !== null ? angle : (
      facing === 'right' ? 0 : (facing === 'down' ? Math.PI / 2 : (facing === 'left' ? Math.PI : -Math.PI / 2))
    );
    for (let i = -2; i <= 2; i++) {
      const sparkAngle = baseAngle + (i * 0.2);
      this.particles.push({
        x: x + Math.cos(sparkAngle) * 15,
        y: y + Math.sin(sparkAngle) * 15,
        vx: Math.cos(sparkAngle) * (120 + Math.random() * 50),
        vy: Math.sin(sparkAngle) * (120 + Math.random() * 50),
        size: 2.5 + Math.random() * 2,
        color: i % 2 === 0 ? '#38bdf8' : '#e0f2fe',
        life: 0.2,
        maxLife: 0.2,
        type: 'spark'
      });
    }
  }

  addFootstepDust(x, y) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -10 - Math.random() * 15,
      size: 3 + Math.random() * 2,
      color: '#475569',
      life: 0.35,
      maxLife: 0.35,
      type: 'dust'
    });
  }

  addFireRing(x, y) {
    // Summon rune
    this.runicCircles.push({
      x,
      y,
      radius: 75,
      color: '#f97316',
      rot: 0,
      rotSpeed: 3.5,
      life: 0.6,
      maxLife: 0.6
    });

    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 100 + Math.random() * 60;
      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 5,
        color: i % 2 === 0 ? '#f97316' : '#ef4444',
        life: 0.45,
        maxLife: 0.45,
        friction: 0.94,
        type: 'fire'
      });
    }
  }

  addIceNova(x, y) {
    this.addScreenShake(5, x, y, this.playerRef, 500);
    // Add ice summon rune
    this.runicCircles.push({
      x,
      y,
      radius: 95,
      color: '#38bdf8',
      rot: 0,
      rotSpeed: -3.0,
      life: 0.75,
      maxLife: 0.75
    });

    // Spawn 8 crystalline ice spikes around the center
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 35 + Math.random() * 45;
      this.iceSpikes.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        height: 24 + Math.random() * 16,
        width: 10 + Math.random() * 6,
        angle: (Math.random() - 0.5) * 0.4,
        life: 0.7,
        maxLife: 0.7
      });
    }

    // Mist & sparkles
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2;
      const speed = 130 + Math.random() * 70;
      this.particles.push({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color: i % 2 === 0 ? '#38bdf8' : '#e0f2fe',
        life: 0.55,
        maxLife: 0.55,
        friction: 0.92,
        type: 'ice'
      });
    }
  }

  addMeteor(targetX, targetY) {
    // Initial warning rumble with distance falloff
    this.addScreenShake(6, targetX, targetY, this.playerRef, 600);
    // 1. Project large glowing runic summoning matrix on target ground
    this.runicCircles.push({
      x: targetX,
      y: targetY,
      radius: 120,
      color: '#f43f5e',
      rot: 0,
      rotSpeed: 4.5,
      life: 1.1,
      maxLife: 1.1
    });

    // 2. Launch celestial meteor from high altitude
    this.fallingMeteors.push({
      startX: targetX - 260,
      startY: targetY - 380,
      targetX,
      targetY,
      curX: targetX - 260,
      curY: targetY - 380,
      progress: 0,
      duration: 0.35 // arrives in 350ms
    });
  }

  createMeteorImpactCrater(targetX, targetY) {
    for (let i = 0; i < 45; i++) {
      const angle = (i / 45) * Math.PI * 2;
      const speed = 180 + Math.random() * 140;
      this.particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 7,
        color: i % 3 === 0 ? '#f43f5e' : (i % 3 === 1 ? '#fbbf24' : '#818cf8'),
        life: 0.75,
        maxLife: 0.75,
        friction: 0.9,
        type: 'meteor_crater'
      });
    }
  }

  addHealAura(x, y) {
    // Healing floral ring
    this.runicCircles.push({
      x,
      y,
      radius: 50,
      color: '#4ade80',
      rot: 0,
      rotSpeed: 2.0,
      life: 0.5,
      maxLife: 0.5
    });

    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 35;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 20,
        vy: -45 - Math.random() * 35,
        size: 4 + Math.random() * 3,
        color: '#4ade80',
        life: 0.65,
        maxLife: 0.65,
        type: 'spark'
      });
    }
  }

  addDashShadow(x, y) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.25,
      maxLife: 0.25,
      type: 'after_image',
      color: '#38bdf8'
    });
  }

  addGroundSlam(x, y) {
    this.addScreenShake(8, x, y, this.playerRef, 500);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const dist = 30 + Math.random() * 25;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 75,
        vy: Math.sin(angle) * 75,
        size: 5 + Math.random() * 4,
        color: '#a8a29e',
        life: 0.5,
        maxLife: 0.5,
        type: 'dust'
      });
    }
  }
}

export class CombatTextSystem {
  constructor() {
    this.texts = [];
  }

  addText(x, y, text, color = '#ffffff', duration = 0.9) {
    this.texts.push({
      x: x + (Math.random() - 0.5) * 16,
      y,
      text,
      color,
      life: duration,
      maxLife: duration
    });
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 25 * dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }
}
