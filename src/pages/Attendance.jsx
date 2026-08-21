import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import RequestModal from '../components/RequestModal';
import { useAuthStore } from '../store/authStore';
import { Calendar, Clock, Loader2, CheckCircle2, Coffee, LogOut, CalendarMinus, Plus, Briefcase } from 'lucide-react';

export default function Attendance() {
  const { user, companyId } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [myRequests, setMyRequests] = useState([]);
  const [customHolidays, setCustomHolidays] = useState({});

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!companyId) return;
      try {
        const holidaysRef = doc(db, 'userData', companyId, 'settings', 'holidays');
        const holidaysSnap = await getDoc(holidaysRef);
        if (holidaysSnap.exists() && holidaysSnap.data().dates) {
          setCustomHolidays(holidaysSnap.data().dates);
        }
      } catch (err) {
        console.error("Error fetching holidays:", err);
      }
    };
    fetchHolidays();
  }, [companyId]);

  const fetchAttendance = async () => {
    if (!companyId || !user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, `userData/${companyId}/attendanceLogs`),
        where('employeeId', '==', user.uid)
      );
      
      const snap = await getDocs(q);
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(log => log.date.startsWith(selectedMonth));
      
      data.sort((a, b) => b.date.localeCompare(a.date));
      setLogs(data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!companyId || !user) return;
    try {
      const q = query(
        collection(db, `userData/${companyId}/hrNotifications`),
        where('employeeId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(req => req.date.startsWith(selectedMonth));
      
      data.sort((a, b) => b.date.localeCompare(a.date));
      setMyRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchRequests();
  }, [selectedMonth, companyId, user]);

  const calculateWorkingDuration = (log) => {
    if (log.status === 'On Leave') return '0h 0m';
    if (log.workType === 'Field') return 'N/A';
    if (!log.clockedInAt) return '-';

    let totalMs = 0;
    const clockInTime = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
    const clockOutTime = log.clockedOutAt ? (log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt)) : new Date();

    totalMs = clockOutTime.getTime() - clockInTime.getTime();

    if (log.breaks && Array.isArray(log.breaks)) {
      log.breaks.forEach(b => {
        if (b.startTime) {
          const bStart = b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime);
          const bEnd = b.endTime ? (b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime)) : new Date();
          totalMs -= (bEnd.getTime() - bStart.getTime());
        }
      });
    }

    if (totalMs < 0) totalMs = 0;
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${totalHours}h ${totalMinutes}m`;
  };

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

  const extraDaysCount = logs.filter(log => {
    if (log.status === 'On Leave') return false;
    if (!log.date) return false;
    const [y, m, d] = log.date.split('-');
    return isLeaveDay(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }).length;

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">My Attendance</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">View your monthly attendance history.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button onClick={() => setIsRequestModalOpen(true)} className="py-2 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Submit Request
          </button>
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-zinc-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black transition-all">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-[14px] font-medium text-zinc-800 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>
      </header>

      <div className="flex gap-6 mb-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black hover:border-zinc-300'}`}
        >
          My Attendance
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black hover:border-zinc-300'}`}
        >
          My Requests
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-[14px]">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            No attendance records found for {new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
          </div>
        ) : (
          <div className="flex flex-col">
            {extraDaysCount > 0 && (
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-cyan-50/50">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-600" />
                  <span className="text-[13px] font-semibold text-cyan-900">Extra Days Worked (Holidays/Weekends)</span>
                </div>
                <div className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-[12px] font-bold">
                  {extraDaysCount} {extraDaysCount === 1 ? 'day' : 'days'}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Work Type</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Time (In - Out)</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Working Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.map((log) => {
                  let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (log.status === 'On Leave') {
                    statusColor = "bg-rose-50 text-rose-700 border-rose-100";
                  } else if (log.status.startsWith('On ')) {
                    statusColor = "bg-orange-50 text-orange-700 border-orange-100";
                  }
                  if (log.status === 'Clocked Out') statusColor = "bg-zinc-100 text-zinc-600 border-zinc-200";

                  let timeStr = 'N/A';
                  if (log.status !== 'On Leave') {
                    let inStr = '-';
                    if (log.clockedInAt) {
                      const dIn = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
                      inStr = dIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    
                    if (log.workType === 'Field') {
                      timeStr = inStr;
                    } else {
                      let outStr = 'Ongoing';
                      if (log.clockedOutAt) {
                        const dOut = log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt);
                        outStr = dOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                      
                      timeStr = `${inStr} - ${outStr}`;
                    }
                  }

                  const [y, m, d] = log.date.split('-');
                  const localDate = new Date(y, m - 1, d);
                  let displayDate = localDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-zinc-900">{displayDate}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-medium text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md">
                          {log.status === 'On Leave' ? 'N/A' : (log.workType || 'Office')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border ${statusColor}`}>
                          {log.status === 'Clocked Out' ? <LogOut className="w-3.5 h-3.5" /> : (log.status === 'On Leave' ? <CalendarMinus className="w-3.5 h-3.5" /> : (log.status.startsWith('On ') ? <Coffee className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />))}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium text-zinc-600">
                        {timeStr}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-zinc-900">{calculateWorkingDuration(log)}</span>
                        {log.status === 'On Leave' && (
                          <div className="text-[11px] text-rose-500 mt-1 italic font-medium">{log.leaveReason}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
          {myRequests.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-[14px]">
              No requests found for {new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-100">
                    <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4 text-[13px] text-zinc-800 whitespace-nowrap">
                        {new Date(req.date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                          req.type === 'Leave' ? 'bg-rose-50 text-rose-700' :
                          req.type === 'WFH' ? 'bg-indigo-50 text-indigo-700' :
                          'bg-fuchsia-50 text-fuchsia-700'
                        }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-zinc-600 max-w-sm truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium border ${
                          req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {req.status}
                        </span>
                        {req.rejectReason && (
                          <div className="text-[11px] text-rose-600 mt-1 max-w-[200px] truncate" title={req.rejectReason}>
                            Reason: {req.rejectReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      <RequestModal isOpen={isRequestModalOpen} onClose={() => {
        setIsRequestModalOpen(false);
        fetchRequests(); // refresh when modal closes
      }} />
    </div>
  );
}
