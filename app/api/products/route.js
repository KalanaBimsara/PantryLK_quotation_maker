import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';
import fs from 'fs/promises';
import path from 'path';

async function getLocalProducts() {
  try {
    const localPath = path.join(process.cwd(), 'data', 'products.json');
    const raw = await fs.readFile(localPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function getProductShop(id) {
  if (typeof id === 'string') {
    if (id.startsWith('polimise_')) return 'Polimise';
    if (id.startsWith('noorbhoy_')) return 'MM Noorbhoy';
  }
  return 'PDS';
}

let productUrlsCache = null;

async function getProductUrls() {
  if (productUrlsCache) return productUrlsCache;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'data', 'product_urls.json'), 'utf-8');
    productUrlsCache = JSON.parse(raw);
  } catch (e) {
    productUrlsCache = {};
  }
  return productUrlsCache;
}

function resolveProductSourceUrl(p, urlMap = {}) {
  if (!p) return null;
  const m = p.id?.match(/(polimise|noorbhoy).*?(\d{10,16})/);
  if (m) {
    const key = m[1] + '_' + m[2];
    if (urlMap[key]) return urlMap[key];
  }
  const cleanName = (p.name || '').replace(/^(Polimise|MM Noorbhoy)\s*-\s*/i, '').trim();
  const query = p.articleNo || p.article_no || cleanName;
  const pShop = p.shop || getProductShop(p.id);

  if (pShop === 'Polimise' || p.id?.startsWith('polimise_')) {
    return `https://polimise.com/search?q=${encodeURIComponent(query)}`;
  }
  if (pShop === 'MM Noorbhoy' || p.id?.startsWith('noorbhoy_')) {
    return `https://noorbhoy.com/search?q=${encodeURIComponent(query)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent('PDS ' + (p.articleNo || p.article_no ? (p.articleNo || p.article_no) + ' ' : '') + cleanName)}`;
}

function filterLocalProducts(prods, { search, category, shops, minPrice, maxPrice, sort, page, limit, isAll }, urlMap = {}) {
  let list = prods.filter(p => {
    const pShop = p.shop || getProductShop(p.id);

    // Shop filter
    if (shops) {
      const shopList = shops.split(',').map(s => s.trim()).filter(Boolean);
      if (shopList.length > 0 && !shopList.includes(pShop)) return false;
    }

    // Category filter
    if (category && category !== 'All' && p.category !== category) {
      return false;
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase().trim();
      const art = (p.articleNo || p.article_no || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      if (!art.includes(q) && !name.includes(q) && !desc.includes(q) && !pShop.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Price filter
    const mrp = Number(p.mrp || 0);
    if (minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice)) && mrp < Number(minPrice)) {
      return false;
    }
    if (maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice)) && mrp > Number(maxPrice)) {
      return false;
    }

    return true;
  });

  // Sort
  if (sort === 'price-asc') list.sort((a, b) => Number(a.mrp || 0) - Number(b.mrp || 0));
  else if (sort === 'price-desc') list.sort((a, b) => Number(b.mrp || 0) - Number(a.mrp || 0));
  else if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sort === 'article') list.sort((a, b) => (a.articleNo || a.article_no || '').localeCompare(b.articleNo || b.article_no || ''));
  else list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));

  const totalCount = list.length;
  if (!isAll && limit > 0) {
    const from = (page - 1) * limit;
    list = list.slice(from, from + limit);
  }

  const formatted = list.map(p => ({
    id: p.id,
    articleNo: p.articleNo || p.article_no,
    name: p.name,
    category: p.category,
    shop: p.shop || getProductShop(p.id),
    mrp: Number(p.mrp || 0),
    unit: p.unit || 'No',
    description: p.description || '',
    image: p.image ? (p.image.startsWith('/') ? p.image : '/' + p.image) : '/images/placeholder.svg',
    sourceUrl: resolveProductSourceUrl(p, urlMap)
  }));

  return {
    products: formatted,
    totalCount,
    page,
    limit: isAll ? totalCount : limit,
    totalPages: isAll || limit <= 0 ? 1 : Math.max(1, Math.ceil(totalCount / limit))
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || searchParams.get('q') || '';
    const category = searchParams.get('category') || 'All';
    const shops = searchParams.get('shops') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || 'default';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = searchParams.get('limit');
    const format = searchParams.get('format') || '';
    const isAll = searchParams.get('all') === 'true' || limitParam === 'all' || limitParam === '0';
    const limit = isAll ? 0 : Math.max(1, parseInt(limitParam || '18', 10));

    const urlMap = await getProductUrls();

    // Try fetching directly from Supabase
    try {
      let query = supabase.from('products').select('*', { count: 'exact' });

      // Category filter
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      // Search filter
      if (search) {
        const q = search.replace(/[,()]/g, ' ').trim();
        if (q) {
          query = query.or(`article_no.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%`);
        }
      }

      // Price filter
      if (minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice))) {
        query = query.gte('mrp', Number(minPrice));
      }
      if (maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice))) {
        query = query.lte('mrp', Number(maxPrice));
      }

      // Shop checkboxes filter
      if (shops) {
        const shopList = shops.split(',').map(s => s.trim()).filter(Boolean);
        const hasPds = shopList.includes('PDS');
        const hasPolimise = shopList.includes('Polimise');
        const hasNoorbhoy = shopList.includes('MM Noorbhoy');

        if (!hasPds && !hasPolimise && !hasNoorbhoy) {
          return NextResponse.json(
            format === 'array' ? [] : { products: [], totalCount: 0, page, limit, totalPages: 0 }
          );
        } else if (hasPolimise && !hasPds && !hasNoorbhoy) {
          query = query.like('id', 'polimise_%');
        } else if (hasNoorbhoy && !hasPds && !hasPolimise) {
          query = query.like('id', 'noorbhoy_%');
        } else if (hasPds && !hasPolimise && !hasNoorbhoy) {
          query = query.not('id', 'like', 'polimise_%').not('id', 'like', 'noorbhoy_%');
        } else if (!hasPds && hasPolimise && hasNoorbhoy) {
          query = query.or('id.like.polimise_%,id.like.noorbhoy_%');
        } else if (hasPds && hasPolimise && !hasNoorbhoy) {
          query = query.not('id', 'like', 'noorbhoy_%');
        } else if (hasPds && !hasPolimise && hasNoorbhoy) {
          query = query.not('id', 'like', 'polimise_%');
        }
      }

      // Sorting
      if (sort === 'price-asc') query = query.order('mrp', { ascending: true });
      else if (sort === 'price-desc') query = query.order('mrp', { ascending: false });
      else if (sort === 'name') query = query.order('name', { ascending: true });
      else if (sort === 'article') query = query.order('article_no', { ascending: true });
      else query = query.order('category', { ascending: true }).order('name', { ascending: true });

      // Pagination
      let data = [];
      let count = null;

      if (isAll) {
        let from = 0;
        const chunkSize = 1000;
        while (true) {
          const { data: chunk, count: totalRows, error } = await query.range(from, from + chunkSize - 1);
          if (error) throw error;
          if (count === null && totalRows !== null && totalRows !== undefined) {
            count = totalRows;
          }
          data = data.concat(chunk || []);
          if (!chunk || chunk.length < chunkSize) break;
          from += chunkSize;
        }
      } else {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data: pageData, count: totalRows, error } = await query.range(from, to);
        if (error) throw error;
        data = pageData || [];
        count = totalRows;
      }

      const formatted = (data || []).map(p => ({
        id: p.id,
        articleNo: p.article_no,
        name: p.name,
        category: p.category,
        shop: getProductShop(p.id),
        mrp: Number(p.mrp || 0),
        unit: p.unit || 'No',
        description: p.description || '',
        image: p.image ? (p.image.startsWith('/') ? p.image : '/' + p.image) : '/images/placeholder.svg',
        sourceUrl: resolveProductSourceUrl(p, urlMap)
      }));

      const totalCount = count !== null && count !== undefined ? count : formatted.length;
      const totalPages = isAll || limit <= 0 ? 1 : Math.max(1, Math.ceil(totalCount / limit));

      if (format === 'array') {
        return NextResponse.json(formatted);
      }

      return NextResponse.json({
        products: formatted,
        totalCount,
        page,
        limit: isAll ? totalCount : limit,
        totalPages
      });
    } catch (dbError) {
      console.warn('Supabase products fetch failed, using local JSON fallback:', dbError.message);
      const local = await getLocalProducts();
      const result = filterLocalProducts(local, { search, category, shops, minPrice, maxPrice, sort, page, limit, isAll }, urlMap);
      if (format === 'array') {
        return NextResponse.json(result.products);
      }
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Fatal error in /api/products GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newProduct = await request.json();
    if (!newProduct.id) {
      newProduct.id = `custom_${Date.now()}`;
    }

    const { data, error } = await supabase.from('products').upsert({
      id: String(newProduct.id),
      article_no: String(newProduct.articleNo || newProduct.article_no || ''),
      name: String(newProduct.name || ''),
      category: String(newProduct.category || ''),
      mrp: Number(newProduct.mrp || 0),
      unit: String(newProduct.unit || 'No'),
      description: String(newProduct.description || ''),
      image: String(newProduct.image || '')
    }).select().single();

    if (error) {
      console.error('Error saving product to Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
