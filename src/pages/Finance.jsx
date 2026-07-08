import React, { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowDownRight, ArrowUpRight, Search, FileText, ArrowUpDown, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
        const q = query(
          collection(db, `userData/${userId}/financialData`),
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // sort by date descending initially
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const handleSort = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    const sorted = [...transactions].sort((a, b) => {
      if (newOrder === 'desc') {
        return new Date(b.date) - new Date(a.date);
      } else {
        return new Date(a.date) - new Date(b.date);
      }
    });
    setTransactions(sorted);
  };

  const filteredTransactions = transactions.filter(t => 
    (t.remarks && t.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.service && t.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalExpense = filteredTransactions.reduce((acc, tx) => {
    return tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue") ? acc + Number(tx.amount || 0) : acc;
  }, 0);

  const totalRevenue = filteredTransactions.reduce((acc, tx) => {
    return (tx.isRevenue && tx.creditType === "revenue") ? acc + Number(tx.amount || 0) : acc;
  }, 0);

  const totalCredit = filteredTransactions.reduce((acc, tx) => {
    return (tx.isRevenue && tx.creditType !== "revenue") || tx.typeOfTransaction === "Income" ? acc + Number(tx.amount || 0) : acc;
  }, 0);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <header className="mb-6 flex-shrink-0">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-black tracking-tight">Finance</h1>
            <p className="text-[15px] text-zinc-500 mt-1.5">Manage your financial transactions here.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 bg-white w-64"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Credit (Funds)</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Expenses</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200/80 z-10">
                <tr>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider w-12 text-center">#</th>
                  <th 
                    className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors group"
                    onClick={handleSort}
                  >
                    <div className="flex items-center gap-1.5">
                      Date
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Service</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedTransactions.map((tx, index) => {
                  const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
                  const isRevenue = tx.isRevenue && tx.creditType === "revenue";
                  const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  
                  let txTypeStyle = { color: 'text-blue-600', bg: 'bg-blue-50', icon: <ArrowDownRight className="w-4 h-4" />, sign: '+ ₹' };
                  if (isExpense) {
                    txTypeStyle = { color: 'text-red-600', bg: 'bg-red-50', icon: <ArrowUpRight className="w-4 h-4" />, sign: '- ₹' };
                  } else if (isRevenue) {
                    txTypeStyle = { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ArrowDownRight className="w-4 h-4" />, sign: '+ ₹' };
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-zinc-400 text-center font-medium">
                        {actualIndex}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-zinc-500 font-medium">
                        {tx.date}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${txTypeStyle.bg} ${txTypeStyle.color}`}>
                            {txTypeStyle.icon}
                          </div>
                          <span className="text-sm font-medium text-zinc-900">{tx.remarks || 'No Description'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-zinc-600">
                        {tx.source || 'N/A'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-zinc-600">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${txTypeStyle.bg} ${txTypeStyle.color} uppercase tracking-wider`}>
                          {isExpense ? 'Expense' : (isRevenue ? 'Revenue' : 'Credit')}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                          {tx.category || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-zinc-600">
                        {tx.service || 'N/A'}
                      </td>
                      <td className={`py-4 px-6 whitespace-nowrap text-sm font-medium text-right ${txTypeStyle.color}`}>
                        {txTypeStyle.sign}{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <FileText className="w-12 h-12 mb-3 text-zinc-200" />
                        <p>No transactions found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200/80 bg-zinc-50 flex-shrink-0">
            <span className="text-sm text-zinc-500">
              Showing <span className="font-medium text-zinc-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-zinc-900">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-medium text-zinc-900">{filteredTransactions.length}</span> results
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-zinc-600 font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
