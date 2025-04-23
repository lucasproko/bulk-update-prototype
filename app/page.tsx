'use client'; // Mark this as a Client Component

import React from 'react';
// Remove import for the old Sidebar component
// import { Sidebar } from '@/components/Sidebar';
import { PeopleList } from '@/components/PeopleList';

export default function HomePage() {
  return (
    // Remove the outer flex container and the old Sidebar rendering
    // The layout now handles the main structure
    // <div className="flex w-full min-h-screen bg-gray-100">
    //   <Sidebar /> 
    //   <div className="flex-1">
        <PeopleList /> 
    //   </div>
    // </div>
  );
} 