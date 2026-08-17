import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, setDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { Receipt, Search, Download, DollarSign, Plus, X, Loader2, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';
import { generatePayslipPDF } from './PayslipGenerator';

export default function PayrollManagement() {
  const { companyId } = useAuthStore();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [payrollLogs, setPayrollLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [processSalaryPrompt, setProcessSalaryPrompt] = useState({ isOpen: false, employee: null });
  
  // Form State
  const [formData, setFormData] = useState({
    month: '',
    baseSalary: 0,
    bonus: 0,
    incentives: 0,
    deductions: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

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

  const filteredEmployees = employees.filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats calculation
  const getEmployeeStats = (empId) => {
    const logs = payrollLogs.filter(l => l.employeeId === empId);
    const totalPaid = logs.reduce((sum, l) => sum + (l.netSalary || 0), 0);
    const totalBonus = logs.reduce((sum, l) => sum + (l.bonus || 0), 0);
    return { totalPaid, totalBonus };
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Payroll Management</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Process salaries and view payroll history for all employees.</p>
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
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Base Salary</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Paid (All Time)</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Bonus</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredEmployees.map(emp => {
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
                      <td className="px-5 py-4 text-[14px] font-semibold text-emerald-600 text-right">
                        ₹{stats.totalPaid.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium text-zinc-600 text-right">
                        ₹{stats.totalBonus.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setFormData({ month: '', baseSalary: emp.salary || 0, bonus: 0, incentives: 0, deductions: 0 });
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
        )}
      </div>

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
                    onChange={(e) => setFormData(p => ({ ...p, month: e.target.value }))}
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
