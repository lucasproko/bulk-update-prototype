import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

export async function POST(
  request: Request,
  { params }: { params: { log_id: string } }
) {
  const originalLogId = parseInt(params.log_id, 10);
  console.log(`[API /api/revert-log] Received request for log ID: ${originalLogId}`);

  if (isNaN(originalLogId)) {
    return NextResponse.json({ error: 'Invalid Log ID format' }, { status: 400 });
  }

  // --- Authentication/Authorization (Skipped for Prototype) ---
  const userId = null; // Placeholder

  // --- TODO: Implement proper transaction handling in production ---

  try {
    // 1. Fetch the original log entry
    const { data: originalLog, error: fetchLogError } = await supabase
      .from('change_logs')
      .select('id, batch_id, employee_id, attribute_name, old_value, new_value, reverted_log_id') // Check if already reverted
      .eq('id', originalLogId)
      .single();

    if (fetchLogError) {
      if (fetchLogError.code === 'PGRST116') { return NextResponse.json({ error: 'Original log not found' }, { status: 404 }); }
      console.error('[API /api/revert-log] Error fetching original log:', fetchLogError);
      throw new Error(`Failed to fetch original log: ${fetchLogError.message}`);
    }

    // Check if the log is already associated with a revert (prevent double reverts)
    if (originalLog.reverted_log_id) {
        // Optionally, check if any *other* log points to this one as being reverted
        // const { count } = await supabase.from('change_logs').select('*', { count: 'exact' }).eq('reverted_log_id', originalLogId);
        // if (count > 0) ...
        return NextResponse.json({ error: 'This log change has already been reverted.' }, { status: 400 });
    }
    
    // Check if the original batch was completed (optional but good practice)
    const { data: originalBatch, error: fetchBatchError } = await supabase
        .from('change_batches')
        .select('status')
        .eq('id', originalLog.batch_id)
        .single();

    if (fetchBatchError || !originalBatch) {
        console.warn(`[API /api/revert-log] Could not verify original batch status for log ${originalLogId}`);
        // Decide whether to proceed or return an error
    }
    // Allow reverting logs from Completed or CompletedWithErrors batches
    // if (originalBatch && !['Completed', 'CompletedWithErrors'].includes(originalBatch.status)) {
    //     return NextResponse.json({ error: `Original batch (${originalLog.batch_id}) was not completed.` }, { status: 400 });
    // }

    // 2. Create a new 'Revert' batch entry for this single action
    const revertDescription = `Single Revert of Log #${originalLogId} (Batch #${originalLog.batch_id})`;
    const { data: revertBatchData, error: revertBatchError } = await supabase
      .from('change_batches')
      .insert({
        status: 'PendingRevert', // Start as pending
        user_id: userId,
        description: revertDescription,
        // reverted_batch_id: null (This is not reverting a full batch)
      })
      .select('id')
      .single();

    if (revertBatchError || !revertBatchData) {
      console.error('[API /api/revert-log] Error creating revert batch entry:', revertBatchError);
      throw new Error(`Failed to create revert batch: ${revertBatchError?.message}`);
    }
    const revertBatchId = revertBatchData.id;
    console.log(`[API /api/revert-log] Created revert batch with ID: ${revertBatchId}`);

    // 3. Perform the single employee update (revert to old_value)
    let valueToRevertTo: any = originalLog.old_value;
    // Basic type guessing (same simplification as revert-batch)
    if (originalLog.old_value !== null) {
        if (!isNaN(Number(originalLog.old_value))) valueToRevertTo = Number(originalLog.old_value);
        else if (originalLog.old_value.toLowerCase() === 'true') valueToRevertTo = true;
        else if (originalLog.old_value.toLowerCase() === 'false') valueToRevertTo = false;
    }

    const updateData = { [originalLog.attribute_name]: valueToRevertTo };
    console.log(`[API /api/revert-log] Reverting employee ${originalLog.employee_id}, attribute ${originalLog.attribute_name} to:`, valueToRevertTo);

    const { error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', originalLog.employee_id);

    let finalRevertStatus = 'Completed';
    if (updateError) {
      console.error('[API /api/revert-log] Error during revert update:', updateError);
      finalRevertStatus = 'Failed'; // Mark revert as failed if DB update fails
       // Don't insert log if update failed?
    } else {
       console.log('[API /api/revert-log] Revert update successful.');
    }

    // 4. Create the new change_logs entry for the revert action (even if update failed, to record attempt)
    const revertLogEntry = {
      batch_id: revertBatchId,
      employee_id: originalLog.employee_id,
      attribute_name: originalLog.attribute_name,
      old_value: originalLog.new_value,
      new_value: originalLog.old_value,
      reverted_log_id: originalLog.id, // Link to the original log entry
    };
    console.log('[API /api/revert-log] Creating revert log entry:', revertLogEntry);
    const { error: logInsertError } = await supabase.from('change_logs').insert(revertLogEntry);

    if (logInsertError) {
      console.error('[API /api/revert-log] Critical: Failed to insert revert log entry!', logInsertError);
      finalRevertStatus = 'Failed'; // Mark as failed if log insert fails
    }

    // 5. Update the revert batch status
    const { error: updateRevertBatchError } = await supabase
      .from('change_batches')
      .update({ status: finalRevertStatus, completed_at: new Date().toISOString() })
      .eq('id', revertBatchId);

    if (updateRevertBatchError) {
      console.error('[API /api/revert-log] Error updating revert batch status:', updateRevertBatchError);
      // Status might be inconsistent, but log the error.
    }

    // (Optional) 6. Mark the original log as reverted? Could add a boolean column `is_reverted` to change_logs.
    // For simplicity now, we rely on checking `reverted_log_id` references.
    // const { error: updateOriginalLogError } = await supabase
    //   .from('change_logs')
    //   .update({ is_reverted: true })
    //   .eq('id', originalLogId);

    if (finalRevertStatus === 'Failed') {
        // If the process failed, throw an error to return 500
        throw new Error('Failed to fully process log revert.');
    }

    console.log(`[API /api/revert-log] Successfully processed revert for log ID: ${originalLogId}. New Batch ID: ${revertBatchId}`);
    return NextResponse.json({ success: true, message: 'Log reverted successfully', revertBatchId: revertBatchId });

  } catch (error: any) {
    console.error("[API /api/revert-log] An error occurred:", error);
    // --- TODO: Rollback logic if using transactions ---
    // If revert batch was created, try marking it as failed
    // ... (similar error handling as in bulk-edit)
    return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
  }
} 