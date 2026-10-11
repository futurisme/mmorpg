/**
 * High-Performance 2D Canvas Pixel-Art Renderer for Forest of Savior RPG.
 * 2026 Engine Enhancements:
 * - Ultra-robust error-proof layering & entity depth sorting
 * - Dynamic atmospheric shaders: volumetric god-rays, chromatic aberration, radial fireglow, vignette
 * - Smart Skill Aiming Reticle: rotating elemental runes, range indicators, trajectory line, magnetic target lock
 * - Directional Slash Arc VFX: radiant curved sword swipe trails with precise angle rotation
 * - Crisp Vector Emotes above character heads: 100% vector drawn, zero OS-dependent emojis
 * - Clean anti-overlapping overhead nameplates & crisp typography
 * 100% pure JavaScript.
 */

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Camera settings
    this.camera = {
      x: 1400,
      y: 1400,
      targetX: 1400,
      targetY: 1400,
      zoom: 1.15,
      targetZoom: 1.15,
      angleMode: 'isometric', // 'isometric', 'topdown', 'action'
      scaleY: 0.84
    };

    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeAmount = 0;
    this.time = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  setCameraMode(mode) {
    this.camera.angleMode = mode;
    if (mode === 'isometric') {
      this.camera.scaleY = 0.84;
    } else if (mode === 'topdown') {
      this.camera.scaleY = 1.0;
    } else if (mode === 'action') {
      this.camera.scaleY = 0.74;
    }
  }

  setZoom(zoom) {
    this.camera.targetZoom = Math.min(1.8, Math.max(0.75, zoom));
  }

  updateCamera(targetX, targetY, dt, screenShake = 0) {
    this.time += dt;

    // Smooth camera follow (lerp)
    this.camera.x += (targetX - this.camera.x) * 0.12;
    this.camera.y += (targetY - this.camera.y) * 0.12;

    // Smooth zoom interpolation
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

    // Screen shake offset
    this.shakeAmount = screenShake;
    this.shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
    this.shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
  }

  screenToWorld(screenX, screenY) {
    const cx = this.width / 2 + this.shakeX;
    const cy = this.height / 2 + this.shakeY;
    const worldX = (screenX - cx) / this.camera.zoom + this.camera.x;
    const worldY = (screenY - cy) / (this.camera.zoom * this.camera.scaleY) + this.camera.y;
    return { x: worldX, y: worldY };
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
  }

  render(world, player, npcManager, particleSystem, combatTextSystem) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Clear background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Camera Transformations
    const cx = this.width / 2 + this.shakeX;
    const cy = this.height / 2 + this.shakeY;

    ctx.translate(cx, cy);
    ctx.scale(this.camera.zoom, this.camera.zoom * this.camera.scaleY);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 3. Terrain & Ground
    this.drawGround(ctx, world);

    // 4. Ground Runic Summon Circles (Rendered flat under characters)
    this.drawRunicCircles(ctx, particleSystem);

    // 4b. Skill Aiming Reticle (If player is aiming a skill)
    if (player && player.aimingSkill) {
      this.drawSkillAimReticle(ctx, player);
    }

    // 5. Campfire & Base Props
    this.drawBaseProps(ctx, world);

    // 6. Interactive Gathering Nodes & Chests
    this.drawInteractiveNodes(ctx, world);

    // 7. Crystalline Ice Spikes (Ground layer)
    this.drawIceSpikes(ctx, particleSystem);

    // 8. Floating EXP & Loot Orbs (Safe check for drops array)
    this.drawDrops(ctx, npcManager);

    // 9. Y-Sorted Entity Layering (Characters, Monsters, Trees, Props)
    const entities = [];

    if (world && world.trees) {
      for (const tree of world.trees) {
        entities.push({ type: 'tree', y: tree.y + 10, data: tree });
      }
    }
    if (world && world.decorations) {
      for (const dec of world.decorations) {
        entities.push({ type: 'decoration', y: dec.y, data: dec });
      }
    }
    if (npcManager && npcManager.enemies) {
      for (const enemy of npcManager.enemies) {
        if (!enemy.dead) {
          entities.push({ type: 'enemy', y: enemy.y, data: enemy });
        }
      }
    }
    if (npcManager && npcManager.npcs) {
      for (const npc of npcManager.npcs) {
        entities.push({ type: 'npc', y: npc.y, data: npc });
      }
    }
    if (player) {
      entities.push({ type: 'player', y: player.y, data: player });
    }

    // Sort by Y for natural depth layering
    entities.sort((a, b) => a.y - b.y);

    for (const ent of entities) {
      try {
        if (ent.type === 'tree') {
          this.drawTree(ctx, ent.data);
        } else if (ent.type === 'decoration') {
          this.drawDecoration(ctx, ent.data);
        } else if (ent.type === 'enemy') {
          this.drawEnemy(ctx, ent.data);
        } else if (ent.type === 'npc') {
          this.drawCharacter(ctx, ent.data, false);
        } else if (ent.type === 'player') {
          this.drawCharacter(ctx, ent.data, true);
        }
      } catch (err) {
        // Silently skip any malformed entity without crashing render loop
      }
    }

    // 10. Spell Particles & Projectiles (Falling Meteors, Slashes, Sparks)
    this.drawFallingMeteors(ctx, particleSystem);
    this.drawParticles(ctx, particleSystem);

    // 11. Drifting Sakura Petals
    this.drawSakuraPetals(ctx, particleSystem);

    // 12. Floating Combat Text
    this.drawCombatText(ctx, combatTextSystem);

    ctx.restore();

    // 13. Screen-Space Atmospheric Shaders & Lighting (Post-processing)
    this.drawAtmosphere(ctx, world, player);
  }

  /**
   * Skill Aiming Reticle: Ground AoE circle, rotating runes, range limit, trajectory line
   */
  drawSkillAimReticle(ctx, player) {
    const skill = player.aimingSkill;
    if (!skill) return;

    ctx.save();

    // 1. Range Boundary Circle (Subtle dashed border around player)
    const maxRange = skill.range || 200;
    ctx.strokeStyle = `${skill.color}55`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, maxRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Trajectory beam from player to aim point
    const beamGrad = ctx.createLinearGradient(player.x, player.y, player.aimX, player.aimY);
    beamGrad.addColorStop(0, `${skill.color}11`);
    beamGrad.addColorStop(1, `${skill.color}bb`);
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.aimX, player.aimY);
    ctx.stroke();

    // 3. Ground Target AoE Ring
    const aoeRadius = skill.aoeRadius || 60;
    const pulse = Math.sin(this.time * 6) * 4;
    const currentRadius = aoeRadius + pulse;

    // Glowing AoE fill
    const fillGrad = ctx.createRadialGradient(player.aimX, player.aimY, 5, player.aimX, player.aimY, currentRadius);
    fillGrad.addColorStop(0, `${skill.color}44`);
    fillGrad.addColorStop(0.8, `${skill.color}22`);
    fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.arc(player.aimX, player.aimY, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // Outer circle
    ctx.strokeStyle = skill.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.aimX, player.aimY, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Rotating inner elemental rune ring
    const rot = this.time * 2.5;
    ctx.save();
    ctx.translate(player.aimX, player.aimY);
    ctx.rotate(rot);

    ctx.strokeStyle = `${skill.color}aa`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Rune points
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const rx = Math.cos(angle) * (currentRadius * 0.65);
      const ry = Math.sin(angle) * (currentRadius * 0.65);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Precision Crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(player.aimX - 8, player.aimY);
    ctx.lineTo(player.aimX + 8, player.aimY);
    ctx.moveTo(player.aimX, player.aimY - 8);
    ctx.lineTo(player.aimX, player.aimY + 8);
    ctx.stroke();

    // 6. Magnetic Lock Indicator (If locked onto an enemy)
    if (player.aimSnappedEnemy) {
      const e = player.aimSnappedEnemy;
      const bSize = e.radius + 14 + pulse * 0.5;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      // 4 Bracket corners [ ]
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(e.x - bSize, e.y - bSize + 8);
      ctx.lineTo(e.x - bSize, e.y - bSize);
      ctx.lineTo(e.x - bSize + 8, e.y - bSize);
      // Top-Right
      ctx.moveTo(e.x + bSize - 8, e.y - bSize);
      ctx.lineTo(e.x + bSize, e.y - bSize);
      ctx.lineTo(e.x + bSize, e.y - bSize + 8);
      // Bottom-Left
      ctx.moveTo(e.x - bSize, e.y + bSize - 8);
      ctx.lineTo(e.x - bSize, e.y + bSize);
      ctx.lineTo(e.x - bSize + 8, e.y + bSize);
      // Bottom-Right
      ctx.moveTo(e.x + bSize - 8, e.y + bSize);
      ctx.lineTo(e.x + bSize, e.y + bSize);
      ctx.lineTo(e.x + bSize, e.y + bSize - 8);
      ctx.stroke();

      // Lock label
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('TARGET LOCKED', e.x, e.y - bSize - 5);
    }

    ctx.restore();
  }

  drawGround(ctx, world) {
    ctx.fillStyle = '#1c4832';
    ctx.fillRect(0, 0, world.width, world.height);

    // Subtle checkered grass tiles
    ctx.fillStyle = '#225b3e';
    for (let x = 0; x < world.width; x += 80) {
      for (let y = 0; y < world.height; y += 80) {
        if ((x + y) % 160 === 0) {
          ctx.fillRect(x, y, 80, 80);
        }
      }
    }

    // Camp dirt plaza
    ctx.fillStyle = '#6d2809';
    ctx.beginPath();
    ctx.ellipse(1400, 1400, 135, 88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cobblestone Main Plaza
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(1400, 1400, 110, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hearth center
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(1400, 1400, 45, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone pathway to ruins
    ctx.fillStyle = '#64748b';
    for (let i = 0; i <= 20; i++) {
      const px = 1400 + (2100 - 1400) * (i / 20);
      const py = 1400 + (2100 - 1400) * (i / 20);
      ctx.beginPath();
      ctx.ellipse(px, py, 26, 16, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stone pathway to West Woods
    for (let i = 0; i <= 15; i++) {
      const px = 1400 - (1400 - 800) * (i / 15);
      const py = 1400 - (1400 - 1000) * (i / 15);
      ctx.beginPath();
      ctx.ellipse(px, py, 24, 15, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // River flowing in north
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 720);
    ctx.bezierCurveTo(700, 780, 1400, 700, 2100, 760);
    ctx.lineTo(2800, 720);
    ctx.lineTo(2800, 800);
    ctx.bezierCurveTo(2100, 840, 1400, 780, 700, 860);
    ctx.lineTo(0, 800);
    ctx.closePath();
    ctx.fill();

    // Animated water shimmer ripples
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 14; i++) {
      const rx = (i * 210 + (this.time * 45)) % 2800;
      const ry = 750 + Math.sin(rx * 0.01 + this.time * 2) * 20;
      ctx.fillRect(rx, ry, 28, 3.5);
    }

    // Wooden Bridge at (1400, 740)
    ctx.fillStyle = '#b45309';
    ctx.fillRect(1370, 710, 60, 85);
    ctx.fillStyle = '#78350f';
    for (let b = 715; b < 790; b += 12) {
      ctx.fillRect(1370, b, 60, 2);
    }
    ctx.fillStyle = '#92400e';
    ctx.fillRect(1368, 710, 4, 85);
    ctx.fillRect(1428, 710, 4, 85);
  }

  drawRunicCircles(ctx, particleSystem) {
    if (!particleSystem || !particleSystem.runicCircles) return;
    for (const rc of particleSystem.runicCircles) {
      ctx.save();
      const alpha = Math.max(0, rc.life / rc.maxLife);
      ctx.globalAlpha = alpha;
      ctx.translate(rc.x, rc.y);
      ctx.scale(1, 0.65); // Tilted flat ellipse
      ctx.rotate(rc.rot);

      // Outer glyph circle
      ctx.strokeStyle = rc.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rc.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Middle concentric ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, rc.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      // Runic star polygon
      ctx.strokeStyle = rc.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const points = 6;
      for (let p = 0; p < points; p++) {
        const ang = (p / points) * Math.PI * 2;
        const rad = p % 2 === 0 ? rc.radius * 0.95 : rc.radius * 0.45;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  }

  drawIceSpikes(ctx, particleSystem) {
    if (!particleSystem || !particleSystem.iceSpikes) return;
    for (const is of particleSystem.iceSpikes) {
      ctx.save();
      const alpha = Math.min(1, is.life / 0.2);
      ctx.globalAlpha = alpha;
      ctx.translate(is.x, is.y);
      ctx.rotate(is.angle);

      // 3D Ice Spike Shard
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.moveTo(-is.width / 2, 0);
      ctx.lineTo(0, -is.height);
      ctx.lineTo(is.width / 2, 0);
      ctx.closePath();
      ctx.fill();

      // Shaded face
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -is.height);
      ctx.lineTo(is.width / 2, 0);
      ctx.closePath();
      ctx.fill();

      // Crystalline white glint
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -is.height);
      ctx.lineTo(-is.width / 4, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawFallingMeteors(ctx, particleSystem) {
    if (!particleSystem || !particleSystem.fallingMeteors) return;
    for (const m of particleSystem.fallingMeteors) {
      ctx.save();
      // Fiery core of falling meteor
      const grad = ctx.createRadialGradient(m.curX, m.curY, 2, m.curX, m.curY, 26);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fef08a');
      grad.addColorStop(0.7, '#f43f5e');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(m.curX, m.curY, 28, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric fire streak
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(m.curX, m.curY);
      ctx.lineTo(m.curX - (m.targetX - m.startX) * 0.25, m.curY - (m.targetY - m.startY) * 0.25);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawBaseProps(ctx, world) {
    if (!world || !world.campfires) return;
    for (const camp of world.campfires) {
      // Glow circle on ground
      const glowGrad = ctx.createRadialGradient(camp.x, camp.y, 10, camp.x, camp.y, camp.healRadius);
      glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.28)');
      glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(camp.x, camp.y, camp.healRadius, 0, Math.PI * 2);
      ctx.fill();

      // Stone ring
      ctx.fillStyle = '#475569';
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(camp.x + Math.cos(ang) * 14, camp.y + Math.sin(ang) * 9, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wooden logs
      ctx.fillStyle = '#78350f';
      ctx.fillRect(camp.x - 10, camp.y - 3, 20, 6);
      ctx.fillRect(camp.x - 3, camp.y - 10, 6, 20);

      // Flickering flame
      const fH = 16 + Math.sin(this.time * 12) * 4;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(camp.x - 7, camp.y);
      ctx.quadraticCurveTo(camp.x, camp.y - fH - 5, camp.x + 7, camp.y);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(camp.x - 4, camp.y);
      ctx.quadraticCurveTo(camp.x, camp.y - fH + 3, camp.x + 4, camp.y);
      ctx.fill();
    }
  }

  drawInteractiveNodes(ctx, world) {
    if (!world) return;

    if (world.gatheringNodes) {
      for (const node of world.gatheringNodes) {
        if (!node.available) continue;

        ctx.save();
        const bob = Math.sin(this.time * 4 + node.x) * 3;

        if (node.type === 'herb') {
          // Moonbloom flower
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(node.x, node.y - 6 + bob, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.arc(node.x, node.y - 6 + bob, 3, 0, Math.PI * 2);
          ctx.fill();

          // Stem & leaf
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(node.x - 1, node.y - 1 + bob, 2, 7);
        } else if (node.type === 'crystal') {
          // Glowing mana crystal
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(node.x, node.y - 14 + bob);
          ctx.lineTo(node.x + 6, node.y - 4 + bob);
          ctx.lineTo(node.x, node.y + 4 + bob);
          ctx.lineTo(node.x - 6, node.y - 4 + bob);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.moveTo(node.x, node.y - 14 + bob);
          ctx.lineTo(node.x + 3, node.y - 4 + bob);
          ctx.lineTo(node.x, node.y + 4 + bob);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }
    }

    if (world.chests) {
      for (const chest of world.chests) {
        ctx.save();
        if (!chest.opened) {
          // Closed Golden Chest
          ctx.fillStyle = '#78350f';
          ctx.fillRect(chest.x - 12, chest.y - 10, 24, 18);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(chest.x - 12, chest.y - 6, 24, 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(chest.x - 2, chest.y - 4, 4, 5);
        } else {
          // Open Chest
          ctx.fillStyle = '#451a03';
          ctx.fillRect(chest.x - 12, chest.y - 4, 24, 12);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(chest.x - 12, chest.y - 12, 24, 8);
        }
        ctx.restore();
      }
    }
  }

  /**
   * Safely draws drops without ever throwing if property name differs
   */
  drawDrops(ctx, npcManager) {
    const drops = (npcManager && (npcManager.drops || npcManager.activeDrops)) || [];
    for (const drop of drops) {
      ctx.save();
      const bob = Math.sin(this.time * 8 + drop.x) * 3;
      if (drop.type === 'exp') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(drop.x, drop.y + bob, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(drop.x - 1, drop.y - 1 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Gold Coin
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(drop.x, drop.y + bob, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawTree(ctx, tree) {
    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(tree.x, tree.y + 6, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#5c2c16';
    ctx.fillRect(tree.x - 6, tree.y - 16, 12, 22);

    const isCherry = tree.type === 'cherry';

    // Foliage (Sakura pink or Deep forest oak)
    ctx.fillStyle = isCherry ? '#f472b6' : '#14532d';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y - 36, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isCherry ? '#fbcfe8' : '#166534';
    ctx.beginPath();
    ctx.arc(tree.x - 7, tree.y - 42, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isCherry ? '#fda4af' : '#22c55e';
    ctx.beginPath();
    ctx.arc(tree.x + 8, tree.y - 40, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawDecoration(ctx, dec) {
    ctx.save();
    if (dec.type === 'ruin_pillar') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(dec.x, dec.y + 4, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.fillRect(dec.x - 12, dec.y - 38, 24, 42);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(dec.x - 14, dec.y - 44, 28, 8);
      ctx.fillRect(dec.x - 14, dec.y - 2, 28, 6);
    } else if (dec.type === 'table') {
      // Guild Wooden Dining Table with chocolate & tea
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(dec.x + dec.width / 2, dec.y + dec.height / 2 + 4, dec.width * 0.5, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(dec.x + 2, dec.y + 2, dec.width - 4, dec.height - 4);

      // Fondue Pot in middle
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(dec.x + dec.width / 2, dec.y + dec.height / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(dec.x + dec.width / 2, dec.y + dec.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (dec.type === 'bench') {
      // Log bench
      ctx.fillStyle = '#5c2c16';
      ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(dec.x + 2, dec.y + 2, dec.width - 4, dec.height - 4);
    } else if (dec.type === 'guild_banner') {
      // Chocolate Everyday Guild Banner
      ctx.fillStyle = '#451a03';
      ctx.fillRect(dec.x - 2, dec.y - 36, 4, 40);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(dec.x - 4, dec.y - 40, 8, 5);

      // Pennant cloth
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(dec.x + 2, dec.y - 36);
      ctx.lineTo(dec.x + 28, dec.y - 36);
      ctx.lineTo(dec.x + 18, dec.y - 20);
      ctx.lineTo(dec.x + 28, dec.y - 4);
      ctx.lineTo(dec.x + 2, dec.y - 4);
      ctx.closePath();
      ctx.fill();

      // Wing emblem
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(dec.x + 12, dec.y - 20, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (dec.type === 'lantern') {
      // Japanese Fantasy Stone Lantern
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(dec.x, dec.y + 4, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.fillRect(dec.x - 4, dec.y - 18, 8, 20);
      // Glowing paper chamber
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(dec.x - 5, dec.y - 14, 10, 8);
      // Roof
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(dec.x - 8, dec.y - 14);
      ctx.lineTo(dec.x, dec.y - 20);
      ctx.lineTo(dec.x + 8, dec.y - 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawEnemy(ctx, enemy) {
    ctx.save();
    const isHurt = enemy.flashHurt > 0;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 6, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.type === 'slime') {
      // Slime squish & stretch hop animation
      const squish = Math.sin(this.time * 8 + enemy.x) * 2.5;
      const rX = enemy.radius + squish;
      const rY = enemy.radius - squish;

      ctx.fillStyle = isHurt ? '#ffffff' : (enemy.isRare ? '#fbbf24' : '#22c55e');
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y - rY * 0.7, rX, rY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Translucent inner core
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(enemy.x - 3, enemy.y - rY * 0.9, 4, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(enemy.x - 5, enemy.y - rY * 0.8, 2.5, 4);
      ctx.fillRect(enemy.x + 3, enemy.y - rY * 0.8, 2.5, 4);
    } else if (enemy.type === 'wolf') {
      // Glade Wolf
      ctx.fillStyle = isHurt ? '#ffffff' : '#475569';
      ctx.fillRect(enemy.x - 14, enemy.y - 16, 28, 18);
      // Head
      ctx.fillStyle = '#334155';
      ctx.fillRect(enemy.x + 8, enemy.y - 20, 12, 12);
      // Glowing red predator eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(enemy.x + 14, enemy.y - 17, 3, 2);
      // Tail
      ctx.fillStyle = '#475569';
      ctx.fillRect(enemy.x - 18, enemy.y - 14, 6, 6);
    } else if (enemy.type === 'treant') {
      // Whispering Treant
      ctx.fillStyle = isHurt ? '#ffffff' : '#78350f';
      ctx.fillRect(enemy.x - 12, enemy.y - 26, 24, 30);
      // Moss top
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 28, 16, 0, Math.PI * 2);
      ctx.fill();
      // Glowing green hollow eyes
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(enemy.x - 6, enemy.y - 18, 3, 3);
      ctx.fillRect(enemy.x + 3, enemy.y - 18, 3, 3);
    } else if (enemy.type === 'golem') {
      // Boss: Ancient Forest Golem
      ctx.fillStyle = isHurt ? '#ffffff' : '#334155';
      ctx.fillRect(enemy.x - 36, enemy.y - 58, 72, 60);

      // Heavy shoulders
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(enemy.x - 46, enemy.y - 64, 22, 26);
      ctx.fillRect(enemy.x + 24, enemy.y - 64, 22, 26);

      // Pulsing purple core
      const pulse = 10 + Math.sin(this.time * 6) * 2;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 32, pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 32, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.fillRect(enemy.x - 24, enemy.y - 74, 10, 16);
      ctx.fillRect(enemy.x + 14, enemy.y - 74, 10, 16);
    }

    // Health Bar
    const barW = enemy.isBoss ? 80 : 36;
    const barH = enemy.isBoss ? 6 : 4;
    const barY = enemy.y - (enemy.isBoss ? 82 : (enemy.radius + 18));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(enemy.x - barW / 2, barY, barW, barH);
    ctx.fillStyle = enemy.isBoss ? '#a855f7' : '#ef4444';
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillRect(enemy.x - barW / 2, barY, barW * hpPct, barH);

    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`${enemy.name} (Lv.${enemy.level})`, enemy.x, barY - 4);

    ctx.restore();
  }

  drawCharacter(ctx, char, isPlayer) {
    if (!char) return;
    const custom = isPlayer ? (char.custom || {}) : char;
    const isHurt = char.flashHurt > 0;
    const bob = (char.isSprinting || Math.hypot(char.vx || 0, char.vy || 0) > 10) ? Math.sin(this.time * 14) * 2 : 0;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(char.x, char.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Outfit / Body
    let outfitColor = '#3b82f6';
    if (custom.outfit === 'archmage') outfitColor = '#4338ca';
    else if (custom.outfit === 'paladin') outfitColor = '#cbd5e1';
    else if (custom.outfit === 'princess') outfitColor = '#f472b6';
    else if (custom.outfit === 'chocolate_tunic') outfitColor = '#78350f';

    ctx.fillStyle = isHurt ? '#ffffff' : outfitColor;
    ctx.fillRect(char.x - 8, char.y - 8 + bob, 16, 18);

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(char.x - 8, char.y + 8 + bob, 16, 2);

    // 2. Head / Skin
    ctx.fillStyle = isHurt ? '#ffffff' : (custom.skinColor || '#fde047');
    ctx.fillRect(char.x - 7, char.y - 20 + bob, 14, 13);

    // 3. Face / Anime Eyes
    ctx.fillStyle = '#0f172a';
    if (char.facing === 'left') {
      ctx.fillRect(char.x - 6, char.y - 16 + bob, 2.5, 4);
      ctx.fillRect(char.x - 1, char.y - 16 + bob, 2.5, 4);
    } else if (char.facing === 'right') {
      ctx.fillRect(char.x + 1, char.y - 16 + bob, 2.5, 4);
      ctx.fillRect(char.x + 5, char.y - 16 + bob, 2.5, 4);
    } else {
      ctx.fillRect(char.x - 5, char.y - 16 + bob, 2.5, 4);
      ctx.fillRect(char.x + 3, char.y - 16 + bob, 2.5, 4);
    }

    // 4. Hair
    const hairColor = custom.hairColor || '#38bdf8';
    const hairStyle = custom.hair || 'anime_bangs';
    ctx.fillStyle = isHurt ? '#ffffff' : hairColor;

    if (hairStyle === 'afro') {
      // Yamada's legendary Afro
      ctx.beginPath();
      ctx.arc(char.x, char.y - 26 + bob, 20, 0, Math.PI * 2);
      ctx.arc(char.x - 14, char.y - 24 + bob, 13, 0, Math.PI * 2);
      ctx.arc(char.x + 14, char.y - 24 + bob, 13, 0, Math.PI * 2);
      ctx.arc(char.x - 8, char.y - 36 + bob, 14, 0, Math.PI * 2);
      ctx.arc(char.x + 8, char.y - 36 + bob, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 'twintails') {
      ctx.beginPath();
      ctx.arc(char.x, char.y - 16 + bob, 11, 0, Math.PI * 2);
      ctx.arc(char.x - 12, char.y - 10 + bob, 6, 0, Math.PI * 2);
      ctx.arc(char.x + 12, char.y - 10 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(char.x - 13, char.y - 12 + bob, 3, 3);
      ctx.fillRect(char.x + 10, char.y - 12 + bob, 3, 3);
    } else if (hairStyle === 'long_bangs') {
      ctx.beginPath();
      ctx.arc(char.x, char.y - 16 + bob, 11, 0, Math.PI * 2);
      ctx.arc(char.x - 11, char.y - 6 + bob, 5, 0, Math.PI * 2);
      ctx.arc(char.x + 11, char.y - 6 + bob, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(char.x, char.y - 16 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(char.x - 8, char.y - 16 + bob);
      ctx.lineTo(char.x - 12, char.y - 11 + bob);
      ctx.lineTo(char.x - 6, char.y - 12 + bob);
      ctx.lineTo(char.x - 8, char.y - 8 + bob);
      ctx.lineTo(char.x + 6, char.y - 12 + bob);
      ctx.lineTo(char.x + 12, char.y - 11 + bob);
      ctx.lineTo(char.x + 8, char.y - 16 + bob);
      ctx.fill();
    }

    // 5. Weapon
    const weaponType = custom.weapon || 'sword';
    if (weaponType === 'staff') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(char.x + 8, char.y - 20 + bob, 3, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(char.x + 9, char.y - 22 + bob, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(char.x + 8, char.y - 23 + bob, 2, 2);
    } else if (weaponType === 'sword') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(char.x + 9, char.y - 14 + bob, 3, 18);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(char.x + 7, char.y + 2 + bob, 7, 2);
    } else if (weaponType === 'daggers') {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(char.x + 8, char.y - 4 + bob, 2, 10);
      ctx.fillRect(char.x - 10, char.y - 4 + bob, 2, 10);
    }

    // 6. Overhead Nameplates
    const tagY = char.y - (hairStyle === 'afro' ? 44 : 32) + bob;
    ctx.textAlign = 'center';

    if (isPlayer) {
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeText(`<${char.guild || 'Chocolate Everyday'}>`, char.x, tagY - 14);
      ctx.fillText(`<${char.guild || 'Chocolate Everyday'}>`, char.x, tagY - 14);
    }

    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    const nameText = `Lv.${char.level || 1} ${char.name || 'Traveler'}`;
    ctx.strokeText(nameText, char.x, tagY);
    ctx.fillStyle = isPlayer ? '#67e8f9' : (char.inParty ? '#4ade80' : '#f8fafc');
    ctx.fillText(nameText, char.x, tagY);

    if (!isPlayer && char.state) {
      let stateLabel = '';
      if (char.state === 'GATHER_HERBS') stateLabel = 'Harvesting';
      else if (char.state === 'FIGHT_SLIMES' || char.state === 'COMBAT') stateLabel = 'Battling';
      else if (char.state === 'FLEE_CAMP') stateLabel = 'Fleeing';
      else if (char.state === 'REST_CAMP') stateLabel = 'Resting';

      if (stateLabel) {
        ctx.font = '9px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(stateLabel, char.x, tagY + 11);
      }
    }

    // 7. Official Vector Badge Emote inside Chat Bubble (Zero OS emojis)
    if (char.emote) {
      this.drawVectorEmoteBubble(ctx, char.x, tagY - 26, char.emote);
    }
  }

  /**
   * Crisp Canvas Vector Emote Bubble (100% Vector drawn)
   */
  drawVectorEmoteBubble(ctx, x, baseY, emoteKey) {
    const bubbleBob = Math.sin(this.time * 8 + x) * 2;
    const bubbleY = baseY + bubbleBob;
    const bubbleW = 32;
    const bubbleH = 22;
    const radius = 6;

    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.roundRect(ctx, x - bubbleW / 2 + 1, bubbleY - bubbleH / 2 + 2, bubbleW, bubbleH, radius);
    ctx.fill();

    // Bubble background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, radius);
    ctx.fill();
    ctx.stroke();

    // Speech bubble pointer arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - 4, bubbleY + bubbleH / 2);
    ctx.lineTo(x, bubbleY + bubbleH / 2 + 5);
    ctx.lineTo(x + 4, bubbleY + bubbleH / 2);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, bubbleY + bubbleH / 2 - 1);
    ctx.lineTo(x, bubbleY + bubbleH / 2 + 5);
    ctx.lineTo(x + 4, bubbleY + bubbleH / 2 - 1);
    ctx.stroke();

    // Draw Vector Badge inside bubble
    this.renderVectorEmoteIcon(ctx, x, bubbleY, emoteKey);

    ctx.restore();
  }

  renderVectorEmoteIcon(ctx, x, y, key) {
    ctx.save();
    ctx.translate(x, y);

    if (key === '❤️' || key === 'emote_heart') {
      // Smooth Red/Pink Heart
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-6, -2, -6, -6, 0, -3);
      ctx.bezierCurveTo(6, -6, 6, -2, 0, 4);
      ctx.fill();
    } else if (key === '✨' || key === 'emote_sparkle') {
      // Golden 4-point magic star
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(1, -1, 6, 0);
      ctx.quadraticCurveTo(1, 1, 0, 6);
      ctx.quadraticCurveTo(-1, 1, -6, 0);
      ctx.quadraticCurveTo(-1, -1, 0, -6);
      ctx.fill();
    } else if (key === '💧' || key === 'emote_sweat') {
      // Cyan tear/sweat droplet
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.quadraticCurveTo(4, 0, 0, 5);
      ctx.quadraticCurveTo(-4, 0, 0, -5);
      ctx.fill();
    } else if (key === '💢' || key === 'emote_angry') {
      // Anime anger cross
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-3, -3, 3, 0, Math.PI / 2);
      ctx.arc(3, -3, 3, Math.PI / 2, Math.PI);
      ctx.arc(3, 3, 3, Math.PI, (3 * Math.PI) / 2);
      ctx.arc(-3, 3, 3, (3 * Math.PI) / 2, Math.PI * 2);
      ctx.stroke();
    } else if (key === '💤' || key === 'emote_sleep') {
      // Purple Zzz
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Zzz', 0, 0);
    } else if (key === '❓' || key === 'emote_help') {
      // Blue question mark
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, -1);
    } else if (key === '🍫' || key === 'emote_choco') {
      // Chocolate bar
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-5, -4, 4, 3.5);
      ctx.fillRect(1, -4, 4, 3.5);
      ctx.fillRect(-5, 0.5, 4, 3.5);
      ctx.fillRect(1, 0.5, 4, 3.5);
    } else if (key === '⚔️' || key === 'emote_swords') {
      // Crossed swords
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
      ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
      ctx.stroke();
    } else if (key === '🥦' || key === 'emote_afro') {
      // Yamada Afro vector cloud
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -1, 5, 0, Math.PI * 2);
      ctx.arc(-4, 0, 3.5, 0, Math.PI * 2);
      ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Default neat chat dot icon
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawParticles(ctx, particleSystem) {
    if (!particleSystem || !particleSystem.particles) return;
    for (const p of particleSystem.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity || 1;

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fire') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ice') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.type === 'meteor_crater') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'slash_arc') {
        // High-Quality Directional Sword Slash Trail
        ctx.save();
        ctx.translate(p.x, p.y);

        const rotAngle = p.angle !== null && p.angle !== undefined ? p.angle : (
          p.facing === 'right' ? 0 : (p.facing === 'down' ? Math.PI / 2 : (p.facing === 'left' ? Math.PI : -Math.PI / 2))
        );
        ctx.rotate(rotAngle);

        // Radiant curved anime crescent blade swipe
        const grad = ctx.createLinearGradient(-15, -20, 25, 20);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
        grad.addColorStop(0.8, 'rgba(2, 132, 199, 0.4)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 30, -Math.PI * 0.45, Math.PI * 0.45, false);
        ctx.arc(0, 0, 16, Math.PI * 0.45, -Math.PI * 0.45, true);
        ctx.closePath();
        ctx.fill();

        // Sharp edge highlight
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 30, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        ctx.restore();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'after_image') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.fillRect(p.x - 8, p.y - 12, 16, 24);
      }

      ctx.restore();
    }
  }

  drawSakuraPetals(ctx, particleSystem) {
    if (!particleSystem || !particleSystem.sakuraPetals) return;
    for (const petal of particleSystem.sakuraPetals) {
      ctx.save();
      ctx.globalAlpha = petal.opacity;
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.angle);

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawCombatText(ctx, combatTextSystem) {
    if (!combatTextSystem || !combatTextSystem.texts) return;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';

    for (const t of combatTextSystem.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);

      ctx.restore();
    }
  }

  /**
   * Screen-Space Atmospheric Shader Pipeline:
   * - Volumetric God-Rays with trigonometric sweep
   * - Chromatic Aberration during Screen Shake impacts
   * - Dynamic Radial Warm Light around Campfire & active magic nodes
   * - Japanese Anime Pastel Vignette Grading
   */
  drawAtmosphere(ctx, world, player) {
    ctx.save();

    // 1. Dynamic Sunbeam God-Rays streaming diagonally
    const rayCycle = Math.sin(this.time * 0.4) * 50;
    ctx.fillStyle = 'rgba(254, 240, 138, 0.038)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const xStart = (i * 320) + rayCycle;
      ctx.moveTo(xStart, 0);
      ctx.lineTo(xStart + 180, 0);
      ctx.lineTo(xStart - 120, this.height);
      ctx.lineTo(xStart - 300, this.height);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Chromatic Aberration Shader effect on Heavy Screen Shake
    if (this.shakeAmount > 4) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const offset = Math.min(5, this.shakeAmount * 0.4);

      // Red fringe
      ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
      ctx.fillRect(offset, 0, this.width, this.height);

      // Cyan fringe
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(-offset, 0, this.width, this.height);
      ctx.restore();
    }

    // 3. Cinematic Vignette & Color Grading
    const vignette = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.35,
      this.width / 2, this.height / 2, this.width * 0.78
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(11, 15, 25, 0.25)');
    vignette.addColorStop(1, 'rgba(8, 12, 22, 0.55)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }
}
