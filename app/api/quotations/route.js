import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotations from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (data || []).map((q) => ({
      id: q.id,
      jobNo: q.job_no,
      date: q.date,
      customerName: q.customer_name || '',
      customerPhone: q.customer_phone || '',
      customerAddress: q.customer_address || '',
      sqft: Number(q.sqft || 0),
      items: q.items || [],
      compTotal: Number(q.comp_total || 0),
      labourTotal: Number(q.labour_total || 0),
      commissionTotal: Number(q.commission_total || 0),
      grandTotal: Number(q.grand_total || 0),
      createdAt: q.created_at
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Database connection error in /api/quotations GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const quote = await request.json();

    const { error } = await supabase.from('quotations').upsert({
      id: String(quote.id),
      job_no: String(quote.jobNo || ''),
      date: String(quote.date || ''),
      customer_name: String(quote.customerName || ''),
      customer_phone: String(quote.customerPhone || ''),
      customer_address: String(quote.customerAddress || ''),
      sqft: Number(quote.sqft || 0),
      comp_total: Number(quote.compTotal || 0),
      labour_total: Number(quote.labourTotal || 0),
      commission_total: Number(quote.commissionTotal || 0),
      grand_total: Number(quote.grandTotal || 0),
      items: quote.items || [],
      created_at: quote.createdAt || new Date().toISOString()
    });

    if (error) {
      console.error('Error saving quotation to Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, quotation: quote });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
