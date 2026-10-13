import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const defaultPath = path.join(process.cwd(), 'data', 'products_default.json');
const currentPath = path.join(process.cwd(), 'data', 'products.json');

export async function POST() {
  try {
    const defaultData = await fs.readFile(defaultPath, 'utf-8');
    await fs.writeFile(currentPath, defaultData, 'utf-8');
    const products = JSON.parse(defaultData);
    return NextResponse.json({ success: true, count: products.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
