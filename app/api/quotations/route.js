import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const quotesPath = path.join(process.cwd(), 'data', 'quotations.json');

export async function GET() {
  try {
    const data = await fs.readFile(quotesPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const quote = await request.json();
    let quotes = [];
    try {
      const data = await fs.readFile(quotesPath, 'utf-8');
      quotes = JSON.parse(data);
    } catch (e) {}

    const index = quotes.findIndex((q) => q.id === quote.id);
    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.unshift(quote);
    }

    await fs.writeFile(quotesPath, JSON.stringify(quotes, null, 2), 'utf-8');
    return NextResponse.json({ success: true, quotation: quote });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
