import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowDownRight, ArrowUpRight, Search, FileText, ArrowUpDown, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Filter, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Label } from 'recharts';
import AddTransactionModal from '../components/AddTransactionModal';

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    transactionType: 'all',
    type: 'all',
    category: 'all',
    service: 'all',
    source: 'all'
  });
  const [expenseChartGroup, setExpenseChartGroup] = useState('category');
  const itemsPerPage = 100;

  const fetchTransactions = async () => {
    setLoading(true);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
        const docRef = doc(db, `userData/${userId}/preferences/prefs`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPreferences(docSnap.data().fields);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };

    fetchTransactions();
    fetchPreferences();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
        await deleteDoc(doc(db, `userData/${userId}/financialData`, id));
        fetchTransactions();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        alert("Error deleting transaction");
      }
    }
  };

  const handleEdit = (tx) => {
    setTransactionToEdit(tx);
    setIsAddModalOpen(true);
  };

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

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search term
      const matchesSearch = (t.remarks && t.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.service && t.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      // Date Range
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;

      // Month Selection
      if (selectedMonth !== 'all') {
        const tMonth = t.date ? t.date.substring(0, 7) : '';
        if (tMonth !== selectedMonth) return false;
      }

      // Category
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      
      // Service
      if (filters.service !== 'all' && t.service !== filters.service) return false;

      // Source
      if (filters.source !== 'all' && t.source !== filters.source) return false;

      // Transaction Type
      const isExpense = t.isExpense || (!t.isRevenue && t.typeOfTransaction !== "Income" && t.creditType !== "revenue");
      const isRevenue = t.isRevenue && t.creditType === "revenue";
      const isCredit = (t.isRevenue && t.creditType !== "revenue") || t.typeOfTransaction === "Income";

      if (filters.transactionType === 'expense' && !isExpense) return false;
      if (filters.transactionType === 'revenue' && !isRevenue) return false;
      if (filters.transactionType === 'credit' && !isCredit) return false;

      // Type
      if (filters.type !== 'all' && t.type !== filters.type) return false;

      return true;
    });
  }, [transactions, searchTerm, filters, selectedMonth]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(transactions.map(t => t.type).filter(Boolean))].sort();
  }, [transactions]);

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

  const totalExpense = filteredTransactions.reduce((acc, tx) => {
    return tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue") ? acc + Number(tx.amount || 0) : acc;
  }, 0);

  const totalRevenue = filteredTransactions.reduce((acc, tx) => {
    return (tx.isRevenue && tx.creditType === "revenue") ? acc + Number(tx.amount || 0) : acc;
  }, 0);

  const totalCredit = filteredTransactions.reduce((acc, tx) => {
    return (tx.isRevenue && tx.creditType !== "revenue") || tx.typeOfTransaction === "Income" ? acc + Number(tx.amount || 0) : acc;
  }, 0);
  
  const totalDirectorLoan = filteredTransactions.reduce((acc, tx) => {
    return (tx.service === "Director's Loan Deposit") ? acc + Number(tx.amount || 0) : acc;
  }, 0);

  const sourceBalances = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const source = tx.source || 'Unknown Source';
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      if (isExpense) {
        if (!acc[source]) acc[source] = 0;
        acc[source] += Number(tx.amount || 0);
      }
      return acc;
    }, {});
  }, [filteredTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Charts Data
  const pieChartData = useMemo(() => {
    const expensesGrouped = filteredTransactions.reduce((acc, tx) => {
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      if (isExpense) {
        const key = tx[expenseChartGroup] || 'N/A';
        acc[key] = (acc[key] || 0) + Number(tx.amount || 0);
      }
      return acc;
    }, {});
    
    return Object.entries(expensesGrouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 5); // top 5
  }, [filteredTransactions, expenseChartGroup]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  const chartData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    let minDate = '9999-12-31';
    let maxDate = '0000-01-01';
    filteredTransactions.forEach(tx => {
      if (tx.date) {
        if (tx.date < minDate) minDate = tx.date;
        if (tx.date > maxDate) maxDate = tx.date;
      }
    });

    const diffTime = Math.abs(new Date(maxDate) - new Date(minDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Determine if we should show daily or monthly
    // We show daily if the selected month is applied, OR if the date range span is <= 62 days
    const isDaily = selectedMonth !== 'all' || (minDate !== '9999-12-31' && diffDays <= 62);

    const dataMap = filteredTransactions.reduce((acc, tx) => {
      if (!tx.date) return acc;
      
      const key = isDaily ? tx.date : tx.date.substring(0, 7); // YYYY-MM-DD or YYYY-MM
      if (!acc[key]) acc[key] = { name: key, income: 0, expense: 0 };
      
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isRevenue = tx.isRevenue && tx.creditType === "revenue";
      
      if (isExpense) acc[key].expense += Number(tx.amount || 0);
      if (isRevenue) acc[key].income += Number(tx.amount || 0);
      
      return acc;
    }, {});
    
    return Object.values(dataMap).sort((a,b) => a.name.localeCompare(b.name)).map(item => {
      // Format the display name for the chart axis
      let displayName = item.name;
      if (isDaily) {
        // e.g. "Jul 15"
        const date = new Date(item.name);
        displayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        // e.g. "Jul 2026"
        const [year, month] = item.name.split('-');
        const date = new Date(year, parseInt(month) - 1);
        displayName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      return { ...item, displayName };
    });
  }, [filteredTransactions, selectedMonth]);

  const expenseBreakdown = useMemo(() => {
    const categories = {};
    const types = {};
    const sources = {};
    const services = {};
    let total = 0;

    filteredTransactions.forEach(tx => {
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      if (isExpense) {
        const amt = Number(tx.amount || 0);
        total += amt;
        
        const cat = tx.category || 'N/A';
        categories[cat] = (categories[cat] || 0) + amt;
        
        const typ = tx.type || 'N/A';
        types[typ] = (types[typ] || 0) + amt;
        
        const src = tx.source || 'N/A';
        sources[src] = (sources[src] || 0) + amt;
        
        const srv = tx.service || 'N/A';
        services[srv] = (services[srv] || 0) + amt;
      }
    });

    const formatData = (obj) => Object.entries(obj)
      .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      category: formatData(categories),
      type: formatData(types),
      source: formatData(sources),
      service: formatData(services),
      total
    };
  }, [filteredTransactions]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      transactionType: 'all',
      type: 'all',
      category: 'all',
      service: 'all',
      source: 'all'
    });
  };

  return (
    <div className="flex flex-col pb-10">
      <header className="mb-6 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-black tracking-tight">Finance</h1>
            <p className="text-[15px] text-zinc-500 mt-1.5">Manage your financial transactions here.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 bg-white w-full sm:w-64"
              />
            </div>
            
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

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors shadow-sm ${showFilters ? 'bg-zinc-100 border-zinc-300 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/90 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-6 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">Advanced Filters</h3>
              <button onClick={clearFilters} className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">From Date</label>
                <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">To Date</label>
                <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Transaction Type</label>
                <select name="transactionType" value={filters.transactionType} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white">
                  <option value="all">All</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                  <option value="credit">Credit / Deposit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Type</label>
                <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white">
                  <option value="all">All Types</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  {preferences?.type?.map(t => !uniqueTypes.includes(t) && <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Category</label>
                <select name="category" value={filters.category} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white">
                  <option value="all">All Categories</option>
                  {preferences?.category?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Service</label>
                <select name="service" value={filters.service} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white">
                  <option value="all">All Services</option>
                  {preferences?.service?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Source</label>
                <select name="source" value={filters.source} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white">
                  <option value="all">All Sources</option>
                  {preferences?.source?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <p className="text-sm font-medium text-zinc-500">Director's Loan Deposit</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">₹{totalDirectorLoan.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
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
        
        {Object.keys(sourceBalances).length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {Object.entries(sourceBalances).map(([source, balance]) => {
              return (
                <div key={source} className="px-3 py-1.5 rounded-lg border border-black text-sm font-medium flex items-center gap-2 bg-black text-white shadow-sm">
                  <span className="opacity-75">{source}:</span>
                  <span>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-900">Top Expenses</h3>
              <select 
                value={expenseChartGroup}
                onChange={(e) => setExpenseChartGroup(e.target.value)}
                className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-black/10"
              >
                <option value="category">by Category</option>
                <option value="source">by Source</option>
                <option value="type">by Type</option>
                <option value="service">by Service</option>
              </select>
            </div>
            <div className="h-64">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ value }) => `₹${value.toLocaleString('en-IN')}`}
                      labelLine={true}
                    >
                      <Label
                        content={({ viewBox }) => {
                          const { cx, cy } = viewBox;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                              <tspan x={cx} y={cy - 8} fontSize="11" fill="#71717a">Total</tspan>
                              <tspan x={cx} y={cy + 8} fontSize="13" fontWeight="bold" fill="#27272a">
                                ₹{expenseBreakdown.total >= 100000 ? (expenseBreakdown.total / 100000).toFixed(1) + 'L' : expenseBreakdown.total >= 1000 ? (expenseBreakdown.total / 1000).toFixed(1) + 'k' : expenseBreakdown.total}
                              </tspan>
                            </text>
                          );
                        }}
                      />
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-sm">No expense data available</div>
              )}
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col">
            <h3 className="text-sm font-medium text-zinc-900 mb-4 flex-shrink-0">Breakdown Detail</h3>
            <div className="space-y-4 max-h-[256px] overflow-y-auto pr-2 custom-scrollbar flex-1">
              {expenseBreakdown[expenseChartGroup]?.length > 0 ? expenseBreakdown[expenseChartGroup].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-zinc-700 truncate mr-2" title={item.name}>{item.name}</span>
                    <span className="text-zinc-900 font-semibold whitespace-nowrap">₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden flex">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(item.percentage, 1)}%` }}></div>
                  </div>
                </div>
              )) : (
                <div className="text-xs text-zinc-400 italic flex items-center justify-center h-full">No data</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mt-6">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Growth Trend: Income vs Expense</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="displayName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                <RechartsTooltip cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
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
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Transaction Type</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Service</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Actions</th>
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
                        {tx.type || 'N/A'}
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
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tx)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center">
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
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between px-6 py-4 border-t border-zinc-200/80 bg-zinc-50 flex-shrink-0">
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

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setTransactionToEdit(null);
        }}
        preferences={preferences}
        transactionToEdit={transactionToEdit}
        onSuccess={() => {
          fetchTransactions();
        }}
      />
    </div>
  );
}
