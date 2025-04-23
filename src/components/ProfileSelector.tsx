import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { sharedAvailableAttributes, getAttributeLabel, Attribute } from '@/config/attributes';

// Define Employee type again (or import from shared location)
type Employee = {
  id: string;
  full_name?: string;
  job_title?: string;
  department?: string;
  [key: string]: any;
};

// Define props for ProfileSelector (Simplified)
interface ProfileSelectorProps {
  onClose: () => void;
  onAttributesChange: (attributes: string[]) => void;
  initialSelectedAttributes: string[];
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  onClose,
  onAttributesChange,
  initialSelectedAttributes
}) => {
  const [currentSelectedAttributes, setCurrentSelectedAttributes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialSelectedAttributes) {
      setCurrentSelectedAttributes([...initialSelectedAttributes]);
    }
  }, [initialSelectedAttributes]);

  // Handler for internal attribute changes (checkbox click)
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setCurrentSelectedAttributes(prev =>
      checked ? [...prev, value] : prev.filter(attrId => attrId !== value)
    );
  };

  // Filter attributes based on search term
  const filteredAttributes = sharedAvailableAttributes.filter(attr =>
    getAttributeLabel(attr.id).toLowerCase().includes(searchTerm.toLowerCase()) &&
    // Exclude non-selectable attributes if necessary (e.g., id, full_name)
    !['id', 'full_name', 'created_at'].includes(attr.id) 
  );

  const handleApply = () => {
      onAttributesChange(currentSelectedAttributes);
      onClose();
  };

  const handleClear = () => {
      setCurrentSelectedAttributes([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-medium">Select Columns to Display</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search attributes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Body - Scrollable Attribute List */}
        <div className="p-4 overflow-y-auto flex-grow min-h-[300px]">
          <p className="text-sm text-gray-600 mb-4">Select the attributes you would like to show in the table</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {filteredAttributes.map(attr => (
              <label key={attr.id} className="flex items-center space-x-3 p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors duration-150">
                <input
                  type="checkbox"
                  value={attr.id}
                  checked={currentSelectedAttributes.includes(attr.id)}
                  onChange={handleCheckboxChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-800">{getAttributeLabel(attr.id)}</span>
              </label>
            ))}
            {filteredAttributes.length === 0 && (
                <p className="text-sm text-gray-500 col-span-full text-center py-4">No attributes found matching "{searchTerm}".</p>
            )}
          </div>
        </div>

        {/* Footer with Apply/Clear */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
           <button 
             onClick={handleClear}
             className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
             >
                Clear All
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
                    Apply
                </button>
           </div>
        </div>
      </div>
    </div>
  );
};