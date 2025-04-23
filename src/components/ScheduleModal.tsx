import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSchedule: (dateTime: string) => void;
}

// Helper to get current date in YYYY-MM-DD format for min attribute
const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirmSchedule 
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<string>('09'); // Default to 9 AM
  const [selectedMinute, setSelectedMinute] = useState<string>('00'); // Default to :00
  const [error, setError] = useState<string | null>(null);

  // Generate options for hours (00-23)
  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  }, []);

  // Generate options for minutes (00, 15, 30, 45)
  const minuteOptions = useMemo(() => {
    return ['00', '15', '30', '45'];
    // Or for all minutes: 
    // return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  }, []);

  const handleConfirm = () => {
    setError(null);
    if (!selectedDate) {
      setError('Please select a date.');
      return;
    }
    // Combine date, hour, and minute into ISO-like string YYYY-MM-DDTHH:mm
    const dateTimeString = `${selectedDate}T${selectedHour}:${selectedMinute}`;
    
    // Optional: Basic validation to ensure the selected time is in the future
    const scheduledDateTime = new Date(dateTimeString);
    if (scheduledDateTime <= new Date()) {
        setError('Please select a date and time in the future.');
        return;
    }

    console.log('[ScheduleModal] Confirming schedule for:', dateTimeString);
    onConfirmSchedule(dateTimeString);
  };
  
  // Reset state when modal opens/closes
  React.useEffect(() => {
      if (isOpen) {
          setSelectedDate('');
          setSelectedHour('09');
          setSelectedMinute('00');
          setError(null);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto flex flex-col transform transition-all duration-300 scale-100 opacity-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Schedule Changes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */} 
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Select the date and time you want the changes to be applied.</p>
          
          {/* Date Input */} 
          <div>
            <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date"
              id="schedule-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getTodayString()} // Prevent selecting past dates
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* Time Input */} 
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Time (Hour : Minute)</label>
             <div className="flex items-center space-x-2">
                {/* Hour Select */}
                <select
                    id="schedule-hour"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white appearance-none"
                >
                    {hourOptions.map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                    ))}
                </select>
                <span className="text-gray-500 font-semibold">:</span>
                {/* Minute Select */}
                <select
                    id="schedule-minute"
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white appearance-none"
                 >
                     {minuteOptions.map(minute => (
                         <option key={minute} value={minute}>{minute}</option>
                     ))}
                 </select>
             </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Modal Footer */} 
        <div className="flex justify-end items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}; 