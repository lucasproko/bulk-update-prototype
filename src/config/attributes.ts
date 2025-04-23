// src/config/attributes.ts

// Define the structure for an attribute
export interface Attribute {
  id: string;
  label: string;
}

// Common Attributes based on Supabase Schema
export const sharedAvailableAttributes: Attribute[] = [
  { id: 'full_name', label: 'Full Name' },
  { id: 'preferred_name', label: 'Preferred Name' },
  { id: 'work_email', label: 'Work Email' },
  // { id: 'personal_email', label: 'Personal Email' },
  // { id: 'phone_number', label: 'Phone' }, 
  { id: 'employee_id', label: 'Employee ID' }, // Added based on schema
  { id: 'job_title', label: 'Job Title' },
  { id: 'department', label: 'Department' },
  { id: 'team', label: 'Team' },
  { id: 'manager_id', label: 'Manager ID' },
  { id: 'job_level', label: 'Job Level' },
  { id: 'employment_type', label: 'Employment Type' }, // Enum: FTE, Contractor, Intern
  { id: 'work_location', label: 'Work Location' },
  { id: 'work_country', label: 'Work Country' },
  { id: 'time_zone', label: 'Time Zone' },
  { id: 'legal_entity', label: 'Legal Entity' },
  // { id: 'start_date', label: 'Start Date' }, // Example if added
  { id: 'compensation_effective_date', label: 'Comp Effective Date' }, // Date type
  { id: 'base_salary', label: 'Base Salary' }, // Numeric
  { id: 'compensation_currency', label: 'Currency' },
  { id: 'equity_shares', label: 'Equity Shares' }, // Integer
  { id: 'target_annual_bonus_percentage', label: 'Target Bonus %' }, // Numeric
  { id: 'on_target_earnings', label: 'OTE' }, // Numeric
  // Add other relevant attributes from your 'employees' table here
];

// Helper to get label from ID - can also live here
export const getAttributeLabel = (id: string): string => {
  const attr = sharedAvailableAttributes.find(a => a.id === id);
  // Simple fallback for custom fields or if lookup fails
  return attr ? attr.label : id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}; 