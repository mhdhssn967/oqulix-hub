import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, Loader2, IndianRupee, Edit2, TrendingUp, X, DollarSign, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { generatePayslipPDF } from './PayslipGenerator';

export default function EmployeePayrollAdminView() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { companyId } = useAuthStore();
  
  const [employee, setEmployee] = useState(null);
  const [payrollLogs, setPayrollLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Salary Edit Modal
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [baseSalaryInput, setBaseSalaryInput] = useState('');
  
  // Process Month Modal
  const [processModal, setProcessModal] = useState({ isOpen: false, month: '', existingLog: null });
  const [formData, setFormData] = useState({
    baseSalary: 0,
    bonus: 0,
    incentives: 0,
    deductions: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  const fetchData = async () => {
    if (!companyId || !employeeId) return;
    setLoading(true);
    try {
      // 1. Fetch Employee Details
      const empDoc = await getDoc(doc(db, `userData/${companyId}/employees`, employeeId));
      if (empDoc.exists()) {
        setEmployee({ id: empDoc.id, ...empDoc.data() });
        setBaseSalaryInput(empDoc.data().salary || '');
      } else {
        Swal.fire('Error', 'Employee not found', 'error');
        navigate('/payroll-management');
        return;
      }

      // 2. Fetch Payroll Logs
      const logsSnap = await getDocs(
        query(
          collection(db, `userData/${companyId}/payrollLogs`),
          where('employeeId', '==', employeeId)
        )
      );
      const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPayrollLogs(logs);
      
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, employeeId]);

  const generateMonthsList = () => {
    let startDate = new Date();
    
    // 1. Try dateOfJoining
    if (employee?.dateOfJoining) {
      const joinDate = new Date(employee.dateOfJoining);
      if (!isNaN(joinDate.getTime())) {
        startDate = joinDate;
      }
    } else {
      // Fallback to start of current year if no join date
      startDate = new Date(new Date().getFullYear(), 0, 1);
    }

    // 2. Check if any payroll logs are older than startDate
    payrollLogs.forEach(log => {
      if (log.month) {
        const [year, month] = log.month.split('-');
        const logDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        if (logDate < startDate) {
          startDate = logDate;
        }
      }
    });
    
    const current = new Date();
    const months = [];
    
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(current.getFullYear(), current.getMonth(), 1);
    
    while (currentMonth <= endMonth) {
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    return months.reverse(); // Most recent first
  };

  const handleUpdateBaseSalary = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, `userData/${companyId}/employees`, employeeId), {
        salary: Number(baseSalaryInput)
      });
      setEmployee(prev => ({ ...prev, salary: Number(baseSalaryInput) }));
      setIsSalaryModalOpen(false);
      Swal.fire({ title: 'Success', text: 'Base salary updated', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'Failed to update salary', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessMonth = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const netSalary = Number(formData.baseSalary) + Number(formData.bonus) + Number(formData.incentives) - Number(formData.deductions);
      
      const updateData = {
        employeeId: employee.id,
        employeeName: employee.name,
        role: employee.position || 'Employee',
        month: processModal.month,
        baseSalary: Number(formData.baseSalary),
        bonus: Number(formData.bonus),
        incentives: Number(formData.incentives),
        deductions: Number(formData.deductions),
        netSalary,
        status: 'Paid',
      };

      if (processModal.existingLog) {
        // Update existing log
        await updateDoc(doc(db, `userData/${companyId}/payrollLogs`, processModal.existingLog.id), updateData);
      } else {
        // Create new log
        updateData.processedDate = serverTimestamp();
        await setDoc(doc(collection(db, `userData/${companyId}/payrollLogs`)), updateData);
      }

      await fetchData(); // Refresh data
      setProcessModal({ isOpen: false, month: '', existingLog: null });
      Swal.fire({ title: 'Success', text: 'Payroll record updated', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'Failed to process payroll', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async (log) => {
    setGeneratingPdfId(log.id);
    try {
      let companyName = 'Your Company';
      try {
         const companySnap = await getDocs(collection(db, `userData/${companyId}/companyInfo`));
         if (!companySnap.empty) {
           companyName = companySnap.docs[0].data().legalName || companyName;
         }
      } catch (e) {
         console.log("Could not fetch company name", e);
      }
      await generatePayslipPDF(employee.name, log, companyName);
    } catch (err) {
      Swal.fire('Error', 'Failed to generate PDF.', 'error');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!employee) return null;

  const monthsList = generateMonthsList();
  const totalEarned = payrollLogs.reduce((sum, l) => sum + (l.netSalary || 0), 0);
  const totalBonus = payrollLogs.reduce((sum, l) => sum + (l.bonus || 0) + (l.incentives || 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/payroll-management')} className="p-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-zinc-600" />
        </button>
        <h1 className="text-2xl font-bold text-black tracking-tight">{employee.name}'s Payroll</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Current Base Salary</p>
              <button onClick={() => setIsSalaryModalOpen(true)} className="text-blue-600 hover:text-blue-800 p-1">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="text-3xl font-bold text-black">₹{(employee.salary || 0).toLocaleString()}</h3>
          </div>
          <p className="text-[12px] text-zinc-500 mt-2">
            Joined: {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3 justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Total Net Earnings</p>
              <h3 className="text-xl font-bold text-black mt-0.5">₹{totalEarned.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3 justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Total Bonus Given</p>
              <h3 className="text-xl font-bold text-black mt-0.5">₹{totalBonus.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/80 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Month</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Base Salary</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Bonus/Incentives</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Deductions</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Net Paid</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {monthsList.map(monthStr => {
                const existingLog = payrollLogs.find(l => l.month === monthStr);
                const isProcessed = !!existingLog;
                
                return (
                  <tr key={monthStr} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-[14px] font-bold text-zinc-900 block">{monthStr}</span>
                      {isProcessed && existingLog.processedDate?.toDate ? (
                        <span className="text-[11px] text-zinc-500">Processed: {existingLog.processedDate.toDate().toLocaleDateString()}</span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">Unprocessed</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-zinc-600 text-right">
                      {isProcessed ? `₹${(existingLog.baseSalary || 0).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-emerald-600 text-right">
                      {isProcessed ? `+ ₹${((existingLog.bonus || 0) + (existingLog.incentives || 0)).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-red-500 text-right">
                      {isProcessed ? `- ₹${(existingLog.deductions || 0).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-4 text-[14px] font-bold text-black text-right">
                      {isProcessed ? `₹${(existingLog.netSalary || 0).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setFormData({
                              baseSalary: isProcessed ? (existingLog.baseSalary || 0) : (employee.salary || 0),
                              bonus: isProcessed ? (existingLog.bonus || 0) : 0,
                              incentives: isProcessed ? (existingLog.incentives || 0) : 0,
                              deductions: isProcessed ? (existingLog.deductions || 0) : 0
                            });
                            setProcessModal({ isOpen: true, month: monthStr, existingLog });
                          }}
                          className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${isProcessed ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}
                        >
                          {isProcessed ? 'Edit' : 'Process'}
                        </button>
                        {isProcessed && (
                          <button
                            onClick={() => handleDownloadPDF(existingLog)}
                            disabled={generatingPdfId === existingLog.id}
                            title="Download Payslip"
                            className="p-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {generatingPdfId === existingLog.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Base Salary Modal */}
      {isSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsSalaryModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleUpdateBaseSalary}>
              <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                <h2 className="text-[15px] font-semibold text-zinc-900">Update Base Salary</h2>
                <button type="button" onClick={() => !isSubmitting && setIsSalaryModalOpen(false)} className="text-zinc-400 hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">New Base Salary (₹)</label>
                <input 
                  type="number" required min="0" value={baseSalaryInput} onChange={(e) => setBaseSalaryInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] transition-all"
                />
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-zinc-100 bg-zinc-50">
                <button type="button" onClick={() => !isSubmitting && setIsSalaryModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process/Edit Month Modal */}
      {processModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setProcessModal({ isOpen: false, month: '', existingLog: null })}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleProcessMonth} className="flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
                <div>
                  <h2 className="text-[15px] font-semibold text-zinc-900">{processModal.existingLog ? 'Edit' : 'Process'} Salary</h2>
                  <p className="text-[12px] text-zinc-500 mt-0.5">{processModal.month}</p>
                </div>
                <button type="button" onClick={() => !isSubmitting && setProcessModal({ isOpen: false, month: '', existingLog: null })} className="text-zinc-400 hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto custom-scrollbar bg-zinc-50/50 flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Base Salary (₹)</label>
                  <input type="number" required min="0" value={formData.baseSalary} onChange={(e) => setFormData({...formData, baseSalary: e.target.value})} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[13px] transition-all font-medium" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Bonus (₹)</label>
                    <input type="number" min="0" value={formData.bonus} onChange={(e) => setFormData({...formData, bonus: e.target.value})} className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] transition-all font-medium text-emerald-900" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">Incentives (₹)</label>
                    <input type="number" min="0" value={formData.incentives} onChange={(e) => setFormData({...formData, incentives: e.target.value})} className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] transition-all font-medium text-emerald-900" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-2">Deductions (₹)</label>
                  <input type="number" min="0" value={formData.deductions} onChange={(e) => setFormData({...formData, deductions: e.target.value})} className="w-full px-3 py-2 bg-red-50/50 border border-red-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-[13px] transition-all font-medium text-red-900" />
                </div>

                <div className="mt-2 bg-black text-white p-4 rounded-xl flex items-center justify-between">
                  <span className="text-[14px] font-bold uppercase tracking-wider text-zinc-400">Net Salary</span>
                  <span className="text-[20px] font-bold text-emerald-400">
                    ₹{(Number(formData.baseSalary) + Number(formData.bonus) + Number(formData.incentives) - Number(formData.deductions)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-zinc-100 bg-white shrink-0">
                <button type="button" onClick={() => !isSubmitting && setProcessModal({ isOpen: false, month: '', existingLog: null })} className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="py-2 px-6 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
