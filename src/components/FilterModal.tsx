import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
// Import from the new config file
import { sharedAvailableAttributes } from '@/config/attributes.ts';

// Define filter structure
interface Filter {
  id: string; // Unique ID for React key
  attribute: string;
  operator: string;
  value: string;
}

// Define available operators (simple text for now)
const operators = [
  { id: 'eq', label: 'is' },
  { id: 'neq', label: 'is not' },
  { id: 'contains', label: 'contains' },
  { id: 'does_not_contain', label: 'does not contain' },
  { id: 'starts_with', label: 'starts with' },
  { id: 'ends_with', label: 'ends with' },
  { id: 'is_empty', label: 'is empty' },        // No value input needed
  { id: 'is_not_empty', label: 'is not empty' }, // No value input needed
];

// Define props
interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: Omit<Filter, 'id'>[]) => void; // Pass filters without internal id
}

// Get attributes available for filtering (exclude non-filterable types if needed)
const filterableAttributes = sharedAvailableAttributes.filter(attr => !['id', 'created_at'].includes(attr.id)); // Example filter

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
}) => {
  const [filters, setFilters] = useState<Filter[]>([]);

  if (!isOpen) return null;

  // Add a new empty filter row
  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: crypto.randomUUID(), // Generate unique ID for the row
        attribute: filterableAttributes[0]?.id || '', // Default to first available attribute
        operator: operators[0].id, // Default to first operator
        value: '',
      },
    ]);
  };

  // Remove a filter row by its unique ID
  const removeFilter = (idToRemove: string) => {
    setFilters(filters.filter(f => f.id !== idToRemove));
  };

  // Update a specific filter row
  const updateFilter = (idToUpdate: string, field: keyof Omit<Filter, 'id'>, value: string) => {
    setFilters(filters.map(f => 
      f.id === idToUpdate ? { ...f, [field]: value } : f
    ));
  };

  // Handle Apply button click
  const handleApply = () => {
    // Create new objects without the id property
    const filtersToApply = filters.map(f => ({
        attribute: f.attribute,
        operator: f.operator,
        value: f.value,
    }));
    // Filter out potentially invalid/incomplete filters (e.g., empty attribute or operator)
    const validFilters = filtersToApply.filter(f => f.attribute && f.operator && (f.value || ['is_empty', 'is_not_empty'].includes(f.operator)));
    onApplyFilters(validFilters);
    onClose(); 
  };

  // Handle Clear All button click
  const handleClearAll = () => {
      setFilters([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col transform transition-all duration-300 scale-100 opacity-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Filter Employees</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Dynamic Filter Rows */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {filters.length === 0 && (
              <p className="text-center text-gray-500 italic">No filters applied. Add a filter to begin.</p>
          )}
          {filters.map((filter) => {
            const requiresValue = !['is_empty', 'is_not_empty'].includes(filter.operator);
            return (
              <div key={filter.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md border">
                {/* Attribute Select */}
                <select 
                  value={filter.attribute}
                  onChange={(e) => updateFilter(filter.id, 'attribute', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm w-1/4"
                >
                  <option value="" disabled>Select Attribute</option>
                  {filterableAttributes.map(attr => (
                    <option key={attr.id} value={attr.id}>{attr.label}</option>
                  ))}
                </select>

                {/* Operator Select */}
                <select 
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm w-1/4"
                >
                   {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.label}</option>
                  ))}
                </select>

                {/* Value Input (Conditional) */}
                <input
                  type="text" // TODO: Change type based on attribute
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                  placeholder={requiresValue ? "Enter value..." : ""}
                  disabled={!requiresValue}
                  className={`w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!requiresValue ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />

                {/* Remove Button */}
                <button onClick={() => removeFilter(filter.id)} className="text-gray-400 hover:text-red-600 p-1" title="Remove filter">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
            })}

          {/* Add Filter Button */}
          <button 
            onClick={addFilter} 
            className="mt-2 flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4" />
            <span>Add Filter</span>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
           <button
            onClick={handleClearAll}
            disabled={filters.length === 0}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All Filters
          </button>
          <div className="space-x-3">
             <button
               onClick={onClose}
               className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
             >
               Cancel
             </button>
             <button
               onClick={handleApply}
               className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
             >
               Apply Filters
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 