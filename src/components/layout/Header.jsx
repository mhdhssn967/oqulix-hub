import React from 'react';
import { Search, Bell, Menu, LogOut } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export function Header() {
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const { logout } = useAuthStore();

  return (
    <header className="h-[72px] sticky top-0 z-20 backdrop-blur-xl bg-[#FBFBFB]/80 border-b border-zinc-200/60 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 -ml-2 text-zinc-600 hover:text-black transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="relative w-full md:w-72 group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-100/50 hover:bg-zinc-100 border border-transparent focus:bg-white focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100 outline-none rounded-lg text-[14px] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5 ml-4">
        <button className="relative p-2 text-zinc-400 hover:text-black transition-colors hidden sm:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full border-2 border-[#FBFBFB]"></span>
        </button>
        <div className="h-6 w-[1px] bg-zinc-200 hidden sm:block"></div>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 md:w-9 md:h-9 bg-black text-white rounded-full flex items-center justify-center font-semibold text-xs shadow-sm ring-2 ring-black/5">
             OQ
           </div>
           <div className="text-left hidden sm:block">
             <p className="text-[13px] font-semibold text-black leading-none">Oqulix Admin</p>
             <p className="text-[11px] text-zinc-500 mt-1">Super Admin</p>
           </div>
           <button 
             onClick={() => logout()}
             className="ml-2 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
             title="Log out"
           >
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </div>
    </header>
  );
}
