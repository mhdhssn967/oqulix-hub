import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Wallet,
  Activity,
  Layers,
  FileSpreadsheet,
  Landmark,
  Users,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { getDirectorsFromPreferences } from '../components/MapDirectorLoanModal';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function FinancialAnalysis() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all', '12m', '6m', 'this_year', or specific 'YYYY-MM'
  const [annualChartMode, setAnnualChartMode] = useState('novToNov'); // 'novToNov' | 'calendar'
  const navigate = useNavigate();

  // Bank Balance & Preferences States
  const [bankBalance, setBankBalance] = useState(0);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [reconMode, setReconMode] = useState('bank'); // 'bank' | 'company'
  const [includeOtherCredits, setIncludeOtherCredits] = useState(true);
  const directorNames = useMemo(() => getDirectorsFromPreferences(preferences), [preferences]);

  const fetchBankBalance = async () => {
    try {
      const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

      // Fetch preferences
      const prefRef = doc(db, `userData/${userId}/preferences/prefs`);
      const prefSnap = await getDoc(prefRef);
      if (prefSnap.exists()) {
        const prefData = prefSnap.data();
        if (prefData.fields) {
          setPreferences(prefData.fields);
        }
        if (prefData.bankBalance !== undefined) {
          setBankBalance(Number(prefData.bankBalance || 0));
          setBalanceUpdatedAt(prefData.bankBalanceUpdatedAt || null);
        }
      }

      // Check financeSettings/bankBalance (takes priority for current balance if present)
      const docRef = doc(db, `userData/${userId}/financeSettings/bankBalance`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBankBalance(Number(data.balance || 0));
        setBalanceUpdatedAt(data.updatedAt || null);
      }
    } catch (err) {
      console.error("Error fetching preferences or bank balance:", err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
      const q = query(collection(db, `userData/${userId}/financialData`));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions for analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchBankBalance();
  }, []);

  // Unique months available in data
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      if (t.date) months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Format month helper
  const formatMonth = (yyyyMm) => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    const date = new Date(year, parseInt(month, 10) - 1);
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };

  // Filtered transactions based on selected period
  const filteredTransactions = useMemo(() => {
    if (selectedPeriod === 'all') return transactions;

    const now = new Date();
    const currentYear = now.getFullYear();

    if (selectedPeriod === 'this_year') {
      return transactions.filter(t => t.date && t.date.startsWith(`${currentYear}`));
    }

    if (selectedPeriod === '6m') {
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      return transactions.filter(t => t.date && t.date >= cutoff);
    }

    if (selectedPeriod === '12m') {
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0];
      return transactions.filter(t => t.date && t.date >= cutoff);
    }

    // Specific month
    return transactions.filter(t => t.date && t.date.startsWith(selectedPeriod));
  }, [transactions, selectedPeriod]);

  // Aggregate Metrics
  const analysisMetrics = useMemo(() => {
    let revenue = 0;
    let expense = 0;
    let creditFunds = 0;
    let directorLoan = 0;

    filteredTransactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isRevenue = tx.isRevenue && tx.creditType === "revenue";
      const isCredit = (tx.isRevenue && tx.creditType !== "revenue") || tx.typeOfTransaction === "Income";

      if (isExpense) {
        expense += amt;
      } else if (isRevenue) {
        revenue += amt;
      } else if (isCredit) {
        creditFunds += amt;
      }

      if (tx.service === "Director's Loan Deposit" || Boolean(tx.directorLoan)) {
        directorLoan += amt;
      }
    });

    const netProfit = revenue - expense;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const taxableRevenue = revenue / 1.18;
    const gstAmount = revenue - taxableRevenue;

    return {
      revenue,
      taxableRevenue,
      gstAmount,
      expense,
      netProfit,
      profitMargin,
      creditFunds,
      directorLoan,
      totalCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Year-wise performance starting from inception (November 2023)
  const yearlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2023;

    const yearsMap = {};
    for (let y = startYear; y <= currentYear; y++) {
      yearsMap[y] = {
        year: String(y),
        label: y === 2023 ? '2023 (Nov - Dec)' : y === currentYear ? `${y} (YTD)` : String(y),
        isStartYear: y === 2023,
        revenue: 0,
        expense: 0,
        net: 0,
        margin: '0.0',
        txCount: 0
      };
    }

    transactions.forEach(tx => {
      if (!tx.date) return;
      // Inception is November 2023
      if (tx.date < '2023-11-01') return;

      const y = tx.date.substring(0, 4);
      if (!yearsMap[y]) {
        yearsMap[y] = {
          year: y,
          label: y,
          isStartYear: false,
          revenue: 0,
          expense: 0,
          net: 0,
          margin: '0.0',
          txCount: 0
        };
      }

      const amt = Number(tx.amount || 0);
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isRevenue = tx.isRevenue && tx.creditType === "revenue";

      if (isExpense) {
        yearsMap[y].expense += amt;
      } else if (isRevenue) {
        yearsMap[y].revenue += amt;
      }
      yearsMap[y].txCount += 1;
    });

    const list = Object.values(yearsMap).sort((a, b) => a.year.localeCompare(b.year));
    list.forEach(item => {
      item.net = item.revenue - item.expense;
      item.margin = item.revenue > 0 ? ((item.net / item.revenue) * 100).toFixed(1) : 0;
    });

    return list;
  }, [transactions]);

  const lifetimeStats = useMemo(() => {
    let revenue = 0;
    let expense = 0;
    yearlyStats.forEach(item => {
      revenue += item.revenue;
      expense += item.expense;
    });
    const net = revenue - expense;
    const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(1) : 0;
    return { revenue, expense, net, margin };
  }, [yearlyStats]);

  // November-to-November 12-Month Performance Cycles (Company Anniversary)
  const novToNovStats = useMemo(() => {
    const startYear = 2023;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // A cycle starting in November Y ends in October Y+1.
    const maxStartYear = currentMonth >= 11 ? currentYear : currentYear - 1;

    const cycles = [];
    let cycleNum = 1;
    for (let y = startYear; y <= maxStartYear; y++) {
      const nextY = y + 1;
      const startDate = `${y}-11-01`;
      const endDate = `${nextY}-10-31`;
      const isCurrent = (nextY === currentYear && currentMonth <= 10) || (y === currentYear && currentMonth >= 11);

      cycles.push({
        id: `cycle-${y}-${nextY}`,
        cycleNum,
        yearLabel: `Year ${cycleNum}`,
        periodLabel: `Nov ${y} – Oct ${nextY}`,
        label: `Nov '${String(y).slice(2)} – Oct '${String(nextY).slice(2)}`,
        dateRangeText: `${startDate} to ${endDate}`,
        isCurrent,
        startDate,
        endDate,
        revenue: 0,
        expense: 0,
        net: 0,
        margin: '0.0',
        txCount: 0
      });
      cycleNum++;
    }

    transactions.forEach(tx => {
      if (!tx.date) return;
      const amt = Number(tx.amount || 0);
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isRevenue = tx.isRevenue && tx.creditType === "revenue";

      for (const c of cycles) {
        if (tx.date >= c.startDate && tx.date <= c.endDate) {
          if (isExpense) c.expense += amt;
          if (isRevenue) c.revenue += amt;
          c.txCount += 1;
          break;
        }
      }
    });

    cycles.forEach(c => {
      c.net = c.revenue - c.expense;
      c.margin = c.revenue > 0 ? ((c.net / c.revenue) * 100).toFixed(1) : 0;
    });

    return cycles;
  }, [transactions]);

  // Monthly breakdown for trend charts & table
  const monthlyStats = useMemo(() => {
    const map = {};

    filteredTransactions.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = {
          month: monthKey,
          label: formatMonth(monthKey),
          revenue: 0,
          expense: 0,
          net: 0,
          txCount: 0
        };
      }

      const amt = Number(tx.amount || 0);
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isRevenue = tx.isRevenue && tx.creditType === "revenue";

      if (isExpense) {
        map[monthKey].expense += amt;
      } else if (isRevenue) {
        map[monthKey].revenue += amt;
      }
      map[monthKey].txCount += 1;
    });

    const list = Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    list.forEach(item => {
      item.net = item.revenue - item.expense;
      item.margin = item.revenue > 0 ? ((item.net / item.revenue) * 100).toFixed(1) : 0;
    });

    return list;
  }, [filteredTransactions]);

  // Category breakdown for expenses
  const categoryData = useMemo(() => {
    const cats = {};
    let totalExp = 0;

    filteredTransactions.forEach(tx => {
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      if (isExpense) {
        const cat = tx.category || 'Uncategorized';
        const amt = Number(tx.amount || 0);
        cats[cat] = (cats[cat] || 0) + amt;
        totalExp += amt;
      }
    });

    return Object.entries(cats)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExp > 0 ? ((value / totalExp) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Source / Account breakdown for Outflows AND Director Loan Deposits
  const accountOutflowData = useMemo(() => {
    const accounts = {};

    const ensureAcc = (rawName) => {
      const name = (rawName && rawName.trim()) || 'Other';
      if (!accounts[name]) {
        const cleanLower = name.toLowerCase().replace(/\s+/g, ' ');
        const isHDFC = cleanLower === 'oqulix hdfc';
        const isDirector = directorNames.some(d => d.toLowerCase().trim() === cleanLower);
        accounts[name] = {
          name,
          expense: 0,
          directorLoanDeposit: 0,
          txCount: 0,
          isHDFC,
          isDirector
        };
      }
      return accounts[name];
    };

    // Pre-populate with all known sources from preferences and directors
    const prefSources = preferences?.source || [];
    prefSources.forEach(s => {
      if (s && typeof s === 'string') ensureAcc(s);
    });
    directorNames.forEach(d => {
      if (d) ensureAcc(d);
    });

    let totalExpense = 0;
    let totalDirectorLoanDeposits = 0;

    filteredTransactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isDirectorLoanTx = tx.service === "Director's Loan Deposit" || Boolean(tx.directorLoan);

      if (isExpense) {
        const acc = ensureAcc(tx.source);
        acc.expense += amt;
        acc.txCount += 1;
        totalExpense += amt;
      }

      if (isDirectorLoanTx) {
        totalDirectorLoanDeposits += amt;

        // If mapped to a specific director
        if (tx.directorLoan && tx.directorLoan.trim()) {
          const dirAcc = ensureAcc(tx.directorLoan);
          dirAcc.directorLoanDeposit += amt;
          dirAcc.txCount += 1;
        }

        // If deposited via/into an account (e.g. Oqulix HDFC)
        if (tx.source && tx.source.trim()) {
          const srcTrimmed = tx.source.trim();
          if (srcTrimmed.toLowerCase() !== (tx.directorLoan || '').trim().toLowerCase()) {
            const srcAcc = ensureAcc(srcTrimmed);
            srcAcc.directorLoanDeposit += amt;
            srcAcc.txCount += 1;
          }
        } else if (!tx.directorLoan) {
          const unmapped = ensureAcc('Unmapped Deposits');
          unmapped.directorLoanDeposit += amt;
          unmapped.txCount += 1;
        }
      }
    });

    const list = Object.values(accounts).map(acc => ({
      ...acc,
      expensePercentage: totalExpense > 0 ? ((acc.expense / totalExpense) * 100).toFixed(1) : '0.0',
      totalActivity: acc.expense + acc.directorLoanDeposit
    }));

    // Filter out accounts with 0 expense AND 0 deposits if they aren't configured in preferences/directors
    const activeList = list.filter(acc => 
      acc.isHDFC || acc.isDirector || acc.totalActivity > 0 || (preferences?.source || []).includes(acc.name)
    );

    // Sort order: Oqulix HDFC first, then directors, then others by totalActivity descending
    activeList.sort((a, b) => {
      if (a.isHDFC) return -1;
      if (b.isHDFC) return 1;
      if (a.isDirector && !b.isDirector) return -1;
      if (!a.isDirector && b.isDirector) return 1;
      return b.totalActivity - a.totalActivity;
    });

    return {
      accounts: activeList,
      totalExpense,
      totalDirectorLoanDeposits
    };
  }, [filteredTransactions, preferences, directorNames]);

  // Cumulative Ledger vs Bank Balance Reconciliation Check
  const reconciliationMetrics = useMemo(() => {
    let rev = 0;
    let dirLoan = 0;
    let otherCredits = 0;
    let hdfcExp = 0;
    let nonHdfcExp = 0;

    transactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const isExpense = tx.isExpense || (!tx.isRevenue && tx.typeOfTransaction !== "Income" && tx.creditType !== "revenue");
      const isRevenue = tx.isRevenue && tx.creditType === "revenue";
      const isDirectorLoan = tx.service === "Director's Loan Deposit" || Boolean(tx.directorLoan);

      if (isExpense) {
        const src = (tx.source || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (src === 'oqulix hdfc') {
          hdfcExp += amt;
        } else {
          nonHdfcExp += amt;
        }
      } else if (isRevenue) {
        rev += amt;
      } else if (isDirectorLoan) {
        dirLoan += amt;
      } else {
        otherCredits += amt;
      }
    });

    const totalExp = hdfcExp + nonHdfcExp;
    
    // 1. Strict Bank Check: (Revenue + Director Loan Deposits) vs (HDFC Expenses + Bank Balance)
    const bankInflowCore = rev + dirLoan;
    const bankInflowTotal = rev + dirLoan + otherCredits;
    const bankOutflowAndBalance = hdfcExp + bankBalance;
    const bankMismatchCore = bankInflowCore - bankOutflowAndBalance;
    const bankMismatchWithOtherCredits = bankInflowTotal - bankOutflowAndBalance;

    // 2. Company-Wide Check: (All Expenses + Bank Balance) vs (Revenue + Director Loans + Non-HDFC Expenses + Other Credits)
    const companyOutflowsAndBalance = totalExp + bankBalance;
    const companyInflowsCore = rev + dirLoan + nonHdfcExp;
    const companyInflowsTotal = rev + dirLoan + nonHdfcExp + otherCredits;
    const companyMismatch = companyInflowsTotal - companyOutflowsAndBalance;

    return {
      rev,
      dirLoan,
      otherCredits,
      hdfcExp,
      nonHdfcExp,
      totalExp,
      bankBalance,
      bankInflowCore,
      bankInflowTotal,
      bankOutflowAndBalance,
      bankMismatchCore,
      bankMismatchWithOtherCredits,
      companyOutflowsAndBalance,
      companyInflowsCore,
      companyInflowsTotal,
      companyMismatch
    };
  }, [transactions, bankBalance]);

  const activeMismatch = useMemo(() => {
    if (reconMode === 'bank') {
      return includeOtherCredits 
        ? reconciliationMetrics.bankMismatchWithOtherCredits 
        : reconciliationMetrics.bankMismatchCore;
    }
    return includeOtherCredits 
      ? reconciliationMetrics.companyMismatch 
      : (reconciliationMetrics.companyInflowsCore - reconciliationMetrics.companyOutflowsAndBalance);
  }, [reconMode, includeOtherCredits, reconciliationMetrics]);

  const currencyFormatter = (val) => {
    if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)} k`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="flex flex-col pb-12 w-full">
      {/* Header */}
      <header className="mb-6 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/finance')}
              className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 transition-colors shadow-sm"
              title="Back to Finance"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold text-black tracking-tight">Financial Analysis</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Analytics
                </span>
              </div>
              <p className="text-[15px] text-zinc-500 mt-1">
                Deep dive into revenue streams, operating costs, profit margins, and monthly growth.
              </p>
            </div>
          </div>

          {/* Period selector buttons & dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedPeriod('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPeriod === 'all' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setSelectedPeriod('this_year')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPeriod === 'this_year' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setSelectedPeriod('12m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPeriod === '12m' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
                }`}
              >
                Last 12M
              </button>
              <button
                onClick={() => setSelectedPeriod('6m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPeriod === '6m' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
                }`}
              >
                Last 6M
              </button>
            </div>

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3.5 py-2 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors shadow-sm cursor-pointer"
            >
              <option value="all">Custom Month...</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bank Balance Card */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black text-white p-6 rounded-2xl border border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.12)] mb-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Current Bank Balance
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Liquid Funds
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    ₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>

                {balanceUpdatedAt && (
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Last updated: {new Date(balanceUpdatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bank & Ledger Reconciliation Audit Check */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-6 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
                  Bank Reconciliation & Audit Check
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                  Math.abs(activeMismatch) < 1 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {Math.abs(activeMismatch) < 1 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Reconciled
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" /> Variance: ₹{Math.abs(activeMismatch).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Verifies if <strong className="text-zinc-700">Bank Expenses + Current Balance</strong> equals <strong className="text-zinc-700">Revenue + Director's Loan Deposits</strong>.
              </p>
            </div>

            {/* Mode Selector and Filter Toggles */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex bg-zinc-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReconMode('bank')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    reconMode === 'bank' ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Bank Check (Oqulix HDFC)
                </button>
                <button
                  type="button"
                  onClick={() => setReconMode('company')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    reconMode === 'company' ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Company-Wide Check (All Sources)
                </button>
              </div>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/80 cursor-pointer text-zinc-700 text-xs transition-colors">
                <input
                  type="checkbox"
                  checked={includeOtherCredits}
                  onChange={(e) => setIncludeOtherCredits(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
                <span>Include Grants & Other Credits</span>
              </label>
            </div>
          </div>

          {/* Equation Visualization: Side A (Outflows + Balance) vs Side B (Inflows) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Side A: Cash Required / Dispatched */}
            <div className="p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {reconMode === 'bank' ? 'Side A: HDFC Debits + Bank Balance' : 'Side A: All Expenses + Bank Balance'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-zinc-200/60 text-zinc-700">
                    Outflows & Reserves
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/50">
                    <span className="text-zinc-600">
                      {reconMode === 'bank' ? 'HDFC Bank Expenses' : 'All Expenses (HDFC + Non-HDFC)'}
                    </span>
                    <span className="font-semibold text-zinc-900">
                      ₹{(reconMode === 'bank' ? reconciliationMetrics.hdfcExp : reconciliationMetrics.totalExp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {reconMode === 'company' && (
                    <div className="flex justify-between items-center text-xs text-zinc-500 pl-3">
                      <span>↳ of which HDFC Debited:</span>
                      <span>₹{reconciliationMetrics.hdfcExp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  {reconMode === 'company' && (
                    <div className="flex justify-between items-center text-xs text-zinc-500 pl-3 border-b border-zinc-200/50 pb-1">
                      <span>↳ of which Paid by Directors (Non-HDFC):</span>
                      <span>₹{reconciliationMetrics.nonHdfcExp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-600 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" /> Current Bank Balance (Cash in Hand)
                    </span>
                    <span className="font-semibold text-emerald-600">
                      +₹{reconciliationMetrics.bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                <span className="text-xs font-bold text-zinc-700 uppercase">Total Outflows + Cash:</span>
                <span className="text-xl font-extrabold text-zinc-900">
                  ₹{(reconMode === 'bank' ? reconciliationMetrics.bankOutflowAndBalance : reconciliationMetrics.companyOutflowsAndBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Side B: Inflows */}
            <div className="p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {reconMode === 'bank' ? 'Side B: Bank Inflows' : 'Side B: Total Company Funding'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-zinc-200/60 text-zinc-700">
                    Inflows & Capital
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/50">
                    <span className="text-zinc-600">Customer Revenue</span>
                    <span className="font-semibold text-emerald-600">
                      ₹{reconciliationMetrics.rev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/50">
                    <span className="text-zinc-600">
                      Director's Loan Cash Deposits <span className="text-xs text-zinc-400 font-normal">(not source expenses)</span>
                    </span>
                    <span className="font-semibold text-purple-600">
                      +₹{reconciliationMetrics.dirLoan.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {reconMode === 'company' && (
                    <div className="flex justify-between items-center py-1 border-b border-zinc-200/50">
                      <span className="text-zinc-600">Director Out-of-pocket Expenses (Personal funding)</span>
                      <span className="font-semibold text-amber-700">
                        +₹{reconciliationMetrics.nonHdfcExp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {includeOtherCredits && (
                    <div className="flex justify-between items-center py-1 text-xs">
                      <span className="text-zinc-600">Other Non-Revenue Credits (Grants, FD redeem, etc.)</span>
                      <span className="font-semibold text-blue-600">
                        +₹{reconciliationMetrics.otherCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                <span className="text-xs font-bold text-zinc-700 uppercase">
                  {reconMode === 'bank' ? 'Total Bank Inflows:' : 'Total Funding Inflows:'}
                </span>
                <span className="text-xl font-extrabold text-zinc-900">
                  ₹{(reconMode === 'bank' 
                    ? (includeOtherCredits ? reconciliationMetrics.bankInflowTotal : reconciliationMetrics.bankInflowCore)
                    : (includeOtherCredits ? reconciliationMetrics.companyInflowsTotal : reconciliationMetrics.companyInflowsCore)
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Reconciliation Audit Result Box */}
          <div className={`mt-5 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            Math.abs(activeMismatch) < 1 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${Math.abs(activeMismatch) < 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {Math.abs(activeMismatch) < 1 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold">
                  {Math.abs(activeMismatch) < 1 
                    ? 'Perfect Balance — No Discrepancy Found' 
                    : `Ledger vs Bank Variance: ${activeMismatch > 0 ? '+' : '-'}₹${Math.abs(activeMismatch).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </h4>
                <div className="text-xs mt-1 text-zinc-600 space-y-1">
                  <p>
                    Equation: <code className="font-semibold bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">Total Inflows − (Outflows + Current Balance) = {activeMismatch > 0 ? '+' : '-'}₹${Math.abs(activeMismatch).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</code>.
                  </p>
                  {!includeOtherCredits && reconciliationMetrics.otherCredits > 0 && (
                    <p className="text-amber-900 font-medium">
                      Note: You have ₹{reconciliationMetrics.otherCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in other credits (Grants, FD redeem, refunds). Enabling <strong>"Include Grants & Other Credits"</strong> accounts for this amount.
                    </p>
                  )}
                  {Math.abs(activeMismatch) > 0 && (
                    <p className="text-zinc-500 text-[11px]">
                      A negative variance means recorded debits + cash exceed recorded inflows. This usually reflects the initial opening balance in the HDFC account prior to November 2023 or untracked initial capital.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0 sm:border-l sm:pl-4 border-amber-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Audit Status</span>
              <span className={`text-xs font-extrabold ${Math.abs(activeMismatch) < 1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {Math.abs(activeMismatch) < 1 ? 'RECONCILED' : 'VARIANCE DETECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Year-Wise Expense vs Revenue Section (Since Inception Nov 2023) */}
        <div 
          className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-6 font-sans"
          style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">Year-Wise Financial Performance</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 tracking-tight">
                  Since Inception (Nov 2023)
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 tracking-tight">
                Annual expense vs revenue comparison since company inception in November 2023.
              </p>
            </div>

            {/* Lifetime Inception Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-500 mr-1.5 tracking-tight">All-Time Revenue:</span>
                <span className="font-semibold text-emerald-600 tracking-tight tabular-nums">₹{lifetimeStats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-500 mr-1.5 tracking-tight">All-Time Expense:</span>
                <span className="font-semibold text-red-600 tracking-tight tabular-nums">₹{lifetimeStats.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-500 mr-1.5 tracking-tight">All-Time Net:</span>
                <span className={`font-semibold tracking-tight tabular-nums ${lifetimeStats.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {lifetimeStats.net >= 0 ? '+' : ''}₹{lifetimeStats.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({lifetimeStats.margin}%)
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Year Breakdown (Styled with Side Panel Font Family & Typography) */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                  1. Calendar Year Breakdown (Jan – Dec)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 tracking-tight">
                  Timeline Overview
                </span>
              </div>
              <span className="text-[12px] text-zinc-400 tracking-tight">
                Standard fiscal calendar metrics from founding date
              </span>
            </div>

            <div className="space-y-2.5">
              {yearlyStats.map((item) => {
                const totalTurnover = item.revenue + item.expense;
                const revPct = totalTurnover > 0 ? ((item.revenue / totalTurnover) * 100).toFixed(0) : 0;
                const expPct = totalTurnover > 0 ? ((item.expense / totalTurnover) * 100).toFixed(0) : 0;

                return (
                  <div 
                    key={item.year} 
                    className="bg-white hover:bg-zinc-50/70 p-3.5 sm:p-4 rounded-xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                  >
                    {/* Left: Year Identity with Side Panel Badge Style */}
                    <div className="flex items-center gap-3.5 lg:w-56 flex-shrink-0">
                      <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center font-medium text-[13px] tracking-tight shadow-sm flex-shrink-0">
                        <span>{item.year}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[14px] text-zinc-900 tracking-tight">{item.label}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-normal tracking-tight">{item.txCount} ledger entries</span>
                      </div>
                    </div>

                    {/* Middle: Financial Metrics (Revenue, Expense, Net) using Sidebar font styler */}
                    <div className="grid grid-cols-3 gap-4 flex-1 py-1 lg:py-0 border-y lg:border-y-0 lg:border-x border-zinc-100 lg:px-6">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
                          Revenue
                        </span>
                        <div className="font-semibold text-[14px] tracking-tight tabular-nums text-emerald-600 flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
                          Expense
                        </span>
                        <div className="font-semibold text-[14px] tracking-tight tabular-nums text-red-600 flex items-center gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>₹{item.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
                          Net Profit
                        </span>
                        <div className={`font-semibold text-[14px] tracking-tight tabular-nums ${item.net >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                          {item.net >= 0 ? '+' : ''}₹{item.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>

                    {/* Right: Revenue vs Expense Bar & Margin Badge */}
                    <div className="flex items-center gap-4 lg:w-64 flex-shrink-0 justify-between lg:justify-end">
                      <div className="w-36 flex flex-col justify-center">
                        <div className="flex justify-between text-[10px] text-zinc-500 font-medium tracking-tight mb-1">
                          <span className="text-emerald-700">Rev {revPct}%</span>
                          <span className="text-red-600">Exp {expPct}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${revPct}%` }}></div>
                          <div className="bg-red-400 h-full" style={{ width: `${expPct}%` }}></div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-tight whitespace-nowrap ${
                        item.net >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-red-50 text-red-700 border border-red-200/80'
                      }`}>
                        {item.net >= 0 ? '+' : ''}{item.margin}% margin
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* November to November Cards Sub-heading & Grid */}
          <div className="mb-6 pt-5 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                  2. November to November Performance (Anniversary Cycles)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 tracking-tight">
                  12-Month Cycles
                </span>
              </div>
              <span className="text-[12px] text-zinc-400 tracking-tight">
                12-month operational cycles starting November 1st
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {novToNovStats.map((cycle) => {
                const totalTurnover = cycle.revenue + cycle.expense;
                const revPct = totalTurnover > 0 ? ((cycle.revenue / totalTurnover) * 100).toFixed(0) : 0;
                const expPct = totalTurnover > 0 ? ((cycle.expense / totalTurnover) * 100).toFixed(0) : 0;

                return (
                  <div key={cycle.id} className="bg-gradient-to-b from-zinc-50/90 to-white hover:from-white hover:to-zinc-50 p-5 rounded-xl border border-zinc-200/90 shadow-sm transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {cycle.yearLabel}
                          </span>
                          {cycle.isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full tracking-tight">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Active Cycle
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-medium tracking-tight px-2 py-0.5 rounded ${
                          cycle.net >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {cycle.net >= 0 ? '+' : ''}{cycle.margin}% margin
                        </span>
                      </div>

                      <div className="text-[14px] font-semibold text-zinc-900 tracking-tight mb-0.5">
                        {cycle.periodLabel}
                      </div>
                      <p className="text-[11px] text-zinc-400 mb-3 tracking-tight">
                        {cycle.dateRangeText} • {cycle.txCount} transactions
                      </p>

                      <div className="space-y-2.5 text-xs">
                        {/* Revenue row */}
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 flex items-center gap-1.5 tracking-tight">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Revenue
                          </span>
                          <span className="font-semibold text-emerald-700 tracking-tight tabular-nums">
                            ₹{cycle.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>

                        {/* Expense row */}
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 flex items-center gap-1.5 tracking-tight">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span> Expense
                          </span>
                          <span className="font-semibold text-red-600 tracking-tight tabular-nums">
                            ₹{cycle.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>

                        {/* Visual proportion bar */}
                        <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden flex my-2">
                          <div className="bg-emerald-500 h-full" style={{ width: `${revPct}%` }} title={`Revenue: ${revPct}%`}></div>
                          <div className="bg-red-400 h-full" style={{ width: `${expPct}%` }} title={`Expense: ${expPct}%`}></div>
                        </div>
                      </div>
                    </div>

                    {/* Net Profit footer */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-medium tracking-tight">Cycle Net Profit:</span>
                      <span className={`font-semibold tracking-tight tabular-nums ${cycle.net >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
                        {cycle.net >= 0 ? '+' : ''}₹{cycle.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Annual Comparison Bar Chart with Mode Toggle */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-700">
                  {annualChartMode === 'novToNov' ? 'November to November Cycles Comparison' : 'Calendar Year Trend Comparison'}
                </span>
                <span className="text-zinc-400 text-[11px]">
                  ({annualChartMode === 'novToNov' ? 'Nov 1 – Oct 31 Cycles' : 'Jan 1 – Dec 31'})
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* View toggle */}
                <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                  <button
                    onClick={() => setAnnualChartMode('novToNov')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      annualChartMode === 'novToNov' ? 'bg-white text-black shadow-sm font-semibold' : 'text-zinc-500 hover:text-black'
                    }`}
                  >
                    Nov to Nov Cycles
                  </button>
                  <button
                    onClick={() => setAnnualChartMode('calendar')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      annualChartMode === 'calendar' ? 'bg-white text-black shadow-sm font-semibold' : 'text-zinc-500 hover:text-black'
                    }`}
                  >
                    Calendar Years
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Revenue
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400"></span> Expense
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-3 h-1 rounded bg-blue-600"></span> Net Profit
                  </span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={annualChartMode === 'novToNov' ? novToNovStats : yearlyStats} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={currencyFormatter} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                    formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Line type="monotone" dataKey="net" name="Net Profit" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 5, fill: '#2563eb', strokeWidth: 1.5, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Card */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Revenue</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{analysisMetrics.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Taxable: ₹{analysisMetrics.taxableRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              <span className="font-medium text-emerald-700">18% GST: ₹{analysisMetrics.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Operating Expense</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  ₹{analysisMetrics.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Top Category:</span>
              <span className="font-semibold text-zinc-800 truncate max-w-[140px]">
                {categoryData[0]?.name || 'N/A'} ({categoryData[0]?.percentage || 0}%)
              </span>
            </div>
          </div>

          {/* Net Profit Card */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Net Profit / Cashflow</p>
                <h3 className={`text-2xl font-bold mt-1 ${analysisMetrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {analysisMetrics.netProfit >= 0 ? '+' : ''}₹{analysisMetrics.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                analysisMetrics.netProfit >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}>
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Profit Margin:</span>
              <span className={`font-bold ${analysisMetrics.profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {analysisMetrics.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Capital & Funds Card */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Funds & Inflow Deposits</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">
                  ₹{analysisMetrics.creditFunds.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Director Deposits:</span>
              <span className="font-semibold text-purple-700">
                ₹{analysisMetrics.directorLoan.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-black"></div>
          <span className="text-sm font-medium text-zinc-500 mt-4">Crunching financial records...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Visualizations: Composed Monthly Chart & Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue vs Expense vs Net Profit Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">Revenue, Expenses & Net Profit Trend</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Compare monthly income against operational expenses and net gain.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Revenue
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                    <span className="w-3 h-3 rounded-sm bg-red-400"></span> Expense
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                    <span className="w-3 h-1 rounded bg-blue-600"></span> Net Profit
                  </span>
                </div>
              </div>

              <div className="h-80 w-full mt-2">
                {monthlyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyStats} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={currencyFormatter} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                        formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Line type="monotone" dataKey="net" name="Net Profit" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 1, stroke: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-400 text-sm">No transaction data available for chart</div>
                )}
              </div>
            </div>

            {/* Expense Distribution Doughnut */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-zinc-900">Expense Distribution</h3>
                  <PieChartIcon className="w-4 h-4 text-zinc-400" />
                </div>
                <p className="text-xs text-zinc-500 mb-4">Breakdown of operational spend by category.</p>
                <div className="h-56">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 8px rgba(0,0,0,0.08)' }} 
                          formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">No expense records found</div>
                  )}
                </div>
              </div>

              {/* Top Categories mini list */}
              <div className="space-y-2 mt-2 pt-3 border-t border-zinc-100 max-h-40 overflow-y-auto pr-1">
                {categoryData.slice(0, 5).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="text-zinc-700 truncate font-medium">{cat.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-semibold text-zinc-900">₹{cat.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className="text-zinc-400 ml-1.5 text-[11px]">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Outflows by Account / Source (With Director Loan Deposits) */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-900">Outflows by Account / Source</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                    With Director Loan Deposits
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Complete account breakdown tracking operational outflows alongside director capital injections.
                </p>
              </div>

              {/* Aggregated Totals Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200/60 text-xs font-medium">
                  Total Outflows: <span className="font-bold">₹{accountOutflowData.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200/60 text-xs font-medium">
                  Director Loan Deposits: <span className="font-bold">₹{accountOutflowData.totalDirectorLoanDeposits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {accountOutflowData.accounts.map((acc) => (
                <div 
                  key={acc.name}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    acc.isHDFC
                      ? 'bg-gradient-to-b from-blue-50/40 via-white to-white border-blue-200/80 shadow-xs'
                      : acc.isDirector
                        ? 'bg-gradient-to-b from-purple-50/40 via-white to-white border-purple-200/80 shadow-xs'
                        : 'bg-white border-zinc-200/80 hover:border-zinc-300'
                  }`}
                >
                  <div>
                    {/* Top Bar: Icon + Name + Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          acc.isHDFC 
                            ? 'bg-blue-100 text-blue-700' 
                            : acc.isDirector 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {acc.isHDFC ? (
                            <Landmark className="w-4 h-4" />
                          ) : acc.isDirector ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            <Wallet className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-900 truncate" title={acc.name}>
                            {acc.name}
                          </h4>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                            acc.isHDFC 
                              ? 'text-blue-600' 
                              : acc.isDirector 
                                ? 'text-purple-600' 
                                : 'text-zinc-500'
                          }`}>
                            {acc.isHDFC ? 'Primary Bank' : acc.isDirector ? 'Company Director' : 'Payment Source'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metric 1: Expense Outflow */}
                    <div className="mt-3 bg-white/80 p-2.5 rounded-lg border border-zinc-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-500 font-medium">Expense Outflow</span>
                        <span className="text-zinc-900 font-bold">
                          ₹{acc.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${acc.isHDFC ? 'bg-blue-600' : 'bg-red-500'}`}
                          style={{ width: `${Math.max(Number(acc.expensePercentage), acc.expense > 0 ? 3 : 0)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                        <span>{acc.isHDFC ? 'Company debits' : 'Out-of-pocket'}</span>
                        <span>{acc.expensePercentage}% of outflows</span>
                      </div>
                    </div>

                    {/* Metric 2: Director Loan Deposit */}
                    <div className="mt-2.5 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-800 font-medium">
                          {acc.isHDFC ? 'Loan Deposits In' : "Director's Loan Deposit"}
                        </span>
                        <span className="text-purple-900 font-bold">
                          ₹{acc.directorLoanDeposit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-600/80 mt-1">
                        {acc.isHDFC 
                          ? 'Deposited into HDFC account' 
                          : acc.isDirector 
                            ? 'Capital loan deposit contribution' 
                            : 'Deposited funds'}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Total Combined / Activity */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">
                      {acc.isDirector ? 'Total Director Inflow:' : 'Total Volume:'}
                    </span>
                    <span className="font-semibold text-zinc-800">
                      ₹{acc.totalActivity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Financial Breakdown Table (Placed below Outflows by Account) */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Monthly Statement Summary</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Aggregated ledger performance per calendar month.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                <span>{monthlyStats.length} Months Recorded</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Month</th>
                    <th className="py-3 px-5 text-right">Revenue</th>
                    <th className="py-3 px-5 text-right">Expenses</th>
                    <th className="py-3 px-5 text-right">Net Profit</th>
                    <th className="py-3 px-5 text-right">Margin</th>
                    <th className="py-3 px-5 text-center">Tx Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {monthlyStats.slice().reverse().map((row) => (
                    <tr key={row.month} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-5 font-medium text-zinc-900">
                        {row.label}
                      </td>
                      <td className="py-3 px-5 text-right font-semibold text-emerald-600">
                        ₹{row.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-5 text-right font-semibold text-red-600">
                        ₹{row.expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-5 text-right font-bold ${row.net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {row.net >= 0 ? '+' : ''}₹{row.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          row.net >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {row.margin}%
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center text-xs text-zinc-500">
                        {row.txCount}
                      </td>
                    </tr>
                  ))}
                  {monthlyStats.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-zinc-400 text-xs">
                        No statement records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
