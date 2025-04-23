'use client'; // Add use client directive

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Search, Filter, Settings } from 'lucide-react';
import { ProfileSelector } from './ProfileSelector';
import { FilterModal } from './FilterModal';
import { EditAttributeModal } from './EditAttributeModal';
import { BulkInputScreen } from './BulkInputScreen';
import { PreviewChangesScreen } from './PreviewChangesScreen';
import { supabase } from '@/utils/supabase/client';
import { sharedAvailableAttributes, getAttributeLabel } from '@/config/attributes'; // Import from new file

// Define Employee type (Consider moving to a shared types file)
type Employee = {
  id: string; // Assuming UUID from Supabase
  full_name?: string;
  job_title?: string;
  department?: string;
  preferred_name?: string;
  work_email?: string;
  personal_email?: string;
  phone_number?: string;
  manager_id?: string;
  employment_status?: string;
  start_date?: string;
  end_date?: string;
  work_location?: string;
  base_salary?: number; // Assuming number
  currency?: string;
  // Add other relevant fields as needed based on your 'employees' table schema
  [key: string]: any; // Allow dynamic access
};

// Define filter structure (matching FilterModal, excluding id)
interface AppliedFilter {
  attribute: string;
  operator: string;
  value: string;
}

export const PeopleList = () => {
  const router = useRouter(); // Initialize router
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showEditAttributeModal, setShowEditAttributeModal] = useState(false);
  // States to hold data for the next step (Bulk Input View)
  const [attributesForEditing, setAttributesForEditing] = useState<string[]>([]);
  const [employeesForEditing, setEmployeesForEditing] = useState<string[]>([]);
  // State to manage the current view/step in the bulk edit process
  const [currentView, setCurrentView] = useState<'list' | 'bulkInput' | 'preview' | 'confirm'>('list');

  // Initialize with default columns based on the schema
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(['work_email', 'department', 'job_title']);
  // State for selected employee IDs (assuming Supabase ID is string/UUID)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  // State for search term
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for data fetching
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Add state for pending changes from BulkInputScreen
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, any>>>({});

  // State for active filters applied from the modal
  const [activeFilters, setActiveFilters] = useState<AppliedFilter[]>([]);
  const [isMounted, setIsMounted] = useState(false); // State to track client mount

  // --- Add state for error/success feedback specific to API calls ---
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // --- Function to fetch employees (defined here for reuse) ---
  const fetchEmployees = async () => {
      setIsLoading(true);
      setError(null);

      // Fetch all columns initially, as user can select any
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*'); // Fetch all available columns

      if (fetchError) {
        console.error('Error fetching employees:', fetchError);
        setError(`Failed to load employees: ${fetchError.message}`);
      } else {
        setEmployees(data || []);
      }
      setIsLoading(false);
  };

  // Function to apply filters (used by useMemo)
  const applyAllFilters = (
      employeesToFilter: Employee[], 
      currentSearchTerm: string, 
      currentActiveFilters: AppliedFilter[]
  ): Employee[] => {
    console.log('[FilterFunc] Applying filters...');
    let filtered = [...employeesToFilter];

    // 1. Search Term
    if (currentSearchTerm) {
        const lowerCaseSearchTerm = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(employee =>
            (employee.full_name?.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (employee.work_email?.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (employee.job_title?.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (employee.department?.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (employee.team?.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (employee.preferred_name?.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }

    // 2. Active Filters
    if (currentActiveFilters.length > 0) {
        filtered = filtered.filter(employee => {
            // Log the result of the .every() check for each employee
            const doesEmployeeMatchAll = currentActiveFilters.every((filter: AppliedFilter) => {
                const value = employee[filter.attribute];
                const filterValue = filter.value;
                const operator = filter.operator;
                let match = false;
                
                // Handle string comparisons with trim and lowercase
                const stringValue = (value === null || value === undefined) ? '' : String(value).trim().toLowerCase();
                const stringFilterValue = String(filterValue).trim().toLowerCase(); // Trim filter value too

                switch (operator) {
                    case 'eq': match = stringValue === stringFilterValue; break;
                    case 'neq': match = stringValue !== stringFilterValue; break;
                    case 'contains': match = stringValue.includes(stringFilterValue); break;
                    case 'does_not_contain': match = !stringValue.includes(stringFilterValue); break;
                    case 'starts_with': match = stringValue.startsWith(stringFilterValue); break;
                    case 'ends_with': match = stringValue.endsWith(stringFilterValue); break;
                    // is_empty / is_not_empty check original value BEFORE trimming/lowercasing
                    case 'is_empty': match = value === null || value === undefined || String(value).trim() === ''; break;
                    case 'is_not_empty': match = value !== null && value !== undefined && String(value).trim() !== ''; break;
                    default: match = true;
                }
                console.log(`  [Filter Check] EmpID: ${employee.id}, Attr: ${filter.attribute}, Op: ${operator}, Val: ${filterValue}, EmpVal: ${value}, Match: ${match}`);
                return match;
            });
            console.log(`[Every Check] EmpID: ${employee.id}, Matches All: ${doesEmployeeMatchAll}`);
            return doesEmployeeMatchAll; // Return the result of .every()
        });
    }
    console.log('[FilterFunc] Done applying. Result count:', filtered.length);
    return filtered;
  };

  // Filter employees using the memoized function call
  const filteredEmployees = useMemo(() => {
    console.log('[Memo] Recalculating filteredEmployees...');
    return applyAllFilters(employees, searchTerm, activeFilters);
  }, [employees, searchTerm, activeFilters]);

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees(); // Call the function defined above
  }, []); // Empty dependency array ensures this runs only once on mount

  // Updated function for applying filters 
  const handleApplyFilters = (appliedFilters: AppliedFilter[]) => {
    console.log('[PeopleList] Applying filters:', appliedFilters);
    setActiveFilters(appliedFilters); // This triggers the useMemo to refilter
  };

  // Callback specifically for attribute changes from the modal
  const handleAttributesChange = (newAttributes: string[]) => {
    setSelectedAttributes(newAttributes);
    // Close the modal automatically after selection, if desired
    // setShowModal(false);
  };

  // --- Checkbox Handlers ---

  // Handle selecting/deselecting all employees
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Select all *filtered* employees
      setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
    } else {
      // Deselect all
      setSelectedEmployeeIds([]);
    }
  };

  // Handle selecting/deselecting a single employee
  const handleSelectRow = (employeeId: string) => {
    setSelectedEmployeeIds(prevSelectedIds => {
      if (prevSelectedIds.includes(employeeId)) {
        // Remove ID if already selected
        return prevSelectedIds.filter(id => id !== employeeId);
      } else {
        // Add ID if not selected
        return [...prevSelectedIds, employeeId];
      }
    });
  };

  // Determine if the header checkbox should be checked
  const isAllSelected = filteredEmployees.length > 0 && selectedEmployeeIds.length === filteredEmployees.length;
  // Determine if the header checkbox should show indeterminate state
  const isIndeterminate = selectedEmployeeIds.length > 0 && selectedEmployeeIds.length < filteredEmployees.length;

  // Handler for confirming attributes to edit from the modal
  const handleConfirmEditAttributes = (attributesToEdit: string[]) => {
    console.log("Attributes selected for editing:", attributesToEdit);
    console.log("Employees selected for editing:", selectedEmployeeIds);
    setAttributesForEditing(attributesToEdit);
    setEmployeesForEditing([...selectedEmployeeIds]); // Store the currently selected employees
    setShowEditAttributeModal(false);
    setCurrentView('bulkInput'); // Navigate to the next step/view
    // Clear selection after initiating edit? Optional, depends on desired UX
    // setSelectedEmployeeIds([]); 
  };

  // Handler for Preview button from BulkInputScreen
  const handlePreview = (changesData: Record<string, Record<string, any>>) => {
    console.log("Changes received for preview:", changesData);
    setPendingChanges(changesData);
    setCurrentView('preview'); // Navigate to the Preview step
  };

  // Handler for Cancel button from BulkInputScreen or unified workflow cancel
  const handleCancelWorkflow = () => {
    console.log("[PeopleList] handleCancelWorkflow called. Resetting state."); // Add log
    setAttributesForEditing([]);
    setEmployeesForEditing([]);
    setSelectedEmployeeIds([]); // Clear selection as well
    setPendingChanges({}); 
    setCurrentView('list'); 
  };

  // Handler for Edit button from PreviewScreen
  const handleGoBackToEdit = () => {
    console.log("[PeopleList] handleGoBackToEdit called. Returning to bulk input."); // Add log
    // Don't clear pendingChanges here, user might want to resume editing
    setCurrentView('bulkInput');
  };

  // Handler for Confirm button from PreviewScreen
  const handleConfirmChanges = async () => {
    console.log("Attempting to confirm changes via API:", pendingChanges);
    console.log("Employee IDs for API:", employeesForEditing);
    setSubmitError(null); // Clear previous errors/success
    setSubmitSuccess(null); // Clear previous success message state
    
    try {
      const response = await fetch('/api/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: pendingChanges, 
          employeeIds: employeesForEditing,
          // No scheduleDateTime for immediate confirm
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unknown API error');

      // setSubmitSuccess(`Changes submitted successfully! Batch ID: ${result.batchId}`); // Remove success state update
      // alert(`Changes submitted successfully! Batch ID: ${result.batchId}`); // Remove alert
      
      // Reset state and return to list
      setAttributesForEditing([]);
      setEmployeesForEditing([]);
      setSelectedEmployeeIds([]);
      setPendingChanges({});
      setCurrentView('list');
      fetchEmployees(); 
      router.push('/audit'); // Navigate to audit page
    } catch (error: any) {
      console.error("Error confirming changes:", error);
      setSubmitError(`Failed to submit changes: ${error.message}`);
      alert(`Failed to submit changes: ${error.message || 'Network error'}`); // Keep error alert for now
    }
  };

  // Handler for Schedule button from PreviewScreen - Updated to accept dateTime
  const handleScheduleChanges = async (scheduleDateTime: string | null) => {
      if (!scheduleDateTime) {
          // This case should ideally be prevented by the Preview screen check,
          // but handle defensively.
          alert("No schedule date/time provided."); 
          console.error("[handleScheduleChanges] scheduleDateTime was null or empty.");
          return; 
      }
      console.log("Attempting to schedule changes via API for:", scheduleDateTime);
      console.log("Changes:", pendingChanges);
      console.log("Employee IDs:", employeesForEditing);
      setSubmitError(null); // Clear previous errors/success
      setSubmitSuccess(null); // Clear previous success message state

      try {
        const response = await fetch('/api/bulk-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changes: pendingChanges,
            employeeIds: employeesForEditing,
            scheduleDateTime: scheduleDateTime // Use the passed-in dateTime
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unknown API error');

        // setSubmitSuccess(`Changes scheduled successfully for ${new Date(scheduleDateTime).toLocaleString()}! Batch ID: ${result.batchId}`); // Remove success state update
        // alert(`Changes scheduled successfully for ${new Date(scheduleDateTime).toLocaleString()}! Batch ID: ${result.batchId}`); // Remove alert

        // Reset state and return to list
        setAttributesForEditing([]);
        setEmployeesForEditing([]);
        setSelectedEmployeeIds([]);
        setPendingChanges({});
        setCurrentView('list');
        router.push('/audit'); // Navigate to audit page
        // No need to refetch immediately for scheduled changes
      } catch (error: any) {
        console.error("Error scheduling changes:", error);
        setSubmitError(`Failed to schedule changes: ${error.message}`);
        alert(`Failed to schedule changes: ${error.message || 'Network error'}`); // Keep error alert for now
      }
  };

  // Filter employees needed for the Bulk Input screen
  const employeesToEdit = useMemo(() => {
      // Ensure employees have loaded before filtering
      if (!employees || employees.length === 0 || employeesForEditing.length === 0) {
          return [];
      }
      return employees.filter(e => employeesForEditing.includes(e.id));
  }, [employees, employeesForEditing]);

  // Effect to set mounted state on client
  useEffect(() => {
      setIsMounted(true);
  }, []);

  // --- Main Render Logic ---
  console.log('[PeopleList] Rendering - currentView:', currentView, 'showEditAttributeModal:', showEditAttributeModal);

  if (currentView === 'bulkInput') {
    // Ensure we have data before rendering the input screen
    if (employeesToEdit.length === 0 && employeesForEditing.length > 0 && !isLoading) {
        // Handle edge case where selected employee data isn't found (e.g., deleted between steps)
        return (
            <div className="p-6 text-center text-red-600">
                Error: Could not find data for selected employees. 
                <button onClick={handleCancelWorkflow} className="ml-2 text-blue-600 underline">Return to list</button>
            </div>
        );
    } else if (isLoading) {
         return <div className="p-6 text-center text-gray-500 italic">Loading employee data...</div>;
    }
    
    return (
      <BulkInputScreen
        employees={employeesToEdit}
        attributes={attributesForEditing}
        initialChanges={pendingChanges}
        onPreview={handlePreview}
        onCancel={handleCancelWorkflow}
      />
    );
  } else if (currentView === 'preview') {
      // Ensure we have data before rendering the preview screen
      if (employeesToEdit.length === 0 && employeesForEditing.length > 0 && !isLoading) {
          return (
              <div className="p-6 text-center text-red-600">
                  Error: Could not find data for selected employees for preview. 
                  <button onClick={handleCancelWorkflow} className="ml-2 text-blue-600 underline">Return to list</button>
              </div>
          );
      } else if (isLoading) {
           return <div className="p-6 text-center text-gray-500 italic">Loading employee data...</div>;
      }
      
      return (
          <PreviewChangesScreen 
              employees={employeesToEdit} 
              attributes={attributesForEditing}
              changes={pendingChanges}
              onEdit={handleGoBackToEdit}
              onConfirm={handleConfirmChanges}
              onSchedule={handleScheduleChanges} // Pass the updated handler
          />
      );
  }

  // --- Original List View Render --- (currentView === 'list')
  // Add log before return to check state during render
  console.log('[PeopleList Render] List View - activeFilters.length:', activeFilters.length);
  
  return <div className="p-6">
      {/* Top section: Title, Filter buttons */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">People</h1>
        {/* Removed Hire button and simplified container */}
        {/* <div className="flex space-x-4">
          <button
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-2 border rounded-lg flex items-center space-x-2 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filter Employees</span>
          </button>
          <button className="px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500">
            Hire
          </button>
        </div> */}
      </div>
      <div className="flex space-x-8 border-b mb-6">
        <button className="px-4 py-2 border-b-2 border-gray-900 font-medium">
          List View
        </button>
        <button className="px-4 py-2 text-gray-500">Org Chart</button>
        <button className="px-4 py-2 text-gray-500">Org Chart Diagram</button>
      </div>
      <div className="flex items-center space-x-4 mb-6">
        <button className="px-4 py-2 bg-gray-100 rounded-lg font-medium">
          Active ({isLoading ? '...' : filteredEmployees.length})
        </button>
        <button className="px-4 py-2 text-gray-500">New hires (0)</button>
        <button className="px-4 py-2 text-gray-500">Changes (0)</button>
        <button className="px-4 py-2 text-gray-500">Offboarding (0)</button>
        <button className="px-4 py-2 text-gray-500">Terminated (0)</button>
      </div>
      <div className="bg-gray-50 p-4 border-t border-b border-gray-200 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium">
              All
            </button>
            {/* <button className="px-4 py-2 text-gray-500 hover:bg-gray-200/50 rounded-lg text-sm">
              Pending onboarding
            </button> */} {/* Removed Pending Onboarding button */}
          </div>
          <div className="flex items-center space-x-2 flex-grow justify-end"> 
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search name, email, title..."
                className="pl-10 pr-4 py-2 border rounded-lg w-64 md:w-96 lg:w-[500px] bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFilterModal(true)} 
              className={`p-2 border rounded-lg hover:bg-gray-100 flex-shrink-0 ${activeFilters.length > 0 ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}
              title="Filter Employees"
            >
                <Filter className={`h-5 w-5 ${activeFilters.length > 0 ? 'text-blue-600' : 'text-gray-500'}`} />
            </button>
            <button 
              onClick={() => setShowModal(true)} 
              className="p-2 border rounded-lg hover:bg-gray-100 flex-shrink-0 bg-white"
              title="Customize Columns"
            >
                <Settings className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto"> 
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-4 w-12 sticky left-0 z-30">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isAllSelected}
                      ref={el => {
                        if (el) {
                          el.indeterminate = isIndeterminate;
                        }
                      }}
                      onChange={handleSelectAll}
                      disabled={isLoading || filteredEmployees.length === 0}
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600 sticky left-12 z-20 min-w-[250px] max-w-[300px]">People</th>
                  {selectedAttributes.map(attr => <th key={attr} className="text-left p-4 font-medium text-gray-600 min-w-[150px]">{getAttributeLabel(attr)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!isMounted || isLoading ? (
                  <tr><td colSpan={selectedAttributes.length + 2} className="p-4 text-center text-gray-500 italic">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={selectedAttributes.length + 2} className="p-4 text-center text-red-500 italic">{error}</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan={selectedAttributes.length + 2} className="p-4 text-center text-gray-500 italic">
                    {searchTerm || activeFilters.length > 0 ? `No employees found matching criteria.` : 'No employees found.'}
                  </td></tr>
                ) : (
                  filteredEmployees.map((employee: Employee) => (
                    <tr 
                      key={employee.id} 
                      className={`hover:bg-gray-50 ${selectedEmployeeIds.includes(employee.id) ? 'bg-blue-50' : 'bg-white'}`} 
                    >
                      <td 
                        className="p-4 w-12 sticky left-0 z-20 bg-white" // Use className for base bg
                        // style={{ backgroundColor: selectedEmployeeIds.includes(employee.id) ? '#EFF6FF' /* bg-blue-50 */ : '#FFFFFF' /* bg-white */ }} // Remove inline style
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onChange={() => handleSelectRow(employee.id)}
                        />
                      </td>
                      <td 
                        className="p-4 sticky left-12 z-10 min-w-[250px] max-w-[300px] bg-white" // Use className for base bg
                        // style={{ backgroundColor: selectedEmployeeIds.includes(employee.id) ? '#EFF6FF' /* bg-blue-50 */ : '#FFFFFF' /* bg-white */ }} // Remove inline style
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {employee.full_name?.split(' ').map(n=>n[0]).join('') ?? '?'}
                          </div>
                          <div>
                            <div className="font-medium">{employee.full_name ?? 'N/A'}</div>
                            <div className="text-sm text-gray-500">{employee.job_title ?? 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      {selectedAttributes.map(attr => (
                        <td key={attr} className="p-4 text-gray-600 min-w-[150px] truncate">
                          {employee[attr] !== null && employee[attr] !== undefined ? String(employee[attr]) : 'N/A'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
      {showModal && <ProfileSelector
        onClose={() => setShowModal(false)}
        onAttributesChange={handleAttributesChange}
        initialSelectedAttributes={selectedAttributes}
      />}

      <EditAttributeModal
        isOpen={showEditAttributeModal}
        onClose={() => setShowEditAttributeModal(false)}
        onConfirm={handleConfirmEditAttributes}
        initialSelectedAttributes={selectedAttributes}
        allAvailableAttributes={sharedAvailableAttributes.filter(attr => !['id', 'created_at', 'full_name'].includes(attr.id))} 
      />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
      />

      {/* Floating Action Buttons - Appears when employees are selected */}
      {selectedEmployeeIds.length > 0 && currentView === 'list' && (
        <div 
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 
                     bg-gray-900 bg-opacity-75 backdrop-blur-sm /* Darker, blurred background */
                     p-2 rounded-xl shadow-lg flex items-center space-x-4" /* Slightly larger padding/radius */
        >
          {/* Clear Selection Button - Reverted size */}
          <button
            onClick={() => setSelectedEmployeeIds([])} 
            className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out text-base font-medium" /* Larger padding/text */
            title="Clear selected employees"
          >
            Clear Selection
          </button>
          
          {/* Edit Button - Reverted size */}
          <button
            onClick={() => {
              setShowEditAttributeModal(true);
            }}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out flex items-center space-x-2 text-base font-medium" /* Larger padding/text */
          >
            <Settings className="h-5 w-5" /> {/* Larger icon */}
            <span>
              Edit {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* Display Submit Success/Error Messages */} 
      {/* {submitSuccess && <div className="m-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{submitSuccess}</div>} */} {/* Removed Success message display */}
      {submitError && <div className="m-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{submitError}</div>}

    </div>;
};