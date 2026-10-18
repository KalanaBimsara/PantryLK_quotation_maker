import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dngdvqkvhtabpfskmhan.supabase.co';

  try {
    // Check tables in Supabase
    const [productsRes, quotesRes, settingsRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact' }).limit(1),
      supabase.from('quotations').select('id', { count: 'exact' }).limit(1),
      supabase.from('settings').select('id', { count: 'exact' }).limit(1)
    ]);

    const productsReady = !productsRes.error;
    const quotationsReady = !quotesRes.error;
    const settingsReady = !settingsRes.error;

    return NextResponse.json({
      connected: true,
      url: url,
      tables: {
        products: {
          ready: productsReady,
          count: productsRes.count ?? 0,
          error: productsRes.error?.message
        },
        quotations: {
          ready: quotationsReady,
          count: quotesRes.count ?? 0,
          error: quotesRes.error?.message
        },
        settings: {
          ready: settingsReady,
          count: settingsRes.count ?? 0,
          error: settingsRes.error?.message
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      url: url,
      error: error.message
    });
  }
}
