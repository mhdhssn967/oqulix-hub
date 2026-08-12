import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Calendar, Loader2, Users, Download, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { calculateEmployeeAttendanceMetrics } from '../utils/attendanceUtils';

export default function EmployeeAttendanceAnalysis() {
  const { companyId } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [customHolidays, setCustomHolidays] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        // Fetch employees
        const empSnap = await getDocs(collection(db, `userData/${companyId}/employees`));
        const emps = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Fetch custom holidays
        const holidaysRef = doc(db, 'userData', companyId, 'settings', 'holidays');
        const holidaysSnap = await getDoc(holidaysRef);
        let holidays = {};
        if (holidaysSnap.exists() && holidaysSnap.data().dates) {
          holidays = holidaysSnap.data().dates;
        }

        // Fetch attendance logs
        const attSnap = await getDocs(collection(db, `userData/${companyId}/attendanceLogs`));
        const logs = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setEmployees(emps);
        setCustomHolidays(holidays);
        setAttendanceLogs(logs);
      } catch (err) {
        console.error("Error fetching analysis data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  const analysisData = useMemo(() => {
    if (loading) return [];
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;

    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let daysPassed = 0;
    if (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth())) {
      daysPassed = daysInMonth;
    } else if (year === today.getFullYear() && month === today.getMonth()) {
      daysPassed = today.getDate();
    } else {
      daysPassed = 0;
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
      if (isLeaveDay(year, month, i)) {
        offDaysPassed++;
      }
    }
    const workingDaysPassed = Math.max(0, daysPassed - offDaysPassed);

    const monthPrefix = `${yearStr}-${monthStr}`;
    const monthLogs = attendanceLogs.filter(log => log.date && log.date.startsWith(monthPrefix));

    return employees.map(emp => {
      const empLogs = monthLogs.filter(log => log.employeeId === emp.id);
      return calculateEmployeeAttendanceMetrics(emp, empLogs, workingDaysPassed);
    }).sort((a, b) => a.name.localeCompare(b.name));

  }, [employees, attendanceLogs, customHolidays, selectedMonth, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Link to="/manage-attendance" className="hover:text-black flex items-center gap-1 transition-colors text-[13px] font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Attendance
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Attendance Analysis</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Overview of employee attendance metrics and hours.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm cursor-pointer"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[14px] font-semibold hover:bg-zinc-800 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Present / Working Days</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Absent</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Leaves</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Field</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">WFH</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Hours (Worked/Expected)</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Avg Hrs/Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {analysisData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-zinc-500 text-[14px]">
                    <Users className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                    No data available for {new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
                  </td>
                </tr>
              ) : (
                analysisData.map(emp => (
                  <tr 
                    key={emp.id} 
                    onClick={() => navigate(`/attendance-analysis/${emp.id}?month=${selectedMonth}`)}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-semibold text-zinc-900">{emp.name}</span>
                        <span className="text-[12px] text-zinc-500">{emp.position}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[14px]">
                      <span className="font-semibold text-emerald-600">{emp.presentDays}</span>
                      <span className="text-zinc-400 mx-1">/</span>
                      <span className="text-zinc-600 font-medium">{emp.workingDaysPassed}</span>
                    </td>
                    <td className="px-5 py-4 text-[14px] text-center">
                      <span className={`font-semibold ${emp.absentDays > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                        {emp.absentDays}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[14px] text-center text-zinc-600 font-medium">
                      {emp.leaveDays}
                    </td>
                    <td className="px-5 py-4 text-[14px] text-center text-fuchsia-600 font-medium">
                      {emp.fieldDays}
                    </td>
                    <td className="px-5 py-4 text-[14px] text-center text-indigo-600 font-medium">
                      {emp.wfhDays}
                    </td>
                    <td className="px-5 py-4 text-[14px] font-semibold text-zinc-900 text-right whitespace-nowrap">
                      {emp.totalHours} <span className="text-zinc-400 font-normal mx-0.5">/</span> <span className="text-zinc-500 font-medium">{emp.expectedHours}h</span>
                    </td>
                    <td className="px-5 py-4 text-[14px] font-medium text-zinc-600 text-right">
                      {emp.avgHours}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
