import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Kalana1812@';

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true, authorized: true });
    }
    return NextResponse.json({ success: false, error: 'Incorrect administrator password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
