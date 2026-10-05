import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Calendar, Loader2, Users, Download, ArrowLeft, X, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { calculateEmployeeAttendanceMetrics } from '../utils/attendanceUtils';
import { toPng } from 'html-to-image';
import Swal from 'sweetalert2';

export default function EmployeeAttendanceAnalysis() {
  const { companyId } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportModal, setReportModal] = useState({ isOpen: false, data: null });
  const reportRef = useRef(null);
  
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

    return employees.filter(emp => emp.isActive !== false).map(emp => {
      const empLogs = monthLogs.filter(log => log.employeeId === emp.id);
      
      let empWorkingDaysPassed = workingDaysPassed;
      if (emp.dateOfJoining) {
        const joinDate = new Date(emp.dateOfJoining);
        if (!isNaN(joinDate.getTime()) && joinDate.getFullYear() === year && joinDate.getMonth() === month) {
          const joinDay = joinDate.getDate();
          if (joinDay > 1) {
            let empOffDaysPassed = 0;
            if (joinDay <= daysPassed) {
              for (let i = joinDay; i <= daysPassed; i++) {
                if (isLeaveDay(year, month, i)) {
                  empOffDaysPassed++;
                }
              }
              empWorkingDaysPassed = Math.max(0, (daysPassed - joinDay + 1) - empOffDaysPassed);
            } else {
              empWorkingDaysPassed = 0;
            }
          }
        }
      }
      return calculateEmployeeAttendanceMetrics(emp, empLogs, empWorkingDaysPassed);
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  }, [employees, attendanceLogs, customHolidays, selectedMonth, loading]);

  const downloadReport = async () => {
    if (!reportRef.current) return;
    try {
      const closeBtn = reportRef.current.querySelector('.close-modal-btn');
      if (closeBtn) closeBtn.style.display = 'none';

      const image = await toPng(reportRef.current, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      if (closeBtn) closeBtn.style.display = 'block';

      const link = document.createElement('a');
      link.download = `Monthly_Report_${reportModal.data?.name}_${selectedMonth}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to generate report image.', 'error');
    }
  };

  const handleOpenReport = (e, emp) => {
    e.stopPropagation();
    setReportModal({ isOpen: true, data: emp });
  };

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
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {analysisData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-12 text-center text-zinc-500 text-[14px]">
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
                    <td className="px-5 py-4 text-right">
                      <button 
                        onClick={(e) => handleOpenReport(e, emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[12px] font-semibold transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Report Modal */}
      {reportModal.isOpen && reportModal.data && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm" onClick={() => setReportModal({ isOpen: false, data: null })}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-x-auto overflow-y-hidden flex flex-col transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()} style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            
            <div ref={reportRef} className="flex flex-col bg-white min-w-[896px]">
              {/* Header */}
              <div className="bg-slate-800 p-5 flex items-center justify-between relative overflow-hidden shrink-0">
                 <div className="flex items-center gap-3 relative z-10">
                   <FileText className="w-6 h-6 text-emerald-400" />
                   <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Monthly Attendance Report</h2>
                 </div>
                 <button onClick={() => setReportModal({ isOpen: false, data: null })} className="close-modal-btn text-slate-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2 z-20">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[85vh] bg-slate-50 flex flex-col gap-6">
              
                {/* Employee Info Header */}
                <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {reportModal.data.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{reportModal.data.name}</h2>
                      <p className="text-[13px] text-slate-500 font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-slate-200">
                  
                  {/* Score */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-emerald-500" strokeDasharray={`${reportModal.data.avgScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-slate-800">{reportModal.data.avgScore}</span>
                        <span className="text-[10px] font-bold text-slate-400">/100</span>
                      </div>
                    </div>
                    <div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold w-fit mb-2 border ${reportModal.data.avgScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : reportModal.data.avgScore >= 50 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> {reportModal.data.avgScore >= 80 ? 'Good performance' : reportModal.data.avgScore >= 50 ? 'Average performance' : 'Needs improvement'}
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Score</p>
                      <p className="text-xl font-bold text-slate-800"><span className="text-2xl font-bold">{reportModal.data.avgScore}</span><span className="text-slate-400 text-sm">/100</span></p>
                    </div>
                  </div>

                  {/* Login Hours / Average Hours */}
                  <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Average Hrs / Day</p>
                    <p className="text-[15px] font-bold text-slate-800">{reportModal.data.avgHours}h</p>
                  </div>

                  {/* Absents */}
                  <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
                    <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Absents / Leaves</p>
                    <p className={`text-[15px] font-bold ${(reportModal.data.absentDays > 0 || reportModal.data.leaveDays > 0) ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {reportModal.data.absentDays} Absents, {reportModal.data.leaveDays} Leaves
                    </p>
                  </div>

                </div>

                {/* Month at a glance */}
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex flex-row items-center justify-between gap-3 mb-4">
                    <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2 shrink-0">
                      <Calendar className="w-4 h-4 text-slate-400" /> Month at a glance
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Present</span>
                      <span className="text-[13px] font-black text-emerald-600">{reportModal.data.presentDays} Days</span>
                      <span className="text-[10px] text-emerald-500 font-bold bg-emerald-100/50 px-1.5 rounded-full">{Math.round((reportModal.data.presentDays / Math.max(1, reportModal.data.workingDaysPassed)) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hrs</span>
                      <span className="text-[13px] font-black text-blue-600">{reportModal.data.totalHours}h / {reportModal.data.expectedHours}h</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WFH</span>
                      <span className="text-[13px] font-black text-indigo-600">{reportModal.data.wfhDays} Days</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-50 border border-fuchsia-100 rounded-full">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Field</span>
                      <span className="text-[13px] font-black text-fuchsia-600">{reportModal.data.fieldDays} Days</span>
                    </div>
                    {parseFloat(reportModal.data.totalHours) > parseFloat(reportModal.data.expectedHours) && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-full">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Extra</span>
                        <span className="text-[13px] font-black text-purple-600">
                          +{(parseFloat(reportModal.data.totalHours) - parseFloat(reportModal.data.expectedHours)).toFixed(1)}h
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Days Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" /> Days breakdown
                    </h3>
                    <span className="text-[11px] text-slate-500">Working days passed: <span className="font-bold text-slate-800">{reportModal.data.workingDaysPassed}</span></span>
                  </div>
                  
                  <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden mb-4">
                    {(() => {
                      const officeDays = reportModal.data.presentDays - reportModal.data.wfhDays - reportModal.data.fieldDays;
                      const wd = Math.max(1, reportModal.data.workingDaysPassed);
                      const officePct = Math.max(0, (officeDays / wd) * 100);
                      const wfhPct = (reportModal.data.wfhDays / wd) * 100;
                      const fieldPct = (reportModal.data.fieldDays / wd) * 100;
                      const leavePct = (reportModal.data.leaveDays / wd) * 100;
                      const absentPct = (reportModal.data.absentDays / wd) * 100;
                      return (
                        <>
                          <div className="h-full bg-emerald-400" style={{ width: `${officePct}%` }}></div>
                          <div className="h-full bg-indigo-400" style={{ width: `${wfhPct}%` }}></div>
                          <div className="h-full bg-fuchsia-400" style={{ width: `${fieldPct}%` }}></div>
                          <div className="h-full bg-amber-400" style={{ width: `${leavePct}%` }}></div>
                          <div className="h-full bg-rose-500" style={{ width: `${absentPct}%` }}></div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                     <div className="flex flex-col">
                       <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Office</span>
                       <span className="text-[13px] font-bold text-slate-800 ml-4">{Math.max(0, reportModal.data.presentDays - reportModal.data.wfhDays - reportModal.data.fieldDays)} days</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> WFH</span>
                       <span className="text-[13px] font-bold text-slate-800 ml-4">{reportModal.data.wfhDays} days</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400"></span> Field</span>
                       <span className="text-[13px] font-bold text-slate-800 ml-4">{reportModal.data.fieldDays} days</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Leave</span>
                       <span className="text-[13px] font-bold text-slate-800 ml-4">{reportModal.data.leaveDays} days</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Absent</span>
                       <span className="text-[13px] font-bold text-slate-800 ml-4">{reportModal.data.absentDays} days</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Not included in image) */}
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setReportModal({ isOpen: false, data: null })} className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-[13px] font-bold transition-colors">
                Cancel
              </button>
              <button onClick={downloadReport} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold shadow-lg transition-colors">
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
