import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const updated = await request.json();

    const supaPayload = {};
    if (updated.articleNo !== undefined) supaPayload.article_no = String(updated.articleNo);
    if (updated.name !== undefined) supaPayload.name = String(updated.name);
    if (updated.category !== undefined) supaPayload.category = String(updated.category);
    if (updated.mrp !== undefined) supaPayload.mrp = Number(updated.mrp);
    if (updated.unit !== undefined) supaPayload.unit = String(updated.unit);
    if (updated.description !== undefined) supaPayload.description = String(updated.description);
    if (updated.image !== undefined) supaPayload.image = String(updated.image);

    const { error } = await supabase.from('products').update(supaPayload).eq('id', id);

    if (error) {
      console.error('Error updating product in Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('Error deleting product from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
