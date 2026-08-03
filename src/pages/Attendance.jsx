import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Calendar, Clock, Loader2, CheckCircle2, Coffee, LogOut, CalendarMinus } from 'lucide-react';

export default function Attendance() {
  const { user, companyId } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, companyId, user]);

  const calculateWorkingDuration = (log) => {
    if (log.status === 'On Leave') return '0h 0m';
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

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">My Attendance</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">View your monthly attendance history.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 border border-zinc-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black transition-all">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-[14px] font-medium text-zinc-800 bg-transparent outline-none cursor-pointer"
          />
        </div>
      </header>

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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Work Type</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Clock Out</th>
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

                  let clockInStr = '-';
                  if (log.clockedInAt && log.status !== 'On Leave') {
                    const d = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
                    clockInStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }
                  
                  let clockOutStr = '-';
                  if (log.clockedOutAt && log.status !== 'On Leave') {
                    const d = log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt);
                    clockOutStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-medium text-zinc-700">{clockInStr}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-medium text-zinc-700">{clockOutStr}</span>
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
        )}
      </div>
    </div>
  );
}
