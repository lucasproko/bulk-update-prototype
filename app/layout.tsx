import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from 'next/link';
import { Users, History, Search, HelpCircle, Settings as SettingsIcon, Bell } from 'lucide-react'; // Added icons
import "../src/index.css"; // Import global styles from src
import Image from 'next/image'; // Import Next.js Image component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rippling Bulk Edit Mockup", // Updated title
  description: "A mockup demonstrating bulk edit features with audit trail.", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebarWidthClass = 'w-20';
  const topBarHeightClass = 'h-16';

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`} suppressHydrationWarning={true}>
        {/* Top Bar - Fixed full width */}
        <header className={`${topBarHeightClass} fixed top-0 left-0 right-0 bg-[#55002A] text-white flex items-center justify-between px-0 shadow z-40`}> {/* Increased z-index to 40 */}
          <div className="flex items-center h-full"> {/* Container for logo and search */}
            {/* Logo Container (aligned with sidebar width) */}
            <div className={`${sidebarWidthClass} flex items-center justify-center h-full flex-shrink-0`}>
              <Image
                src="/rippling-logo.png" // Path relative to public directory
                alt="Rippling Logo"
                width={40} // Adjust size as needed
                height={40} // Adjust size as needed
                className="object-contain" // Ensures image scales nicely
              />
            </div>
            {/* Search bar container (starts after logo) */}
            <div className="relative flex-shrink-0 ml-6"> {/* Added ml-6 for spacing */}
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                    type="text"
                    placeholder="Search for people or apps"
                    className="pl-10 pr-4 py-2 bg-[#7E2A51] text-white placeholder-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-[#681A3E]"
                />
            </div>
          </div>

            {/* Right side - Icons & User Info Placeholder (Pushed to the right by justify-between) */}
            <div className="flex items-center space-x-4 pr-6"> {/* Added pr-6 */}
                <button className="text-gray-300 hover:text-white flex items-center text-sm">
                    SUPPORT
                </button>
                <button className="text-gray-300 hover:text-white">
                    <HelpCircle className="h-5 w-5" />
                </button>
                <button className="text-gray-300 hover:text-white">
                    <SettingsIcon className="h-5 w-5" />
                </button>
                {/* User Info Placeholder */}
                <div className="flex items-center space-x-2 cursor-pointer border-l border-white/20 pl-4">
                   <div className="w-8 h-8 rounded-full bg-pink-200 text-pink-800 flex items-center justify-center text-sm font-semibold">LP</div>
                   <div>
                     <div className="text-sm font-medium">Luke Prokopiak</div>
                     <div className="text-xs text-gray-300">Admin</div>
                   </div>
                   {/* Dropdown Arrow Placeholder */}
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                     <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                   </svg>
                </div>
            </div>
        </header>

        {/* Container for Sidebar and Main Content (below top bar) */}
        <div className={`flex flex-1 pt-16`}> {/* Offset content below fixed header */}
          {/* Sidebar - Fixed below header, left side */}
          <aside className={`${sidebarWidthClass} fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-6 z-20`}>
            {/* Sidebar content pushed down by pt-16 on parent, no spacer needed */}
            <nav className="flex flex-col space-y-4 items-center flex-grow pt-4"> {/* Added pt-4 for spacing */}
               {/* Employees Link */}
              <Link href="/" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 group flex flex-col items-center" title="Employees">
                 <Users className="h-6 w-6" />
                 <span className="text-xs mt-1 group-hover:font-medium">People</span>
              </Link>

               {/* Audit Link */}
              <Link href="/audit" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 group flex flex-col items-center" title="Audit Log">
                 <History className="h-6 w-6" />
                  <span className="text-xs mt-1 group-hover:font-medium">Audit</span>
              </Link>

              {/* Add more placeholder icons if needed */}
            </nav>

            {/* Bottom Icons stick to bottom */}
            <div className="flex flex-col space-y-4 items-center pb-4 flex-shrink-0">
                {/* Placeholder Bottom Icons */}
                <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900" title="Placeholder Action">
                    <Bell className="h-6 w-6" />
                </button>
                <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900" title="Placeholder Settings">
                    <SettingsIcon className="h-6 w-6" />
                </button>
            </div>
          </aside>

          {/* Main Content Area - Offset left for the sidebar */}
          <main className={`flex-1 overflow-y-auto bg-white ml-20`}> {/* Use explicit ml-20, no mt-16 needed */}
             <div>
               {children}
             </div>
          </main>
        </div>
      </body>
    </html>
  );
} 