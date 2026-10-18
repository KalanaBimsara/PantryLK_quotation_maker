const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve(destPath);
    }

    if (url.startsWith('//')) url = 'https:' + url;

    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(destPath, () => {});
        const redirectUrl = res.headers.location.startsWith('//') ? 'https:' + res.headers.location : res.headers.location;
        return downloadImage(redirectUrl, destPath).then(resolve);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return resolve(null);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    });

    req.on('error', () => {
      file.close();
      fs.unlink(destPath, () => {});
      resolve(null);
    });
    req.setTimeout(12000, () => {
      req.destroy();
      file.close();
      fs.unlink(destPath, () => {});
      resolve(null);
    });
  });
}

async function runPool(items, limit, fn) {
  let index = 0;
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item, index++));
    executing.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(executing);
}

function getCategory(p) {
  const t = (p.title || '').toLowerCase();
  const type = (p.product_type || '').toLowerCase();

  // 1. Kitchen Appliances
  if (
    type.includes('oven') || type.includes('hob') || type.includes('hood') || type.includes('dishwasher') ||
    type.includes('refrigerator') || type.includes('cooktop') || type.includes('chiller') ||
    t.includes('oven') || t.includes('gas hob') || t.includes('cooker hood') || t.includes('dishwasher') ||
    t.includes('refrigerator') || t.includes('induction cooktop') || t.includes('wine chiller')
  ) {
    return 'Kitchen Appliances';
  }

  // 2. Sinks & Mixer Taps
  if (
    type.includes('sink') || type.includes('tap') || type.includes('faucet') ||
    t.includes('sink') || t.includes('mixer tap') || t.includes('faucet') || t.includes('tap') ||
    t.includes('strainer') || t.includes('drain cover') || t.includes('waste coupling')
  ) {
    return 'Sinks & Mixer Taps';
  }

  // 3. Cutlery Trays & Waste Bins
  if (
    type.includes('cutlery') || type.includes('waste bin') || type.includes('dustbin') ||
    t.includes('cutlery') || t.includes('waste bin') || t.includes('dustbin') || t.includes('trash')
  ) {
    return 'Cutlery Trays & Waste Bins';
  }

  // 4. Hardware, Hinges & Drawer Systems
  if (
    type.includes('drawer') || type.includes('lift') || type.includes('stay') || type.includes('front') ||
    t.includes('drawer slide') || t.includes('drawer railing') || t.includes('drawer system') ||
    t.includes('flap stay') || t.includes('door lift') || t.includes('bifold') || t.includes('hinge') ||
    t.includes('tandem') || t.includes('front panel') || t.includes('front clip') || t.includes('drawer carcass')
  ) {
    return 'Hardware, Hinges & Drawer Systems';
  }

  // 5. Handles & Profiles
  if (type.includes('handle') || type.includes('knob') || t.includes('handle') || t.includes('knob')) {
    return 'Aluminium Profiles & Handles';
  }

  // 6. Default in kitchen-fittings -> Kitchen Pullouts & Storage Racks
  return 'Kitchen Pullouts & Storage Racks';
}

async function fetchKitchenFittings() {
  console.log('Fetching all products from https://noorbhoy.com/collections/kitchen-fittings...');
  let page = 1;
  const products = [];
  while (true) {
    const url = 'https://noorbhoy.com/collections/kitchen-fittings/products.json?limit=250&page=' + page;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      console.log('Error fetching page', page, 'status:', res.status);
      break;
    }
    const data = await res.json();
    if (!data.products || data.products.length === 0) break;
    products.push(...data.products);
    console.log(`Page ${page}: ${data.products.length} products (cumulative: ${products.length})`);
    if (data.products.length < 250) break;
    page++;
  }
  return products;
}

async function main() {
  const products = await fetchKitchenFittings();
  console.log(`\nTotal products retrieved from kitchen-fittings: ${products.length}`);

  const imagesDir = path.join(process.cwd(), 'public', 'images', 'products');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const scrapedItems = [];
  let counter = 1;

  for (const p of products) {
    const category = getCategory(p);

    for (const v of p.variants) {
      const codeNum = String(counter).padStart(4, '0');
      const articleNo = v.sku && v.sku.trim().length > 1 ? v.sku.trim() : `NBH-KF-${codeNum}`;
      counter++;

      let baseTitle = p.title.trim();
      let itemName = `MM Noorbhoy - ${baseTitle}`;
      if (p.variants.length > 1 && v.title && v.title !== 'Default Title') {
        const vTitle = v.title.trim();
        if (!itemName.toLowerCase().includes(vTitle.toLowerCase())) {
          itemName += ` (${vTitle})`;
        }
      }

      const imgObj = v.featured_image || (p.images && p.images[0]);
      const imageUrl = imgObj ? imgObj.src : '';
      const ext = imageUrl ? (path.extname(imageUrl.split('?')[0]) || '.jpg') : '.jpg';
      const imgFileName = `noorbhoy_${p.id}_${v.id}${ext}`;
      const localRelativePath = `images/products/${imgFileName}`;
      const localAbsolutePath = path.join(imagesDir, imgFileName);

      const price = parseFloat(v.price) || 0;
      const descText = cleanHtml(p.body_html) || `${itemName}. Quality hardware from MM Noorbhoy & Co.`;

      scrapedItems.push({
        id: `noorbhoy_${p.id}_${v.id}`,
        catalog: 'MM Noorbhoy',
        shop: 'MM Noorbhoy',
        category: category,
        subcategory: 'Kitchen Fittings',
        articleNo: articleNo,
        name: itemName,
        description: descText,
        unit: 'No',
        perSqfRate: null,
        mrp: price,
        image: localRelativePath,
        imageUrl: imageUrl,
        localPath: localAbsolutePath,
        inStock: Boolean(v.available)
      });
    }
  }

  console.log(`Total variants (catalog items) parsed: ${scrapedItems.length}`);

  // Download missing images in pool
  console.log('Downloading images for kitchen fittings...');
  let downloadedCount = 0;
  await runPool(scrapedItems, 8, async (item) => {
    if (item.imageUrl) {
      const res = await downloadImage(item.imageUrl, item.localPath);
      if (res) downloadedCount++;
    }
  });
  console.log(`Finished image processing. Total ready images: ${downloadedCount}`);

  // Read current products catalog
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  const defaultPath = path.join(process.cwd(), 'data', 'products_default.json');
  const currentCatalog = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  // Separate existing items: keep PDS LK, Polimise, and Noorbhoy non-kitchen fittings
  const kitchenScrapedIds = new Set(scrapedItems.map(x => x.id));
  
  // Non-kitchen Noorbhoy items: Wardrobe, Edge Banding, HMR Boards, and Hardware not in kitchen collection
  const preservedItems = currentCatalog.filter(p => {
    if (p.shop !== 'MM Noorbhoy') return true;
    return !kitchenScrapedIds.has(p.id);
  });

  console.log(`Preserved existing items: ${preservedItems.length} (PDS LK, Polimise, Noorbhoy Wardrobe/Edge/HMR/Hardware)`);

  // Clean format for new scraped items
  const cleanScrapedItems = scrapedItems.map(item => ({
    id: item.id,
    catalog: 'MM Noorbhoy',
    shop: 'MM Noorbhoy',
    category: item.category,
    subcategory: item.subcategory,
    articleNo: item.articleNo,
    name: item.name,
    description: item.description,
    unit: item.unit,
    perSqfRate: item.perSqfRate,
    mrp: item.mrp,
    image: item.image,
    inStock: item.inStock
  }));

  // Combine preserved items + scraped kitchen items
  const finalCatalog = [...preservedItems, ...cleanScrapedItems];
  console.log(`New Grand Total Catalog: ${finalCatalog.length} products`);

  // Save to both data/products.json and data/products_default.json
  fs.writeFileSync(productsPath, JSON.stringify(finalCatalog, null, 2), 'utf-8');
  fs.writeFileSync(defaultPath, JSON.stringify(finalCatalog, null, 2), 'utf-8');
  console.log('Successfully saved to data/products.json and data/products_default.json');

  // Print final distribution
  const matrix = {};
  finalCatalog.forEach(p => {
    if (!matrix[p.category]) matrix[p.category] = { Total: 0, PDS: 0, Polimise: 0, 'MM Noorbhoy': 0 };
    matrix[p.category].Total++;
    matrix[p.category][p.shop]++;
  });
  console.log('\nFinal Catalog Matrix by Category and Supplier:');
  console.table(matrix);
}

main().catch(err => {
  console.error('Extraction error:', err);
  process.exit(1);
});
