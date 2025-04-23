import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

export async function POST(
  request: Request, // Keep request parameter even if not used directly, as per Next.js convention
  { params }: { params: { batch_id: string } }
) {
  const batchId = parseInt(params.batch_id, 10);
  console.log(`[API /api/cancel-batch] Received request for batch ID: ${batchId}`);

  if (isNaN(batchId)) {
    return NextResponse.json({ error: 'Invalid Batch ID format' }, { status: 400 });
  }

  // --- Authentication/Authorization (Skipped for Prototype) ---
  // Check if the user has permission to cancel this batch

  try {
    // 1. Find the batch and check its status
    const { data: batchData, error: fetchError } = await supabase
      .from('change_batches')
      .select('status')
      .eq('id', batchId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // Not found code
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      }
      console.error('[API /api/cancel-batch] Error fetching batch:', fetchError);
      throw new Error(`Failed to fetch batch: ${fetchError.message}`);
    }

    if (!batchData || batchData.status !== 'Scheduled') {
      return NextResponse.json({ error: 'Batch cannot be cancelled (must be Scheduled)' }, { status: 400 });
    }

    // 2. Update the batch status to 'Cancelled'
    const { error: updateError } = await supabase
      .from('change_batches')
      .update({ status: 'Cancelled', completed_at: new Date().toISOString() }) // Mark completion time as cancellation time
      .eq('id', batchId);

    if (updateError) {
      console.error('[API /api/cancel-batch] Error updating batch status:', updateError);
      throw new Error(`Failed to update batch status: ${updateError.message}`);
    }

    console.log(`[API /api/cancel-batch] Successfully cancelled batch ID: ${batchId}`);
    return NextResponse.json({ success: true, message: 'Batch cancelled successfully' });

  } catch (error: any) {
    console.error("[API /api/cancel-batch] An error occurred:", error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
  }
} 