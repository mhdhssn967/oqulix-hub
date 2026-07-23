import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { X, Filter, User, IndianRupee } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export default function ReimbursementAnalysis({ reimbursements, onClose }) {
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [clientSearchFocused, setClientSearchFocused] = useState(false);

  // We only analyze "Sent" reimbursements since those are the actual payouts
  const sentReimbursements = useMemo(() => {
    return reimbursements.filter(r => r.status === 'Sent' || r.status === 'Approved & Sent');
  }, [reimbursements]);

  // Unique lists for filters
  const expenseTypes = useMemo(() => {
    const types = new Set(sentReimbursements.map(r => r.expenseType || 'Unknown'));
    return Array.from(types).sort();
  }, [sentReimbursements]);

  const segments = useMemo(() => {
    const segs = new Set(sentReimbursements.map(r => r.segment || 'General'));
    return Array.from(segs).sort();
  }, [sentReimbursements]);

  const uniqueClients = useMemo(() => {
    const clients = new Set();
    sentReimbursements.forEach(r => {
      if (r.clientName) clients.add(r.clientName);
    });
    return Array.from(clients).sort();
  }, [sentReimbursements]);

  // Apply filters
  const filteredData = useMemo(() => {
    return sentReimbursements.filter(r => {
      if (expenseFilter !== 'all' && (r.expenseType || 'Unknown') !== expenseFilter) return false;
      if (segmentFilter !== 'all' && (r.segment || 'General') !== segmentFilter) return false;
      if (clientFilter.trim() !== '') {
        const clientName = (r.clientName || '').toLowerCase();
        if (!clientName.includes(clientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [sentReimbursements, expenseFilter, segmentFilter, clientFilter]);

  // Aggregations
  const employeeStats = useMemo(() => {
    const stats = {};
    filteredData.forEach(r => {
      const emp = r.employeeName || 'Unknown';
      if (!stats[emp]) stats[emp] = 0;
      stats[emp] += Number(r.amount || 0);
    });
    return Object.entries(stats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const segmentData = useMemo(() => {
    const stats = {};
    filteredData.forEach(r => {
      const seg = r.segment || 'General';
      if (!stats[seg]) stats[seg] = 0;
      stats[seg] += Number(r.amount || 0);
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const expenseData = useMemo(() => {
    const stats = {};
    filteredData.forEach(r => {
      const ext = r.expenseType || 'Unknown';
      if (!stats[ext]) stats[ext] = 0;
      stats[ext] += Number(r.amount || 0);
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const totalAmount = filteredData.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  return (
    <div className="w-full flex flex-col mb-8 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50 flex-shrink-0">
        <h2 className="text-[16px] font-bold text-zinc-900 flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-emerald-600" />
          Reimbursement Analysis
        </h2>
      </div>
      
      <div className="p-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full min-w-[200px]">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter by Segment
              </label>
              <select 
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="all">All Segments</option>
                {segments.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full min-w-[200px]">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter by Expense Type
              </label>
              <select 
                value={expenseFilter}
                onChange={(e) => setExpenseFilter(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="all">All Types</option>
                {expenseTypes.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full min-w-[200px] relative">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Search by Client Name
              </label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Type client name..."
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  onFocus={() => setClientSearchFocused(true)}
                  onBlur={() => setTimeout(() => setClientSearchFocused(false), 200)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 pr-8"
                />
                {clientFilter && (
                  <button 
                    onClick={() => setClientFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {clientSearchFocused && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto no-scrollbar">
                  {uniqueClients.length === 0 ? (
                    <div className="px-3 py-2 text-[13px] text-zinc-500 italic">No clients found</div>
                  ) : uniqueClients.filter(c => c.toLowerCase().includes(clientFilter.toLowerCase())).length > 0 ? (
                    uniqueClients.filter(c => c.toLowerCase().includes(clientFilter.toLowerCase())).map((client, idx) => (
                      <div 
                        key={`${client}-${idx}`}
                        className="px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 cursor-pointer border-b border-zinc-100 last:border-0"
                        onMouseDown={() => setClientFilter(client)}
                      >
                        {client}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[13px] text-zinc-500 italic">No matching clients</div>
                  )}
                </div>
              )}
            </div>
            <div className="bg-emerald-50 px-5 py-2 border border-emerald-200 rounded-lg h-[42px] flex items-center gap-3 min-w-[200px] justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total</span>
              <span className="text-emerald-700 font-bold text-lg">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Segments Pie Chart */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[340px] flex flex-col">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Reimbursements by Segment</h3>
              <div className="flex-1 min-h-0">
                {segmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={segmentData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {segmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-sm">No data available</div>
                )}
              </div>
            </div>

            {/* Expense Type Pie Chart */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] h-[340px] flex flex-col">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Reimbursements by Expense Type</h3>
              <div className="flex-1 min-h-0">
                {expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-sm">No data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Employee Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Employee Reimbursement Breakdown</h3>
            {employeeStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-500 border-y border-zinc-100">
                    <tr>
                      <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Employee Name</th>
                      <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px] text-right">Total Reimbursed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {employeeStats.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-zinc-400" />
                          {emp.name}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 text-right">
                          ₹{emp.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-400 text-sm">
                No reimbursement data matches the selected filters.
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
