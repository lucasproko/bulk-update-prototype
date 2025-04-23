import React, { useState } from 'react';
// Import from the new config file
import { sharedAvailableAttributes, getAttributeLabel, Attribute } from '@/config/attributes.ts'; 
import { ScheduleModal } from './ScheduleModal.tsx'; // Import the new modal

// Define structure for Employee (can be imported if moved)
type Employee = {
  id: string;
  full_name?: string;
  [key: string]: any;
};

// Define the structure for changes
type ChangeRecord = Record<string, Record<string, any>>;

// Props for the PreviewChangesScreen
interface PreviewChangesScreenProps {
  employees: Employee[]; // Array of selected employee objects (original data)
  attributes: string[]; // Array of attribute IDs being edited
  changes: ChangeRecord; // Object containing the new values { empId: { attrId: newValue } }
  onEdit: () => void; // Callback to go back to the input screen
  onConfirm: () => void; // Callback to confirm and submit changes
  onSchedule: (scheduleDateTime: string) => void; // Expects a non-null string now
}

// Helper to format value for display
const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
        return ''; // Represent empty/null consistently
    }
    // Add more formatting logic here if needed (dates, numbers, currency)
    return String(value);
};

export const PreviewChangesScreen: React.FC<PreviewChangesScreenProps> = ({
  employees,
  attributes,
  changes,
  onEdit,
  onConfirm,
  onSchedule,
}) => {

  // Add state for schedule modal visibility
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // Calculate the total number of actual changes
  const totalChangesCount = Object.values(changes).reduce((acc, empChanges) => acc + Object.keys(empChanges).length, 0);

  // Handler to be passed to the modal for confirming the schedule
  const handleConfirmSchedule = (dateTime: string) => {
    console.log('[PreviewChangesScreen] Scheduling confirmed for:', dateTime);
    onSchedule(dateTime); // Call the original onSchedule prop
    setIsScheduleModalOpen(false); // Close the modal
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Title and Action Buttons - Add padding here */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4 px-6 pt-6">
          <h1 className="text-2xl font-bold text-gray-800">Preview Changes</h1>
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Edit
            </button>
            
            {/* Update Schedule Changes button to open modal */}
            <button
              onClick={() => setIsScheduleModalOpen(true)} 
              className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={totalChangesCount === 0} 
            >
              Schedule Changes
            </button>

            <button
              onClick={onConfirm}
              disabled={totalChangesCount === 0}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Changes
            </button>
          </div>
        </div>

        {/* Summary Text - Add padding here */} 
        <p className="mb-4 text-sm text-gray-600 px-6">
          Reviewing {totalChangesCount} change(s) across {Object.keys(changes).length} employee(s). 
          Changes are highlighted below.
        </p>

        {/* Read-only Table container - Add padding here */}
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full min-w-[800px] table-fixed bg-white rounded-lg border shadow">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left p-3 px-4 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-60">Employee</th>
                {attributes.map(attrId => (
                  <th key={attrId} className="text-left p-3 px-4 font-semibold text-gray-600 border-l w-52">
                    {getAttributeLabel(attrId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const employeeChanges = changes[employee.id] || {};
                const hasChangesForEmployee = Object.keys(employeeChanges).length > 0;

                // Only render rows for employees included in the 'changes' object
                if (!hasChangesForEmployee) return null;

                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="p-3 px-4 sticky left-0 bg-white hover:bg-gray-50 z-10 w-60 align-middle">
                      <div>
                        <div className="font-medium text-gray-900">{employee.full_name ?? 'N/A'}</div>
                        <div className="text-xs text-gray-500">ID: {employee.id}</div>
                      </div>
                    </td>
                    {attributes.map(attrId => {
                      const originalValue = employee[attrId];
                      const newValue = employeeChanges[attrId];
                      const hasChanged = newValue !== undefined && newValue !== null && newValue !== '' && formatValue(newValue) !== formatValue(originalValue);

                      return (
                        <td key={attrId} className="p-3 px-4 text-sm text-gray-600 border-l w-52 align-middle break-words">
                          {hasChanged ? (
                            <div>
                              <span className="text-red-500 line-through mr-2">
                                {formatValue(originalValue) || <span className="italic">Empty</span>}
                              </span>
                              <span className="text-green-600 font-semibold">
                                {formatValue(newValue)}
                              </span>
                            </div>
                          ) : (
                            <span>{formatValue(originalValue) || <span className="text-gray-400 italic">Empty</span>}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Keep modal outside padding */}
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onConfirmSchedule={handleConfirmSchedule}
        />
      </div>
    </div>
  );
}; 