import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';
import fs from 'fs/promises';
import path from 'path';

export async function POST() {
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  const quotesPath = path.join(process.cwd(), 'data', 'quotations.json');
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');

  try {
    let syncedProducts = 0;
    let syncedQuotations = 0;
    let syncedSettings = false;

    // 1. Sync Products
    try {
      const fileData = await fs.readFile(productsPath, 'utf-8');
      const products = JSON.parse(fileData);

      const rows = products.map((p) => ({
        id: String(p.id),
        article_no: String(p.articleNo || p.article_no || ''),
        name: String(p.name || ''),
        category: String(p.category || ''),
        mrp: Number(p.mrp || 0),
        unit: String(p.unit || 'No'),
        description: String(p.description || ''),
        image: String(p.image || '')
      }));

      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase
          .from('products')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          return NextResponse.json({
            error: error.message,
            syncedProducts,
            hint: 'Please ensure you have executed supabase_schema.sql in your Supabase SQL Editor.'
          }, { status: 400 });
        }
        syncedProducts += batch.length;
      }
    } catch (e) {
      console.error('Error syncing products:', e);
    }

    // 2. Sync Settings
    try {
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      await supabase.from('settings').upsert({
        id: 'default',
        company_name: String(settings.companyName || ''),
        company_tagline: String(settings.companyTagline || ''),
        company_address: String(settings.companyAddress || ''),
        company_phone: String(settings.companyPhone || ''),
        company_email: String(settings.companyEmail || ''),
        company_web: String(settings.companyWeb || ''),
        labour_rate_per_sq_ft: Number(settings.labourRatePerSqFt ?? 1800),
        sales_commission_rate: Number(settings.salesCommissionRate ?? 5),
        currency: String(settings.currency || 'LKR'),
        currency_symbol: String(settings.currencySymbol || 'Rs.'),
        terms_and_conditions: String(settings.termsAndConditions || ''),
        updated_at: new Date().toISOString()
      });
      syncedSettings = true;
    } catch (e) {
      console.error('Error syncing settings:', e);
    }

    // 3. Sync Quotations
    try {
      const quotesData = await fs.readFile(quotesPath, 'utf-8');
      const quotes = JSON.parse(quotesData);
      if (Array.isArray(quotes) && quotes.length > 0) {
        const quoteRows = quotes.map((q) => ({
          id: String(q.id),
          job_no: String(q.jobNo || ''),
          date: String(q.date || ''),
          customer_name: String(q.customerName || ''),
          customer_phone: String(q.customerPhone || ''),
          customer_address: String(q.customerAddress || ''),
          sqft: Number(q.sqft || 0),
          comp_total: Number(q.compTotal || 0),
          labour_total: Number(q.labourTotal || 0),
          commission_total: Number(q.commissionTotal || 0),
          grand_total: Number(q.grandTotal || 0),
          items: q.items || [],
          created_at: q.createdAt || new Date().toISOString()
        }));

        const { error } = await supabase
          .from('quotations')
          .upsert(quoteRows, { onConflict: 'id' });

        if (!error) {
          syncedQuotations = quoteRows.length;
        }
      }
    } catch (e) {
      console.error('Error syncing quotations:', e);
    }

    return NextResponse.json({
      success: true,
      syncedProducts,
      syncedQuotations,
      syncedSettings,
      message: `Synchronized ${syncedProducts} products, ${syncedQuotations} quotations, and system settings to Supabase!`
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

