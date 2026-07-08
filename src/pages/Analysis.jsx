import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Users, ChevronLeft, ChevronRight, CheckSquare, User, Calendar, PieChart,
  BarChart2, Target, Megaphone, Activity, Layers, TrendingUp, Zap
} from 'lucide-react';

// ─── Helper: extract YYYY-MM-DD from item ──────────────
const getItemDate = (item) => {
  if (item.date) return item.date;
  if (item.createdAt?.seconds) {
    const d = new Date(item.createdAt.seconds * 1000);
    return d.toISOString().slice(0, 10);
  }
  return null;
};

// ─── Helper: get employee / associate name ──────────────
const getEmployee = (item) =>
  item.employeeName || item.assignedToName || item.addedByName || 'Unknown';

// ─── Main Component ─────────────────────────────────────
export default function Analysis() {
  const [regularLeads, setRegularLeads] = useState([]);
  const [adLeads, setAdLeads] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showLeads, setShowLeads] = useState(true);
  const [showAdLeads, setShowAdLeads] = useState(true);
  const [showDistributors, setShowDistributors] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());

  // ── Fetch data ────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
        const [leadsSnap, adSnap, distSnap] = await Promise.all([
          getDoc(doc(db, 'userData', userId, 'crmData', 'leads')),
          getDoc(doc(db, 'userData', userId, 'crmData', 'adLeads')),
          getDoc(doc(db, 'userData', userId, 'crmData', 'distributors')),
        ]);
        if (leadsSnap.exists()) setRegularLeads(leadsSnap.data().items || []);
        if (adSnap.exists()) setAdLeads(adSnap.data().items || []);
        if (distSnap.exists()) setDistributors(distSnap.data().items || []);
      } catch (e) {
        console.error('Error fetching CRM data for analysis:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Filtered master dataset ───────────────────────────
  const filtered = useMemo(() => {
    let pool = [];
    if (showLeads) pool = pool.concat(regularLeads.map(i => ({ ...i, _type: 'lead' })));
    if (showAdLeads) pool = pool.concat(adLeads.map(i => ({ ...i, _type: 'adLead' })));
    if (showDistributors) pool = pool.concat(distributors.map(i => ({ ...i, _type: 'distributor' })));
    if (employeeFilter) pool = pool.filter(i => getEmployee(i) === employeeFilter);
    return pool;
  }, [regularLeads, adLeads, distributors, showLeads, showAdLeads, showDistributors, employeeFilter]);

  // ── Unique employees ──────────────────────────────────
  const allEmployees = useMemo(() => {
    const names = new Set();
    regularLeads.forEach(i => names.add(getEmployee(i)));
    adLeads.forEach(i => names.add(getEmployee(i)));
    distributors.forEach(i => names.add(getEmployee(i)));
    return [...names].sort();
  }, [regularLeads, adLeads, distributors]);

  // ── Derived stats ─────────────────────────────────────
  const stats = useMemo(() => {
    const total = filtered.length;
    const leads = filtered.filter(i => i._type === 'lead').length;
    const ads = filtered.filter(i => i._type === 'adLead').length;
    const dists = filtered.filter(i => i._type === 'distributor').length;

    const statusMap = {};
    filtered.forEach(i => {
      const s = i.currentStatus || 'N/A';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCount = filtered.filter(i => {
      const d = getItemDate(i);
      return d && d.startsWith(thisMonth);
    }).length;

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthCount = filtered.filter(i => {
      const d = getItemDate(i);
      return d && d.startsWith(lastMonthStr);
    }).length;

    const trend = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : thisMonthCount > 0 ? 100 : 0;

    // conversion rate (contacted / total)
    const contacted = filtered.filter(i =>
      (i.currentStatus || '').toLowerCase().includes('contact') ||
      (i.currentStatus || '').toLowerCase().includes('meeting') ||
      (i.currentStatus || '').toLowerCase().includes('demo') ||
      (i.currentStatus || '').toLowerCase().includes('converted')
    ).length;
    const convRate = total > 0 ? Math.round((contacted / total) * 100) : 0;

    // region distribution
    const regionMap = {};
    filtered.forEach(i => {
      const r = i.place || i.region || i.state || 'Unknown';
      regionMap[r] = (regionMap[r] || 0) + 1;
    });
    const topRegions = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { total, leads, ads, dists, statusMap, thisMonthCount, trend, convRate, topRegions };
  }, [filtered]);

  // ── Calendar data ─────────────────────────────────────
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const dayMap = {};
    filtered.forEach(item => {
      const d = getItemDate(item);
      if (d && d.startsWith(prefix)) {
        const day = parseInt(d.slice(8, 10), 10);
        if (!dayMap[day]) dayMap[day] = { leads: 0, adLeads: 0, distributors: 0, total: 0 };
        if (item._type === 'lead') dayMap[day].leads++;
        else if (item._type === 'adLead') dayMap[day].adLeads++;
        else if (item._type === 'distributor') dayMap[day].distributors++;
        dayMap[day].total++;
      }
    });
    return dayMap;
  }, [filtered, calendarDate]);

  // ── Calendar grid generation ──────────────────────────
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();   // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);  // blanks
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calendarDate]);

  // ── Monthly Totals ────────────────────────────────────
  const monthlyTotals = useMemo(() => {
    let leads = 0;
    let adLeads = 0;
    let distributors = 0;
    Object.values(calendarData).forEach(day => {
      leads += day.leads;
      adLeads += day.adLeads;
      distributors += day.distributors;
    });
    return { leads, adLeads, distributors, total: leads + adLeads + distributors };
  }, [calendarData]);

  const monthLabel = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const navigateMonth = (delta) => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const isToday = (day) => {
    const now = new Date();
    return day === now.getDate() && calendarDate.getMonth() === now.getMonth() && calendarDate.getFullYear() === now.getFullYear();
  };

  // ── Status color helper ───────────────────────────────
  const getStatusColor = (status) => {
    if (!status) return 'bg-zinc-50 text-zinc-600';
    const s = status.toLowerCase();
    if (s.includes('lost') || s.includes('fail') || s.includes('cancel')) return 'bg-red-50 text-red-700';
    if (s.includes('won') || s.includes('success') || s.includes('converted')) return 'bg-emerald-50 text-emerald-700';
    if (s.includes('progress') || s.includes('contacted') || s.includes('discuss')) return 'bg-blue-50 text-blue-700';
    if (s.includes('meeting') || s.includes('schedule') || s.includes('demo')) return 'bg-purple-50 text-purple-700';
    if (s.includes('active') || s.includes('onboard')) return 'bg-emerald-50 text-emerald-700';
    if (s.includes('new') || s.includes('lead')) return 'bg-sky-50 text-sky-700';
    return 'bg-amber-50 text-amber-700';
  };

  // ── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">CRM Analysis</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Comprehensive performance insights across all pipelines.</p>
        </div>
      </header>

      {/* ── Filters Bar ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-center gap-4">
        {/* Data-source toggles */}
        <div className="flex items-center gap-4">
          {[
            { label: 'Regular Leads', count: regularLeads.length, checked: showLeads, toggle: () => setShowLeads(!showLeads), color: 'bg-blue-500' },
            { label: 'Ad Leads', count: adLeads.length, checked: showAdLeads, toggle: () => setShowAdLeads(!showAdLeads), color: 'bg-purple-500' },
            { label: 'Distributors', count: distributors.length, checked: showDistributors, toggle: () => setShowDistributors(!showDistributors), color: 'bg-emerald-500' },
          ].map(opt => (
            <label
              key={opt.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer select-none transition-all text-[13px] font-medium border ${
                opt.checked
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <input
                type="checkbox"
                checked={opt.checked}
                onChange={opt.toggle}
                className="sr-only"
              />
              <span className={`w-2 h-2 rounded-full ${opt.checked ? 'bg-white' : opt.color}`}></span>
              {opt.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${opt.checked ? 'bg-white/20' : 'bg-zinc-200 text-zinc-500'}`}>
                {opt.count}
              </span>
            </label>
          ))}
        </div>

        {/* Employee filter */}
        <div className="relative lg:ml-auto w-full lg:w-56">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 outline-none rounded-xl text-[13px] transition-all appearance-none cursor-pointer text-zinc-700"
          >
            <option value="">All Associates</option>
            {allEmployees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Compact Stats Strip ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-zinc-900', bg: 'bg-zinc-100', icon: Layers, iconColor: 'text-zinc-600' },
          { label: 'Leads', value: stats.leads, color: 'text-blue-700', bg: 'bg-blue-50', icon: Target, iconColor: 'text-blue-600' },
          { label: 'Ad Leads', value: stats.ads, color: 'text-purple-700', bg: 'bg-purple-50', icon: Megaphone, iconColor: 'text-purple-600' },
          { label: 'Distributors', value: stats.dists, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Users, iconColor: 'text-emerald-600' },
          { label: 'This Month', value: stats.thisMonthCount, color: 'text-amber-700', bg: 'bg-amber-50', trend: stats.trend, icon: Zap, iconColor: 'text-amber-600' },
          { label: 'Engaged', value: `${stats.convRate}%`, color: 'text-sky-700', bg: 'bg-sky-50', icon: Activity, iconColor: 'text-sky-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-full border border-zinc-200/80 p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center pr-4 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <div className="ml-3 flex-1 flex flex-col justify-center">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none mb-1">{s.label}</span>
              <div className="flex items-center justify-between">
                <span className={`text-[15px] font-bold leading-none tracking-tight ${s.color}`}>{s.value}</span>
                {s.trend !== undefined && (
                  <span className={`flex items-center text-[10px] font-bold ${s.trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {s.trend >= 0 ? '↑' : '↓'}{Math.abs(s.trend)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar Section ─────────────────────────────*/}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <h3 className="text-[14px] font-semibold text-zinc-800">{monthLabel}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCalendarDate(new Date());
              }}
              className="px-3 py-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar legend and totals */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Leads <span className="text-zinc-900 font-bold ml-0.5">{monthlyTotals.leads}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> Ad Leads <span className="text-zinc-900 font-bold ml-0.5">{monthlyTotals.adLeads}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Distributors <span className="text-zinc-900 font-bold ml-0.5">{monthlyTotals.distributors}</span>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-600 bg-white px-2 py-1 rounded shadow-sm border border-zinc-200">
            Monthly Total: <span className="text-black">{monthlyTotals.total}</span>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-wider py-2.5 border-b border-zinc-100">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarGrid.map((day, idx) => {
            const data = day ? calendarData[day] : null;
            const today = day ? isToday(day) : false;
            return (
              <div
                key={idx}
                className={`min-h-[80px] border-b border-r border-zinc-100 p-2 transition-colors ${
                  day ? 'hover:bg-zinc-50/80 cursor-default' : 'bg-zinc-50/30'
                } ${today ? 'bg-blue-50/40' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-[12px] font-semibold mb-1.5 flex items-center justify-between ${today ? 'text-blue-600' : 'text-zinc-600'}`}>
                      {day}
                      {today && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Today</span>}
                    </div>
                    {data && (
                      <div className="space-y-1">
                        {data.leads > 0 && (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-blue-50/80 text-blue-700">
                            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                            <span className="text-[9px] font-semibold">{data.leads} Lead{data.leads > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {data.adLeads > 0 && (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-purple-50/80 text-purple-700">
                            <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                            <span className="text-[9px] font-semibold">{data.adLeads} Ad Lead{data.adLeads > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {data.distributors > 0 && (
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-50/80 text-emerald-700">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            <span className="text-[9px] font-semibold">{data.distributors} Dist{data.distributors > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Insights Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <div className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <h3 className="text-[13px] font-semibold text-zinc-700 mb-4 flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
            Status Breakdown
          </h3>
          <div className="space-y-2.5">
            {Object.entries(stats.statusMap)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3 group">
                    <div className="w-28 text-[11px] text-zinc-600 font-medium truncate group-hover:text-zinc-900 transition-colors">{status}</div>
                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        getStatusColor(status).includes('red') ? 'bg-red-400' :
                        getStatusColor(status).includes('emerald') ? 'bg-emerald-400' :
                        getStatusColor(status).includes('blue') ? 'bg-blue-400' :
                        getStatusColor(status).includes('purple') ? 'bg-purple-400' :
                        getStatusColor(status).includes('sky') ? 'bg-sky-400' :
                        'bg-amber-400'
                      }`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-semibold w-14 text-right">{count} <span className="text-zinc-300">({pct}%)</span></div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Regions */}
        <div className="bg-white rounded-xl border border-zinc-200/80 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <h3 className="text-[13px] font-semibold text-zinc-700 mb-4 flex items-center gap-2">
            <PieChart className="w-3.5 h-3.5 text-zinc-400" />
            Top Regions
          </h3>
          <div className="space-y-2.5">
            {stats.topRegions.map(([region, count]) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={region} className="flex items-center gap-3 group">
                  <div className="w-28 text-[11px] text-zinc-600 font-medium truncate group-hover:text-zinc-900 transition-colors">{region}</div>
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-800 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-semibold w-14 text-right">{count} <span className="text-zinc-300">({pct}%)</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
