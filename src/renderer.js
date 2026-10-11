/**
 * Enhanced 2D Canvas Pixel-Art Renderer for Forest of Savior RPG.
 * Features:
 * - Anti-clutter overhead nameplates with automatic Y-separation and crisp typography
 * - Dynamic anime combat animations: runic summoning circles, weapon trail arcs,
 *   knockback effects, squash-and-stretch slimes, floating exp orbs
 * - Camera modes (2.5D Isometric FOS, 90° Top-Down, 60° Action Angle) & smooth zoom
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

    // Add screen shake offset if active
    this.shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
    this.shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
  }

  render(world, player, npcManager, particleSystem, combatTextSystem) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Camera Transformations
    const cx = this.width / 2 + this.shakeX;
    const cy = this.height / 2 + this.shakeY;

    ctx.translate(cx, cy);
    ctx.scale(this.camera.zoom, this.camera.zoom * this.camera.scaleY);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 3. Draw Terrain & Ground (Grass, Cobblestone Paths, Water)
    this.drawGround(ctx, world);

    // 4. Draw Campfire, Shrines, and Base Decorations
    this.drawBaseProps(ctx, world);

    // 5. Draw Gathering Nodes & Chests
    this.drawInteractiveNodes(ctx, world);

    // 6. Draw Floating EXP & Loot Orbs
    this.drawDrops(ctx, npcManager);

    // 7. Gather all renderable entities for Y-Sorting (proper depth!)
    const entities = [];

    // Trees
    for (const tree of world.trees) {
      entities.push({ type: 'tree', y: tree.y + 10, data: tree });
    }

    // World Decorations (lanterns, tables, pillars)
    for (const dec of world.decorations) {
      entities.push({ type: 'decoration', y: dec.y, data: dec });
    }

    // Enemies
    for (const enemy of npcManager.enemies) {
      if (!enemy.dead) {
        entities.push({ type: 'enemy', y: enemy.y, data: enemy });
      }
    }

    // NPCs
    for (const npc of npcManager.npcs) {
      entities.push({ type: 'npc', y: npc.y, data: npc });
    }

    // Player
    entities.push({ type: 'player', y: player.y, data: player });

    // Sort by Y for natural depth layering
    entities.sort((a, b) => a.y - b.y);

    // Render sorted entities
    for (const ent of entities) {
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
    }

    // 8. Spell Particles & Combat Effects
    this.drawParticles(ctx, particleSystem);

    // 9. Sakura Petals Floating Overlay
    this.drawSakuraPetals(ctx, particleSystem);

    // 10. Floating Combat Text
    this.drawCombatText(ctx, combatTextSystem);

    ctx.restore();
  }

  drawGround(ctx, world) {
    // Fill base lush anime green grass
    ctx.fillStyle = '#22543d';
    ctx.fillRect(0, 0, world.width, world.height);

    // Checker pattern subtle grass variance
    ctx.fillStyle = '#276749';
    for (let x = 0; x < world.width; x += 80) {
      for (let y = 0; y < world.height; y += 80) {
        if ((x + y) % 160 === 0) {
          ctx.fillRect(x, y, 80, 80);
        }
      }
    }

    // Camp dirt plaza
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(1400, 1400, 130, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cobblestone Main Plaza rim
    ctx.fillStyle = '#a0aec0';
    ctx.beginPath();
    ctx.ellipse(1400, 1400, 110, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Camp inner hearth
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(1400, 1400, 45, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone pathway to ruins (Southeast)
    ctx.fillStyle = '#718096';
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

    // River flowing in the north
    ctx.fillStyle = '#38bdf8';
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 12; i++) {
      const rx = (i * 240 + (this.time * 40)) % 2800;
      const ry = 750 + Math.sin(rx * 0.01 + this.time * 2) * 20;
      ctx.fillRect(rx, ry, 24, 4);
    }

    // Wooden Bridge at (1400, 740)
    ctx.fillStyle = '#b45309';
    ctx.fillRect(1370, 710, 60, 85);
    ctx.fillStyle = '#78350f';
    for (let b = 715; b < 790; b += 12) {
      ctx.fillRect(1370, b, 60, 2);
    }
    // Bridge railings
    ctx.fillStyle = '#92400e';
    ctx.fillRect(1368, 710, 4, 85);
    ctx.fillRect(1428, 710, 4, 85);
  }

  drawBaseProps(ctx, world) {
    for (const camp of world.campfires) {
      // Warm ground radial glow
      const grad = ctx.createRadialGradient(camp.x, camp.y, 10, camp.x, camp.y, camp.healRadius);
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
      grad.addColorStop(0.5, 'rgba(234, 88, 12, 0.15)');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(camp.x, camp.y, camp.healRadius, 0, Math.PI * 2);
      ctx.fill();

      // Fire pit stones
      ctx.fillStyle = '#475569';
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(camp.x + Math.cos(ang) * 18, camp.y + Math.sin(ang) * 12, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Burning logs
      ctx.fillStyle = '#78350f';
      ctx.fillRect(camp.x - 14, camp.y - 4, 28, 7);
      ctx.fillRect(camp.x - 4, camp.y - 12, 8, 24);

      // Flickering anime fire flames
      const flameH = 18 + Math.sin(this.time * 12) * 5;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(camp.x - 10, camp.y);
      ctx.lineTo(camp.x, camp.y - flameH - 4);
      ctx.lineTo(camp.x + 10, camp.y);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(camp.x - 6, camp.y);
      ctx.lineTo(camp.x, camp.y - flameH * 0.7);
      ctx.lineTo(camp.x + 6, camp.y);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(camp.x, camp.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawInteractiveNodes(ctx, world) {
    for (const node of world.gatheringNodes) {
      if (!node.available) continue;

      if (node.type === 'herb') {
        const bob = Math.sin(this.time * 3 + node.x) * 3;
        ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.fillRect(node.x - 1, node.y - 8 + bob, 3, 10);
        ctx.beginPath();
        ctx.arc(node.x - 4, node.y - 4 + bob, 3, 0, Math.PI * 2);
        ctx.arc(node.x + 4, node.y - 4 + bob, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ec4899';
        for (let p = 0; p < 5; p++) {
          const pang = (p / 5) * Math.PI * 2 + this.time;
          ctx.beginPath();
          ctx.arc(node.x + Math.cos(pang) * 6, node.y - 10 + bob + Math.sin(pang) * 5, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(node.x, node.y - 10 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (node.type === 'crystal') {
        const bob = Math.sin(this.time * 2.5 + node.y) * 2;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - 18 + bob);
        ctx.lineTo(node.x + 8, node.y + bob);
        ctx.lineTo(node.x, node.y + 4 + bob);
        ctx.lineTo(node.x - 8, node.y + bob);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - 18 + bob);
        ctx.lineTo(node.x + 4, node.y - 2 + bob);
        ctx.lineTo(node.x, node.y + 2 + bob);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (const chest of world.chests) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(chest.x, chest.y + 10, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = chest.opened ? '#78350f' : '#b45309';
      ctx.fillRect(chest.x - 14, chest.y - 10, 28, 20);

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(chest.x - 14, chest.y - 10, 28, 3);
      ctx.fillRect(chest.x - 14, chest.y + 4, 28, 3);
      ctx.fillRect(chest.x - 3, chest.y - 2, 6, 6);

      if (!chest.opened && Math.sin(this.time * 4 + chest.x) > 0.5) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(chest.x + 10, chest.y - 16, 4, 4);
      }
    }
  }

  drawDrops(ctx, npcManager) {
    for (const drop of npcManager.drops) {
      const bob = Math.sin(this.time * 8 + drop.x) * 4;
      // Glowing orb
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.beginPath();
      ctx.arc(drop.x, drop.y + bob, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(drop.x, drop.y + bob, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(drop.x - 1, drop.y + bob - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTree(ctx, tree) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(tree.x, tree.y + 12, tree.radius * 0.9, tree.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(tree.x - 7, tree.y - 12, 14, 26);

    const isCherry = tree.type === 'cherry';
    const baseColor = isCherry ? '#f472b6' : '#15803d';
    const highlightColor = isCherry ? '#fbcfe8' : '#4ade80';
    const darkColor = isCherry ? '#db2777' : '#166534';

    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(tree.x - 12, tree.y - 24, tree.radius * 0.85, 0, Math.PI * 2);
    ctx.arc(tree.x + 12, tree.y - 24, tree.radius * 0.85, 0, Math.PI * 2);
    ctx.arc(tree.x, tree.y - 38, tree.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(tree.x - 8, tree.y - 28, tree.radius * 0.75, 0, Math.PI * 2);
    ctx.arc(tree.x + 8, tree.y - 28, tree.radius * 0.75, 0, Math.PI * 2);
    ctx.arc(tree.x, tree.y - 42, tree.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(tree.x - 4, tree.y - 45, tree.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDecoration(ctx, dec) {
    if (dec.type === 'lantern') {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(dec.x - 6, dec.y - 16, 12, 16);
      ctx.fillRect(dec.x - 10, dec.y - 20, 20, 4);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(dec.x - 4, dec.y - 14, 8, 8);

      ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
      ctx.beginPath();
      ctx.arc(dec.x, dec.y - 10, 32, 0, Math.PI * 2);
      ctx.fill();
    } else if (dec.type === 'ruin_pillar') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(dec.x, dec.y + 8, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.fillRect(dec.x - 16, dec.y - 44, 32, 50);

      ctx.fillStyle = '#818cf8';
      ctx.fillRect(dec.x - 6, dec.y - 30, 4, 18);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(dec.x - 14, dec.y - 6, 8, 6);
    } else if (dec.type === 'table') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(dec.x + 2, dec.y + 2, dec.width - 4, dec.height - 4);
    } else if (dec.type === 'bench') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
    } else if (dec.type === 'guild_banner') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(dec.x - 2, dec.y - 40, 4, 45);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(dec.x + 2, dec.y - 38, 30, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(dec.x + 2, dec.y - 38, 30, 3);
      ctx.fillRect(dec.x + 2, dec.y - 19, 30, 3);
      ctx.beginPath();
      ctx.arc(dec.x + 16, dec.y - 27, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnemy(ctx, enemy) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 8, enemy.radius * 0.8, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const isHurt = enemy.flashHurt > 0;

    if (enemy.type === 'slime') {
      // Squash & Stretch physics
      const bounce = enemy.bounceOffset || 0;
      const stretch = bounce > 2 ? 0.85 : 1.15;
      ctx.fillStyle = isHurt ? '#ffffff' : '#22c55e';
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y - 4 - bounce, enemy.radius * stretch, enemy.radius * (2 - stretch) * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(enemy.x - 5, enemy.y - 6 - bounce, 3, 4);
      ctx.fillRect(enemy.x + 2, enemy.y - 6 - bounce, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x - 4, enemy.y - 6 - bounce, 1, 2);
      ctx.fillRect(enemy.x + 3, enemy.y - 6 - bounce, 1, 2);
    } else if (enemy.type === 'wolf') {
      ctx.fillStyle = isHurt ? '#ffffff' : '#475569';
      ctx.fillRect(enemy.x - 14, enemy.y - 12, 28, 14);
      ctx.fillRect(enemy.x - 18, enemy.y - 16, 12, 12);
      ctx.fillRect(enemy.x - 18, enemy.y - 20, 4, 5);
      ctx.fillRect(enemy.x - 10, enemy.y - 20, 4, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(enemy.x - 16, enemy.y - 14, 3, 3);
    } else if (enemy.type === 'treant') {
      ctx.fillStyle = isHurt ? '#ffffff' : '#3f2e1e';
      ctx.fillRect(enemy.x - 18, enemy.y - 34, 36, 40);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(enemy.x - 22, enemy.y - 36, 44, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(enemy.x - 8, enemy.y - 22, 5, 5);
      ctx.fillRect(enemy.x + 3, enemy.y - 22, 5, 5);
    } else if (enemy.type === 'golem') {
      ctx.fillStyle = isHurt ? '#ffffff' : '#334155';
      ctx.fillRect(enemy.x - 36, enemy.y - 60, 72, 65);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(enemy.x - 46, enemy.y - 64, 22, 26);
      ctx.fillRect(enemy.x + 24, enemy.y - 64, 22, 26);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 32, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 32, 4, 0, Math.PI * 2);
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

    // Enemy Name & Level
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`${enemy.name} (Lv.${enemy.level})`, enemy.x, barY - 4);
  }

  drawCharacter(ctx, char, isPlayer) {
    const custom = isPlayer ? char.custom : char;
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

    // Robe hem / trim
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(char.x - 8, char.y + 8 + bob, 16, 2);

    // 2. Chibi Anime Head
    ctx.fillStyle = isHurt ? '#ffffff' : (custom.skinColor || '#fde047');
    ctx.beginPath();
    ctx.arc(char.x, char.y - 12 + bob, 10, 0, Math.PI * 2);
    ctx.fill();

    // 3. Anime Eyes
    ctx.fillStyle = '#0f172a';
    if (char.id === 'yamada') {
      ctx.fillRect(char.x - 5, char.y - 12 + bob, 3, 2);
      ctx.fillRect(char.x + 2, char.y - 12 + bob, 3, 2);
    } else {
      ctx.fillRect(char.x - 5, char.y - 14 + bob, 3, 4);
      ctx.fillRect(char.x + 2, char.y - 14 + bob, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(char.x - 4, char.y - 14 + bob, 1, 2);
      ctx.fillRect(char.x + 3, char.y - 14 + bob, 1, 2);
    }

    // 4. Hairstyle (Including Yamada's iconic Afro!)
    const hairStyle = custom.hair;
    const hairColor = custom.hairColor || '#1e293b';
    ctx.fillStyle = isHurt ? '#ffffff' : hairColor;

    if (hairStyle === 'afro' || custom.headAccessory === 'afro') {
      ctx.beginPath();
      ctx.arc(char.x, char.y - 18 + bob, 18, 0, Math.PI * 2);
      ctx.arc(char.x - 10, char.y - 14 + bob, 12, 0, Math.PI * 2);
      ctx.arc(char.x + 10, char.y - 14 + bob, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(char.x - 4, char.y - 24 + bob, 6, 0, Math.PI * 2);
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
      ctx.arc(char.x + 9, char.y - 22 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
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

    // 6. Overhead Nameplates (Optimized to Prevent Text Soups!)
    const tagY = char.y - (hairStyle === 'afro' ? 44 : 32) + bob;
    ctx.textAlign = 'center';

    // Only render full guild tag for Player (avoids 5 layered <Chocolate Everyday> on screen!)
    if (isPlayer) {
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeText(`<${char.guild || 'Chocolate Everyday'}>`, char.x, tagY - 14);
      ctx.fillText(`<${char.guild || 'Chocolate Everyday'}>`, char.x, tagY - 14);
    }

    // Crisp high-contrast name and level
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    const nameText = `Lv.${char.level} ${char.name}`;
    ctx.strokeText(nameText, char.x, tagY);
    ctx.fillStyle = isPlayer ? '#67e8f9' : (char.inParty ? '#4ade80' : '#f8fafc');
    ctx.fillText(nameText, char.x, tagY);

    // Subtle small status/goal ticker if NPC is doing autonomous actions
    if (!isPlayer && char.state) {
      let stateLabel = '';
      if (char.state === 'GATHER_HERBS') stateLabel = '🌸 Harvesting';
      else if (char.state === 'FIGHT_SLIMES' || char.state === 'COMBAT') stateLabel = '⚔️ Battling';
      else if (char.state === 'FLEE_CAMP') stateLabel = '🏃 Fleeing';
      else if (char.state === 'REST_CAMP') stateLabel = '🍵 Resting';

      if (stateLabel) {
        ctx.font = '9px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(stateLabel, char.x, tagY + 11);
      }
    }

    // 7. Emote Bubble
    if (char.emote) {
      const bubbleY = tagY - 24;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(char.x, bubbleY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(char.x - 3, bubbleY + 10);
      ctx.lineTo(char.x, bubbleY + 14);
      ctx.lineTo(char.x + 3, bubbleY + 10);
      ctx.fill();

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(char.emote, char.x, bubbleY + 5);
    }
  }

  drawParticles(ctx, particleSystem) {
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
        // Shockwave crater
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'slash_arc') {
        // Gradient weapon slash
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 24, 0, Math.PI * 0.85);
        ctx.stroke();
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
}
