/**
 * World and Map System for Forest of Savior (FOS).
 * Procedural tile engine with Japanese anime fantasy aesthetics.
 * Pure JavaScript, optimized for fast rendering and collision checks.
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
      { x: 1850, y: 750 }, { x: 1950, y: 820 }, { x: 2050, y: 700 }, { x: 2150, y: 850 },
      { x: 1200, y: 1550 }, { x: 1050, y: 950 }, { x: 1600, y: 1250 }, { x: 2250, y: 920 }
    ];
    herbs.forEach((pos, idx) => {
      this.gatheringNodes.push({
        id: `herb_${idx}`,
        type: 'herb',
        name: 'Moonbloom Herb',
        x: pos.x,
        y: pos.y,
        respawnTimer: 0,
        available: true,
        itemReward: { id: 'moonbloom', name: 'Moonbloom Herb', count: 1, type: 'material', desc: 'A glowing petal essential for Akane\'s guild potion quest.' }
      });
    });

    // 6 Mana Crystals
    const crystals = [
      { x: 1950, y: 2050 }, { x: 2250, y: 2050 }, { x: 2100, y: 1880 },
      { x: 850, y: 1600 }, { x: 1650, y: 650 }, { x: 1450, y: 2200 }
    ];
    crystals.forEach((pos, idx) => {
      this.gatheringNodes.push({
        id: `crystal_${idx}`,
        type: 'crystal',
        name: 'Azure Mana Crystal',
        x: pos.x,
        y: pos.y,
        respawnTimer: 0,
        available: true,
        itemReward: { id: 'mana_crystal', name: 'Azure Mana Crystal', count: 1, type: 'material', desc: 'Rare crystalline catalyst infused with ancient Lv999 arcane energy.' }
      });
    });
  }

  spawnChests() {
    const chestLocations = [
      {
        x: 1600, y: 1500,
        reward: { id: 'potion_large', name: 'Chocolate Elixir', count: 3, type: 'consumable', desc: 'Delicious chocolate potion made by Eita. Restores 250 HP and MP!' }
      },
      {
        x: 650, y: 900,
        reward: { id: 'ring_savior', name: 'Ring of Savior', count: 1, type: 'accessory', stats: { magic: 25, def: 10 }, desc: 'A sparkling ring blessed by the Forest Goddess.' }
      },
      {
        x: 2250, y: 2150,
        reward: { id: 'yamada_staff', name: 'Wooden Wizard Rod', count: 1, type: 'weapon', stats: { magic: 65, atk: 20 }, desc: 'A plain wooden stick used by Yamada-kun. Has ridiculous magical power.' }
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
    return 'Forest of Savior - Deep Canopy';
  }

  // Check collision against solid world obstacles
  checkCollision(x, y, radius = 14) {
    // Map edges
    if (x - radius < 60 || x + radius > this.width - 60 || y - radius < 60 || y + radius > this.height - 60) {
      return true;
    }

    // Check trees
    for (const tree of this.trees) {
      const dx = x - tree.x;
      const dy = y - (tree.y + 12); // tree trunk center
      if (Math.hypot(dx, dy) < (radius + tree.radius * 0.45)) {
        return true;
      }
    }

    // Check stone pillars
    for (const dec of this.decorations) {
      if (dec.type === 'ruin_pillar') {
        const dx = x - dec.x;
        const dy = y - dec.y;
        if (Math.hypot(dx, dy) < (radius + dec.radius)) {
          return true;
        }
      } else if (dec.type === 'table') {
        if (x >= dec.x - radius && x <= dec.x + dec.width + radius &&
            y >= dec.y - radius && y <= dec.y + dec.height + radius) {
          return true;
        }
      }
    }

    return false;
  }
}
