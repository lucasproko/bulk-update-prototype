import React from 'react';
import { Search, Menu } from 'lucide-react';
export const Sidebar = () => {
  return <div className="w-64 bg-[#2c1b3b] text-white min-h-screen">
      <div className="p-4 flex items-center justify-between border-b border-gray-700">
        <div className="text-2xl font-bold">⋮⋮⋮</div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input type="text" placeholder="Search for people or apps..." className="pl-8 pr-2 py-1 bg-gray-700 rounded text-sm w-48" />
        </div>
      </div>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 py-2">
          <Menu className="h-5 w-5" />
          <span className="font-medium">Upload changes</span>
        </div>
      </div>
    </div>;
};