import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';
import fs from 'fs/promises';
import path from 'path';

const defaultPath = path.join(process.cwd(), 'data', 'products_default.json');

export async function POST() {
  try {
    // Read seed data from default catalog
    const defaultData = await fs.readFile(defaultPath, 'utf-8');
    const products = JSON.parse(defaultData);

    const rows = products.map((p) => ({
      id: String(p.id),
      article_no: String(p.articleNo || p.article_no || ''),
      name: String(p.name || ''),
      category: String(p.category || ''),
      mrp: Number(p.mrp || 0),
      unit: String(p.unit || 'No'),
      description: String(p.description || ''),
      image: String(p.image || '')
    }));

    // Reset directly into Supabase database in batches without saving to local files
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error('Error upserting batch to Supabase:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: products.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
