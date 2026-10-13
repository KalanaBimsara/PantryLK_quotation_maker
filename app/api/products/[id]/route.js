import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'products.json');

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const updated = await request.json();
    const fileData = await fs.readFile(dataPath, 'utf-8');
    let products = JSON.parse(fileData);

    const index = products.findIndex((p) => p.id === id);
    if (index >= 0) {
      products[index] = { ...products[index], ...updated };
      await fs.writeFile(dataPath, JSON.stringify(products, null, 2), 'utf-8');
      return NextResponse.json({ success: true, product: products[index] });
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const fileData = await fs.readFile(dataPath, 'utf-8');
    let products = JSON.parse(fileData);

    products = products.filter((p) => p.id !== id);
    await fs.writeFile(dataPath, JSON.stringify(products, null, 2), 'utf-8');
    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
