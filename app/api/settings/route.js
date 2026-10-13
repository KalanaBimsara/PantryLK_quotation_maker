import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const settingsPath = path.join(process.cwd(), 'data', 'settings.json');

export async function GET() {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({
      companyName: 'Pantry LK Pvt Ltd',
      labourRatePerSqFt: 1800.0,
      salesCommissionRate: 5.0,
    });
  }
}

export async function POST(request) {
  try {
    const newSettings = await request.json();
    await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2), 'utf-8');
    return NextResponse.json({ success: true, settings: newSettings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
