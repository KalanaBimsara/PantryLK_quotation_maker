import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'products.json');

export async function GET() {
  try {
    const fileData = await fs.readFile(dataPath, 'utf-8');
    const products = JSON.parse(fileData);
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const newProduct = await request.json();
    let products = [];
    try {
      const fileData = await fs.readFile(dataPath, 'utf-8');
      products = JSON.parse(fileData);
    } catch (e) {}

    if (!newProduct.id) {
      newProduct.id = `custom_${Date.now()}`;
    }
    products.unshift(newProduct);
    await fs.writeFile(dataPath, JSON.stringify(products, null, 2), 'utf-8');
    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
