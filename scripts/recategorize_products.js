const fs = require('fs');
const path = require('path');

let nbMap = new Map();
try {
  const nbPath = path.join(__dirname, 'noorbhoy_items.json');
  if (fs.existsSync(nbPath)) {
    const nbRaw = JSON.parse(fs.readFileSync(nbPath, 'utf-8'));
    nbRaw.forEach(i => nbMap.set(i.id, i.subcategory));
  }
} catch (e) {}

function getShop(p) {
  if (p.catalog === 'Polimise' || (p.id && String(p.id).startsWith('polimise_'))) return 'Polimise';
  if (p.catalog === 'MM Noorbhoy' || (p.id && String(p.id).startsWith('noorbhoy_'))) return 'MM Noorbhoy';
  return 'PDS';
}

function getCleanCategory(p) {
  const cat = p.category;
  const name = (p.name || '').toLowerCase();
  const desc = (p.description || '').toLowerCase();
  const sub = (p.subcategory || '').toLowerCase();
  const text = (name + ' ' + desc + ' ' + sub);

  // Carbon crystal board -> Boards
  if (name.includes('carbon crystal') || desc.includes('carbon crystal')) {
    return 'Boards';
  }

  // All aluminium items (include aluminum word in the title) from PVC -> Aluminium Profiles & Handles
  if (/alumin[i]?um/i.test(name)) {
    if (cat === 'PVC Panels' || sub.includes('pvc wall') || name.includes('end cap') || name.includes('joiner') || name.includes('corner') || name.includes('panel seperator')) {
      return 'Aluminium Profiles & Handles';
    }
  }

  // 1. Boards & Panels -> Boards
  if (cat === 'Boards & Panels' || cat === 'Boards') {
    return 'Boards';
  }

  // 2. Solid Surfaces & Wall Panels -> PVC Panels vs Solid Surfaces
  if (cat === 'Solid Surfaces & Wall Panels' || cat === 'PVC Panels' || cat === 'Solid Surfaces') {
    if (name.includes('flute panel') || name.includes('pvc wall paneling sheets') || sub.includes('pvc wall')) {
      return 'PVC Panels';
    }
    return 'Solid Surfaces';
  }

  // 3. Hardware, Hinges & Drawer Systems -> Hinges vs Drawer Systems
  if (cat === 'Hardware, Hinges & Drawer Systems' || cat === 'Hinges' || cat === 'Drawer Systems') {
    if (name.includes('yarım ay') || name.includes('kio 160mm') || name.includes('ren 916mm') || name.includes('roma 256mm') || name.includes('handle') || name.includes('knob')) {
      return 'Aluminium Profiles & Handles';
    }
    if (name.includes('iron board') || name.includes('ironing board')) {
      return 'Wardrobe Accessories';
    }
    if (name.includes('fruit tray')) {
      return 'Cutlery Trays & Waste Bins';
    }
    if (name.includes('cup & saucer') || name.includes('drawer basket') || name.includes('cargoplus')) {
      return 'Kitchen Pullouts & Storage Racks';
    }

    const isHinge = text.includes('hinge') || text.includes('lift system') || text.includes('lift up') || text.includes('folding door') || text.includes('lidstay') || text.includes('flap stay') || text.includes('cabinet stay') || text.includes('slide on') || text.includes('sensys') || text.includes('plaf');
    const isDrawer = text.includes('drawer') || text.includes('railing') || text.includes('drawer slide') || text.includes('bearing slide') || text.includes('slim box') || text.includes('slimbox') || text.includes('double wall') || text.includes('innotech') || text.includes('innotect') || text.includes('front clip') || text.includes('front panel') || text.includes('wood panel without railing') || text.includes('heavy duty drawer');

    if (isHinge && !isDrawer) return 'Hinges';
    if (isDrawer && !isHinge) return 'Drawer Systems';
    if (isHinge && isDrawer) {
      if (text.includes('lift') || text.includes('hinge') || text.includes('slide on')) return 'Hinges';
      return 'Drawer Systems';
    }
    if (name.includes('plastic corner')) return 'Hinges';
    return 'Hinges';
  }

  return cat;
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const prods = JSON.parse(raw);

  const updated = prods.map(p => {
    const shop = getShop(p);
    const cleanCat = getCleanCategory(p);
    return {
      ...p,
      shop: shop,
      category: cleanCat
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  console.log(`Updated ${filePath}: ${updated.length} products recategorized.`);
  return updated;
}

const currentFile = path.join(process.cwd(), 'data', 'products.json');
const defaultFile = path.join(process.cwd(), 'data', 'products_default.json');

const resCurrent = processFile(currentFile);
processFile(defaultFile);

// Print category matrix by shop
const matrix = {};
resCurrent.forEach(p => {
  if (!matrix[p.category]) matrix[p.category] = { Total: 0, PDS: 0, Polimise: 0, 'MM Noorbhoy': 0 };
  matrix[p.category].Total++;
  matrix[p.category][p.shop]++;
});

console.log('\nFinal Recategorized Matrix:');
console.table(matrix);
