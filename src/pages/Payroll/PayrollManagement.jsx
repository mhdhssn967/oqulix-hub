import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, setDoc, doc, getDoc, serverTimestamp, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { Receipt, Search, Download, DollarSign, Plus, X, Loader2, ArrowRight, IndianRupee, TrendingUp } from 'lucide-react';
import Swal from 'sweetalert2';
import { generatePayslipPDF } from './PayslipGenerator';

export default function PayrollManagement() {
  const { companyId } = useAuthStore();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [payrollLogs, setPayrollLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [selectedMonthForExpected, setSelectedMonthForExpected] = useState(`${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`);
  
  // Modals
  const [processSalaryPrompt, setProcessSalaryPrompt] = useState({ isOpen: false, employee: null });
  const [processAllPrompt, setProcessAllPrompt] = useState({ isOpen: false, data: {} });
  
  // Form State
  const [formData, setFormData] = useState({
    month: '',
    baseSalary: 0,
    bonus: 0,
    incentives: 0,
    deductions: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculationDetails, setCalculationDetails] = useState(null);

  const handleMonthChange = async (monthStr) => {
    setFormData(p => ({ ...p, month: monthStr }));
    if (!monthStr || !processSalaryPrompt.employee || !companyId) {
      setCalculationDetails(null);
      return;
    }
    
    setCalculationDetails({ loading: true });
    
    try {
      const [yearStr, monthStrPart] = monthStr.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStrPart, 10);
      
      const holidaysRef = doc(db, 'userData', companyId, 'settings', 'holidays');
      const holidaysSnap = await getDoc(holidaysRef);
      const customHolidays = holidaysSnap.exists() && holidaysSnap.data().dates ? holidaysSnap.data().dates : {};
      
      const isLeaveDay = (y, m, d) => {
        const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (customHolidays[dStr]) return true;
        const date = new Date(y, m, d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) return true;
        if (dayOfWeek === 6) {
          const weekNumber = Math.ceil(d / 7);
          if (weekNumber === 2 || weekNumber === 4) return true;
        }
        return false;
      };
      
      const daysInMonth = new Date(year, month, 0).getDate();
      let offDays = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        if (isLeaveDay(year, month - 1, i)) {
          offDays++;
        }
      }
      
      const workingDays = daysInMonth - offDays;
      const expectedHours = workingDays * 6.5;
      
      const attQ = query(
        collection(db, `userData/${companyId}/attendanceLogs`),
        where('employeeId', '==', processSalaryPrompt.employee.id)
      );
      const attSnap = await getDocs(attQ);
      
      let totalMinutesWorked = 0;
      let fieldDays = 0;
      
      attSnap.docs.forEach(d => {
        const log = d.data();
        if (log.date && log.date.startsWith(monthStr) && log.status !== 'On Leave') {
          if (log.workType === 'Field') {
            fieldDays++;
          } else if (log.clockedInAt) {
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
            if (ms > 0) totalMinutesWorked += Math.floor(ms / 60000);
          }
        }
      });
      
      const actualHours = (totalMinutesWorked / 60) + (fieldDays * 6.5);
      const fullSalary = processSalaryPrompt.employee.salary || 0;
      let calculatedSalary = fullSalary;
      
      if (expectedHours > 0) {
        calculatedSalary = (fullSalary / expectedHours) * actualHours;
        if (calculatedSalary > fullSalary) calculatedSalary = fullSalary;
      }
      
      setFormData(p => ({ ...p, baseSalary: Math.round(calculatedSalary) }));
      setCalculationDetails({
        loading: false,
        actualHours: actualHours.toFixed(1),
        expectedHours: expectedHours.toFixed(1),
        originalSalary: fullSalary
      });
      
    } catch (err) {
      console.error("Error calculating expected salary:", err);
      setCalculationDetails({ loading: false, error: true });
    }
  };

  const [currentMonthExpected, setCurrentMonthExpected] = useState({});

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, `userData/${companyId}/employees`));
      const emps = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(emps);

      const logsSnap = await getDocs(query(collection(db, `userData/${companyId}/payrollLogs`), orderBy('processedDate', 'desc')));
      const logs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayrollLogs(logs);

      const [yearStr, monthStrPart] = selectedMonthForExpected.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStrPart, 10) - 1;
      const monthStr = selectedMonthForExpected;
      
      const holidaysRef = doc(db, 'userData', companyId, 'settings', 'holidays');
      const holidaysSnap = await getDoc(holidaysRef);
      const customHolidays = holidaysSnap.exists() && holidaysSnap.data().dates ? holidaysSnap.data().dates : {};
      
      const isLeaveDay = (y, m, d) => {
        const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (customHolidays[dStr]) return true;
        const date = new Date(y, m, d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) return true;
        if (dayOfWeek === 6) {
          const weekNumber = Math.ceil(d / 7);
          if (weekNumber === 2 || weekNumber === 4) return true;
        }
        return false;
      };
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let offDays = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        if (isLeaveDay(year, month, i)) {
          offDays++;
        }
      }
      
      const expectedHours = (daysInMonth - offDays) * 6.5;
      
      const attQ = query(collection(db, `userData/${companyId}/attendanceLogs`));
      const attSnap = await getDocs(attQ);
      
      const empStats = {};
      attSnap.docs.forEach(d => {
        const log = d.data();
        if (log.date && log.date.startsWith(monthStr) && log.status !== 'On Leave') {
          const eId = log.employeeId;
          if (!empStats[eId]) empStats[eId] = { totalMinutesWorked: 0, fieldDays: 0 };
          
          if (log.workType === 'Field') {
            empStats[eId].fieldDays++;
          } else if (log.clockedInAt) {
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
            if (ms > 0) empStats[eId].totalMinutesWorked += Math.floor(ms / 60000);
          }
        }
      });
      
      const currentMonthExp = {};
      emps.forEach(emp => {
        const stats = empStats[emp.id] || { totalMinutesWorked: 0, fieldDays: 0 };
        const actualHours = (stats.totalMinutesWorked / 60) + (stats.fieldDays * 6.5);
        const fullSalary = emp.salary || 0;
        let calculated = fullSalary;
        if (expectedHours > 0) {
          calculated = (fullSalary / expectedHours) * actualHours;
        }
        currentMonthExp[emp.id] = Math.round(calculated);
      });
      
      setCurrentMonthExpected(currentMonthExp);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, selectedMonthForExpected]);

  const handleProcessSalary = async (e) => {
    e.preventDefault();
    if (!formData.month) {
      Swal.fire('Error', 'Please select a month', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const netSalary = Number(formData.baseSalary) + Number(formData.bonus) + Number(formData.incentives) - Number(formData.deductions);
      
      const newLog = {
        employeeId: processSalaryPrompt.employee.id,
        employeeName: processSalaryPrompt.employee.name,
        role: processSalaryPrompt.employee.position || 'Employee',
        month: formData.month,
        baseSalary: Number(formData.baseSalary),
        bonus: Number(formData.bonus),
        incentives: Number(formData.incentives),
        deductions: Number(formData.deductions),
        netSalary,
        status: 'Paid',
        processedDate: serverTimestamp()
      };

      const docRef = doc(collection(db, `userData/${companyId}/payrollLogs`));
      await setDoc(docRef, newLog);

      Swal.fire({ title: 'Success', text: 'Salary processed successfully.', icon: 'success', timer: 1500, showConfirmButton: false });
      setProcessSalaryPrompt({ isOpen: false, employee: null });
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to process salary.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessAllSalary = () => {
    if (!selectedMonthForExpected) {
      Swal.fire('Error', 'Please select a month first.', 'error');
      return;
    }

    const activeEmployees = employees.filter(e => e.isActive !== false);
    if (activeEmployees.length === 0) {
      Swal.fire('Info', 'No active employees to process.', 'info');
      return;
    }
    
    const initialData = {};
    activeEmployees.forEach(emp => {
      initialData[emp.id] = currentMonthExpected[emp.id] || 0;
    });

    setProcessAllPrompt({ isOpen: true, data: initialData });
  };

  const confirmProcessAllSalary = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const activeEmployees = employees.filter(emp => emp.isActive !== false);
      const batch = writeBatch(db);
      let count = 0;

      activeEmployees.forEach(emp => {
        const finalSalary = Number(processAllPrompt.data[emp.id]) || 0;
        
        const newLog = {
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.position || 'Employee',
          month: selectedMonthForExpected,
          baseSalary: finalSalary,
          bonus: 0,
          incentives: 0,
          deductions: 0,
          netSalary: finalSalary,
          status: 'Paid',
          processedDate: serverTimestamp()
        };

        const docRef = doc(collection(db, `userData/${companyId}/payrollLogs`));
        batch.set(docRef, newLog);
        count++;
      });

      await batch.commit();

      Swal.fire('Success', `Successfully processed salaries for ${count} employees.`, 'success');
      setProcessAllPrompt({ isOpen: false, data: {} });
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to process all salaries.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats calculation
  const getEmployeeStats = (empId) => {
    const logs = payrollLogs.filter(l => l.employeeId === empId);
    const totalPaid = logs.reduce((sum, l) => sum + (l.netSalary || 0), 0);
    const totalBonus = logs.reduce((sum, l) => sum + (l.bonus || 0), 0);
    const totalIncentives = logs.reduce((sum, l) => sum + (l.incentives || 0), 0);
    return { totalPaid, totalBonus, totalIncentives };
  };

  const totalCompanyPaid = payrollLogs.reduce((sum, l) => sum + (l.netSalary || 0), 0);
  const totalCompanySalary = payrollLogs.reduce((sum, l) => sum + (l.baseSalary || 0), 0);
  const totalCompanyBonus = payrollLogs.reduce((sum, l) => sum + (l.bonus || 0), 0);
  const totalCompanyIncentives = payrollLogs.reduce((sum, l) => sum + (l.incentives || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Payroll Management</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5 mb-4">Process salaries and view payroll history for all employees.</p>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-zinc-900 text-white rounded-full text-[12px] font-semibold flex items-center gap-1.5 whitespace-nowrap shadow-sm">
              <IndianRupee className="w-3.5 h-3.5 opacity-80" /> Total Disbursed: ₹{totalCompanyPaid.toLocaleString()}
            </div>
            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[12px] font-semibold border border-blue-100 flex items-center gap-1.5 whitespace-nowrap">
              <Receipt className="w-3.5 h-3.5" /> Base Salaries: ₹{totalCompanySalary.toLocaleString()}
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[12px] font-semibold border border-emerald-100 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5" /> Bonuses: ₹{totalCompanyBonus.toLocaleString()}
            </div>
            <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-[12px] font-semibold border border-purple-100 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5" /> Incentives: ₹{totalCompanyIncentives.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center shrink-0">
          <button 
            onClick={handleProcessAllSalary}
            disabled={isSubmitting}
            className="bg-black hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-medium text-[13px] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Process All Salaries
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[13px] font-semibold text-zinc-600">Expected Salary Month:</label>
            <input
              type="month"
              value={selectedMonthForExpected}
              onChange={(e) => setSelectedMonthForExpected(e.target.value)}
              className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-8 p-4">
            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <div className="px-5 py-3 bg-zinc-50/80 border-b border-zinc-200 font-semibold text-[14px] text-zinc-800">
                Active Employees
              </div>
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Standard Base Salary</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-blue-600 uppercase tracking-wider text-right bg-blue-50/50">
                    Expected ({new Date(parseInt(selectedMonthForExpected.split('-')[0]), parseInt(selectedMonthForExpected.split('-')[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })})
                  </th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Paid (All Time)</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Bonus</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Incentives</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredEmployees.filter(emp => emp.isActive !== false).map(emp => {
                  const stats = getEmployeeStats(emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[12px]">
                          {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-zinc-900">{emp.name}</span>
                          {emp.isActive === false && (
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Inactive</span>
                          )}
                        </div>
                      </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-zinc-600 font-medium">
                        {emp.position || 'Employee'}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-medium text-zinc-900 text-right">
                        ₹{(emp.salary || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-bold text-blue-700 text-right bg-blue-50/50">
                        ₹{(currentMonthExpected[emp.id] || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-semibold text-emerald-600 text-right">
                        ₹{stats.totalPaid.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium text-emerald-600 text-right">
                        ₹{stats.totalBonus.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium text-purple-600 text-right">
                        ₹{stats.totalIncentives.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setFormData({ month: '', baseSalary: emp.salary || 0, bonus: 0, incentives: 0, deductions: 0 });
                              setCalculationDetails(null);
                              setProcessSalaryPrompt({ isOpen: true, employee: emp });
                            }}
                            className="px-3 py-1.5 bg-black text-white text-[12px] font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                          >
                            Process Salary
                          </button>
                          <button
                            onClick={() => navigate(`/payroll-management/${emp.id}`)}
                            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-[12px] font-semibold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                          >
                            Records <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>

            {filteredEmployees.filter(emp => emp.isActive === false).length > 0 && (
              <div className="overflow-x-auto border border-zinc-200 rounded-xl opacity-75 hover:opacity-100 transition-opacity">
                <div className="px-5 py-3 bg-zinc-50/80 border-b border-zinc-200 font-semibold text-[14px] text-zinc-800">
                  Inactive Employees
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Standard Base Salary</th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-blue-600 uppercase tracking-wider text-right bg-blue-50/50">
                        Expected ({new Date(parseInt(selectedMonthForExpected.split('-')[0]), parseInt(selectedMonthForExpected.split('-')[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })})
                      </th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Paid (All Time)</th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Bonus</th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Incentives</th>
                      <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredEmployees.filter(emp => emp.isActive === false).map(emp => {
                      const stats = getEmployeeStats(emp.id);
                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors bg-zinc-50/30">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center font-bold text-[12px]">
                              {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold text-zinc-600">{emp.name}</span>
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Inactive</span>
                            </div>
                          </div>
                          </td>
                          <td className="px-5 py-4 text-[13px] text-zinc-500 font-medium">
                            {emp.position || 'Employee'}
                          </td>
                          <td className="px-5 py-4 text-[14px] font-medium text-zinc-500 text-right">
                            ₹{(emp.salary || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-[14px] font-bold text-blue-600/70 text-right bg-blue-50/30">
                            ₹{(currentMonthExpected[emp.id] || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-[14px] font-semibold text-emerald-600/70 text-right">
                            ₹{stats.totalPaid.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-[13px] font-medium text-emerald-600/70 text-right">
                            ₹{stats.totalBonus.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-[13px] font-medium text-purple-600/70 text-right">
                            ₹{stats.totalIncentives.toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setFormData({ month: '', baseSalary: emp.salary || 0, bonus: 0, incentives: 0, deductions: 0 });
                                  setCalculationDetails(null);
                                  setProcessSalaryPrompt({ isOpen: true, employee: emp });
                                }}
                                className="px-3 py-1.5 bg-black/80 text-white text-[12px] font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                              >
                                Process Salary
                              </button>
                              <button
                                onClick={() => navigate(`/payroll-management/${emp.id}`)}
                                className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-[12px] font-semibold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                              >
                                Records <ArrowRight className="w-3.5 h-3.5" />
                              </button>
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
        )}
      </div>

      {/* Process All Salary Modal */}
      {processAllPrompt.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setProcessAllPrompt({ isOpen: false, data: {} })}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={confirmProcessAllSalary} className="flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
                <div>
                  <h2 className="text-[15px] font-semibold text-zinc-900">Process All Salaries</h2>
                  <p className="text-[12px] text-zinc-500 mt-1">
                    Month: {new Date(parseInt(selectedMonthForExpected.split('-')[0]), parseInt(selectedMonthForExpected.split('-')[1]) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button type="button" onClick={() => !isSubmitting && setProcessAllPrompt({ isOpen: false, data: {} })} className="text-zinc-400 hover:text-black transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto custom-scrollbar bg-zinc-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employees.filter(e => e.isActive !== false).map(emp => (
                    <div key={emp.id} className="bg-white border border-zinc-200/80 rounded-xl p-3 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-zinc-300 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[12px] shrink-0 border border-zinc-200/50">
                          {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[13px] font-semibold text-zinc-900 truncate">{emp.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-zinc-500 truncate">{emp.position || 'Employee'}</span>
                            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium border border-zinc-200/60">
                              Base: ₹{(emp.salary || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IndianRupee className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <input 
                          type="number"
                          min="0"
                          required
                          value={processAllPrompt.data[emp.id] !== undefined ? processAllPrompt.data[emp.id] : ''}
                          onChange={(e) => setProcessAllPrompt(prev => ({
                            ...prev,
                            data: { ...prev.data, [emp.id]: e.target.value }
                          }))}
                          className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[14px] font-bold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-zinc-100 bg-white shrink-0">
                <button 
                  type="button"
                  onClick={() => setProcessAllPrompt({ isOpen: false, data: {} })}
                  className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-6 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Confirm & Process All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Salary Modal */}
      {processSalaryPrompt.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setProcessSalaryPrompt({ isOpen: false, employee: null })}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleProcessSalary} className="flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
                <h2 className="text-[15px] font-semibold text-zinc-900">Process Salary - {processSalaryPrompt.employee?.name}</h2>
                <button type="button" onClick={() => !isSubmitting && setProcessSalaryPrompt({ isOpen: false, employee: null })} className="text-zinc-400 hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto custom-scrollbar bg-zinc-50/50 flex flex-col gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-zinc-700 mb-1.5 uppercase tracking-wide">Month & Year</label>
                  <input 
                    type="month"
                    required
                    value={formData.month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-zinc-700 mb-1.5 uppercase tracking-wide">Base Salary (₹)</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData(p => ({ ...p, baseSalary: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    />
                    {calculationDetails?.loading ? (
                      <p className="mt-1.5 text-[11px] text-zinc-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Calculating hours...</p>
                    ) : calculationDetails && !calculationDetails.error ? (
                      <p className="mt-1.5 text-[10px] text-zinc-500 leading-tight">
                        Calculated from <span className="font-semibold text-zinc-700">{calculationDetails.actualHours}</span> / {calculationDetails.expectedHours} worked hours. (Standard: ₹{calculationDetails.originalSalary?.toLocaleString()})
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-zinc-700 mb-1.5 uppercase tracking-wide">Bonus (₹)</label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.bonus}
                      onChange={(e) => setFormData(p => ({ ...p, bonus: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-zinc-700 mb-1.5 uppercase tracking-wide">Incentives (₹)</label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.incentives}
                      onChange={(e) => setFormData(p => ({ ...p, incentives: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-red-600 mb-1.5 uppercase tracking-wide">Deductions (₹)</label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.deductions}
                      onChange={(e) => setFormData(p => ({ ...p, deductions: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="mt-2 p-4 bg-black text-white rounded-xl flex items-center justify-between">
                  <span className="text-[14px] font-bold uppercase tracking-wider text-zinc-400">Net Salary</span>
                  <span className="text-[20px] font-bold text-emerald-400">
                    ₹{(Number(formData.baseSalary) + Number(formData.bonus) + Number(formData.incentives) - Number(formData.deductions)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-zinc-100 bg-white">
                <button 
                  type="button"
                  onClick={() => setProcessSalaryPrompt({ isOpen: false, employee: null })}
                  className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-6 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Confirm Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
