import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase.from('quotations').delete().eq('id', id);

    if (error) {
      console.error('Error deleting quotation from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
