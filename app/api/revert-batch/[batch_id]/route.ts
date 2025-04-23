import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

export async function POST(
  request: Request,
  { params }: { params: { batch_id: string } }
) {
  const originalBatchId = parseInt(params.batch_id, 10);
  console.log(`[API /api/revert-batch] Received request for batch ID: ${originalBatchId}`);

  if (isNaN(originalBatchId)) {
    return NextResponse.json({ error: 'Invalid Original Batch ID format' }, { status: 400 });
  }

  // --- Authentication/Authorization (Skipped for Prototype) ---
  const userId = null; // Placeholder

  // --- TODO: Implement proper transaction handling in production ---

  try {
    // 1. Fetch the original batch to check status and get description
    const { data: originalBatch, error: fetchBatchError } = await supabase
      .from('change_batches')
      .select('status, description')
      .eq('id', originalBatchId)
      .single();

    if (fetchBatchError) {
        if (fetchBatchError.code === 'PGRST116') { return NextResponse.json({ error: 'Original batch not found' }, { status: 404 }); }
        console.error('[API /api/revert-batch] Error fetching original batch:', fetchBatchError);
        throw new Error(`Failed to fetch original batch: ${fetchBatchError.message}`);
    }

    // Check if the original batch is in a revertable state (e.g., Completed)
    if (!['Completed', 'CompletedWithErrors'].includes(originalBatch.status)) {
        return NextResponse.json({ error: `Original batch cannot be reverted (status is ${originalBatch.status})` }, { status: 400 });
    }

    // 2. Fetch all change logs for the original batch
    const { data: originalLogs, error: fetchLogError } = await supabase
      .from('change_logs')
      .select('id, employee_id, attribute_name, old_value, new_value')
      .eq('batch_id', originalBatchId);

    if (fetchLogError) {
      console.error('[API /api/revert-batch] Error fetching original logs:', fetchLogError);
      throw new Error(`Failed to fetch original logs: ${fetchLogError.message}`);
    }

    if (!originalLogs || originalLogs.length === 0) {
      return NextResponse.json({ error: 'No logs found for the original batch to revert' }, { status: 404 });
    }

    // 3. Create a new 'Revert' batch entry
    const revertDescription = `Revert of Batch #${originalBatchId}: ${originalBatch.description}`.substring(0, 255); // Add description limit
    const { data: revertBatchData, error: revertBatchError } = await supabase
      .from('change_batches')
      .insert({
        status: 'PendingRevert', // Start as pending revert
        user_id: userId,
        description: revertDescription,
        reverted_batch_id: originalBatchId, // Link to the original batch
      })
      .select('id')
      .single();

    if (revertBatchError || !revertBatchData) {
      console.error('[API /api/revert-batch] Error creating revert batch entry:', revertBatchError);
      throw new Error(`Failed to create revert batch: ${revertBatchError?.message}`);
    }
    const revertBatchId = revertBatchData.id;
    console.log(`[API /api/revert-batch] Created revert batch with ID: ${revertBatchId}`);

    // 4. Process each original log: revert employee data and create new log
    const revertPromises = [];
    const revertLogEntries = [];
    const employeeUpdatesMap: Record<string, Record<string, any>> = {};

    for (const log of originalLogs) {
      // Prepare employee update: set attribute back to old_value
      // Important: Need to handle type conversion if old_value was stored as text!
      // This is a simplification - real implementation needs robust type handling.
      let valueToRevertTo: any = log.old_value;
      // Basic type guessing (needs improvement based on schema knowledge)
      if (log.old_value !== null) {
          if (!isNaN(Number(log.old_value))) valueToRevertTo = Number(log.old_value);
          else if (log.old_value.toLowerCase() === 'true') valueToRevertTo = true;
          else if (log.old_value.toLowerCase() === 'false') valueToRevertTo = false;
      }

      // Group updates by employee_id
      if (!employeeUpdatesMap[log.employee_id]) {
        employeeUpdatesMap[log.employee_id] = {};
      }
      employeeUpdatesMap[log.employee_id][log.attribute_name] = valueToRevertTo;

      // Prepare log entry for the revert action
      revertLogEntries.push({
        batch_id: revertBatchId,
        employee_id: log.employee_id,
        attribute_name: log.attribute_name,
        old_value: log.new_value, // The 'new' value from the original log is the 'old' value for the revert
        new_value: log.old_value, // The 'old' value from the original log is the 'new' value for the revert
        reverted_log_id: log.id, // Link to the original log entry
      });
    }

    // Perform employee updates grouped by employee
    for (const employeeId in employeeUpdatesMap) {
      revertPromises.push(
        supabase
          .from('employees')
          .update(employeeUpdatesMap[employeeId])
          .eq('id', employeeId)
      );
    }
    
    // Execute all revert updates
    console.log(`[API /api/revert-batch] Performing ${revertPromises.length} revert updates...`);
    const revertResults = await Promise.allSettled(revertPromises);
    const revertErrors = revertResults.filter(result => result.status === 'rejected');

    let finalRevertStatus = 'Completed';
    if (revertErrors.length > 0) {
      console.error('[API /api/revert-batch] Errors occurred during revert updates:', revertErrors);
      finalRevertStatus = 'CompletedWithErrors';
      // Log specific errors
      revertErrors.forEach((errorResult: any) => {
           console.error(` - Revert Update Failed for employee (implicitly): ${errorResult.reason?.message || 'Unknown error'}`);
      });
    }

    // Insert all revert log entries
    if (revertLogEntries.length > 0) {
        console.log(`[API /api/revert-batch] Inserting ${revertLogEntries.length} revert change_logs entries...`);
        const { error: logInsertError } = await supabase.from('change_logs').insert(revertLogEntries);
        if (logInsertError) {
            // This is bad - updates may have happened, but logs failed. Mark batch as problematic.
            console.error('[API /api/revert-batch] Critical: Failed to insert revert logs after updates!', logInsertError);
            finalRevertStatus = 'Failed'; // Mark as failed if logs couldn't be inserted
        } else {
            console.log(`[API /api/revert-batch] Successfully inserted revert logs.`);
        }
    }

    // 5. Update the revert batch status
    const { error: updateRevertBatchError } = await supabase
      .from('change_batches')
      .update({ status: finalRevertStatus, completed_at: new Date().toISOString() })
      .eq('id', revertBatchId);

    if (updateRevertBatchError) {
      // Log error, but proceed if updates were okay
      console.error('[API /api/revert-batch] Error updating revert batch status:', updateRevertBatchError);
    }

    // (Optional) 6. Update the original batch status to 'Reverted'
    const { error: updateOriginalBatchError } = await supabase
      .from('change_batches')
      .update({ status: 'Reverted' })
      .eq('id', originalBatchId);
      
    if (updateOriginalBatchError){
        console.warn('[API /api/revert-batch] Failed to update original batch status to Reverted:', updateOriginalBatchError);
    }

    console.log(`[API /api/revert-batch] Successfully processed revert for batch ID: ${originalBatchId}. New Batch ID: ${revertBatchId}`);
    return NextResponse.json({ success: true, message: 'Batch reverted successfully', revertBatchId: revertBatchId, status: finalRevertStatus });

  } catch (error: any) {
    console.error("[API /api/revert-batch] An error occurred:", error);
    // --- TODO: Rollback logic if using transactions ---
    // If revert batch was created, try marking it as failed
    // ... (similar error handling as in bulk-edit)
    return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
  }
} 