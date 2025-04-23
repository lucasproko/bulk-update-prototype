import React from 'react';
import { sharedAvailableAttributes, Attribute } from '@/config/attributes.ts'; // Import from new file

// --- Common Attributes based on Supabase Schema ---
// Define in a shared location ideally (e.g., src/config/attributes.ts)
// const sharedAvailableAttributes = [
//   // { id: 'employee_id', label: 'Employee ID' }, // Usually unique, less common to display by default
//   // { id: 'full_name', label: 'Full Name' }, // Handled separately in the first column
//   { id: 'preferred_name', label: 'Preferred Name' },
//   { id: 'work_email', label: 'Work Email' },
//   // { id: 'personal_email', label: 'Personal Email' }, // Example if you add it
//   // { id: 'phone_number', label: 'Phone' }, // Example if you add it
//   { id: 'job_title', label: 'Job Title' },
//   { id: 'department', label: 'Department' },
//   { id: 'team', label: 'Team' },
//   { id: 'manager_id', label: 'Manager ID' }, // Consider displaying name via join later
//   { id: 'job_level', label: 'Job Level' },
//   { id: 'employment_type', label: 'Employment Type' },
//   { id: 'work_location', label: 'Work Location' },
//   { id: 'work_country', label: 'Work Country' },
//   { id: 'time_zone', label: 'Time Zone' },
//   { id: 'legal_entity', label: 'Legal Entity' },
//   // { id: 'start_date', label: 'Start Date' }, // Example if you add it
//   // { id: 'end_date', label: 'End Date' }, // Example if you add it
//   { id: 'base_salary', label: 'Base Salary' }, // Sensitive - consider RLS/permissions
//   { id: 'compensation_currency', label: 'Currency' },
//   { id: 'equity_shares', label: 'Equity Shares' }, // Sensitive
//   { id: 'target_annual_bonus_percentage', label: 'Target Bonus %' }, // Sensitive
//   { id: 'on_target_earnings', label: 'OTE' }, // Sensitive
//   { id: 'compensation_effective_date', label: 'Comp Effective Date' },
// ];
// Filter out attributes handled specially (like full_name) or ones not suitable for simple selection
const availableAttributesForSelector = sharedAvailableAttributes.filter(attr => !['id', 'created_at', 'full_name'].includes(attr.id));
// --- End Common Attributes ---

// Prop types (Simple for now, enhance if needed)
interface AttributeSelectorProps {
  selectedAttributes: string[];
  onChange: (selected: string[]) => void;
}

export const AttributeSelector: React.FC<AttributeSelectorProps> = ({
  selectedAttributes,
  onChange
}) => {
  const handleToggle = (attributeId: string) => {
    const newSelection = selectedAttributes.includes(attributeId)
      ? selectedAttributes.filter(id => id !== attributeId)
      : [...selectedAttributes, attributeId];
    onChange(newSelection);
  };

  return <div className="space-y-4">
      <p className="text-gray-600">
        Select the attributes you would like to show in the table
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* Use the filtered list for the selector */}
        {availableAttributesForSelector.map(attribute => <div key={attribute.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              id={attribute.id}
              checked={selectedAttributes.includes(attribute.id)}
              onChange={() => handleToggle(attribute.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={attribute.id} className="font-medium">
              {attribute.label}
            </label>
          </div>)}
      </div>
    </div>;
};