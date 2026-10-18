const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dngdvqkvhtabpfskmhan.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_N_dHFFD0hGGKrN5KOP_TJw_RkdU2Pwd';
const supabase = createClient(supabaseUrl, supabaseKey);

function getShop(p) {
  if (p.catalog === 'Polimise' || (p.id && String(p.id).startsWith('polimise_'))) return 'Polimise';
  if (p.catalog === 'MM Noorbhoy' || (p.id && String(p.id).startsWith('noorbhoy_'))) return 'MM Noorbhoy';
  return 'PDS';
}

function getNewCategory(p) {
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

async function run() {
  const currentPath = path.join(process.cwd(), 'data', 'products.json');
  const defaultPath = path.join(process.cwd(), 'data', 'products_default.json');

  const raw = fs.readFileSync(currentPath, 'utf-8');
  const products = JSON.parse(raw);

  const updatedProducts = products.map(p => {
    const newCat = getNewCategory(p);
    const shop = p.shop || getShop(p);
    return {
      ...p,
      category: newCat,
      shop: shop
    };
  });

  // Write updated data files
  fs.writeFileSync(currentPath, JSON.stringify(updatedProducts, null, 2), 'utf-8');
  fs.writeFileSync(defaultPath, JSON.stringify(updatedProducts, null, 2), 'utf-8');
  console.log(`Updated data/products.json and data/products_default.json (${updatedProducts.length} items)`);

  // Category matrix
  const matrix = {};
  updatedProducts.forEach(p => {
    if (!matrix[p.category]) matrix[p.category] = { Total: 0, PDS: 0, Polimise: 0, 'MM Noorbhoy': 0 };
    matrix[p.category].Total++;
    matrix[p.category][p.shop]++;
  });
  console.table(matrix);

  // Sync to Supabase
  console.log('Syncing categories to Supabase database...');
  const rows = updatedProducts.map(p => ({
    id: String(p.id),
    article_no: String(p.articleNo || p.article_no || ''),
    name: String(p.name || ''),
    category: String(p.category || ''),
    mrp: Number(p.mrp || 0),
    unit: String(p.unit || 'No'),
    description: String(p.description || ''),
    image: String(p.image || '')
  }));

  const batchSize = 100;
  let synced = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error syncing batch ${i} - ${i + batch.length}:`, error.message);
    } else {
      synced += batch.length;
    }
  }
  console.log(`Successfully synced ${synced}/${rows.length} products to Supabase.`);
}

run().catch(console.error);
