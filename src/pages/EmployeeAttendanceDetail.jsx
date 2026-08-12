import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Home, UserX, UserCheck, Check, X } from 'lucide-react';
import { calculateEmployeeAttendanceMetrics } from '../utils/attendanceUtils';

export default function EmployeeAttendanceDetail() {
  const { employeeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { companyId } = useAuthStore();
  
  const initialMonth = searchParams.get('month') || (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  })();
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [customHolidays, setCustomHolidays] = useState({});

  useEffect(() => {
    setSearchParams({ month: selectedMonth }, { replace: true });
  }, [selectedMonth, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId || !employeeId) return;
      setLoading(true);
      try {
        const empRef = doc(db, `userData/${companyId}/employees`, employeeId);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          setEmployee({ id: empSnap.id, ...empSnap.data() });
        }

        const holidaysRef = doc(db, 'userData', companyId, 'settings', 'holidays');
        const holidaysSnap = await getDoc(holidaysRef);
        let holidays = {};
        if (holidaysSnap.exists() && holidaysSnap.data().dates) {
          holidays = holidaysSnap.data().dates;
        }
        setCustomHolidays(holidays);

        const logsRef = collection(db, `userData/${companyId}/attendanceLogs`);
        const q = query(logsRef, where('employeeId', '==', employeeId));
        const logsSnap = await getDocs(q);
        
        const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAttendanceLogs(logs);

      } catch (err) {
        console.error("Error fetching employee attendance details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, employeeId]);

  const { year, month, daysInMonth, monthLogs, metrics, calendarDays } = useMemo(() => {
    if (!employee) return { year: 0, month: 0, daysInMonth: 0, monthLogs: [], metrics: null, calendarDays: [] };
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10) - 1;

    const today = new Date();
    const days = new Date(yearNum, monthNum + 1, 0).getDate();
    
    let daysPassed = 0;
    if (yearNum < today.getFullYear() || (yearNum === today.getFullYear() && monthNum < today.getMonth())) {
      daysPassed = days;
    } else if (yearNum === today.getFullYear() && monthNum === today.getMonth()) {
      daysPassed = today.getDate();
    }

    const isLeaveDay = (y, m, d) => {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (customHolidays[dateStr]) return true;

      const date = new Date(y, m, d);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0) return true; // Sunday
      if (dayOfWeek === 6) { // 2nd and 4th Saturday
        const weekNumber = Math.ceil(d / 7);
        if (weekNumber === 2 || weekNumber === 4) return true;
      }
      return false;
    };

    let offDaysPassed = 0;
    for (let i = 1; i <= daysPassed; i++) {
      if (isLeaveDay(yearNum, monthNum, i)) {
        offDaysPassed++;
      }
    }
    const workingDaysPassed = Math.max(0, daysPassed - offDaysPassed);

    const mLogs = attendanceLogs.filter(log => log.date && log.date.startsWith(selectedMonth));
    const calculatedMetrics = calculateEmployeeAttendanceMetrics(employee, mLogs, workingDaysPassed);

    const firstDayOfMonth = new Date(yearNum, monthNum, 1).getDay(); // 0 = Sunday, 1 = Monday...
    
    const calDays = [];
    // Padding before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      calDays.push(null);
    }
    
    for (let d = 1; d <= days; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      const log = mLogs.find(l => l.date === dateStr);
      const isOff = isLeaveDay(yearNum, monthNum, d);
      const isPassed = d <= daysPassed;
      
      let status = 'Upcoming';
      if (log) {
        if (log.status === 'On Leave') status = 'Leave';
        else if (log.workType === 'Field') status = 'Field';
        else if (log.workType === 'WFH') status = 'WFH';
        else status = 'Present';
      } else if (isPassed) {
        if (isOff) status = 'Off';
        else status = 'Absent';
      } else {
        if (isOff) status = 'Off';
      }

      let logHours = 0;
      if (log && log.clockedInAt && log.workType !== 'Field') {
        const tIn = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
        const tOut = log.clockedOutAt ? (log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt)) : new Date();
        let ms = tOut.getTime() - tIn.getTime();
        if (log.breaks && Array.isArray(log.breaks)) {
          log.breaks.forEach(b => {
            if (b.startTime) {
              const bS = b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime);
              const bE = b.endTime ? (b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime)) : new Date();
              ms -= (bE.getTime() - bS.getTime());
            }
          });
        }
        if (ms > 0) logHours = (ms / 3600000).toFixed(1);
      }

      calDays.push({
        date: d,
        status,
        logHours
      });
    }

    return { year: yearNum, month: monthNum, daysInMonth: days, monthLogs: mLogs, metrics: calculatedMetrics, calendarDays: calDays };
  }, [employee, attendanceLogs, customHolidays, selectedMonth]);

  const overallMetrics = useMemo(() => {
    let present = 0;
    let wfh = 0;
    let field = 0;
    let leave = 0;
    attendanceLogs.forEach(log => {
      if (log.status === 'On Leave') leave++;
      else {
        present++;
        if (log.workType === 'WFH') wfh++;
        else if (log.workType === 'Field') field++;
      }
    });
    return { present, wfh, field, leave };
  }, [attendanceLogs]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-zinc-500">Employee not found.</div>
    );
  }

  const statusColors = {
    'Present': 'bg-emerald-50 border-emerald-200 text-emerald-800',
    'Field': 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
    'WFH': 'bg-indigo-50 border-indigo-200 text-indigo-800',
    'Leave': 'bg-amber-50 border-amber-200 text-amber-800',
    'Absent': 'bg-rose-50 border-rose-200 text-rose-800',
    'Off': 'bg-zinc-50 border-zinc-200 text-zinc-500',
    'Upcoming': 'bg-white border-zinc-100 border-dashed text-zinc-400'
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col pb-10 min-h-screen p-6 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <Link to="/attendance-analysis" className="hover:text-black flex items-center gap-1 transition-colors text-[13px] font-medium text-zinc-500">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Analysis
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-black tracking-tight">{employee.name}</h1>
            <p className="text-[15px] text-zinc-500 mt-1.5">{employee.position || 'Employee'} • Attendance Detailed Analysis</p>
          </div>
        </div>
        
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm cursor-pointer"
          />
        </div>
      </header>

      {/* Summary Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-emerald-100 flex items-center gap-1.5 whitespace-nowrap">
          <UserCheck className="w-3.5 h-3.5" /> Present: {metrics.presentDays} / {metrics.workingDaysPassed}
        </div>
        <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-indigo-100 flex items-center gap-1.5 whitespace-nowrap">
          <Home className="w-3.5 h-3.5" /> WFH: {metrics.wfhDays} / {metrics.workingDaysPassed}
        </div>
        <div className="px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-fuchsia-100 flex items-center gap-1.5 whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5" /> Field: {metrics.fieldDays} / {metrics.workingDaysPassed}
        </div>
        <div className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-amber-100 flex items-center gap-1.5 whitespace-nowrap">
          <CalendarIcon className="w-3.5 h-3.5" /> Leaves: {metrics.leaveDays}
        </div>
        <div className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-rose-100 flex items-center gap-1.5 whitespace-nowrap">
          <UserX className="w-3.5 h-3.5" /> Absent: {metrics.absentDays} / {metrics.workingDaysPassed}
        </div>
        <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[11px] sm:text-[12px] font-semibold border border-blue-100 flex items-center gap-1.5 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" /> Hours: {metrics.totalHours} / {metrics.expectedHours}h
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-bold text-zinc-900 mb-6">Monthly Calendar</h3>
        
        <div className="grid grid-cols-7 gap-4 mb-3">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-3 sm:gap-4">
          {calendarDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="min-h-[100px]" />;
            
            return (
              <div 
                key={day.date} 
                className={`w-full min-h-[64px] sm:h-auto sm:min-h-[72px] flex flex-col items-center justify-center sm:justify-start p-1 sm:p-2 rounded-xl border ${statusColors[day.status]} transition-all relative overflow-hidden group`}
              >
                <span className={`text-[12px] sm:text-[14px] font-bold ${
                  day.status === 'Absent' ? 'text-rose-700' :
                  day.status === 'Leave' || day.status === 'Off' ? 'text-slate-500' : 
                  'text-zinc-700'
                }`}>
                  {day.date}
                </span>

                {['Present', 'WFH', 'Field'].includes(day.status) && (
                  <div className="flex mt-0.5 w-full items-center justify-center flex-col gap-0.5">
                    <span className={`text-[10px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md truncate max-w-full inline-flex items-center justify-center gap-0.5 ${
                      day.status === 'Present' ? 'bg-emerald-200/50 text-emerald-800' :
                      day.status === 'WFH' ? 'bg-indigo-200/50 text-indigo-800' :
                      'bg-fuchsia-200/50 text-fuchsia-800'
                    }`}>
                      <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3" strokeWidth={3} /> <span className="hidden md:inline">{day.status}</span>
                    </span>
                    {day.logHours > 0 && day.status !== 'Field' && (
                      <span className="text-[10px] font-semibold opacity-75 hidden md:flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {day.logHours}h
                      </span>
                    )}
                  </div>
                )}
                
                {day.status === 'Absent' && (
                  <div className="flex mt-0.5 w-full text-center items-center justify-center">
                    <span className="flex items-center justify-center gap-0.5 text-[10px] sm:text-[9px] font-bold text-rose-700 uppercase tracking-wider bg-rose-200/50 px-1.5 py-0.5 rounded-md truncate max-w-full">
                      <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" strokeWidth={3} /> <span className="hidden md:inline">Absent</span>
                    </span>
                  </div>
                )}

                {day.status === 'Leave' && (
                  <div className="flex mt-0.5 w-full text-center items-center justify-center">
                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider bg-amber-200/50 px-1.5 py-0.5 rounded-md truncate max-w-full hidden md:inline-block">
                      Leave
                    </span>
                    <span className="md:hidden w-2 h-2 rounded-full bg-amber-500 mt-1"></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All-Time Analysis */}
      <div className="mt-8 bg-white rounded-3xl p-6 border border-zinc-200 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-bold text-zinc-900 mb-6">All-Time Analysis</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-semibold border border-zinc-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total Present: {overallMetrics.present}
          </div>
          <div className="px-4 py-2 bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-semibold border border-zinc-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Total WFH: {overallMetrics.wfh}
          </div>
          <div className="px-4 py-2 bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-semibold border border-zinc-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> Total Field: {overallMetrics.field}
          </div>
          <div className="px-4 py-2 bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-semibold border border-zinc-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Total Leaves: {overallMetrics.leave}
          </div>
        </div>
      </div>
    </div>
  );
}
