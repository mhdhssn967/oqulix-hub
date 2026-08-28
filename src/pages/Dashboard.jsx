import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { Clock, CheckSquare, Calendar, CreditCard, ChevronRight, ChevronLeft, LayoutDashboard, User, ArrowUpRight, TrendingUp, Sparkles, CheckCircle, Laptop, Map, CalendarMinus, AlertCircle, X, Plus, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import RequestModal from '../components/RequestModal';

export default function Dashboard() {
  const { user, isAdmin, isManager, employeeData, companyId, permissions, isAdLeadManager } = useAuthStore();
  const navigate = useNavigate();
  
  const isDigitalMarketing = employeeData?.position?.trim().toLowerCase() === 'digital marketing';
  const canManageAdLeads = isDigitalMarketing || isAdLeadManager;

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [monthAttendance, setMonthAttendance] = useState({});
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [customHolidays, setCustomHolidays] = useState({});
  const [todaysGlobalFollowUps, setTodaysGlobalFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const userName = isAdmin ? 'Admin' : (employeeData?.name || 'User');
  const todayDate = new Date().toISOString().split('T')[0];
  const currentDateFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!companyId || !user) return;
      setLoading(true);
      try {
        const attRef = collection(db, `userData/${companyId}/attendanceLogs`);
        const attQ = query(attRef, where('employeeId', '==', user.uid), where('date', '==', todayDate));
        const attSnap = await getDocs(attQ);
        if (!attSnap.empty) {
          setTodayAttendance(attSnap.docs[0].data());
        }

        const tasksRef = collection(db, 'userData', companyId, 'tasks');
        let tasksQ;
        if (isAdmin) {
          tasksQ = query(tasksRef, where('status', '==', 'Pending'));
        } else {
          tasksQ = query(tasksRef, where('status', '==', 'Pending'), where('assignedToUid', '==', user.uid));
        }
        const tasksSnap = await getDocs(tasksQ);
        setPendingTasksCount(tasksSnap.size);

        // Fetch custom holidays
        const holidaysRef = doc(db, 'userData', companyId, 'settings', 'holidays');
        const holidaysSnap = await getDoc(holidaysRef);
        if (holidaysSnap.exists() && holidaysSnap.data().dates) {
          setCustomHolidays(holidaysSnap.data().dates);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [companyId, user, isAdmin, todayDate]);

  // Global follow-ups fetch across all segments
  useEffect(() => {
    if (!companyId) return;
    const fetchGlobalFollowUps = async () => {
      try {
        const segments = ['happymoves', 'gamefaktory'];
        const collections = ['leads', 'adLeads', 'distributors'];
        const allFollowUps = [];

        for (const seg of segments) {
          for (const col of collections) {
            const colRef = collection(db, 'userData', companyId, 'segments', seg, 'crmData', col, 'items');
            const snap = await getDocs(colRef);
            snap.forEach(docSnap => {
              const data = docSnap.data();
              const followUp = data.nextFollowUp || data.followUpDate;
              if (followUp === todayDate) {
                const sourceName = col === 'leads' ? 'Regular Lead' : col === 'adLeads' ? 'Ad Lead' : 'Distributor';
                allFollowUps.push({
                  id: docSnap.id,
                  ...data,
                  _sourceCollection: sourceName,
                  _segmentName: seg === 'happymoves' ? 'Happy Moves' : 'Game Faktory',
                  _sourceTab: col === 'leads' ? 'regular' : col === 'adLeads' ? 'ads' : 'distributors'
                });
              }
            });
          }
        }

        const filteredFollowUps = allFollowUps.filter(item => {
          if (isAdmin || isManager) return true;
          if (item._sourceTab === 'ads' && canManageAdLeads) return true;
          return item.userId === user?.uid || item.assignedToUid === user?.uid;
        });

        setTodaysGlobalFollowUps(filteredFollowUps);
      } catch (err) {
        console.error("Error fetching global follow ups:", err);
      }
    };
    fetchGlobalFollowUps();
  }, [companyId, isAdmin, isManager, canManageAdLeads, user?.uid, todayDate]);


  const hasPerm = (label) => {
    if (isAdmin) return true;
    if (permissions && permissions.length > 0) return permissions.includes(label);
    return false;
  };

  // Calendar Logic
  const [calendarDate, setCalendarDate] = useState(new Date());

  const generateCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const isLeaveDay = (year, month, day) => {
    if (!day) return { isLeave: false };
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (customHolidays[dateStr]) {
      return { isLeave: true, reason: customHolidays[dateStr], isCustom: true };
    }

    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) return { isLeave: true, reason: 'Off', isCustom: false }; // Sunday
    
    if (dayOfWeek === 6) { // Saturday
      const weekNumber = Math.ceil(day / 7);
      if (weekNumber === 2 || weekNumber === 4) return { isLeave: true, reason: 'Off', isCustom: false };
    }
    
    return { isLeave: false };
  };

  const handleDayClick = async (day) => {
    if (!day) return;
    if (!isAdmin && !hasPerm('Employees')) return;

    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (customHolidays[dateStr]) {
      const res = await Swal.fire({
        title: 'Remove Holiday?',
        text: `Do you want to remove "${customHolidays[dateStr]}" from this date?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000000',
        confirmButtonText: 'Yes, remove it'
      });
      if (res.isConfirmed) {
        const newHolidays = { ...customHolidays };
        delete newHolidays[dateStr];
        setCustomHolidays(newHolidays);
        await setDoc(doc(db, 'userData', companyId, 'settings', 'holidays'), { dates: newHolidays }, { merge: true });
      }
    } else {
      const { value: reason } = await Swal.fire({
        title: 'Mark as Holiday',
        input: 'text',
        inputLabel: 'Holiday Name (e.g. National Holiday)',
        inputPlaceholder: 'Enter reason',
        showCancelButton: true,
        confirmButtonColor: '#000000',
        inputValidator: (value) => {
          if (!value) return 'You need to write something!';
        }
      });

      if (reason) {
        const newHolidays = { ...customHolidays, [dateStr]: reason };
        setCustomHolidays(newHolidays);
        await setDoc(doc(db, 'userData', companyId, 'settings', 'holidays'), { dates: newHolidays }, { merge: true });
      }
    }
  };

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const calendarDays = generateCalendarDays(calYear, calMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const [stats, setStats] = useState({
    totalWorkingDays: 0,
    workingDaysPassed: 0,
    totalPresent: 0,
    wfhCount: 0,
    fieldCount: 0,
    officeCount: 0,
    leaveCount: 0,
    absentCount: 0,
    extraDaysCount: 0
  });

  useEffect(() => {
    const today = new Date();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    let offDays = 0;
    let offDaysPassed = 0;
    
    let daysPassed = 0;
    if (calYear < today.getFullYear() || (calYear === today.getFullYear() && calMonth < today.getMonth())) {
      daysPassed = daysInMonth;
    } else if (calYear === today.getFullYear() && calMonth === today.getMonth()) {
      daysPassed = today.getDate();
    } else {
      daysPassed = 0;
    }

    for (let i = 1; i <= daysInMonth; i++) {
      if (isLeaveDay(calYear, calMonth, i).isLeave) {
        offDays++;
        if (i <= daysPassed) offDaysPassed++;
      }
    }

    const totalWorkingDays = daysInMonth - offDays;
    const workingDaysPassed = Math.max(0, daysPassed - offDaysPassed);

    let totalPresent = 0;
    let wfhCount = 0;
    let fieldCount = 0;
    let officeCount = 0;
    let leaveCount = 0;
    let extraDaysCount = 0;

    Object.values(monthAttendance).forEach(log => {
      if (log.status === 'On Leave') {
        leaveCount++;
      } else {
        totalPresent++;
        if (log.workType === 'WFH') wfhCount++;
        else if (log.workType === 'Field') fieldCount++;
        else officeCount++;
        
        if (log.date) {
          const [y, m, d] = log.date.split('-');
          if (y && m && d) {
            const holCheck = isLeaveDay(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            if (holCheck.isLeave) extraDaysCount++;
          }
        }
      }
    });

    const absentCount = Math.max(0, workingDaysPassed - (totalPresent - extraDaysCount) - leaveCount);

    setStats({
      totalWorkingDays,
      workingDaysPassed,
      totalPresent,
      wfhCount,
      fieldCount,
      officeCount,
      leaveCount,
      absentCount,
      extraDaysCount
    });
  }, [monthAttendance, calYear, calMonth, customHolidays]);

  useEffect(() => {
    const fetchMonthLogs = async () => {
      if (!companyId || !user) return;
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const prefix = `${calYear}-${monthStr}`;
      
      try {
        const attRef = collection(db, `userData/${companyId}/attendanceLogs`);
        const q = query(attRef, where('employeeId', '==', user.uid));
        const snap = await getDocs(q);
        
        const logs = {};
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.date && data.date.startsWith(prefix)) {
            logs[data.date] = data;
          }
        });
        setMonthAttendance(logs);
      } catch (err) {
        console.error("Error fetching month attendance:", err);
      }
    };
    fetchMonthLogs();
  }, [calYear, calMonth, companyId, user]);

  const quickLinks = [
    { label: 'CRM Tracker', icon: LayoutDashboard, path: '/crm', perm: 'CRM', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100', desc: 'Manage leads and deals' },
    { label: 'My Tasks', icon: CheckSquare, path: '/tasks', perm: 'Tasks', color: 'bg-orange-50 text-orange-600', border: 'border-orange-100', desc: 'Track your assigned work' },
    { label: 'Attendance', icon: Calendar, path: '/attendance', perm: 'Attendance', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100', desc: 'View monthly records' },
    { label: 'Reimbursements', icon: CreditCard, path: '/reimbursements', perm: 'Reimbursements', color: 'bg-purple-50 text-purple-600', border: 'border-purple-100', desc: 'Submit and track expenses' },
  ].filter(link => hasPerm(link.perm));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 font-sans w-full">
      {/* Sleek, standard header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">{currentDateFormatted}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-[14px] text-zinc-500 mt-1 mb-4">
            Here's a quick overview of your workspace today.
          </p>

          {/* Quick Stats Pills */}
          {!isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-full text-[11px] sm:text-[12px] font-semibold flex items-center gap-1.5 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5" /> Working Days: {stats.totalWorkingDays}
              </div>
              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-emerald-100 flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5" /> Present: {stats.totalPresent} / {stats.workingDaysPassed}
              </div>
              <div className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-amber-100 flex items-center gap-1.5 whitespace-nowrap">
                <CalendarMinus className="w-3.5 h-3.5" /> Leaves: {stats.leaveCount}
              </div>
              {stats.wfhCount > 0 && (
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-indigo-100 flex items-center gap-1.5 whitespace-nowrap">
                  <Laptop className="w-3.5 h-3.5" /> WFH: {stats.wfhCount}
                </div>
              )}
              {stats.fieldCount > 0 && (
                <div className="px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-fuchsia-100 flex items-center gap-1.5 whitespace-nowrap">
                  <Map className="w-3.5 h-3.5" /> Field: {stats.fieldCount}
                </div>
              )}
              {stats.absentCount > 0 && (
                <div className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-rose-100 flex items-center gap-1.5 whitespace-nowrap">
                  <AlertCircle className="w-3.5 h-3.5" /> Absent: {stats.absentCount}
                </div>
              )}
              {stats.extraDaysCount > 0 && (
                <div className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-cyan-100 flex items-center gap-1.5 whitespace-nowrap">
                  <Briefcase className="w-3.5 h-3.5" /> Extra Days: {stats.extraDaysCount}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
          <button onClick={() => setIsRequestModalOpen(true)} className="py-2 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Submit Request
          </button>
        </div>
      </header>

      {todaysGlobalFollowUps.length > 0 && (
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col mb-3">
            <h2 className="text-[14px] font-bold text-sky-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Today's Follow-Ups
            </h2>
            <p className="text-[12px] text-sky-700/80">Across all segments</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {todaysGlobalFollowUps.map(lead => (
              <div 
                key={lead.id} 
                onClick={() => navigate('/crm', { state: { openQuickUpdateLead: lead } })}
                className="flex-shrink-0 w-64 bg-white border border-sky-100 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-sky-300 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-sky-400 group-hover:bg-sky-600 transition-colors" />
                <div className="flex justify-between items-start mb-1.5 pl-2">
                  <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{lead._sourceCollection}</span>
                  <span className="text-[10px] font-medium text-zinc-400">{lead._segmentName}</span>
                </div>
                <div className="pl-2">
                  <p className="text-[13px] font-bold text-zinc-900 truncate">{lead.clientName || lead.name || lead.distributorName || 'Unnamed'}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{lead.phone || lead.contactNo || lead.contactNumber || 'No Phone'}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Ref: {lead.personOfContact || lead.contactPersonName || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Quick Stats & Actions */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Official Company Calendar */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-[16px] font-semibold text-zinc-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-zinc-400" />
                Company Calendar
              </h2>
              <div className="flex items-center justify-between sm:justify-end gap-3 bg-zinc-50 border border-zinc-200/60 rounded-xl p-1">
                <button 
                  onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))} 
                  className="p-1.5 text-zinc-500 hover:text-black hover:bg-white rounded-lg hover:shadow-sm transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] font-semibold text-zinc-900 min-w-[120px] text-center">
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))} 
                  className="p-1.5 text-zinc-500 hover:text-black hover:bg-white rounded-lg hover:shadow-sm transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] sm:text-[11px] font-bold text-zinc-600 uppercase tracking-wider py-1.5 sm:py-2 bg-zinc-100/80 rounded-lg">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const leaveData = isLeaveDay(calYear, calMonth, day);
                const isLeave = leaveData.isLeave;
                
                const today = new Date();
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                const isPastDay = day && (calYear < today.getFullYear() || (calYear === today.getFullYear() && calMonth < today.getMonth()) || (calYear === today.getFullYear() && calMonth === today.getMonth() && day < today.getDate()));
                
                const canEdit = (isAdmin || hasPerm('Employees')) && day;
                
                const dateStr = day ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                const myLog = dateStr ? monthAttendance[dateStr] : null;
                
                const isAbsent = !isAdmin && isPastDay && !isLeave && !myLog;
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square sm:aspect-auto sm:h-16 flex flex-col items-center justify-center sm:justify-start sm:p-2 rounded-xl border ${
                      !day ? 'border-transparent bg-transparent' : 
                      isAbsent ? 'border-red-200 bg-red-50' :
                      isLeave ? 'border-slate-200 bg-slate-50' : 
                      isToday ? 'border-blue-200 bg-blue-50 ring-1 ring-blue-100' :
                      'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50'
                    } ${canEdit ? 'cursor-pointer hover:opacity-80' : ''} transition-all relative overflow-hidden group`}
                  >
                    {day && (
                      <>
                        <span className={`text-[13px] sm:text-[14px] font-bold ${
                          isAbsent ? 'text-red-700' :
                          isLeave ? 'text-slate-500' : 
                          isToday ? 'text-blue-700' : 'text-zinc-700'
                        }`}>
                          {day}
                        </span>
                        
                        {isLeave && (
                          <div className="hidden sm:block mt-0.5 w-full text-center">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider bg-slate-200/60 px-1.5 py-0.5 rounded-md truncate max-w-full inline-block" title={leaveData.reason}>
                              {leaveData.reason}
                            </span>
                          </div>
                        )}
                        
                        {isAbsent && (
                          <div className="hidden sm:block mt-0.5 w-full text-center">
                            <span className="flex items-center justify-center gap-0.5 text-[9px] font-bold text-red-700 uppercase tracking-wider bg-red-100 px-1.5 py-0.5 rounded-md truncate max-w-full" title="Absent">
                              <X className="w-2.5 h-2.5" strokeWidth={3} /> Absent
                            </span>
                          </div>
                        )}

                        {!isAdmin && !isLeave && !isAbsent && myLog && (
                          <div className="hidden sm:block mt-0.5 w-full text-center">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md truncate max-w-full inline-block ${
                              myLog.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                              myLog.status.startsWith('On ') ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`} title={myLog.status}>
                              {myLog.status === 'Clocked Out' ? 'Present' : myLog.status}
                            </span>
                          </div>
                        )}

                        {/* Mobile indicators */}
                        {isLeave && (
                          <div className="sm:hidden absolute bottom-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                        )}
                        {isAbsent && (
                          <div className="sm:hidden absolute bottom-1.5 flex items-center justify-center">
                             <X className="w-3 h-3 text-red-600" strokeWidth={4} />
                          </div>
                        )}
                        {!isAdmin && !isLeave && !isAbsent && myLog && (
                          <div className={`sm:hidden absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${
                             myLog.status === 'On Leave' ? 'bg-amber-500' :
                             myLog.status.startsWith('On ') ? 'bg-orange-500' :
                             'bg-emerald-500'
                          }`}></div>
                        )}

                        {canEdit && !isLeave && !isAbsent && (
                          <div className="hidden sm:group-hover:flex absolute inset-0 bg-black/5 items-center justify-center">
                            <span className="text-[10px] font-bold text-zinc-600">Mark Off</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-5 text-[12px] font-semibold text-zinc-500">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                   <div className="w-1 h-1 bg-slate-400 rounded-full sm:hidden"></div>
                 </div>
                 Leave / Off
               </div>
               {!isAdmin && (
                 <>
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-md bg-red-100 border border-red-200 flex items-center justify-center">
                       <X className="w-2.5 h-2.5 text-red-600 sm:hidden" strokeWidth={4} />
                     </div>
                     Absent
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                       <div className="w-1 h-1 bg-emerald-500 rounded-full sm:hidden"></div>
                     </div>
                     Present
                   </div>
                 </>
               )}
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-md bg-blue-100 border border-blue-200"></div>
                 Today
               </div>
            </div>
          </div>

          {quickLinks.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
              <h3 className="text-[15px] font-semibold text-zinc-900 mb-5 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                Quick Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickLinks.map((link, idx) => (
                  <div 
                    key={idx}
                    onClick={() => navigate(link.path)}
                    className="group p-4 rounded-xl border border-zinc-200 hover:border-black/20 hover:shadow-sm bg-white cursor-pointer transition-all flex items-start gap-4"
                  >
                    <div className={`p-3 rounded-xl ${link.color} ${link.border} bg-opacity-50 shrink-0 transition-transform group-hover:scale-105`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-zinc-900 truncate">{link.label}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-black transition-colors" />
                      </div>
                      <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{link.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks Banner */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-orange-900">Pending Tasks</h3>
                <p className="text-[13px] text-orange-700 mt-0.5">
                  You currently have <strong className="font-bold">{pendingTasksCount}</strong> tasks awaiting action.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/tasks')}
              className="px-5 py-2.5 bg-white border border-orange-200 text-orange-700 text-[13px] font-semibold rounded-xl hover:bg-orange-100 transition-colors shrink-0 shadow-sm"
            >
              View Tasks
            </button>
          </div>
        </div>

        {/* Right Column: Attendance Widget */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden h-full">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Today's Log
              </h2>
              <button onClick={() => navigate('/attendance')} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                History
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center">
              {todayAttendance ? (
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    todayAttendance.status === 'On Leave' ? 'bg-rose-100 text-rose-600' : 
                    (todayAttendance.status.startsWith('On ') ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600')
                  }`}>
                    {todayAttendance.status === 'On Leave' ? <Calendar className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-zinc-900 mb-1">
                    {todayAttendance.status}
                  </h3>
                  
                  <div className="text-[13px] text-zinc-500 mb-6">
                    {todayAttendance.workType && todayAttendance.status !== 'On Leave' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-md font-medium mr-2">
                        {todayAttendance.workType}
                      </span>
                    )}
                    {todayAttendance.clockedInAt && todayAttendance.status !== 'On Leave' && (
                      <span>
                        Started at <strong className="text-zinc-700">
                          {todayAttendance.clockedInAt.toDate ? todayAttendance.clockedInAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(todayAttendance.clockedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </span>
                    )}
                    {todayAttendance.status === 'On Leave' && (
                      <span>{todayAttendance.leaveReason}</span>
                    )}
                  </div>
                  
                  {todayAttendance.status !== 'On Leave' && todayAttendance.status !== 'Clocked Out' && (
                    <div className="w-full mt-auto p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Current Time</span>
                        <span className="text-[15px] font-semibold text-zinc-900 mt-0.5">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-zinc-200"></div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Status</span>
                        <span className="text-[13px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Active
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                    <Clock className="w-6 h-6 text-zinc-300" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-900 mb-1">Not Clocked In</h3>
                  <p className="text-[13px] text-zinc-500 max-w-[200px] mx-auto">
                    Your attendance hasn't been logged yet for today.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <RequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
    </div>
  );
}
