import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronLeft, TrendingUp, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GstAnalysis() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
      const q = query(
        collection(db, `userData/${userId}/financialData`),
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // filter only revenue
      const revenues = data.filter(tx => tx.isRevenue && tx.creditType === "revenue");
      revenues.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(revenues);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const uniqueMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      if (t.date) {
        months.add(t.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const formatMonth = (yyyyMm) => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => {
      const tMonth = t.date ? t.date.substring(0, 7) : '';
      return tMonth === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const totalRevenue = filteredTransactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const totalTaxable = totalRevenue / 1.18;
  const totalGst = totalRevenue - totalTaxable;

  return (
    <div className="flex flex-col pb-10">
      <header className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate('/finance')}
            className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-black tracking-tight">GST Analysis</h1>
            <p className="text-[15px] text-zinc-500 mt-1.5">View and analyze GST on revenue transactions.</p>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors shadow-sm cursor-pointer"
          >
            <option value="all">All Months</option>
            {uniqueMonths.map(month => (
              <option key={month} value={month}>{formatMonth(month)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-500">Amount received incl. GST</p>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-500">Taxable value</p>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Calculator className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-blue-600">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-500">GST @ 18%</p>
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Calculator className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-purple-600">₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200/80 z-10">
                <tr>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Customer / Source</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Amount received incl. GST</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Taxable value</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">GST @ 18%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTransactions.map((tx) => {
                  const amt = Number(tx.amount || 0);
                  const taxable = amt / 1.18;
                  const gst = amt - taxable;
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-zinc-500 font-medium">
                        {tx.date}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-zinc-900">
                        {tx.source || tx.remarks || 'Unknown Customer'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-semibold text-emerald-600 text-right">
                        ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-zinc-600 text-right">
                        ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-zinc-600 text-right">
                        ₹{gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-zinc-400">
                      No revenue transactions found.
                    </td>
                  </tr>
                ) : (
                  <tr className="bg-zinc-50 font-bold border-t border-zinc-200">
                    <td className="py-4 px-6 text-sm text-black" colSpan="2">TOTAL</td>
                    <td className="py-4 px-6 text-sm text-emerald-600 text-right">
                      ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-sm text-black text-right">
                      ₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-sm text-black text-right">
                      ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
