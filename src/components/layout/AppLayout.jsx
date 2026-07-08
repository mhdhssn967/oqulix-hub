import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="h-screen overflow-hidden bg-[#FBFBFB] flex font-sans text-zinc-900 selection:bg-black selection:text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="p-4 md:p-8 lg:p-10 flex-1 overflow-auto">
          <div className="w-full max-w-[1920px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
