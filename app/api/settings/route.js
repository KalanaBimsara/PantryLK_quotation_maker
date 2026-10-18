import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('Error fetching settings from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      return NextResponse.json({
        companyName: data.company_name || 'Pantry LK Pvt Ltd',
        companyTagline: data.company_tagline || 'Premium Modern Kitchen & Pantry Solutions',
        companyAddress: data.company_address || 'Colombo, Sri Lanka',
        companyPhone: data.company_phone || '+94 77 000 0000',
        companyEmail: data.company_email || 'sales@pantrylk.com',
        companyWeb: data.company_web || 'www.pantrylk.com',
        labourRatePerSqFt: Number(data.labour_rate_per_sq_ft ?? 1800.0),
        salesCommissionRate: Number(data.sales_commission_rate ?? 5.0),
        currency: data.currency || 'LKR',
        currencySymbol: data.currency_symbol || 'Rs.',
        termsAndConditions: data.terms_and_conditions || ''
      });
    }

    return NextResponse.json({
      companyName: 'Pantry LK Pvt Ltd',
      companyTagline: 'Premium Modern Kitchen & Pantry Solutions',
      companyAddress: 'Colombo, Sri Lanka',
      companyPhone: '+94 77 000 0000',
      companyEmail: 'sales@pantrylk.com',
      companyWeb: 'www.pantrylk.com',
      labourRatePerSqFt: 1800.0,
      salesCommissionRate: 5.0,
      currency: 'LKR',
      currencySymbol: 'Rs.',
      termsAndConditions: ''
    });
  } catch (error) {
    console.error('Database connection error in /api/settings GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newSettings = await request.json();

    const { error } = await supabase.from('settings').upsert({
      id: 'default',
      company_name: String(newSettings.companyName || ''),
      company_tagline: String(newSettings.companyTagline || ''),
      company_address: String(newSettings.companyAddress || ''),
      company_phone: String(newSettings.companyPhone || ''),
      company_email: String(newSettings.companyEmail || ''),
      company_web: String(newSettings.companyWeb || ''),
      labour_rate_per_sq_ft: Number(newSettings.labourRatePerSqFt ?? 1800),
      sales_commission_rate: Number(newSettings.salesCommissionRate ?? 5),
      currency: String(newSettings.currency || 'LKR'),
      currency_symbol: String(newSettings.currencySymbol || 'Rs.'),
      terms_and_conditions: String(newSettings.termsAndConditions || ''),
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error saving settings to Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
