import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

// Define the expected request body structure
interface BulkEditPayload {
  changes: Record<string, Record<string, any>>; // { employeeId: { attribute: newValue } }
  employeeIds: string[]; // Array of employee IDs being edited
  scheduleDateTime?: string; // Optional: ISO string for scheduling
}

export async function POST(request: Request) {
  console.log("[API /api/bulk-edit] Received POST request");

  let payload: BulkEditPayload;
  try {
    payload = await request.json();
    console.log("[API /api/bulk-edit] Parsed payload:", payload);
  } catch (error) {
    console.error("[API /api/bulk-edit] Error parsing request body:", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { changes, employeeIds, scheduleDateTime } = payload;

  // --- Input Validation (Basic) ---
  if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'Invalid changes data' }, { status: 400 });
  }
  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid employee IDs' }, { status: 400 });
  }
  // Ensure employeeIds in payload match keys in changes object
  if (!employeeIds.every(id => changes[id])) {
      return NextResponse.json({ error: 'Mismatch between employeeIds and changes object keys' }, { status: 400 });
  }

  // --- Authentication (Skipped for Prototype) ---
  const userId = null; // Placeholder - In real app, get from session: const { data: { user } } = await supabase.auth.getUser(); userId = user?.id;

  const isScheduled = !!scheduleDateTime;

  if (isScheduled) {
    // --- Handle Scheduled Update --- 
    console.log(`[API /api/bulk-edit] Starting SCHEDULED batch process.`);
    let batchId: number | null = null;
    try {
        // 1. Create SCHEDULED change_batches entry
        const { data: batchData, error: batchError } = await supabase
            .from('change_batches')
            .insert({
                status: 'Scheduled', // Directly set as Scheduled
                scheduled_for: new Date(scheduleDateTime!).toISOString(),
                user_id: userId,
                description: `Scheduled bulk edit for ${employeeIds.length} employees.`,
            })
            .select('id')
            .single();

        if (batchError || !batchData) {
            console.error("[API /api/bulk-edit] Error creating SCHEDULED change_batches entry:", batchError);
            throw new Error(`Failed to create scheduled change batch: ${batchError?.message}`);
        }
        batchId = batchData.id;
        console.log(`[API /api/bulk-edit] Created SCHEDULED change_batches entry with ID: ${batchId}`);

        // 2. Create log entries for scheduled batch (no old_value fetching needed yet)
        const logEntries = [];
        for (const employeeId of employeeIds) {
            const employeeChanges = changes[employeeId];
            if (!employeeChanges) continue;
            for (const attributeName in employeeChanges) {
                const newValue = employeeChanges[attributeName];
                logEntries.push({
                    batch_id: batchId,
                    employee_id: employeeId,
                    attribute_name: attributeName,
                    old_value: null, // Old value not relevant/fetched for scheduled task logs initially
                    new_value: newValue !== undefined && newValue !== null ? String(newValue) : null,
                });
            }
        }
        if (logEntries.length > 0) {
            console.log(`[API /api/bulk-edit] Inserting ${logEntries.length} change_logs entries for scheduled batch ${batchId}...`);
            const { error: logError } = await supabase.from('change_logs').insert(logEntries);
            if (logError) {
                console.error("[API /api/bulk-edit] Error inserting scheduled change_logs:", logError);
                // Attempt to mark batch as failed
                await supabase.from('change_batches').update({ status: 'Failed' }).eq('id', batchId);
                throw new Error(`Failed to insert scheduled change logs: ${logError.message}`);
            }
            console.log(`[API /api/bulk-edit] Successfully inserted scheduled logs.`);
        }
        
        console.log(`[API /api/bulk-edit] Scheduled batch process complete. Batch ID: ${batchId}`);
        return NextResponse.json({ success: true, batchId: batchId, status: 'Scheduled' }, { status: 200 });

    } catch (error: any) {
         console.error("[API /api/bulk-edit] An error occurred during the scheduled bulk edit process:", error);
         // Try to mark batch as failed if ID exists
         if (batchId) { 
             try { await supabase.from('change_batches').update({ status: 'Failed' }).eq('id', batchId); } catch { /* ignore */ } 
         }
         return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
    }
  } else {
    // --- Handle IMMEDIATE Update (Refactored Logic) --- 
    console.log(`[API /api/bulk-edit] Starting IMMEDIATE batch process.`);
    let batchId: number | null = null;
    let finalBatchStatus: string = 'Unknown';
    const logEntries = []; // To store logs before inserting
    const oldValuesMap = new Map<string, Map<string, any>>(); // Map<employeeId, Map<attribute, oldValue>>

    try {
      // 1. Fetch ALL necessary old values upfront
      console.log("[API /api/bulk-edit - IMMEDIATE] Fetching old values...");
      const fetchPromises = [];
      for (const employeeId of employeeIds) {
          const employeeChanges = changes[employeeId];
          if (!employeeChanges || Object.keys(employeeChanges).length === 0) continue;
          const attributesToFetch = Object.keys(employeeChanges);
          if (attributesToFetch.length > 0) {
              fetchPromises.push(
                  supabase
                      .from('employees')
                      .select(`id, ${attributesToFetch.join(',')}`)
                      .eq('id', employeeId)
                      .maybeSingle()
                      .then(({ data, error }) => {
                          if (error) {
                              console.warn(`[API /api/bulk-edit - IMMEDIATE] Error fetching old values for ${employeeId}:`, error);
                              oldValuesMap.set(employeeId, new Map()); 
                          } else if (data) {
                              // Cast data to a record type
                              const dataRecord = data as Record<string, any>; 
                              const attrMap = new Map<string, any>();
                              for (const attr of attributesToFetch) {
                                  // Access the casted record
                                  attrMap.set(attr, dataRecord[attr]); 
                              }
                              oldValuesMap.set(employeeId, attrMap);
                          } else {
                               oldValuesMap.set(employeeId, new Map()); // Employee not found or no data
                          }
                      })
              );
          }
      }
      await Promise.all(fetchPromises); // Wait for all fetches to complete
      console.log("[API /api/bulk-edit - IMMEDIATE] Finished fetching old values.");

      // 2. Prepare Log Entries using pre-fetched old values
      const updatePromises = []; // Prepare updates in the same loop
      
      const changesEntries = Object.entries(changes);
      console.log(`[API /api/bulk-edit - IMMEDIATE] Preparing logs for ${changesEntries.length} entries...`); // Log: Start prep

      for (const employeeId of employeeIds) {
          // Find the specific entry for this employeeId, comparing string key to stringified employeeId
          const changeEntry = changesEntries.find(([key, _]) => key === String(employeeId));
          
          if (!changeEntry) {
              console.warn(`[API /api/bulk-edit - IMMEDIATE] No changes found in payload for employeeId ${employeeId} (type mismatch?)`);
              continue; // Skip if no entry found (e.g., type mismatch)
          }
          
          const [_, employeeChanges] = changeEntry;
          const fetchedOldValues = oldValuesMap.get(employeeId) ?? new Map();

          // Log the object we are about to iterate over
          console.log(`[API /api/bulk-edit - IMMEDIATE] Inspecting employeeChanges for ${employeeId}:`, JSON.stringify(employeeChanges)); 

          if (!employeeChanges || typeof employeeChanges !== 'object' || Object.keys(employeeChanges).length === 0) {
              console.log(`[API /api/bulk-edit - IMMEDIATE] Skipping employee ${employeeId} due to invalid changes object.`);
              continue;
          }

          // Modify inner loop to use Object.keys()
          const attributeNames = Object.keys(employeeChanges);
          console.log(`[API /api/bulk-edit - IMMEDIATE] Attributes to process for ${employeeId}:`, attributeNames); 

          for (const attributeName of attributeNames) {
              // We no longer need hasOwnProperty check when using Object.keys()
              console.log(`[API /api/bulk-edit - IMMEDIATE] Processing attribute: ${attributeName}`);
              // @ts-ignore - Acknowledge potential implicit any for dynamic attribute access
              const newValue = employeeChanges[attributeName];
              const oldValue = fetchedOldValues.get(attributeName); 
              const logItem = {
                  employee_id: employeeId,
                  attribute_name: attributeName,
                  old_value: oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
                  new_value: newValue !== undefined && newValue !== null ? String(newValue) : null,
              };
              logEntries.push(logItem);
              console.log(`[API /api/bulk-edit - IMMEDIATE] Pushed log item:`, logItem); // Log: Item pushed
          }
          
          // 3. Prepare update promise
          // Ensure employeeChanges is valid before pushing update
          if (attributeNames.length > 0) {
             updatePromises.push(
                supabase
                    .from('employees')
                    .update(employeeChanges as Record<string, any>) 
                    .eq('id', employeeId)
             );
             console.log(`[API /api/bulk-edit - IMMEDIATE] Prepared update promise for employee ${employeeId}`); // Log update prep
          } else {
             console.log(`[API /api/bulk-edit - IMMEDIATE] No attributes to update for employee ${employeeId}, skipping update promise.`);
          }
      }
      
      console.log(`[API /api/bulk-edit - IMMEDIATE] Total raw logEntries prepared: ${logEntries.length}`); // Log: Total raw logs

      // 4. Execute all updates
      console.log(`[API /api/bulk-edit - IMMEDIATE] Performing ${updatePromises.length} updates...`);
      const updateResults = await Promise.allSettled(updatePromises);
      const updateErrors = updateResults.filter(result => result.status === 'rejected');

      // 5. Determine final batch status
      if (updateErrors.length > 0) {
          console.error("[API /api/bulk-edit - IMMEDIATE] Errors occurred during updates:", updateErrors);
          finalBatchStatus = 'CompletedWithErrors'; 
          updateErrors.forEach((errorResult: any) => {
              console.error(` - Update Failed: ${errorResult.reason?.message || 'Unknown error'}`);
          });
      } else {
          console.log("[API /api/bulk-edit - IMMEDIATE] Updates successful.");
          finalBatchStatus = 'Completed';
      }

      // 6. Create the change_batches entry
      console.log(`[API /api/bulk-edit - IMMEDIATE] Creating batch entry with status: ${finalBatchStatus}`);
      const { data: batchData, error: batchError } = await supabase
          .from('change_batches')
          .insert({
              status: finalBatchStatus,
              completed_at: new Date().toISOString(),
              user_id: userId,
              description: `Immediate bulk edit for ${employeeIds.length} employees.`,
          })
          .select('id')
          .single();

      if (batchError || !batchData) {
          console.error("[API /api/bulk-edit - IMMEDIATE] CRITICAL: Failed to create change_batches entry!", batchError);
          throw new Error(`Failed to create change batch entry: ${batchError?.message}`);
      }
      batchId = batchData.id;
      console.log(`[API /api/bulk-edit - IMMEDIATE] Created batch ID: ${batchId}`);

      // 7. Add batch_id to log entries and insert them
      console.log(`[API /api/bulk-edit - IMMEDIATE] Mapping logEntries to add batchId ${batchId}...`); // Log: Before map
      const logsWithBatchId = logEntries.map(log => ({ ...log, batch_id: batchId }));
      console.log(`[API /api/bulk-edit - IMMEDIATE] Resulting logsWithBatchId length: ${logsWithBatchId.length}`); // Log: After map

      if (logsWithBatchId.length > 0) {
         console.log(`[API /api/bulk-edit - IMMEDIATE] Attempting to insert ${logsWithBatchId.length} change_logs entries...`); // Log: Before insert
          const { error: logError } = await supabase.from('change_logs').insert(logsWithBatchId);
          if (logError) {
              console.error("[API /api/bulk-edit - IMMEDIATE] CRITICAL: Failed to insert change_logs after batch creation!", logError);
              await supabase.from('change_batches').update({ status: 'Failed' }).eq('id', batchId);
              finalBatchStatus = 'Failed';
              throw new Error(`Failed to insert change logs: ${logError.message}`);
          } else {
             console.log(`[API /api/bulk-edit - IMMEDIATE] Successfully inserted change_logs.`); // Log: After insert success
          }
      } else {
           console.warn(`[API /api/bulk-edit - IMMEDIATE] Skipped inserting logs because logsWithBatchId array was empty.`); // Log: Skipped insert!
      }

      console.log(`[API /api/bulk-edit - IMMEDIATE] Process complete. Batch ID: ${batchId}, Status: ${finalBatchStatus}`);
      return NextResponse.json({ success: true, batchId: batchId, status: finalBatchStatus }, { status: 200 });

    } catch (error: any) {
       console.error("[API /api/bulk-edit - IMMEDIATE] An error occurred:", error);
       if (batchId && finalBatchStatus !== 'Failed') { 
           try { await supabase.from('change_batches').update({ status: 'Failed' }).eq('id', batchId); } catch { /* ignore */ } 
       }
       return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
    }
  }
  // Should not reach here if isScheduled or !isScheduled is handled
  return NextResponse.json({ error: 'Invalid request path' }, { status: 400 }); 
} 