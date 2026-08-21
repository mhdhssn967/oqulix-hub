import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { Download, Loader2, Receipt, TrendingUp, IndianRupee } from 'lucide-react';
import Swal from 'sweetalert2';
import { generatePayslipPDF } from './PayslipGenerator';

export default function EmployeePayroll() {
  const { user, companyId, employeeData } = useAuthStore();
  const [payrollLogs, setPayrollLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  const fetchData = async () => {
    if (!companyId || !user?.uid) return;
    setLoading(true);
    try {
      const logsSnap = await getDocs(
        query(
          collection(db, `userData/${companyId}/payrollLogs`),
          where('employeeId', '==', user.uid)
        )
      );
      
      const logs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Firestore requires index for complex queries, sorting locally for safety
      logs.sort((a, b) => {
        const timeA = a.processedDate?.toDate ? a.processedDate.toDate().getTime() : 0;
        const timeB = b.processedDate?.toDate ? b.processedDate.toDate().getTime() : 0;
        return timeB - timeA;
      });
      
      setPayrollLogs(logs);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, user?.uid]);

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
      
      const empName = employeeData?.name || log.employeeName || 'Employee';
      await generatePayslipPDF(empName, log, companyName);
    } catch (err) {
      Swal.fire('Error', 'Failed to generate PDF.', 'error');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const totalEarned = payrollLogs.reduce((sum, l) => sum + (l.netSalary || 0), 0);
  const totalBonus = payrollLogs.reduce((sum, l) => sum + (l.bonus || 0) + (l.incentives || 0), 0);
  const totalDeductions = payrollLogs.reduce((sum, l) => sum + (l.deductions || 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold text-black tracking-tight">My Payroll</h1>
        <p className="text-[15px] text-zinc-500">View your salary history and download payslips.</p>
      </header>

      {loading ? (
        <div className="p-12 flex justify-center bg-white rounded-2xl border border-zinc-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Total Net Earnings</p>
                <h3 className="text-2xl font-bold text-black mt-1">₹{totalEarned.toLocaleString()}</h3>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Total Bonus & Incentives</p>
                <h3 className="text-2xl font-bold text-black mt-1">₹{totalBonus.toLocaleString()}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Total Deductions</p>
                <h3 className="text-2xl font-bold text-black mt-1">₹{totalDeductions.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h2 className="text-[16px] font-bold text-zinc-900">Transaction History</h2>
            </div>
            <div className="overflow-x-auto">
              {payrollLogs.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-[14px]">
                  No payroll history found.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-zinc-100">
                      <th className="px-6 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Base Salary</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Bonus/Incentives</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Deductions</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Net Paid</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {payrollLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-bold text-zinc-900 block">{log.month}</span>
                          <span className="text-[12px] text-zinc-500">Processed: {log.processedDate?.toDate ? log.processedDate.toDate().toLocaleDateString() : 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 text-[14px] font-medium text-zinc-600 text-right">₹{log.baseSalary?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-[14px] font-medium text-emerald-600 text-right">+ ₹{((log.bonus || 0) + (log.incentives || 0)).toLocaleString()}</td>
                        <td className="px-6 py-4 text-[14px] font-medium text-red-500 text-right">- ₹{log.deductions?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-[15px] font-bold text-black text-right">₹{log.netSalary?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDownloadPDF(log)}
                            disabled={generatingPdfId === log.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-[13px] font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                          >
                            {generatingPdfId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
