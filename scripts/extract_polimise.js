const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    // If file already exists and is non-empty, skip
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve(destPath);
    }

    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        return reject(new Error(`Failed to download ${url}: status code ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
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
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  console.log('Fetching Polimise Nuomi collection...');
  const res = await fetch('https://polimise.com/collections/nuomi/products.json?limit=250');
  const data = await res.json();
  const products = data.products || [];

  console.log(`Retrieved ${products.length} products from Polimise Nuomi.`);

  const imagesDir = path.join(process.cwd(), 'public', 'images', 'products');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const extractedItems = [];
  let itemCounter = 1;

  for (let pIndex = 0; pIndex < products.length; pIndex++) {
    const p = products[pIndex];
    const isWardrobe = p.product_type === 'Wardrobe' || p.tags.includes('Wardrobe');
    const category = isWardrobe ? 'Polimise Wardrobe Accessories' : 'Polimise Kitchen Accessories';

    for (let vIndex = 0; vIndex < p.variants.length; vIndex++) {
      const v = p.variants[vIndex];
      const codeNum = String(itemCounter).padStart(3, '0');
      const articleNo = `PLM-NM-${codeNum}`;
      itemCounter++;

      // Build product title displaying "Polimise"
      let name = p.title.trim();
      if (!name.startsWith('Polimise')) {
        name = `Polimise - ${name}`;
      }
      if (p.variants.length > 1 && v.title && v.title !== 'Default Title') {
        const vTitle = v.title.trim();
        if (!name.toLowerCase().includes(vTitle.toLowerCase())) {
          name = `${name} (${vTitle})`;
        }
      }

      // Exact Image URL
      const imgObj = v.featured_image || p.images[0];
      let imgPath = '';
      if (imgObj && imgObj.src) {
        // Clean URL to download
        const rawUrl = imgObj.src.split('?')[0];
        const ext = path.extname(rawUrl) || '.jpg';
        const imgFileName = `polimise_nuomi_${p.id}_${v.id}${ext}`;
        const localFilePath = path.join(imagesDir, imgFileName);

        try {
          await downloadImage(imgObj.src, localFilePath);
          imgPath = `images/products/${imgFileName}`;
        } catch (e) {
          console.error(`Failed to download image for ${name}:`, e.message);
          imgPath = imgObj.src; // fallback to CDN url if local download fails
        }
      }

      const desc = cleanHtml(p.body_html) || `${name}. High quality Nuomi hardware distributed by Polimise.`;
      const price = parseFloat(v.price) || 0;

      extractedItems.push({
        id: `polimise_nuomi_${p.id}_${v.id}`,
        catalog: 'Polimise',
        category: category,
        subcategory: isWardrobe ? 'Wardrobe Hardware' : 'Kitchen Accessories',
        sn: String(extractedItems.length + 1),
        articleNo: articleNo,
        name: name,
        description: desc,
        unit: 'No',
        perSqfRate: null,
        mrp: price,
        image: imgPath,
        inStock: v.available ?? true
      });
    }
  }

  console.log(`\nSuccessfully processed ${extractedItems.length} items from Polimise!`);
  
  // Save extracted items to scripts/polimise_items.json
  const outPath = path.join(process.cwd(), 'scripts', 'polimise_items.json');
  fs.writeFileSync(outPath, JSON.stringify(extractedItems, null, 2), 'utf-8');
  console.log(`Saved items to ${outPath}`);

  // Sample preview
  console.log('\nPreview of first 3 items:');
  console.log(extractedItems.slice(0, 3));
}

run().catch(console.error);
