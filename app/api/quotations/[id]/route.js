import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const quotesPath = path.join(process.cwd(), 'data', 'quotations.json');

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const fileData = await fs.readFile(quotesPath, 'utf-8');
    let quotes = JSON.parse(fileData);

    quotes = quotes.filter((q) => q.id !== id);
    await fs.writeFile(quotesPath, JSON.stringify(quotes, null, 2), 'utf-8');
    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
