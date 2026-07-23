import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, CheckSquare, Users, TrendingUp, Settings, FileText, Database, UserCheck, BarChart2, X, UserCog, Receipt, Bell } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function Sidebar() {
  const isOpen = useUIStore((s) => s.isMobileMenuOpen);
  const closeMobileMenu = useUIStore((s) => s.closeMobileMenu);
  const { user, isAdmin, isManager, companyId } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    
    const reimbursementsRef = collection(db, 'userData', companyId, 'reimbursements');
    let q;
    
    if (isAdmin || isManager) {
      q = query(reimbursementsRef, where('status', '==', 'Pending'));
    } else if (user?.uid) {
      q = query(reimbursementsRef, where('status', '==', 'Pending'), where('employeeUid', '==', user.uid));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching pending count:", error);
    });

    return () => unsubscribe();
  }, [companyId, isAdmin, isManager, user?.uid]);

  const navItems = [
    { icon: LayoutDashboard, label: 'CRM', path: '/' },
    { icon: BarChart2, label: 'CRM Analysis', path: '/analysis' },
    ...(isAdmin ? [{ icon: CreditCard, label: 'Finance', path: '/finance' }] : []),
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: Receipt, label: 'Reimbursements', path: '/reimbursements' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: UserCheck, label: 'Attendance', path: '/attendance' },
    ...(isAdmin ? [{ icon: UserCog, label: 'Employees', path: '/employees' }] : []),
    { icon: TrendingUp, label: 'Performance', path: '/performance' },
    { icon: FileText, label: 'Documents', path: '/documents' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 shrink-0 bg-[#0A0A0A] p-6 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-12 px-2 mt-2">
          <img src="/logo_transp.png" alt="Oqulix Logo" className="h-12 w-auto object-contain" />
          <button 
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={closeMobileMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="space-y-1.5 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-4 px-3">Main Menu</div>
          {navItems.map((item, i) => (
            <NavLink 
              key={i} 
              to={item.path} 
              onClick={closeMobileMenu}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-white/10 text-white font-medium' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                  <span className="text-[14px] tracking-tight flex-1">{item.label}</span>
                  {item.label === 'Reimbursements' && pendingCount > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                      {pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="mt-8 border-t border-white/10 pt-4 flex flex-col gap-1.5">
          <button
            onClick={() => useAuthStore.getState().requestNotificationPermission()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-zinc-400 hover:bg-white/5 hover:text-zinc-200 w-full text-left"
          >
            <Bell className="w-[18px] h-[18px] text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="text-[14px] tracking-tight">Enable Notifications</span>
          </button>
          
          <NavLink 
            to="/settings" 
            onClick={closeMobileMenu}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
              isActive ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
             {({ isActive }) => (
               <>
                 <Settings className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                 <span className="text-[14px] tracking-tight">Settings</span>
               </>
             )}
          </NavLink>
        </div>
      </aside>
    </>
  );
}
