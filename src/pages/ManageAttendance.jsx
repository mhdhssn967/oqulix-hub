import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, setDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Calendar, Clock, Plus, X, UserCheck, Loader2, Search, CheckCircle2, Coffee, Utensils, Play, LogOut, Building2, Home, MapPin, MoreHorizontal, CalendarMinus, BarChart2, Pencil } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

function TimePicker12Hour({ value, onChange }) {
  let initialHour = '';
  let initialMinute = '';
  let initialAmpm = 'AM';
  
  if (value) {
    const [h, m] = value.split(':');
    let hr = parseInt(h, 10);
    initialMinute = m;
    if (hr >= 12) {
      initialAmpm = 'PM';
      if (hr > 12) hr -= 12;
    } else {
      initialAmpm = 'AM';
      if (hr === 0) hr = 12;
    }
    initialHour = hr.toString().padStart(2, '0');
  }

  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [ampm, setAmpm] = useState(initialAmpm);

  useEffect(() => {
    if (value === '') {
      setHour('');
      setMinute('');
      setAmpm('AM');
    }
  }, [value]);

  const handleChange = (h, m, ap) => {
    if (!h || !m) {
      onChange('');
      return;
    }
    let hr = parseInt(h, 10);
    if (ap === 'PM' && hr < 12) hr += 12;
    if (ap === 'AM' && hr === 12) hr = 0;
    
    onChange(`${hr.toString().padStart(2, '0')}:${m.padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select 
        value={hour} 
        onChange={(e) => {
          setHour(e.target.value);
          handleChange(e.target.value, minute, ampm);
        }}
        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all flex-1 cursor-pointer"
      >
        <option value="">HH</option>
        {[...Array(12)].map((_, i) => (
          <option key={i+1} value={(i+1).toString().padStart(2, '0')}>
            {(i+1).toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-zinc-400 font-bold">:</span>
      <select 
        value={minute} 
        onChange={(e) => {
          setMinute(e.target.value);
          handleChange(hour, e.target.value, ampm);
        }}
        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all flex-1 cursor-pointer"
      >
        <option value="">MM</option>
        {[...Array(60)].map((_, i) => (
          <option key={i} value={i.toString().padStart(2, '0')}>
            {i.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <select 
        value={ampm} 
        onChange={(e) => {
          setAmpm(e.target.value);
          handleChange(hour, minute, e.target.value);
        }}
        className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all w-20 cursor-pointer"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export default function ManageAttendance() {
  const { user, companyId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  
  // Get today's date in YYYY-MM-DD
  const getTodayStr = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  };

  const getCurrentTimeStr = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakPrompt, setBreakPrompt] = useState({ isOpen: false, logId: null, type: '', reason: '', time: getCurrentTimeStr() });
  const [editLogPrompt, setEditLogPrompt] = useState({ isOpen: false, log: null, clockInTime: '', clockOutTime: '', workType: '' });

  const getTimeStrFromDate = (d) => {
    if (!d) return '';
    const dateObj = d.toDate ? d.toDate() : new Date(d);
    return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { log, clockInTime, clockOutTime, workType } = editLogPrompt;
      let updateData = { workType };
      
      const [year, month, day] = log.date.split('-');
      
      if (clockInTime) {
        const [h, m] = clockInTime.split(':');
        updateData.clockedInAt = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(h, 10), parseInt(m, 10), 0);
      }
      
      if (clockOutTime) {
        const [h, m] = clockOutTime.split(':');
        updateData.clockedOutAt = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(h, 10), parseInt(m, 10), 0);
      }

      await setDoc(doc(db, `userData/${companyId}/attendanceLogs`, log.id), updateData, { merge: true });
      
      Swal.fire({ title: 'Success', text: 'Attendance updated successfully.', icon: 'success', timer: 1500, showConfirmButton: false });
      setEditLogPrompt({ isOpen: false, log: null, clockInTime: '', clockOutTime: '', workType: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Failed to update attendance.', icon: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };
  const [clockInTime, setClockInTime] = useState('');

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState('');
  const [selectedLeaveEmployeeIds, setSelectedLeaveEmployeeIds] = useState([]);
  const [leaveReason, setLeaveReason] = useState('Sick Leave');

  const [activeTab, setActiveTab] = useState('attendance');
  const [hrRequests, setHrRequests] = useState([]);

  const fetchRequests = async () => {
    if (!companyId) return;
    try {
      const snap = await getDocs(collection(db, `userData/${companyId}/hrNotifications`));
      const reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      reqs.sort((a, b) => {
         const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
         const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
         return tB - tA;
      });
      setHrRequests(reqs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRequest = async (req) => {
    if (!companyId) return;
    try {
      const batch = writeBatch(db);
      
      const notifRef = doc(db, `userData/${companyId}/hrNotifications`, req.id);
      batch.set(notifRef, { status: 'Accepted' }, { merge: true });

      const docId = `${req.date}_${req.employeeId}`;
      const attRef = doc(db, `userData/${companyId}/attendanceLogs`, docId);

      if (req.type === 'Leave') {
        batch.set(attRef, {
          employeeId: req.employeeId,
          employeeName: req.employeeName,
          date: req.date,
          status: 'On Leave',
          leaveReason: req.reason
        }, { merge: true });
      } else {
        const [year, month, day] = req.date.split('-');
        const customDate = new Date();
        customDate.setFullYear(parseInt(year, 10));
        customDate.setMonth(parseInt(month, 10) - 1);
        customDate.setDate(parseInt(day, 10));
        customDate.setHours(9, 0, 0, 0); 

        batch.set(attRef, {
          employeeId: req.employeeId,
          employeeName: req.employeeName,
          date: req.date,
          clockedInAt: customDate,
          status: 'Present',
          workType: req.type,
          breaks: []
        }, { merge: true });
      }

      await batch.commit();
      Swal.fire({ title: 'Accepted', text: 'Request accepted and attendance updated.', icon: 'success', timer: 2000, showConfirmButton: false });
      fetchRequests();
      fetchData();
    } catch (error) {
      console.error("Error accepting request", error);
      Swal.fire('Error', 'Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (req) => {
    if (!companyId) return;
    const { value: reason } = await Swal.fire({
      title: 'Reject Request',
      input: 'text',
      inputLabel: 'Reason for Rejection',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) return 'You need to write something!';
      }
    });

    if (reason) {
      try {
        const notifRef = doc(db, `userData/${companyId}/hrNotifications`, req.id);
        await setDoc(notifRef, { status: 'Rejected', rejectReason: reason }, { merge: true });
        Swal.fire({ title: 'Rejected', text: 'Request has been rejected.', icon: 'success', timer: 2000, showConfirmButton: false });
        fetchRequests();
      } catch (error) {
        console.error("Error rejecting request", error);
        Swal.fire('Error', 'Failed to reject request', 'error');
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab, companyId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // 1. Fetch all employees
      const empSnap = await getDocs(collection(db, `userData/${companyId}/employees`));
      const emps = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(emps);

      // 2. Fetch attendance logs
      const attSnap = await getDocs(collection(db, `userData/${companyId}/attendanceLogs`));
      const allLogs = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter logs by selected date locally
      const dayLogs = allLogs.filter(log => log.date === selectedDate);
      setAttendanceLogs(dayLogs);

    } catch (err) {
      console.error("Error fetching attendance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, selectedDate]);

  const toggleEmployeeSelection = (id) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]
    );
  };

  const handleClockIn = async (workType = 'Office') => {
    if (!companyId || selectedEmployeeIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      selectedEmployeeIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        
        let finalClockInTime = serverTimestamp();
        if (clockInTime) {
          const [year, month, day] = selectedDate.split('-');
          const customDate = new Date();
          customDate.setFullYear(parseInt(year, 10));
          customDate.setMonth(parseInt(month, 10) - 1);
          customDate.setDate(parseInt(day, 10));
          
          const [hours, minutes] = clockInTime.split(':');
          customDate.setHours(parseInt(hours, 10));
          customDate.setMinutes(parseInt(minutes, 10));
          customDate.setSeconds(0);
          
          finalClockInTime = customDate;
        }
        
        const docId = `${selectedDate}_${empId}`;
        const ref = doc(db, `userData/${companyId}/attendanceLogs`, docId);
        
        batch.set(ref, {
          employeeId: empId,
          employeeName: emp.name,
          date: selectedDate,
          clockedInAt: finalClockInTime,
          status: 'Present',
          workType: workType,
          breaks: []
        }, { merge: true }); // merge in case they were already clocked in
      });
      
      await batch.commit();
      
      setIsModalOpen(false);
      setSelectedEmployeeIds([]);
      setSearchQuery('');
      setClockInTime('');
      fetchData(); // refresh the list
    } catch (err) {
      console.error("Error clocking in employees:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkLeave = async () => {
    if (!companyId || selectedLeaveEmployeeIds.length === 0 || !leaveReason.trim()) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      selectedLeaveEmployeeIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        
        const docId = `${selectedDate}_${empId}`;
        const ref = doc(db, `userData/${companyId}/attendanceLogs`, docId);
        
        batch.set(ref, {
          employeeId: empId,
          employeeName: emp.name,
          date: selectedDate,
          status: 'On Leave',
          leaveReason: leaveReason.trim()
        }, { merge: true });
      });
      
      await batch.commit();
      
      setIsLeaveModalOpen(false);
      setSelectedLeaveEmployeeIds([]);
      setLeaveSearchQuery('');
      setLeaveReason('Sick Leave');
      fetchData(); // refresh the list
    } catch (err) {
      console.error("Error marking leave:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (logId, actionType, customTimeStr = null) => {
    if (!companyId) return;
    try {
      const ref = doc(db, `userData/${companyId}/attendanceLogs`, logId);
      const log = attendanceLogs.find(l => l.id === logId);
      if (!log) return;

      let actionTime = new Date();
      if (customTimeStr) {
        const [year, month, day] = selectedDate.split('-');
        const [hours, minutes] = customTimeStr.split(':');
        actionTime = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hours, 10), parseInt(minutes, 10), 0);
      }

      if (actionType === 'Resume') {
        const currentBreaks = log.breaks || [];
        if (currentBreaks.length > 0) {
          currentBreaks[currentBreaks.length - 1].endTime = actionTime;
        }
        await setDoc(ref, {
          status: 'Present',
          breaks: currentBreaks
        }, { merge: true });
      } else if (actionType === 'ClockOut') {
        const currentBreaks = log.breaks || [];
        if (currentBreaks.length > 0 && !currentBreaks[currentBreaks.length - 1].endTime) {
          currentBreaks[currentBreaks.length - 1].endTime = actionTime;
        }
        await setDoc(ref, {
          status: 'Clocked Out',
          clockedOutAt: actionTime,
          breaks: currentBreaks
        }, { merge: true });
      } else {
        // Any other actionType is treated as a break type (e.g. 'Tea', 'Lunch', or custom)
        const newBreak = {
          type: actionType,
          startTime: actionTime,
          endTime: null
        };
        await setDoc(ref, {
          status: `On ${actionType}`,
          breaks: [...(log.breaks || []), newBreak]
        }, { merge: true });
      }
      
      fetchData(); // refresh
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Get IDs of employees already clocked in or on leave today
  const clockedInIds = attendanceLogs.map(log => log.employeeId);
  
  // Filter employees for clock in modal based on search and if not clocked in
  const availableEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const notClockedIn = !clockedInIds.includes(emp.id);
    return matchesSearch && notClockedIn;
  });

  // Filter employees for leave modal based on search and if not clocked in
  const availableLeaveEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(leaveSearchQuery.toLowerCase());
    const notClockedIn = !clockedInIds.includes(emp.id);
    return matchesSearch && notClockedIn;
  });

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Manage Attendance</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Track and clock in employee attendance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm cursor-pointer"
            />
          </div>
          <Link
            to="/attendance-analysis"
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-800 rounded-xl text-[14px] font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <BarChart2 className="w-4 h-4" />
            Analysis
          </Link>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-[14px] font-semibold hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <CalendarMinus className="w-4 h-4" />
            Mark Leave
          </button>
          <button
            onClick={() => {
              setClockInTime(getCurrentTimeStr());
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[14px] font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Clock In Employees
          </button>
        </div>
      </header>

      <div className="flex gap-6 mb-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'}`}
        >
          Live Attendance
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-black'}`}
        >
          Employee Requests
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : attendanceLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-[14px]">
            <UserCheck className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            No employees have clocked in on {selectedDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Employee Name</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Time (In - Out)</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Breaks</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Working Hours</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {attendanceLogs.map((log) => {
                  let timeStr = 'N/A';
                  let durationStr = '--';
                  if (log.clockedInAt) {
                    const clockedInDate = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
                    const clockInStr = clockedInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    let clockOutStr = 'Ongoing';
                    if (log.clockedOutAt) {
                      const clockedOutDate = log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt);
                      clockOutStr = clockedOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    
                    if (log.workType === 'Field') {
                      timeStr = clockInStr;
                    } else {
                      timeStr = `${clockInStr} - ${clockOutStr}`;
                    }
                    
                    const isToday = selectedDate === getTodayStr();
                    let endReferenceTime = currentTime;
                    
                    if (!isToday) {
                       if (log.clockedOutAt) {
                           endReferenceTime = log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt);
                       } else {
                           endReferenceTime = null; // No clock out recorded
                       }
                    } else if (log.status === 'Clocked Out' && log.clockedOutAt) {
                       endReferenceTime = log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt);
                    }
                    
                    if (endReferenceTime) {
                      let totalMs = endReferenceTime - clockedInDate;
                      
                      // Subtract completed breaks
                      const breaks = log.breaks || [];
                      let activeBreakStart = null;
                      
                      breaks.forEach(b => {
                        const sTime = b.startTime ? (b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime)) : null;
                        const eTime = b.endTime ? (b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime)) : null;
                        if (sTime) {
                          if (eTime) {
                            totalMs -= (eTime - sTime);
                          } else {
                            activeBreakStart = sTime;
                          }
                        }
                      });
                      
                      // Pause live clock during active break
                      if (activeBreakStart && log.status !== 'Clocked Out') {
                         totalMs -= (endReferenceTime - activeBreakStart);
                      }
                      
                      if (totalMs > 0) {
                        const hours = Math.floor(totalMs / (1000 * 60 * 60));
                        const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
                        const seconds = Math.floor((totalMs / 1000) % 60);
                        durationStr = `${hours}h ${minutes}m ${seconds}s`;
                      } else {
                        durationStr = '0h 0m 0s';
                      }
                    } else {
                      durationStr = 'Ongoing (No clock-out)';
                    }
                    
                    if (log.workType === 'Field') {
                      durationStr = 'N/A';
                    }
                  }

                  if (log.status === 'On Leave') {
                    timeStr = 'N/A';
                    durationStr = '0h 0m 0s';
                  }

                  let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (log.status === 'On Leave') {
                    statusColor = "bg-rose-50 text-rose-700 border-rose-100";
                  } else if (log.status.startsWith('On ')) {
                    statusColor = "bg-orange-50 text-orange-700 border-orange-100";
                  }
                  if (log.status === 'Clocked Out') statusColor = "bg-zinc-100 text-zinc-600 border-zinc-200";
                  
                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[12px]">
                            {log.employeeName ? log.employeeName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="text-[14px] font-semibold text-zinc-900">{log.employeeName}</span>
                        </div>
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
                        <div className="flex flex-col gap-1.5 items-start">
                          {(log.breaks || []).map((b, i) => {
                            const sTime = b.startTime ? (b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime)) : null;
                            const eTime = b.endTime ? (b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime)) : null;
                            
                            const sStr = sTime ? sTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '?';
                            const eStr = eTime ? eTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
                            
                            return (
                              <span key={i} className="text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-2 py-1 inline-flex whitespace-nowrap">
                                <strong className="text-zinc-700 mr-1">{b.type}:</strong> {sStr} - {eStr}
                              </span>
                            );
                          })}
                          {(!log.breaks || log.breaks.length === 0) && (
                            <span className="text-[12px] text-zinc-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium text-indigo-600 font-mono tracking-tight w-32">
                        {durationStr}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditLogPrompt({ isOpen: true, log, clockInTime: getTimeStrFromDate(log.clockedInAt), clockOutTime: getTimeStrFromDate(log.clockedOutAt), workType: log.workType || 'Office' })} className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Log">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {log.status === 'Present' && log.workType !== 'Field' && (
                            <>
                              <button onClick={() => setBreakPrompt({ isOpen: true, logId: log.id, type: 'Tea', reason: 'Tea Break', time: getCurrentTimeStr() })} className="p-1.5 text-zinc-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors" title="Tea Break">
                                <Coffee className="w-4 h-4" />
                              </button>
                              <button onClick={() => setBreakPrompt({ isOpen: true, logId: log.id, type: 'Lunch', reason: 'Lunch Break', time: getCurrentTimeStr() })} className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Lunch Break">
                                <Utensils className="w-4 h-4" />
                              </button>
                              <button onClick={() => setBreakPrompt({ isOpen: true, logId: log.id, type: 'Custom', reason: '', time: getCurrentTimeStr() })} className="p-1.5 text-zinc-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Other Break">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <button onClick={() => setBreakPrompt({ isOpen: true, logId: log.id, type: 'ClockOut', reason: 'Clock Out', time: getCurrentTimeStr() })} className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Clock Out">
                                <LogOut className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {log.status === 'Present' && log.workType === 'Field' && (
                            <span className="text-[12px] text-zinc-400 font-medium italic">On Field</span>
                          )}
                          {log.status.startsWith('On ') && (
                            <button onClick={() => handleAction(log.id, 'Resume')} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200">
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume Work
                            </button>
                          )}
                          {log.status === 'Clocked Out' && (
                            <span className="text-[12px] text-zinc-400 font-medium italic">Completed</span>
                          )}
                          {log.status === 'On Leave' && (
                            <span className="text-[12px] text-rose-600 font-medium italic px-2 py-1 bg-rose-50 rounded border border-rose-100">{log.leaveReason}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
          {hrRequests.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-[14px]">
              No employee requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-200/80">
                    <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Employee</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {hrRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-zinc-900">{req.employeeName?.includes('@') ? (req.employeeName === 'contact@oqulix.com' ? 'Admin' : req.employeeName.split('@')[0]) : req.employeeName}</span>
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
                      <td className="px-5 py-4 text-[13px] text-zinc-600 whitespace-nowrap">
                        {new Date(req.date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-zinc-600 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                          req.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                          req.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {req.status}
                        </span>
                        {req.rejectReason && (
                          <div className="text-[10px] text-rose-600 mt-1 max-w-[120px] truncate" title={req.rejectReason}>
                            Reason: {req.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {req.status === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleAcceptRequest(req)} className="px-3 py-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200">
                              Accept
                            </button>
                            <button onClick={() => handleRejectRequest(req)} className="px-3 py-1.5 text-[12px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors border border-rose-200">
                              Reject
                            </button>
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

      {/* Clock In Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
              <h2 className="text-[15px] font-semibold text-zinc-900">Clock In Employees</h2>
              <button type="button" onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-zinc-400 hover:text-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 shrink-0 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Clock In Time (Leave empty for current time)</label>
                <TimePicker12Hour 
                  value={clockInTime}
                  onChange={setClockInTime}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar bg-zinc-50/30">
              {availableEmployees.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-[13px]">
                  No available employees to clock in for {selectedDate}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableEmployees.map(emp => {
                    const isSelected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <div 
                        key={emp.id}
                        onClick={() => toggleEmployeeSelection(emp.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected 
                            ? 'border-black bg-black/5 ring-1 ring-black' 
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 transition-colors ${
                          isSelected ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-900 truncate">{emp.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{emp.position || 'Employee'}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-black border-black text-white' : 'border-zinc-300'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 shrink-0 border-t border-zinc-100 flex items-center justify-between bg-white">
              <span className="text-[13px] font-medium text-zinc-600">
                {selectedEmployeeIds.length} selected
              </span>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors mr-2"
                >
                  Cancel
                </button>
                <div className="flex gap-2 border-l border-zinc-200 pl-4">
                  <button
                    onClick={() => handleClockIn('WFH')}
                    disabled={isSubmitting || selectedEmployeeIds.length === 0}
                    className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Home className="w-4 h-4 text-zinc-500" />
                    WFH
                  </button>
                  <button
                    onClick={() => handleClockIn('Field')}
                    disabled={isSubmitting || selectedEmployeeIds.length === 0}
                    className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    Field
                  </button>
                  <button
                    onClick={() => handleClockIn('Office')}
                    disabled={isSubmitting || selectedEmployeeIds.length === 0}
                    className="py-2 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                    Office
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Break Confirmation Modal */}
      {breakPrompt.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBreakPrompt({ isOpen: false, logId: null, type: '', reason: '', time: '' })}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col p-5">
            <h3 className="text-[16px] font-semibold text-zinc-900 mb-2">
              {breakPrompt.type === 'Custom' ? 'Custom Break' : (breakPrompt.type === 'ClockOut' ? 'Clock Out' : `${breakPrompt.reason}`)}
            </h3>
            <p className="text-[13px] text-zinc-500 mb-4">
              Please confirm {breakPrompt.type === 'Custom' ? 'and enter the reason for' : ''} this {breakPrompt.type === 'ClockOut' ? 'action' : 'break'}.
            </p>
            
            {breakPrompt.type === 'Custom' && (
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Reason</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="e.g. Doctor Appointment"
                  value={breakPrompt.reason}
                  onChange={(e) => setBreakPrompt(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Start Time (Leave empty for current time)</label>
              <TimePicker12Hour 
                value={breakPrompt.time}
                onChange={(newTime) => setBreakPrompt(prev => ({ ...prev, time: newTime }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setBreakPrompt({ isOpen: false, logId: null, type: '', reason: '', time: '' })}
                className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={breakPrompt.type === 'Custom' && !breakPrompt.reason.trim()}
                onClick={() => {
                  const breakType = breakPrompt.type === 'Custom' ? breakPrompt.reason.trim() : breakPrompt.type;
                  handleAction(breakPrompt.logId, breakType, breakPrompt.time);
                  setBreakPrompt({ isOpen: false, logId: null, type: '', reason: '', time: '' });
                }}
                className={`py-2 px-4 text-[13px] font-semibold text-white ${breakPrompt.type === 'ClockOut' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-zinc-800'} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {breakPrompt.type === 'ClockOut' ? 'Confirm Clock Out' : 'Start Break'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsLeaveModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
              <h2 className="text-[15px] font-semibold text-zinc-900">Mark Employees on Leave</h2>
              <button type="button" onClick={() => !isSubmitting && setIsLeaveModalOpen(false)} className="text-zinc-400 hover:text-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 shrink-0 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Leave Reason</label>
                <input 
                  type="text"
                  placeholder="e.g. Sick Leave, Vacation, Personal"
                  list="leaveReasons"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
                <datalist id="leaveReasons">
                  <option value="Sick Leave" />
                  <option value="Casual Leave" />
                  <option value="Granted Leave" />
                  <option value="Vacation" />
                  <option value="Bereavement" />
                  <option value="Unpaid Leave" />
                </datalist>
              </div>

              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search employees to mark on leave..."
                  value={leaveSearchQuery}
                  onChange={(e) => setLeaveSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar bg-zinc-50/30">
              {availableLeaveEmployees.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-[13px]">
                  No available employees to mark on leave for {selectedDate}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableLeaveEmployees.map(emp => {
                    const isSelected = selectedLeaveEmployeeIds.includes(emp.id);
                    return (
                      <div 
                        key={emp.id}
                        onClick={() => setSelectedLeaveEmployeeIds(prev => 
                          prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        )}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected 
                            ? 'border-black bg-black/5 ring-1 ring-black' 
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 transition-colors ${
                          isSelected ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-900 truncate">{emp.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{emp.position || 'Employee'}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-black border-black text-white' : 'border-zinc-300'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 shrink-0 border-t border-zinc-100 flex items-center justify-between bg-white">
              <span className="text-[13px] font-medium text-zinc-600">
                {selectedLeaveEmployeeIds.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkLeave}
                  disabled={isSubmitting || selectedLeaveEmployeeIds.length === 0 || !leaveReason.trim()}
                  className="py-2 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarMinus className="w-4 h-4" />}
                  Confirm Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {editLogPrompt.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setEditLogPrompt({ isOpen: false, log: null, clockInTime: '', clockOutTime: '', workType: '' })}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <form onSubmit={handleEditSubmit}>
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
                <h2 className="text-[15px] font-semibold text-zinc-900">Edit Attendance</h2>
                <button type="button" onClick={() => !isSubmitting && setEditLogPrompt({ isOpen: false, log: null, clockInTime: '', clockOutTime: '', workType: '' })} className="text-zinc-400 hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 shrink-0 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Clock In Time</label>
                  <TimePicker12Hour 
                    value={editLogPrompt.clockInTime}
                    onChange={(val) => setEditLogPrompt(p => ({ ...p, clockInTime: val }))}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Clock Out Time</label>
                  <TimePicker12Hour 
                    value={editLogPrompt.clockOutTime}
                    onChange={(val) => setEditLogPrompt(p => ({ ...p, clockOutTime: val }))}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-700 mb-1.5">Work Type</label>
                  <select
                    value={editLogPrompt.workType}
                    onChange={(e) => setEditLogPrompt(p => ({ ...p, workType: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all cursor-pointer"
                  >
                    <option value="Office">Office</option>
                    <option value="WFH">WFH</option>
                    <option value="Field">Field</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 p-4 bg-white">
                <button 
                  type="button"
                  onClick={() => setEditLogPrompt({ isOpen: false, log: null, clockInTime: '', clockOutTime: '', workType: '' })}
                  className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
