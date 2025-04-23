import React, { useState } from 'react';

// Define type for a single user based on sample data
type User = {
  id: number;
  name: string;
  initials: string;
  color: string;
};

const users: User[] = [{
  id: 135,
  name: 'Giuseppe Bashirian',
  initials: 'GB',
  color: 'bg-blue-500'
}, {
  id: 136,
  name: 'Aydin Donnelly',
  initials: 'AD',
  color: 'bg-indigo-500'
}, {
  id: 246,
  name: 'Mary Moo',
  initials: 'MM',
  color: 'bg-teal-500'
}, {
  id: 302,
  name: 'Lauren Sanchez',
  initials: 'LS',
  color: 'bg-teal-500'
}, {
  id: 285,
  name: 'Isabel Reichert',
  initials: 'IR',
  color: 'bg-gray-500'
}, {
  id: 304,
  name: 'Jim Cricket',
  initials: 'JC',
  color: 'bg-red-500'
}, {
  id: 300,
  name: 'Laura Keller',
  initials: 'LK',
  color: 'bg-red-500'
}, {
  id: 18,
  name: 'Lue Cormier',
  initials: 'LC',
  color: 'bg-indigo-500'
}, {
  id: 19,
  name: 'Lorie Mraz',
  initials: 'LM',
  color: 'bg-indigo-500'
}];

// Define Props type
interface UserListProps {
  onSelectionChange: (selectedIds: number[]) => void;
}

export const UserList: React.FC<UserListProps> = ({
  onSelectionChange
}) => {
  // Explicitly type the state for selected user IDs
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  // Type the userId parameter
  const handleSelectUser = (userId: number) => {
    const newSelected = selectedUsers.includes(userId) ? 
        selectedUsers.filter(id => id !== userId) : 
        [...selectedUsers, userId];
    setSelectedUsers(newSelected);
    onSelectionChange(newSelected);
  };
  return <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="w-10 p-4">
              <input type="checkbox" className="rounded border-gray-300" />
            </th>
            <th className="text-left p-4 font-medium text-gray-600">People</th>
            <th className="text-left p-4 font-medium text-gray-600">
              Rippling profile ID
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="p-4">
                <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelectUser(user.id)} className="rounded border-gray-300" />
              </td>
              <td className="p-4 flex items-center">
                <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-white font-medium mr-3`}>
                  {user.initials}
                </div>
                <span>{user.name}</span>
              </td>
              <td className="p-4 text-gray-600">{user.id}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
};