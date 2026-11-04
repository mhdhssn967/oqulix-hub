import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  CheckSquare, 
  ClipboardList, 
  Users, 
  TrendingUp, 
  Settings, 
  FileText, 
  Database, 
  UserCheck, 
  BarChart2, 
  X, 
  UserCog, 
  Receipt, 
  Bell, 
  Megaphone, 
  Home, 
  MonitorSmartphone, 
  Shield, 
  Banknote, 
  Calculator, 
  Wallet, 
  Briefcase, 
  UserCheck2,
  ChevronDown,
  Building2,
  User,
  Layers
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export function Sidebar() {
  const isOpen = useUIStore((s) => s.isMobileMenuOpen);
  const closeMobileMenu = useUIStore((s) => s.closeMobileMenu);
  const { user, isAdmin, isManager, companyId, permissions, isHR } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasSubordinates, setHasSubordinates] = useState(false);
  const location = useLocation();

  // Collapsible menu sections for Admin
  const [expandedSections, setExpandedSections] = useState({
    crm: true,
    finance: false,
    tasks: false,
    employees: false,
    profile: false,
    company: false
  });

  // Auto-expand section if the current route belongs to it
  useEffect(() => {
    const p = location.pathname;
    if (['/crm', '/crm/team', '/analysis', '/clients'].some(path => p === path || p.startsWith(path + '/'))) {
      setExpandedSections(prev => ({ ...prev, crm: true }));
    } else if (['/finance', '/finance/analysis', '/financial-analysis', '/reimbursements'].some(path => p === path || p.startsWith(path + '/'))) {
      setExpandedSections(prev => ({ ...prev, finance: true }));
    } else if (['/tasks', '/task-manager', '/completed-tasks'].some(path => p === path || p.startsWith(path + '/'))) {
      setExpandedSections(prev => ({ ...prev, tasks: true }));
    } else if (['/employees', '/manage-attendance', '/hiring', '/attendance-analysis'].some(path => p === path || p.startsWith(path + '/'))) {
      setExpandedSections(prev => ({ ...prev, employees: true }));
    } else if (['/attendance', '/performance', '/payroll', '/payroll-management'].some(path => p === path || p.startsWith(path + '/'))) {
      setExpandedSections(prev => ({ ...prev, profile: true }));
    } else if (['/company-vault', '/documents', '/ad-settings', '/assets'].some(path => p === path || p.startsWith(path + '/'))) {
      setExpandedSections(prev => ({ ...prev, company: true }));
    }
  }, [location.pathname]);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    // Check if the current user has direct reports
    if (!user?.uid) return;
    const checkSubordinates = async () => {
      try {
        const empSnap = await getDocs(query(collection(db, 'employees'), where('managerId', '==', user.uid)));
        if (!empSnap.empty) {
          setHasSubordinates(true);
        }
      } catch (e) {
        console.error("Error checking subordinates:", e);
      }
    };
    checkSubordinates();
  }, [user?.uid]);

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

  // Admin grouped collapsible navigation structure
  const adminGroups = [
    {
      key: 'crm',
      label: 'CRM',
      icon: LayoutDashboard,
      items: [
        { label: 'Leads', path: '/crm' },
        { label: 'Team CRM', path: '/crm/team' },
        { label: 'CRM Analysis', path: '/analysis' },
        { label: 'Clients', path: '/clients' },
      ]
    },
    {
      key: 'finance',
      label: 'Finance',
      icon: CreditCard,
      items: [
        { label: 'Finance', path: '/finance' },
        { label: 'Finance Analysis', path: '/finance/analysis' },
        { label: 'Reimbursements', path: '/reimbursements', hasBadge: true },
      ]
    },
    {
      key: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      items: [
        { label: 'Tasks', path: '/tasks' },
        { label: 'Task Management', path: '/task-manager' },
      ]
    },
    {
      key: 'employees',
      label: 'Employees',
      icon: UserCog,
      items: [
        { label: 'Employee Details', path: '/employees' },
        { label: 'Manage Attendance', path: '/manage-attendance' },
        { label: 'Hiring', path: '/hiring' },
      ]
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: User,
      items: [
        { label: 'Attendance', path: '/attendance' },
        { label: 'Performance', path: '/performance' },
        { label: 'Payroll', path: '/payroll' },
        { label: 'Payroll Management', path: '/payroll-management' },
      ]
    },
    {
      key: 'company',
      label: 'Company',
      icon: Building2,
      items: [
        { label: 'Company Vault', path: '/company-vault' },
        { label: 'Documents', path: '/documents' },
        { label: 'Ad Settings', path: '/ad-settings' },
        { label: 'Assets', path: '/assets' },
      ]
    }
  ];

  // Standard flat navigation for regular employees / managers
  const standardNavItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: LayoutDashboard, label: 'CRM', path: '/crm' },
    { icon: Users, label: 'Team CRM', path: '/crm/team' },
    { icon: BarChart2, label: 'CRM Analysis', path: '/analysis' },
    { icon: CreditCard, label: 'Finance', path: '/finance' },
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: Banknote, label: 'Reimbursements', path: '/reimbursements' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: ClipboardList, label: 'Task Manager', path: '/task-manager' },
    { icon: UserCheck, label: 'Attendance', path: '/attendance' },
    { icon: Users, label: 'Manage Attendance', path: '/manage-attendance' },
    { icon: UserCog, label: 'Employees', path: '/employees' },
    { icon: Briefcase, label: 'Hiring', path: '/hiring' },
    { icon: MonitorSmartphone, label: 'Assets', path: '/assets' },
    { icon: Shield, label: 'Company Vault', path: '/company-vault' },
    { icon: TrendingUp, label: 'Performance', path: '/performance' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Calculator, label: 'Payroll Management', path: '/payroll-management' },
    { icon: Wallet, label: 'Payroll', path: '/payroll' },
    { icon: Megaphone, label: 'Ad Settings', path: '/ad-settings' },
  ];

  const hasPermission = (label) => {
    if (label === 'Dashboard' || label === 'Payroll') return true;
    
    if (label === 'Team CRM') {
      return isAdmin || isManager || isHR || hasSubordinates;
    }
    
    if (label === 'Finance' && isHR && !isAdmin) {
      if (permissions && permissions.includes(label)) return true;
      return false;
    }
    
    if (label === 'Hiring' && (isAdmin || isHR)) return true;

    if (isAdmin || isManager) return true;
    
    if (permissions && permissions.length > 0) {
      return permissions.includes(label);
    }
    return !['Finance', 'Employees', 'Hiring', 'Task Manager', 'Payroll Management'].includes(label);
  };

  const filteredStandardItems = standardNavItems.filter(item => hasPermission(item.label));

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
        className={`fixed inset-y-0 left-0 w-64 shrink-0 bg-[#0A0A0A] p-5 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8 px-2 mt-1">
          <img src="/logo_transp.png" alt="Oqulix Logo" className="h-11 w-auto object-contain" />
          <button 
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={closeMobileMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2.5 px-3">Main Menu</div>

          {/* ADMIN ACCORDION NAVIGATION */}
          {isAdmin ? (
            <div className="space-y-1">
              {/* Standalone Dashboard */}
              <NavLink 
                to="/" 
                end
                onClick={closeMobileMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-white/10 text-white font-medium shadow-xs' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <Home className={`w-[17px] h-[17px] ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                    <span className="text-[13.5px] tracking-tight flex-1">Dashboard</span>
                  </>
                )}
              </NavLink>

              {/* Collapsible Groups */}
              {adminGroups.map((group) => {
                const isExpanded = !!expandedSections[group.key];
                const isAnyChildActive = group.items.some(it => {
                  if (it.path === '/') return location.pathname === '/';
                  return location.pathname === it.path || location.pathname.startsWith(it.path + '/');
                });

                return (
                  <div key={group.key} className="pt-1">
                    {/* Collapsible Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(group.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer select-none group ${
                        isAnyChildActive 
                          ? 'text-white font-medium bg-white/[0.04]' 
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <group.icon className={`w-[17px] h-[17px] ${isAnyChildActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                        <span className="text-[13.5px] tracking-tight truncate">{group.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {group.key === 'finance' && pendingCount > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs">
                            {pendingCount}
                          </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-zinc-300' : ''}`} />
                      </div>
                    </button>

                    {/* Submenu Items */}
                    {isExpanded && (
                      <div className="mt-1 ml-4 pl-3 border-l border-zinc-800/80 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        {group.items.map((subItem) => (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            onClick={closeMobileMenu}
                            className={({ isActive }) => `flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] tracking-tight transition-all duration-150 ${
                              isActive 
                                ? 'bg-white/10 text-white font-medium' 
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{subItem.label}</span>
                            {subItem.hasBadge && pendingCount > 0 && (
                              <span className="bg-blue-600 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                                {pendingCount}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* STANDARD EMPLOYEE / MANAGER NAVIGATION */
            filteredStandardItems.map((item, i) => (
              <NavLink 
                key={i} 
                to={item.path} 
                onClick={closeMobileMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-[17px] h-[17px] ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                    <span className="text-[13.5px] tracking-tight flex-1">{item.label}</span>
                    {item.label === 'Reimbursements' && pendingCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                        {pendingCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))
          )}
        </nav>
        
        <div className="mt-4 border-t border-white/10 pt-3 flex flex-col gap-1">
          <button
            onClick={() => useAuthStore.getState().requestNotificationPermission()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-zinc-400 hover:bg-white/5 hover:text-zinc-200 w-full text-left"
          >
            <Bell className="w-[17px] h-[17px] text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="text-[13.5px] tracking-tight">Enable Notifications</span>
          </button>
          
          {hasPermission('Settings') && (
            <NavLink 
              to="/settings" 
              onClick={closeMobileMenu}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                isActive ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
               {({ isActive }) => (
                 <>
                   <Settings className={`w-[17px] h-[17px] ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                   <span className="text-[13.5px] tracking-tight">Settings</span>
                 </>
               )}
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
