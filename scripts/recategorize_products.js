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
  const name = (p.name || '').toLowerCase();
  const desc = (p.description || '').toLowerCase();
  const catalog = p.catalog || '';
  const sub = p.subcategory || '';
  const shop = getShop(p);

  // 1. MM Noorbhoy
  if (shop === 'MM Noorbhoy') {
    const s = nbMap.get(p.id) || '';
    if (s === 'Sinks & Taps') return 'Sinks & Mixer Taps';
    if (s === 'Edge Banding') return 'Edge Banding';
    if (s === 'HMR Boards') return 'Boards & Panels';
    if (s === 'Wardrobe Fittings') return 'Wardrobe Accessories';
    if (s === 'Pullouts & Baskets') {
      if (name.includes('cutlery') || name.includes('dustbin') || name.includes('waste bin')) {
        return 'Cutlery Trays & Waste Bins';
      }
      return 'Kitchen Pullouts & Storage Racks';
    }
    if (s === 'Hardware & Slides') {
      if (name.includes('handle') || name.includes('knob')) {
        return 'Aluminium Profiles & Handles';
      }
      if (name.includes('ironing board')) {
        return 'Wardrobe Accessories';
      }
      return 'Hardware, Hinges & Drawer Systems';
    }
  }

  // 2. Polimise
  if (shop === 'Polimise') {
    if (name.includes('sink')) return 'Sinks & Mixer Taps';
    if (name.includes('cutlery') || name.includes('dustbin') || name.includes('waste bin')) return 'Cutlery Trays & Waste Bins';
    if (name.includes('wardrobe') || name.includes('wardobe') || name.includes('trouser') || name.includes('mirror') || name.includes('winder') || name.includes('clothes') || name.includes('hanger')) {
      return 'Wardrobe Accessories';
    }
    return 'Kitchen Pullouts & Storage Racks';
  }

  // 3. PDS (by clean catalog and subcategory)
  if (sub === 'Edge Banding' || (catalog === 'AGT' && p.unit === 'Mtr') || name.includes('edge band') || name.includes('pvc edge')) {
    return 'Edge Banding';
  }
  if (catalog === 'SCHOCK Germany' || name.includes('schock') || desc.includes('schock') || name.includes('granite kitchen sink')) {
    return 'Sinks & Mixer Taps';
  }
  if (catalog === 'VESTEL Appliances') return 'Kitchen Appliances';
  if (catalog === 'LG HI-MACS' || catalog === 'PDS Wall Paneling') return 'Solid Surfaces & Wall Panels';
  if (catalog === 'PDS Lighting') return 'LED Lighting & Electrical';
  if (catalog === 'PDS PVC & Dustbins') return 'Cutlery Trays & Waste Bins';
  if (catalog === 'PDS Wardrobe') return 'Wardrobe Accessories';
  if (catalog === 'PDS Kitchen Storage') return 'Kitchen Pullouts & Storage Racks';
  if (catalog === 'PDS Aluminium Profiles' || name.includes('handle') || name.includes('knob')) {
    return 'Aluminium Profiles & Handles';
  }
  if (catalog === 'HeveaBoard' || catalog === 'AGT') {
    return 'Boards & Panels';
  }
  if (catalog === 'PDS Hardware & Handles') {
    return 'Hardware, Hinges & Drawer Systems';
  }

  return 'Hardware, Hinges & Drawer Systems';
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
