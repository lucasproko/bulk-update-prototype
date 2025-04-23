'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle, Info, X } from 'lucide-react';

// Define types for our data (consider moving to a shared types file)
type ChangeBatch = {
  id: number;
  created_at: string;
  status: string; // Scheduled, Completed, Reverted, Cancelled, Failed, Pending, CompletedWithErrors, PendingRevert
  scheduled_for: string | null;
  completed_at: string | null;
  user_id: string | null; // Assuming UUID
  description: string | null;
  reverted_batch_id: number | null;
  // Potentially add user email/name if joining
  // user_email?: string; 
};

type ChangeLog = {
  id: number;
  batch_id: number;
  employee_id: string; // Assuming UUID
  attribute_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  reverted_log_id: number | null;
  employees?: { full_name: string | null } | null; // Added for joined data
};

// Helper function to format date/time (consider moving to a utils file)
const formatDateTime = (isoString: string | null) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString(undefined, { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper component for status badges (consider moving to components folder)
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let colorClasses = 'bg-gray-100 text-gray-800';
    let Icon = Info;

    switch (status) {
        case 'Scheduled': colorClasses = 'bg-blue-100 text-blue-800'; Icon = Clock; break;
        case 'Completed': colorClasses = 'bg-green-100 text-green-800'; Icon = CheckCircle; break;
        case 'CompletedWithErrors': colorClasses = 'bg-yellow-100 text-yellow-800'; Icon = AlertCircle; break;
        case 'Reverted': colorClasses = 'bg-purple-100 text-purple-800'; Icon = RefreshCw; break;
        case 'Cancelled': colorClasses = 'bg-gray-200 text-gray-600'; Icon = XCircle; break;
        case 'Failed': colorClasses = 'bg-red-100 text-red-800'; Icon = XCircle; break;
        // Add cases for Pending, PendingRevert if needed
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
            <Icon className="-ml-0.5 mr-1.5 h-3 w-3" />
            {status}
        </span>
    );
};

export default function AuditPage() {
  const [scheduledBatches, setScheduledBatches] = useState<ChangeBatch[]>([]);
  const [completedBatches, setCompletedBatches] = useState<ChangeBatch[]>([]);
  const [selectedBatchLogs, setSelectedBatchLogs] = useState<ChangeLog[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState<boolean>(true);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch Scheduled Batches
  const fetchScheduledBatches = useCallback(async () => {
    setIsLoadingScheduled(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('change_batches')
        .select('*') // Select all columns for now
        // .select('*, user:users(email)') // Example join for user email
        .eq('status', 'Scheduled')
        .order('scheduled_for', { ascending: true });

      if (fetchError) throw fetchError;
      setScheduledBatches(data || []);
    } catch (err) {
      // Type catch error
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error fetching scheduled batches:", err);
      setError(`Failed to load scheduled batches: ${message}`);
      setScheduledBatches([]); // Clear data on error
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  // Fetch Completed/Historical Batches
  const fetchCompletedBatches = useCallback(async () => {
    setIsLoadingCompleted(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('change_batches')
        .select('*') 
        // Filter out only states that are actively pending/scheduled
        // 'Pending' should no longer exist, but excluding just in case.
        // 'PendingRevert' is an intermediate state before revert completion.
        .not('status', 'in', '("Scheduled","PendingRevert")') // Removed "Pending"
        .order('created_at', { ascending: false }); 

      if (fetchError) throw fetchError;
      setCompletedBatches(data || []);
    } catch (err) {
      // Type catch error
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error fetching completed batches:", err);
      setError(`Failed to load completed batches: ${message}`); // Keep generic error
      setCompletedBatches([]); 
    } finally {
      setIsLoadingCompleted(false);
    }
  }, []);

  // Fetch logs for a specific batch
  const fetchBatchLogs = useCallback(async (batchId: number) => {
    if (!batchId) return;
    setIsLoadingLogs(true);
    setSelectedBatchLogs([]);
    // Clear previous specific errors when fetching new logs
    setError(null); 
    setActionError(null); 
    setActionSuccess(null);
    try {
      // Update select query to join with employees table
      const { data, error: fetchError } = await supabase
        .from('change_logs')
        .select('*, employees (full_name)') // Fetch log data and employee name
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setSelectedBatchLogs(data || []);
    } catch (err) {
      // Type catch error
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error fetching logs for batch ${batchId}:`, err);
      // Set error specific to log fetching for display inside the modal
      setError(`Failed to load logs for batch ${batchId}: ${message}`);
      setSelectedBatchLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // Initial data fetch on mount
  useEffect(() => {
    fetchScheduledBatches();
    fetchCompletedBatches();
  }, [fetchScheduledBatches, fetchCompletedBatches]);

  // Handler to open details modal
  const handleViewDetails = (batchId: number) => {
    setSelectedBatchId(batchId);
    setActionError(null);
    setActionSuccess(null);
    fetchBatchLogs(batchId);
    setIsModalOpen(true);
  };

  // Handler to close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBatchId(null);
    setSelectedBatchLogs([]);
    setError(null);
    setActionError(null);
    setActionSuccess(null);
  };

  // --- Action Handlers (Implement API Calls) ---
  const handleCancelBatch = async (batchId: number) => {
    if (!confirm(`Are you sure you want to cancel scheduled batch #${batchId}?`)) {
      return;
    }
    console.log("Cancelling Batch", batchId);
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch(`/api/cancel-batch/${batchId}`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel batch');
      }

      setActionSuccess(`Batch #${batchId} cancelled successfully.`);
      await fetchScheduledBatches();
      await fetchCompletedBatches();

    } catch (err) {
      // Type catch error
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error cancelling batch:", err);
      setActionError(`Error cancelling batch #${batchId}: ${message}`);
      alert(`Error cancelling batch #${batchId}: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertBatch = async (batchId: number) => {
    if (!confirm(`Are you sure you want to revert all changes from batch #${batchId}? This will create a new batch record for the revert action.`)) {
      return;
    }
    console.log("Reverting Batch", batchId);
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch(`/api/revert-batch/${batchId}`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revert batch');
      }

      setActionSuccess(`Batch #${batchId} reverted successfully. Revert recorded in new batch #${result.revertBatchId}.`);
      alert(`Batch #${batchId} reverted successfully. Revert recorded in new batch #${result.revertBatchId}.`);
      await fetchCompletedBatches();

    } catch (err) {
      // Type catch error
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error reverting batch:", err);
      setActionError(`Error reverting batch #${batchId}: ${message}`);
      alert(`Error reverting batch #${batchId}: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertLog = async (logId: number) => {
    if (!confirm(`Are you sure you want to revert the single change from log #${logId}? This will create a new batch record for the revert action.`)) {
      return;
    }
    console.log("Reverting Log", logId);
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch(`/api/revert-log/${logId}`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revert log');
      }

      setActionSuccess(`Log #${logId} reverted successfully. Revert recorded in new batch #${result.revertBatchId}.`);
      alert(`Log #${logId} reverted successfully. Revert recorded in new batch #${result.revertBatchId}.`);
      if (selectedBatchId) {
        await fetchBatchLogs(selectedBatchId); 
      }
      await fetchCompletedBatches();

    } catch (err) {
      // Type catch error
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error reverting log:", err);
      setActionError(`Error reverting log #${logId}: ${message}`);
      alert(`Error reverting log #${logId}: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-8 px-6 pt-6">
          Bulk Change Audit
        </h1>

        {/* General Fetch Error Display */} 
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center mx-6">
            <AlertCircle className="h-5 w-5 mr-2"/> 
            <span>{error}</span>
          </div>
        )}
        {/* Action Success/Error Display (General Page Level) */} 
        {actionSuccess && !isModalOpen && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center mx-6">
                  <CheckCircle className="h-5 w-5 mr-2"/> 
                  <span>{actionSuccess}</span>
              </div>
        )}
        {actionError && !isModalOpen && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center mx-6">
                  <AlertCircle className="h-5 w-5 mr-2"/> 
                  <span>{actionError}</span>
              </div>
        )}

        {/* Scheduled Changes Section */} 
        <section className="mb-8 px-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600"/>
              Scheduled Changes
            </div>
            <button 
              onClick={fetchScheduledBatches} 
              disabled={isLoadingScheduled}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-wait"
              title="Refresh Scheduled"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingScheduled ? 'animate-spin' : ''}`} />
            </button>
          </h2>
          {isLoadingScheduled ? (
            <p className="text-center text-gray-500 italic">Loading scheduled changes...</p>
          ) : scheduledBatches.length === 0 ? (
            <p className="text-center text-gray-500 italic">No changes currently scheduled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] bg-white rounded-lg border shadow">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Batch ID</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Description</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Scheduled For</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Initiated At</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scheduledBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="p-3 px-4 text-sm text-gray-500">{batch.id}</td>
                      <td className="p-3 px-4 text-sm"><StatusBadge status="Scheduled" /></td>
                      <td className="p-3 px-4 text-sm text-gray-700">{batch.description || 'N/A'}</td>
                      <td className="p-3 px-4 text-sm text-gray-700">{formatDateTime(batch.scheduled_for)}</td>
                      <td className="p-3 px-4 text-sm text-gray-500">{formatDateTime(batch.created_at)}</td>
                      <td className="p-3 px-4 text-sm space-x-3">
                        <button 
                          onClick={() => handleViewDetails(batch.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          disabled={isSubmitting}
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => handleCancelBatch(batch.id)} 
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Completed History Section */} 
        <section className="px-6 pb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600"/>
              Completed / History
            </div>
            <button 
              onClick={fetchCompletedBatches} 
              disabled={isLoadingCompleted}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-wait"
              title="Refresh History"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingCompleted ? 'animate-spin' : ''}`} />
            </button>
          </h2>
          {isLoadingCompleted ? (
            <p className="text-center text-gray-500 italic">Loading history...</p>
          ) : completedBatches.length === 0 ? (
            <p className="text-center text-gray-500 italic">No completed changes found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] bg-white rounded-lg border shadow">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Batch ID</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Description</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Completed At</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Initiated At</th>
                    <th className="text-left p-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedBatches.map((batch) => (
                    <tr key={batch.id} className={`hover:bg-gray-50 ${batch.status === 'Reverted' || batch.reverted_batch_id ? 'opacity-70' : ''}`}>
                      <td className="p-3 px-4 text-sm text-gray-500">{batch.id}</td>
                      <td className="p-3 px-4 text-sm"><StatusBadge status={batch.status} /></td>
                      <td className="p-3 px-4 text-sm text-gray-700">{batch.description || 'N/A'}</td>
                      <td className="p-3 px-4 text-sm text-gray-500">{formatDateTime(batch.completed_at)}</td>
                      <td className="p-3 px-4 text-sm text-gray-500">{formatDateTime(batch.created_at)}</td>
                      <td className="p-3 px-4 text-sm space-x-3">
                        <button 
                          onClick={() => handleViewDetails(batch.id)} 
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          Details
                        </button>
                        {batch.status === 'Completed' && !batch.reverted_batch_id && (
                          <button 
                            onClick={() => handleRevertBatch(batch.id)} 
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            Revert Batch
                          </button>
                        )}
                        {batch.status === 'Reverted' && (
                          <span className="text-xs text-purple-600 italic">(Reverted by Batch #{batch.reverted_batch_id})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Details Modal */} 
        {isModalOpen && selectedBatchId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col transform transition-all duration-300 scale-100 opacity-100">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-20"> {/* Increased z-index */} 
                  <h2 className="text-lg font-semibold text-gray-800">Details for Batch #{selectedBatchId}</h2>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal-specific Action Feedback */} 
                {actionError && <div className="m-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2"/> {actionError}</div>}
                {actionSuccess && <div className="m-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm flex items-center"><CheckCircle className="h-4 w-4 mr-2"/>{actionSuccess}</div>}
                {/* Display log fetch error inside modal */}
                {error && <div className="m-3 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2"/>{error}</div>}

                {/* Modal Body - Scrollable Log Table */}
                <div className="p-4 overflow-y-auto flex-grow">
                  {isLoadingLogs ? (
                    <p className="text-center text-gray-500 italic">Loading logs...</p>
                  ) : selectedBatchLogs.length === 0 && !error ? ( // Show only if no logs AND no error
                    <p className="text-center text-gray-500 italic">No individual changes found for this batch.</p>
                  ) : !error ? ( // Only render table if no log fetch error
                    <div className="overflow-x-auto"> {/* Added wrapper for horizontal scroll */}
                      <table className="w-full min-w-[900px] border-collapse"> {/* Added min-width */} 
                        <thead className="sticky top-0 bg-gray-50 z-10"> {/* Ensure header is sticky within scrollable area */} 
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">Log ID</th>
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">Employee ID</th>
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">Employee Name</th> {/* Added Name Header */}
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">Attribute</th>
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">Old Value</th>
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">New Value</th>
                            <th className="text-left p-3 font-medium text-gray-600 text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedBatchLogs.map((log) => (
                            <tr key={log.id} className={`hover:bg-gray-50 ${log.reverted_log_id ? 'opacity-50 bg-gray-100' : ''}`}>
                              <td className="p-3 text-sm text-gray-500">{log.id}</td>
                              <td className="p-3 text-sm text-gray-500 font-mono text-xs">{log.employee_id}</td>
                              <td className="p-3 text-sm text-gray-700">{log.employees?.full_name ?? <i className="text-gray-400">N/A</i>}</td> {/* Added Name Cell + N/A handling */} 
                              <td className="p-3 text-sm text-gray-700">{getAttributeLabel(log.attribute_name)}</td>
                              <td className="p-3 text-sm text-gray-500 break-all">{log.old_value ?? <i className="text-gray-400">Empty</i>}</td> {/* Added break-all */}
                              <td className="p-3 text-sm text-gray-500 break-all">{log.new_value ?? <i className="text-gray-400">Empty</i>}</td> {/* Added break-all */}
                              <td className="p-3 text-sm text-gray-500 whitespace-nowrap"> {/* Prevent wrap on action button */}
                                  {log.reverted_log_id ? (
                                      <span className="text-xs text-purple-600 italic">Reverted (Log ID: {log.reverted_log_id})</span>
                                  ) : (
                                      <button 
                                          onClick={() => handleRevertLog(log.id)} 
                                          disabled={isSubmitting}
                                          className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                      >
                                          Revert {/* Changed from Revert Log */}
                                      </button>
                                  )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null /* Don't render table if there was an error fetching logs */} 
                </div>

                {/* Modal Footer */} 
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end sticky bottom-0 z-10">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to get attribute label (needs to be defined or imported if not already)
// Keep the existing helper function definition
function getAttributeLabel(attributeId: string): string {
    const labels: Record<string, string> = {
        work_email: 'Work Email',
        department: 'Department',
        job_title: 'Job Title',
        base_salary: 'Base Salary',
        // Add other mappings as needed
    };
    return labels[attributeId] || attributeId; // Return ID if no label found
} 