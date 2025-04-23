import React, { useState } from 'react';
// Import from the new config file
import { getAttributeLabel } from '@/config/attributes.ts';

// Define the structure for an attribute (duplicate for now, move later)
// interface Attribute { ... }

// Define structure for Employee (can be imported if moved to shared types)
type Employee = {
  id: string;
  full_name?: string;
  [key: string]: unknown;
};

// Define the type for the changes record
type ChangeRecord = Record<string, Record<string, unknown>>;

// Props for the BulkInputScreen
interface BulkInputScreenProps {
  employees: Employee[]; // Array of selected employee objects
  attributes: string[]; // Array of attribute IDs to edit
  initialChanges?: ChangeRecord; // Make initial changes optional
  onPreview: (changes: ChangeRecord) => void;
  onCancel: () => void;
}

// Helper to get label from ID (could be imported)
// const getAttributeLabel = (id: string): string => { ... };

export const BulkInputScreen: React.FC<BulkInputScreenProps> = ({
  employees,
  attributes,
  initialChanges, // Receive initial changes
  onPreview,
  onCancel,
}) => {
  // Initialize state with initialChanges if provided, otherwise empty object
  const [changes, setChanges] = useState<ChangeRecord>(initialChanges || {});
  // State to hold the values entered in the header inputs
  const [headerInputs, setHeaderInputs] = useState<Record<string, string>>({});
  // State to control visibility of the header input/apply UI for each attribute
  const [showApplyAllInput, setShowApplyAllInput] = useState<Record<string, boolean>>({});

  // Handle input changes and update the state
  const handleInputChange = (
    employeeId: string,
    attributeId: string,
    value: unknown
  ) => {
    setChanges((prevChanges) => ({
      ...prevChanges,
      [employeeId]: {
        ...prevChanges[employeeId],
        [attributeId]: value,
      },
    }));
  };

  // Handle changes in the header input fields
  const handleHeaderInputChange = (attributeId: string, value: string) => {
    setHeaderInputs((prev) => ({ ...prev, [attributeId]: value }));
  };

  // Handle applying the header input value to all employees for a specific attribute
  const handleApplyAll = (attributeId: string) => {
    const valueToApply = headerInputs[attributeId];
    // Only apply if there's a value entered (treat empty string as valid)
    if (valueToApply === undefined || valueToApply === null) return;

    // Explicitly type newChangesForAll to satisfy TypeScript
    const newChangesForAll: ChangeRecord = {};
    employees.forEach(employee => {
        // Create or update the changes for this employee
        newChangesForAll[employee.id] = {
            ...(changes[employee.id] || {}), // Keep existing changes for other attributes
            [attributeId]: valueToApply,     // Apply the new value for this attribute
        };
    });

    // Merge the updates for this attribute into the main changes state
    setChanges(prevChanges => ({
        ...prevChanges,
        ...newChangesForAll,
    }));

    // Optional: Clear the header input after applying - keeping it for now
    // setHeaderInputs((prev) => ({ ...prev, [attributeId]: '' }));

    // Optionally hide the input after applying
    // setShowApplyAllInput(prev => ({ ...prev, [attributeId]: false }));
  };

  // Handle clicking the preview button
  const handlePreviewClick = () => {
    // Filter out empty changes before previewing (optional)
    const finalChanges: ChangeRecord = {};
    Object.entries(changes).forEach(([empId, attrs]) => {
      const empChanges: Record<string, unknown> = {};
      Object.entries(attrs).forEach(([attrId, value]) => {
        // Only include if value is not empty or significantly different from original?
        // For now, include all entered values.
        if (value !== undefined && value !== null && value !== '') {
             empChanges[attrId] = value;
        }
      });
      if (Object.keys(empChanges).length > 0) {
         finalChanges[empId] = empChanges;
      }
    });
    onPreview(finalChanges);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-6 pt-6">
          <h1 className="text-2xl font-bold text-gray-800">Bulk Edit Input</h1>
          <div className="space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handlePreviewClick}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Preview Changes
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600 px-6">
          Editing {attributes.length} attribute(s) for {employees.length} employee(s).
          Enter new values below. Leave fields blank to keep the original value.
        </p>

        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full min-w-[800px] table-fixed bg-white rounded-lg border shadow">
            <thead className="bg-gray-50">
              <tr className="border-b">
                {/* Make Employee column slightly wider and ensure it's sticky */}
                <th className="text-left p-3 px-4 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 w-60">Employee</th> 
                {attributes.map(attrId => (
                  <React.Fragment key={attrId}>
                    {/* Apply fixed width to header cells */}
                    <th className="text-left p-3 px-4 font-semibold text-gray-600 border-l w-52 align-top">
                      Current {getAttributeLabel(attrId)}
                    </th>
                    {/* Header cell for New values, now includes input and button */}
                    <th className={`text-left p-2 px-3 font-semibold text-gray-600 border-l w-52 ${showApplyAllInput[attrId] ? 'align-top' : 'align-middle'}`}>
                       {showApplyAllInput[attrId] ? (
                         // Show Input, Apply, and Cancel buttons when expanded
                         <div className="flex flex-col space-y-1">
                            <span>New {getAttributeLabel(attrId)}</span>
                            <div className="flex items-center space-x-1">
                               <input
                                type="text" // TODO: Match input type later
                                placeholder="Set value..."
                                value={headerInputs[attrId] ?? ''}
                                onChange={(e) => handleHeaderInputChange(attrId, e.target.value)}
                                // Match styling of row inputs (sm:text-sm)
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                               />
                               <button
                                onClick={() => handleApplyAll(attrId)}
                                title={`Apply entered value to all ${employees.length} employees`}
                                className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 text-xs shrink-0" // Shrink button
                               >
                                Apply
                               </button>
                                <button
                                  onClick={() => setShowApplyAllInput(prev => ({ ...prev, [attrId]: false }))}
                                  title="Cancel setting all values"
                                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:ring-offset-1 text-xs shrink-0" // Shrink button
                                >
                                  X
                                </button>
                             </div>
                           </div>
                       ) : (
                         // Show Label and 'Set All' button inline initially
                         <div className="flex justify-between items-center">
                            <span>New {getAttributeLabel(attrId)}</span>
                            <button
                              onClick={() => setShowApplyAllInput(prev => ({ ...prev, [attrId]: true }))}
                              title={`Use this button to set all selected values for the ${getAttributeLabel(attrId)} to the same value. Useful for changes such as new offices`}
                              className="ml-2 px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 shrink-0"
                            >
                              Set All
                            </button>
                          </div>
                       )}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  {/* Ensure employee cell matches header width and is sticky */}
                  <td className="p-3 px-4 sticky left-0 bg-white hover:bg-gray-50 z-10 w-60 align-middle">
                    <div>
                      <div className="font-medium text-gray-900">{employee.full_name ?? 'N/A'}</div>
                      <div className="text-xs text-gray-500">ID: {employee.id}</div>
                    </div>
                  </td>
                  {attributes.map(attrId => (
                    <React.Fragment key={`${employee.id}-${attrId}`}>
                      {/* Current Value Cell - Apply fixed width */}
                      <td className="p-3 px-4 text-sm text-gray-600 border-l w-52 align-middle break-words">
                        {employee[attrId] !== null && employee[attrId] !== undefined ? String(employee[attrId]) : <span className="text-gray-400 italic">Empty</span>}
                      </td>
                      {/* New Value Input Cell - Apply fixed width */}
                      <td className="p-2 px-3 border-l w-52 align-middle">
                        {/* TODO: Add specific input types based on attrId (date, select, number) */}
                        <input
                          type="text" // Default to text for now
                          placeholder="Enter new value..."
                          value={String(changes[employee.id]?.[attrId] ?? '')}
                          onChange={(e) => handleInputChange(employee.id, attrId, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div> 
      </div> 
    </div>
  );
};