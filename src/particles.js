/**
 * Particle Effects & Floating Combat Text for Forest of Savior RPG.
 * Anime aesthetics with drifting sakura petals, arcane fire, ice mist, and meteors.
 * 100% pure JavaScript.
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.sakuraPetals = [];
    this.maxSakura = 45;
    this.screenShake = 0;
    this.shakeDecay = 12;

    this.initSakura();
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

  update(dt) {
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

  addScreenShake(amount = 8) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  addHitSpark(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        color: '#fef08a',
        life: 0.25,
        maxLife: 0.25,
        type: 'spark'
      });
    }
  }

  addSlashArc(x, y, facing) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      facing,
      life: 0.18,
      maxLife: 0.18,
      type: 'slash_arc',
      color: '#ffffff'
    });
  }

  addFootstepDust(x, y) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -10 - Math.random() * 15,
      size: 3 + Math.random() * 2,
      color: 'rgba(203, 213, 225, 0.4)',
      life: 0.3,
      maxLife: 0.3,
      type: 'dust'
    });
  }

  addFireRing(x, y) {
    this.addScreenShake(3);
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 90 + Math.random() * 50;
      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 4,
        color: i % 2 === 0 ? '#f97316' : '#ef4444',
        life: 0.45,
        maxLife: 0.45,
        friction: 0.94,
        type: 'fire'
      });
    }
  }

  addIceNova(x, y) {
    this.addScreenShake(4);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 120 + Math.random() * 60;
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
    this.addScreenShake(12);
    // Impact blast ring
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = 160 + Math.random() * 120;
      this.particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        color: i % 3 === 0 ? '#f43f5e' : (i % 3 === 1 ? '#fbbf24' : '#818cf8'),
        life: 0.7,
        maxLife: 0.7,
        friction: 0.9,
        type: 'meteor_crater'
      });
    }
  }

  addHealAura(x, y) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 35;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 20,
        vy: -40 - Math.random() * 30,
        size: 4 + Math.random() * 3,
        color: '#4ade80',
        life: 0.6,
        maxLife: 0.6,
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
    this.addScreenShake(7);
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 30 + Math.random() * 20;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 70,
        vy: Math.sin(angle) * 70,
        size: 5 + Math.random() * 3,
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
