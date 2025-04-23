import React, { useState, useMemo, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Attribute } from '@/config/attributes'; // Ensure correct import path

// Define the structure for an attribute - REMOVED
// interface Attribute {
//   id: string;
//   label: string;
// }

// Define the props for the modal
interface EditAttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAttributes: string[]) => void;
  initialSelectedAttributes: string[]; // Attributes currently shown in the table
  allAvailableAttributes: Attribute[]; // Use imported Attribute type
}

export const EditAttributeModal: React.FC<EditAttributeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedAttributes,
  allAvailableAttributes,
}) => {
  // State for the attributes selected *within this modal*
  const [selectedEditAttributes, setSelectedEditAttributes] = useState<string[]>([]);
  
  // State for the search term within the modal
  const [searchTerm, setSearchTerm] = useState('');

  // Effect to reset state when modal opens with the current initial attributes
  useEffect(() => {
    if (isOpen) {
      // Reset the selection to match the currently passed initial attributes
      setSelectedEditAttributes([...initialSelectedAttributes]);
      // Reset search term when opening
      setSearchTerm('');
    }
  }, [isOpen, initialSelectedAttributes]);

  // Filter and sort attributes based on search term and selection
  const filteredAndSortedAttributes = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = allAvailableAttributes.filter(
      (attr) =>
        !searchTerm || // Include all if search is empty
        attr.label.toLowerCase().includes(lowerCaseSearchTerm) ||
        attr.id.toLowerCase().includes(lowerCaseSearchTerm)
    );

    // Sort: selected first, then alphabetically
    return filtered.sort((a, b) => {
      const aIsSelected = selectedEditAttributes.includes(a.id);
      const bIsSelected = selectedEditAttributes.includes(b.id);

      if (aIsSelected && !bIsSelected) return -1; // a comes first
      if (!aIsSelected && bIsSelected) return 1; // b comes first

      // If both are selected or both are not selected, sort alphabetically by label
      return a.label.localeCompare(b.label);
    });
  }, [allAvailableAttributes, searchTerm, selectedEditAttributes]); // Dependencies

  // Handle toggling checkbox selection
  const handleToggle = (attributeId: string) => {
    setSelectedEditAttributes((prevSelected) => {
      if (prevSelected.includes(attributeId)) {
        return prevSelected.filter((id) => id !== attributeId);
      } else {
        return [...prevSelected, attributeId];
      }
    });
  };

  // Handle confirm button click
  const handleConfirmClick = () => {
    onConfirm(selectedEditAttributes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col transform transition-all duration-300 scale-100 opacity-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-medium text-gray-800">Select Attributes to Edit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 sticky top-[65px] bg-white z-10"> {/* Ensure sticky positioning */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search attributes..."
              className="pl-10 pr-4 py-2 border rounded-lg w-full text-sm" // Reduced font size slightly
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Body - Attribute List */}
        {/* Apply min-height and adjust padding */}
        <div className="px-6 py-2 space-y-1 overflow-y-auto flex-1 min-h-[300px]"> {/* Adjusted padding, added min-height */}
          {filteredAndSortedAttributes.length > 0 ? (
            filteredAndSortedAttributes.map((attribute) => (
              <div
                key={attribute.id}
                // Reduced vertical padding (py-2), keep horizontal padding (px-3)
                className="flex items-center space-x-3 py-2 px-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleToggle(attribute.id)}
              >
                <input
                  type="checkbox"
                  id={`edit-attr-${attribute.id}`}
                  checked={selectedEditAttributes.includes(attribute.id)}
                  onChange={() => handleToggle(attribute.id)}
                  // Make checkbox non-interactive directly as div is clickable
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none h-4 w-4"
                />
                <label htmlFor={`edit-attr-${attribute.id}`} className="font-medium cursor-pointer flex-grow text-sm"> {/* Reduced font size */}
                  {attribute.label}
                </label>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 italic pt-4">
              {searchTerm ? `No attributes found matching "${searchTerm}".` : 'No attributes available.'}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg sticky bottom-0 z-10">
          <span className="text-sm text-gray-600">
             {selectedEditAttributes.length} attribute{selectedEditAttributes.length !== 1 ? 's' : ''} selected
          </span>
          <div className="space-x-3">
             <button
               onClick={onClose}
               className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
             >
               Cancel
             </button>
             <button
               onClick={handleConfirmClick}
               disabled={selectedEditAttributes.length === 0}
               className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               Confirm Attributes
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 