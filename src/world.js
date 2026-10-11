/**
 * World and Map System for Forest of Savior (FOS).
 * Procedural tile engine with Japanese anime fantasy aesthetics.
 * Features:
 * - High-performance obstacle collision detection
 * - Multi-ray tangential pathfinding & obstacle steering (never get stuck on trees/pillars)
 * - Automatic overlap resolution & stuck recovery
 * 100% pure JavaScript.
 */

export class GameWorld {
  constructor() {
    this.width = 2800;
    this.height = 2800;
    this.tileSize = 40;

    // Environmental entities
    this.trees = [];
    this.decorations = []; // flowers, stones, lanterns
    this.gatheringNodes = [];
    this.chests = [];
    this.campfires = [];
    this.zones = [
      { name: 'Chocolate Everyday Guild Camp', x: 1400, y: 1400, radius: 260 },
      { name: 'Whispering Woods', x: 800, y: 1000, radius: 450 },
      { name: 'Moonbloom Glade', x: 2000, y: 800, radius: 400 },
      { name: 'Silverflow River & Bridge', x: 1400, y: 800, radius: 350 },
      { name: 'Ruins of Savior - Golem Gate', x: 2100, y: 2100, radius: 500 },
      { name: 'Shadow Wolf Den', x: 700, y: 2000, radius: 400 }
    ];

    this.init();
  }

  init() {
    // Generate Campfire at Guild Base
    this.campfires.push({
      x: 1400,
      y: 1400,
      radius: 30,
      healRadius: 180,
      name: 'Guild Campfire'
    });

    // Generate Guild Benches and Tables around camp
    this.decorations.push({ type: 'table', x: 1350, y: 1360, width: 45, height: 25 });
    this.decorations.push({ type: 'bench', x: 1350, y: 1390, width: 45, height: 12 });
    this.decorations.push({ type: 'bench', x: 1350, y: 1335, width: 45, height: 12 });

    // Guild Banner
    this.decorations.push({ type: 'guild_banner', x: 1450, y: 1350 });

    // Generate Forest Trees (avoiding camp center)
    const treeSeeds = [
      // Outer borders
      ...this.generateTreeRing(1400, 1400, 1200, 80),
      ...this.generateTreeRing(1400, 1400, 1050, 70),
      // Dense clusters in Whispering Woods
      ...this.generateTreeCluster(700, 800, 350, 35),
      ...this.generateTreeCluster(900, 1200, 300, 28),
      // Moonbloom grove trees
      ...this.generateTreeCluster(2100, 750, 320, 25),
      // Shadow Wolf Den trees
      ...this.generateTreeCluster(650, 2100, 360, 32),
      // Ancient Golem ruins perimeter trees
      ...this.generateTreeCluster(1900, 2200, 280, 20)
    ];

    this.trees = treeSeeds;

    // Stone lanterns along pathways
    const lanternCoords = [
      { x: 1320, y: 1320 }, { x: 1480, y: 1320 }, { x: 1320, y: 1480 }, { x: 1480, y: 1480 },
      { x: 1400, y: 1100 }, { x: 1400, y: 950 }, { x: 1400, y: 700 },
      { x: 1700, y: 1700 }, { x: 1900, y: 1900 }
    ];
    lanternCoords.forEach(pos => {
      this.decorations.push({ type: 'lantern', x: pos.x, y: pos.y });
    });

    // Ancient Stone Pillars in Savior Ruins
    const ruinPillars = [
      { x: 2000, y: 2000 }, { x: 2200, y: 2000 },
      { x: 2000, y: 2200 }, { x: 2200, y: 2200 },
      { x: 2100, y: 1950 }, { x: 2100, y: 2250 }
    ];
    ruinPillars.forEach(p => {
      this.decorations.push({ type: 'ruin_pillar', x: p.x, y: p.y, radius: 24 });
    });

    // Gathering Nodes: Moonbloom Herbs, Ancient Wood, Mana Crystals
    this.spawnGatheringNodes();

    // Treasure Chests
    this.spawnChests();
  }

  generateTreeRing(cx, cy, radius, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + (Math.sin(i * 3.7) * 40);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      list.push({ x, y, radius: 26, type: (i % 3 === 0) ? 'cherry' : 'oak' });
    }
    return list;
  }

  generateTreeCluster(cx, cy, radius, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      list.push({ x, y, radius: 26, type: (i % 4 === 0) ? 'cherry' : 'oak' });
    }
    return list;
  }

  spawnGatheringNodes() {
    // 8 Moonbloom Herbs
    const herbs = [
      { x: 1100, y: 1100, name: 'Moonbloom Herb' },
      { x: 950, y: 1350, name: 'Moonbloom Herb' },
      { x: 1750, y: 1200, name: 'Moonbloom Herb' },
      { x: 1900, y: 900, name: 'Moonbloom Herb' },
      { x: 2150, y: 700, name: 'Moonbloom Herb' },
      { x: 800, y: 1700, name: 'Moonbloom Herb' },
      { x: 1250, y: 1650, name: 'Moonbloom Herb' },
      { x: 1600, y: 1550, name: 'Moonbloom Herb' }
    ];

    // 4 Azure Mana Crystals
    const crystals = [
      { x: 2200, y: 1900, name: 'Azure Mana Crystal' },
      { x: 1900, y: 2250, name: 'Azure Mana Crystal' },
      { x: 600, y: 950, name: 'Azure Mana Crystal' },
      { x: 1400, y: 650, name: 'Azure Mana Crystal' }
    ];

    this.gatheringNodes = [
      ...herbs.map((h, i) => ({
        id: `herb_${i}`,
        type: 'herb',
        x: h.x,
        y: h.y,
        name: h.name,
        available: true,
        respawnTimer: 0,
        itemReward: { id: 'moonbloom_herb', name: 'Moonbloom Herb', count: 1, type: 'material', desc: 'Rare glowing forest herb. Restores spirit.' }
      })),
      ...crystals.map((c, i) => ({
        id: `crystal_${i}`,
        type: 'crystal',
        x: c.x,
        y: c.y,
        name: c.name,
        available: true,
        respawnTimer: 0,
        itemReward: { id: 'mana_crystal', name: 'Azure Crystal', count: 1, type: 'material', desc: 'Crystallized ancient forest mana.' }
      }))
    ];
  }

  spawnChests() {
    const chestLocations = [
      {
        x: 1550, y: 1500,
        reward: { id: 'starter_elixir', name: 'Savior Elixir', count: 2, type: 'consumable', heal: 150, desc: 'Restores 150 HP instantly.' }
      },
      {
        x: 750, y: 850,
        reward: { id: 'gold_pouch', name: 'Treasure Pouch', count: 250, type: 'gold', desc: '250 Gold coins.' }
      },
      {
        x: 2350, y: 750,
        reward: { id: 'choco_cake_box', name: 'Guild Cake Box', count: 5, type: 'consumable', buff: 'atk', desc: 'Rare sweets buffing ATK by +25!' }
      },
      {
        x: 2300, y: 2300,
        reward: { id: 'ancient_relic', name: 'Relic of Savior', count: 1000, type: 'gold', desc: 'Ancient golden treasure from the Golem sanctuary.' }
      },
      {
        x: 800, y: 2200,
        reward: { id: 'gold_pouch', name: 'Treasure Pouch', count: 500, type: 'gold', desc: '500 Gold coins.' }
      }
    ];

    this.chests = chestLocations.map((c, idx) => ({
      id: `chest_${idx}`,
      x: c.x,
      y: c.y,
      opened: false,
      reward: c.reward
    }));
  }

  update(dt) {
    // Respawn gathering nodes
    for (const node of this.gatheringNodes) {
      if (!node.available) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.available = true;
        }
      }
    }
  }

  // Get current zone name based on coordinates
  getCurrentZone(x, y) {
    for (const z of this.zones) {
      const dx = x - z.x;
      const dy = y - z.y;
      if (Math.hypot(dx, dy) <= z.radius) {
        return z.name;
      }
    }
    return 'Forest of Savior - Deep Woods';
  }

  // Check collision against solid world obstacles
  checkCollision(x, y, radius = 14) {
    // Map edges
    if (x - radius < 60 || x + radius > this.width - 60 || y - radius < 60 || y + radius > this.height - 60) {
      return true;
    }

    // Check trees (tree trunk circular collider)
    for (const tree of this.trees) {
      const dx = x - tree.x;
      const dy = y - (tree.y + 12); // tree trunk center
      const treeRadius = tree.radius * 0.38;
      if (Math.hypot(dx, dy) < (radius + treeRadius)) {
        return true;
      }
    }

    // Check decorations (stone pillars, tables, benches, stone lanterns)
    for (const dec of this.decorations) {
      if (dec.type === 'ruin_pillar') {
        const dx = x - dec.x;
        const dy = y - dec.y;
        if (Math.hypot(dx, dy) < (radius + (dec.radius || 20))) {
          return true;
        }
      } else if (dec.type === 'table') {
        if (x >= dec.x - radius && x <= dec.x + dec.width + radius &&
            y >= dec.y - radius && y <= dec.y + dec.height + radius) {
          return true;
        }
      } else if (dec.type === 'bench') {
        if (x >= dec.x - radius && x <= dec.x + dec.width + radius &&
            y >= dec.y - radius && y <= dec.y + dec.height + radius) {
          return true;
        }
      } else if (dec.type === 'lantern') {
        const dx = x - dec.x;
        const dy = y - dec.y;
        if (Math.hypot(dx, dy) < (radius + 8)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * High-Precision Fluid Pathfinding & Anti-Stuck Steering:
   * Enables seamless navigation around trees, ruin pillars, camp furniture, and tight corners.
   * Employs multi-whisker raycasts, dual-axis slide projection, and automatic anti-stuck recovery.
   */
  navigate(entity, targetX, targetY, speed, dt, radius = 14, minDistance = 6) {
    if (!entity) return true;

    const dx = targetX - entity.x;
    const dy = targetY - entity.y;
    const dist = Math.hypot(dx, dy);

    // Update entity facing direction for sprite rendering
    if (Math.abs(dx) > 1.5) {
      entity.facing = dx >= 0 ? 'right' : 'left';
    }

    if (dist <= minDistance) {
      entity._stuckDuration = 0;
      return true; // Reached target threshold
    }

    const step = Math.min(dist, speed * dt);
    const directAngle = Math.atan2(dy, dx);

    // Track movement progress to detect physical jams
    if (!entity._navPos) {
      entity._navPos = { x: entity.x, y: entity.y };
      entity._stuckDuration = 0;
    }
    const deltaMoved = Math.hypot(entity.x - entity._navPos.x, entity.y - entity._navPos.y);
    if (deltaMoved < 1.0) {
      entity._stuckDuration = (entity._stuckDuration || 0) + dt;
    } else {
      entity._stuckDuration = 0;
      entity._navPos.x = entity.x;
      entity._navPos.y = entity.y;
    }

    // 1. Try Direct Line-of-Sight Step
    const directNextX = entity.x + Math.cos(directAngle) * step;
    const directNextY = entity.y + Math.sin(directAngle) * step;

    if (!this.checkCollision(directNextX, directNextY, radius)) {
      entity.x = directNextX;
      entity.y = directNextY;
      return false;
    }

    // 2. Direct Step Blocked: Try Independent Axis Sliding (wall/tree-sliding)
    let movedX = false;
    let movedY = false;

    if (!this.checkCollision(directNextX, entity.y, radius)) {
      entity.x = directNextX;
      movedX = true;
    }
    if (!this.checkCollision(entity.x, directNextY, radius)) {
      entity.y = directNextY;
      movedY = true;
    }

    if (movedX || movedY) {
      return false;
    }

    // 3. Multi-Ray Tangential Whisker Steering around obstacle perimeter
    const whiskerOffsets = [
      0.30, -0.30,
      0.60, -0.60,
      0.95, -0.95,
      1.30, -1.30,
      1.65, -1.65,
      2.00, -2.00
    ];

    for (const offset of whiskerOffsets) {
      const probeAngle = directAngle + offset;
      const px = entity.x + Math.cos(probeAngle) * step;
      const py = entity.y + Math.sin(probeAngle) * step;
      if (!this.checkCollision(px, py, radius)) {
        entity.x = px;
        entity.y = py;
        return false;
      }
    }

    // 4. Autonomous Anti-Stuck Pulse: If entity is cornered or wedged against obstacle
    if (entity._stuckDuration > 0.35) {
      this.resolveOverlap(entity, radius);

      // Generate lateral evasion impulse
      const evasionSign = (entity.id && entity.id.charCodeAt(0) % 2 === 0) ? 1 : -1;
      const evasionAngle = directAngle + (Math.PI * 0.5 * evasionSign);
      const evStep = step * 1.4;
      const evX = entity.x + Math.cos(evasionAngle) * evStep;
      const evY = entity.y + Math.sin(evasionAngle) * evStep;

      if (!this.checkCollision(evX, evY, radius)) {
        entity.x = evX;
        entity.y = evY;
      } else {
        // Reverse lateral escape
        const revX = entity.x - Math.cos(evasionAngle) * evStep;
        const revY = entity.y - Math.sin(evasionAngle) * evStep;
        if (!this.checkCollision(revX, revY, radius)) {
          entity.x = revX;
          entity.y = revY;
        }
      }

      // If severely stuck for > 1.6s, gently reposition towards target open space
      if (entity._stuckDuration > 1.6) {
        this.resolveOverlap(entity, radius + 4);
        entity._stuckDuration = 0;
      }
    }

    return false;
  }

  /**
   * Pushes entities safely out of overlapping obstacle colliders
   */
  resolveOverlap(entity, radius = 14) {
    if (!entity) return;

    // Resolve Tree Collisions
    for (const tree of this.trees) {
      const dx = entity.x - tree.x;
      const dy = entity.y - (tree.y + 12);
      const d = Math.hypot(dx, dy);
      const minDist = radius + tree.radius * 0.38;
      if (d < minDist && d > 0.01) {
        const push = minDist - d + 2.5;
        entity.x += (dx / d) * push;
        entity.y += (dy / d) * push;
      }
    }

    // Resolve Decorations (Pillars, Lanterns, Tables, Benches)
    for (const dec of this.decorations) {
      if (dec.type === 'ruin_pillar') {
        const dx = entity.x - dec.x;
        const dy = entity.y - dec.y;
        const d = Math.hypot(dx, dy);
        const minDist = radius + (dec.radius || 20);
        if (d < minDist && d > 0.01) {
          const push = minDist - d + 2.5;
          entity.x += (dx / d) * push;
          entity.y += (dy / d) * push;
        }
      } else if (dec.type === 'lantern') {
        const dx = entity.x - dec.x;
        const dy = entity.y - dec.y;
        const d = Math.hypot(dx, dy);
        const minDist = radius + 8;
        if (d < minDist && d > 0.01) {
          const push = minDist - d + 2;
          entity.x += (dx / d) * push;
          entity.y += (dy / d) * push;
        }
      } else if (dec.type === 'table' || dec.type === 'bench') {
        const centerX = dec.x + dec.width * 0.5;
        const centerY = dec.y + dec.height * 0.5;
        const hw = dec.width * 0.5 + radius;
        const hh = dec.height * 0.5 + radius;
        const dx = entity.x - centerX;
        const dy = entity.y - centerY;

        if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
          const overlapX = hw - Math.abs(dx);
          const overlapY = hh - Math.abs(dy);
          if (overlapX < overlapY) {
            entity.x += (dx > 0 ? 1 : -1) * (overlapX + 2);
          } else {
            entity.y += (dy > 0 ? 1 : -1) * (overlapY + 2);
          }
        }
      }
    }

    // Resolve Map Edges
    const margin = 65;
    if (entity.x < margin) entity.x = margin;
    if (entity.x > this.width - margin) entity.x = this.width - margin;
    if (entity.y < margin) entity.y = margin;
    if (entity.y > this.height - margin) entity.y = this.height - margin;
  }
}
