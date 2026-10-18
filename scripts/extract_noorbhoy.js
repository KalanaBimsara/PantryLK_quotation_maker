const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve(destPath);
    }

    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(destPath, () => {});
        return downloadImage(res.headers.location, destPath).then(resolve);
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

async function fetchAllProducts() {
  let page = 1;
  const all = [];
  console.log('Fetching products from noorbhoy.com...');
  while (true) {
    try {
      const res = await fetch(`https://noorbhoy.com/products.json?limit=250&page=${page}`);
      const data = await res.json();
      if (!data.products || data.products.length === 0) break;
      all.push(...data.products);
      console.log(`Page ${page}: ${data.products.length} products (Total: ${all.length})`);
      if (data.products.length < 250) break;
      page++;
    } catch (e) {
      console.error('Error fetching page', page, e.message);
      break;
    }
  }
  return all;
}

async function run() {
  const allProducts = await fetchAllProducts();
  console.log(`Total products downloaded: ${allProducts.length}`);

  const imagesDir = path.join(process.cwd(), 'public', 'images', 'products');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const selectedItems = [];
  let counter = 1;

  for (const p of allProducts) {
    const t = p.title.toLowerCase();
    const type = (p.product_type || '').toLowerCase();
    const tags = (p.tags || []).map(x => x.toLowerCase()).join(' ');
    const desc = (p.body_html || '').toLowerCase();

    // 1. Strict Exclusions
    if (t.includes('soap') || t.includes('towel') || t.includes('toilet') || t.includes('shower') || t.includes('toothbrush') || t.includes('bathroom') || t.includes('bath mixer')) continue;
    if (t.includes('cleaning') || t.includes('duster') || t.includes('bbq') || t.includes('barbecue') || t.includes('dinnerware') || t.includes('cookware') || t.includes('baking') || t.includes('frying pan') || t.includes('pressure cooker')) continue;
    if (t.includes('door closer') || t.includes('door lock') || t.includes('door bolt') || t.includes('padlock') || t.includes('key box') || t.includes('door stopper') || t.includes('door viewer') || t.includes('floor hinge') || t.includes('panic exit') || t.includes('door guard') || t.includes('door knocker') || t.includes('door chain') || t.includes('door selector')) continue;
    if (t.includes('table bracket') || t.includes('sofa') || t.includes('curtain') || t.includes('window')) continue;

    let category = null;
    let subcategory = '';

    // 2. Boards & Edge Banding: ONLY HMR and AGT boards and edge bands
    const isEdge = t.includes('edge band') || type.includes('edge band');
    const isHmr = (t.includes('hmr') || tags.includes('hmr') || desc.includes('hmr')) && (t.includes('board') || t.includes('mdf') || t.includes('mfc'));
    const isAgt = t.includes('agt') && (t.includes('board') || t.includes('panel') || t.includes('mdf'));

    if (isEdge || isHmr || isAgt) {
      category = 'MM Noorbhoy HMR Boards & Edge Bands';
      subcategory = isEdge ? 'Edge Banding' : (isHmr ? 'HMR Boards' : 'AGT Boards');
    }
    // 3. Wardrobe Manufacturing
    else if (t.includes('wardrobe') || t.includes('trouser rack') || t.includes('tie rack') || t.includes('liftable hanger') || t.includes('wardrobe lift') || t.includes('jewelry box') || t.includes('shoe rack') || type.includes('wardrobe')) {
      category = 'MM Noorbhoy Wardrobe Accessories';
      subcategory = 'Wardrobe Fittings';
    }
    // 4. Kitchen & Pantry Manufacturing
    else if (
      t.includes('pullout') || t.includes('pull-out') || t.includes('pull out') ||
      t.includes('cutlery tray') || t.includes('dish rack') || t.includes('kitchen basket') ||
      t.includes('pantry roll-out') || t.includes('pantry unit') || t.includes('corner unit') ||
      t.includes('revolving saucer') || t.includes('magic corner') || t.includes('kitchen rack') ||
      (t.includes('sink') && !t.includes('faucet mat')) || t.includes('kitchen tap') || t.includes('sink tap') || t.includes('sink mixer') ||
      t.includes('tandem') || t.includes('drawer system') || t.includes('drawer railing') || t.includes('drawer slide') ||
      t.includes('concealed hinge') ||
      ((t.includes('waste bin') || t.includes('dustbin')) && (t.includes('cabinet') || t.includes('kitchen') || t.includes('pull')))
    ) {
      category = 'MM Noorbhoy Kitchen & Pantry Fittings';
      subcategory = t.includes('sink') || t.includes('tap') || t.includes('mixer') ? 'Sinks & Taps' : (t.includes('hinge') || t.includes('drawer') ? 'Hardware & Slides' : 'Pullouts & Baskets');
    }

    if (!category) continue;

    for (const v of p.variants) {
      const codeNum = String(counter).padStart(3, '0');
      const articleNo = v.sku && v.sku.trim().length > 1 ? v.sku.trim() : `NBH-${codeNum}`;
      counter++;

      // Clean Title with MM Noorbhoy
      let baseTitle = p.title.trim();
      let itemName = `MM Noorbhoy - ${baseTitle}`;
      if (p.variants.length > 1 && v.title && v.title !== 'Default Title') {
        const vTitle = v.title.trim();
        if (!itemName.toLowerCase().includes(vTitle.toLowerCase())) {
          itemName += ` (${vTitle})`;
        }
      }

      const imgObj = v.featured_image || p.images[0];
      const imageUrl = imgObj?.src || '';
      const ext = imageUrl ? (path.extname(imageUrl.split('?')[0]) || '.jpg') : '.jpg';
      const imgFileName = `noorbhoy_${p.id}_${v.id}${ext}`;
      const localRelativePath = `images/products/${imgFileName}`;
      const localAbsolutePath = path.join(imagesDir, imgFileName);

      const price = parseFloat(v.price) || 0;
      const descText = cleanHtml(p.body_html) || `${itemName}. Quality hardware from MM Noorbhoy & Co.`;
      const isMtr = isEdge;

      selectedItems.push({
        id: `noorbhoy_${p.id}_${v.id}`,
        catalog: 'MM Noorbhoy',
        category: category,
        subcategory: subcategory,
        sn: String(selectedItems.length + 1),
        articleNo: articleNo,
        name: itemName,
        description: descText,
        unit: isMtr ? 'Mtr' : 'No',
        perSqfRate: null,
        mrp: price,
        image: localRelativePath,
        inStock: v.available ?? true,
        _imageUrl: imageUrl,
        _localAbsolutePath: localAbsolutePath
      });
    }
  }

  console.log(`\nFiltered down to ${selectedItems.length} pantry & wardrobe items for MM Noorbhoy!`);

  // Download images concurrently in batches of 15
  console.log('Downloading item images...');
  const batchSize = 15;
  let downloadedCount = 0;

  for (let i = 0; i < selectedItems.length; i += batchSize) {
    const batch = selectedItems.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        if (item._imageUrl) {
          const res = await downloadImage(item._imageUrl, item._localAbsolutePath);
          if (res) downloadedCount++;
        }
      })
    );
    process.stdout.write(`Downloaded ${Math.min(i + batchSize, selectedItems.length)} / ${selectedItems.length} images\r`);
  }
  console.log(`\nImage downloads finished. Successfully stored ${downloadedCount} images.`);

  // Clean temp keys before saving
  const finalItems = selectedItems.map(item => {
    const { _imageUrl, _localAbsolutePath, ...rest } = item;
    return rest;
  });

  const outPath = path.join(process.cwd(), 'scripts', 'noorbhoy_items.json');
  fs.writeFileSync(outPath, JSON.stringify(finalItems, null, 2), 'utf-8');
  console.log(`Saved items to ${outPath}`);

  // Summary by category
  const summary = {};
  finalItems.forEach(item => {
    summary[item.category] = (summary[item.category] || 0) + 1;
  });
  console.log('\nFinal Items Breakdown:', summary);
}

run().catch(console.error);
