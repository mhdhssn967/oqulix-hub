import React, { useState, useMemo } from 'react';
import { X, Download, FileText, ChevronRight, Check, AlertCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const isPhoneIrregular = (phone) => {
  if (!phone || phone === 'N/A') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length < 8 || digits.length > 15;
};

const ReportGenerator = ({ isOpen, onClose, allData, allEmployees }) => {
  const [step, setStep] = useState(1); // 1: Config, 2: Preview
  
  // Data Types Selection
  const [selectedTypes, setSelectedTypes] = useState({
    leads: true,
    adLeads: true,
    distributors: true
  });

  // Employee Selection
  const [selectedEmployees, setSelectedEmployees] = useState(
    allEmployees.reduce((acc, emp) => ({ ...acc, [emp]: true }), {})
  );

  // Extract all unique months from data (YYYY-MM)
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    const addMonth = (item) => {
      const d = item.date || (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toISOString().slice(0, 10) : null);
      if (d) months.add(d.slice(0, 7)); // YYYY-MM
    };
    allData.leads.forEach(addMonth);
    allData.adLeads.forEach(addMonth);
    allData.distributors.forEach(addMonth);
    return Array.from(months).sort();
  }, [allData]);

  const [fromMonth, setFromMonth] = useState(uniqueMonths[0] || '');
  const [toMonth, setToMonth] = useState(uniqueMonths[uniqueMonths.length - 1] || '');

  // Filter Data based on config
  const filteredData = useMemo(() => {
    if (step !== 2) return { leads: [], adLeads: [], distributors: [] };

    const filterItems = (items, isSelected) => {
      if (!isSelected) return [];
      return items.filter(item => {
        const emp = item.employeeName || item.assignedToName || item.addedByName || 'Unknown';
        if (!selectedEmployees[emp]) return false;
        
        const d = item.date || (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toISOString().slice(0, 10) : null);
        if (!d) return false;
        const month = d.slice(0, 7);
        if (month < fromMonth || month > toMonth) return false;
        
        return true;
      });
    };

    return {
      leads: filterItems(allData.leads, selectedTypes.leads),
      adLeads: filterItems(allData.adLeads, selectedTypes.adLeads),
      distributors: filterItems(allData.distributors, selectedTypes.distributors)
    };
  }, [allData, selectedTypes, selectedEmployees, fromMonth, toMonth, step]);

  const generateMonthRange = (start, end) => {
    const months = [];
    if (!start || !end) return months;
    let current = new Date(`${start}-01T00:00:00`);
    const endDate = new Date(`${end}-01T00:00:00`);
    while (current <= endDate) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };

  const reportMonths = useMemo(() => {
    return generateMonthRange(fromMonth, toMonth);
  }, [fromMonth, toMonth]);

  const employeeStats = useMemo(() => {
    if (step !== 2) return {};
    const stats = {};
    
    // Initialize stats
    Object.keys(selectedEmployees).forEach(emp => {
      if (selectedEmployees[emp]) {
        stats[emp] = { 
          total: { leads: 0, adLeads: 0, distributors: 0, all: 0 },
          months: {}
        };
        reportMonths.forEach(m => {
          stats[emp].months[m] = { leads: 0, adLeads: 0, distributors: 0 };
        });
      }
    });

    const process = (items, type) => {
      items.forEach(item => {
        const emp = item.employeeName || item.assignedToName || item.addedByName || 'Unknown';
        if (!stats[emp]) return;
        
        const d = item.date || (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toISOString().slice(0, 10) : null);
        if (!d) return;
        const m = d.slice(0, 7);
        
        if (stats[emp].months[m]) {
          stats[emp].months[m][type]++;
          stats[emp].total[type]++;
          stats[emp].total.all++;
        }
      });
    };

    process(filteredData.leads, 'leads');
    process(filteredData.adLeads, 'adLeads');
    process(filteredData.distributors, 'distributors');
    return stats;
  }, [filteredData, step, selectedEmployees, reportMonths]);

  const employeeRawData = useMemo(() => {
    if (step !== 2) return {};
    const dataByEmp = {};
    
    // Initialize dataByEmp
    Object.keys(selectedEmployees).forEach(emp => {
      if (selectedEmployees[emp]) {
        dataByEmp[emp] = {};
        reportMonths.forEach(m => {
          dataByEmp[emp][m] = [];
        });
      }
    });

    const processItems = (items, typeKey) => {
      items.forEach(item => {
        const emp = item.employeeName || item.assignedToName || item.addedByName || 'Unknown';
        if (!dataByEmp[emp]) return;
        const d = item.date || (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toISOString().slice(0, 10) : null);
        if (!d) return;
        const m = d.slice(0, 7);
        if (dataByEmp[emp][m]) {
          dataByEmp[emp][m].push({ ...item, _type: typeKey });
        }
      });
    };

    if (selectedTypes.leads) processItems(filteredData.leads, 'leads');
    if (selectedTypes.adLeads) processItems(filteredData.adLeads, 'adLeads');
    if (selectedTypes.distributors) processItems(filteredData.distributors, 'distributors');
    
    // Sort items by date within each month
    Object.keys(dataByEmp).forEach(emp => {
      Object.keys(dataByEmp[emp]).forEach(m => {
        dataByEmp[emp][m].sort((a, b) => {
          const dA = a.date || (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toISOString() : '');
          const dB = b.date || (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toISOString() : '');
          return dA.localeCompare(dB);
        });
      });
    });

    return dataByEmp;
  }, [filteredData, step, selectedEmployees, reportMonths, selectedTypes]);

  const formatMonthLabel = (yyyyMm) => {
    const d = new Date(`${yyyyMm}-01T00:00:00`);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  };

  const A4Page = ({ children }) => (
    <div className="bg-white w-[210mm] min-h-[297mm] mx-auto mb-10 shadow-lg border border-zinc-300 relative overflow-hidden print:w-auto print:min-h-0 print:p-0 print:m-0 print:shadow-none print:border-0" style={{ padding: '15mm', breakAfter: 'page' }}>
      {children}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:absolute print:inset-0 print:p-0 print:flex-none print:items-start print:justify-start">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:h-auto print:overflow-visible print:max-w-none print:rounded-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-zinc-600" />
            <h2 className="text-[18px] font-bold text-zinc-900">
              {step === 1 ? 'Configure Report' : 'Report Preview'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-200 transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-50/30 print:overflow-visible print:bg-white">
          {step === 1 ? (
            <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-8">
              
              {/* Date Range */}
              <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="text-[14px] font-bold text-zinc-800 mb-4 uppercase tracking-wider">1. Select Date Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] text-zinc-500 font-medium mb-1.5">From Month</label>
                    <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none">
                      {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] text-zinc-500 font-medium mb-1.5">To Month</label>
                    <select value={toMonth} onChange={(e) => setToMonth(e.target.value)} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none">
                      {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Data Types */}
              <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="text-[14px] font-bold text-zinc-800 mb-4 uppercase tracking-wider">2. Include Data Types</h3>
                <div className="flex gap-4">
                  {[
                    { key: 'leads', label: 'Regular Leads' },
                    { key: 'adLeads', label: 'Ad Leads' },
                    { key: 'distributors', label: 'Distributors' }
                  ].map(type => (
                    <label key={type.key} className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedTypes[type.key] ? 'bg-black text-white border-black' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={selectedTypes[type.key]} 
                        onChange={() => setSelectedTypes(p => ({ ...p, [type.key]: !p[type.key] }))} 
                      />
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedTypes[type.key] ? 'border-white bg-white/20' : 'border-zinc-300 bg-white'}`}>
                        {selectedTypes[type.key] && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="font-medium text-[13px]">{type.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Employees */}
              <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold text-zinc-800 uppercase tracking-wider">3. Select Associates</h3>
                  <button 
                    onClick={() => {
                      const allSelected = Object.values(selectedEmployees).every(Boolean);
                      const newState = {};
                      allEmployees.forEach(emp => newState[emp] = !allSelected);
                      setSelectedEmployees(newState);
                    }}
                    className="text-[12px] font-medium text-blue-600 hover:underline"
                  >
                    Toggle All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allEmployees.map(emp => (
                    <label key={emp} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${selectedEmployees[emp] ? 'bg-blue-50/50 border-blue-200 text-blue-900' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={selectedEmployees[emp]} 
                        onChange={() => setSelectedEmployees(p => ({ ...p, [emp]: !p[emp] }))} 
                      />
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${selectedEmployees[emp] ? 'border-blue-500 bg-blue-500' : 'border-zinc-300 bg-white'}`}>
                        {selectedEmployees[emp] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-semibold text-[12px] truncate">{emp}</span>
                    </label>
                  ))}
                </div>
              </section>

            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-200/80 print:overflow-visible print:h-auto print:p-0 print:bg-white">
              {/* ACTUAL REPORT PREVIEW PAGE */}
              <div id="report-preview-content" className="font-sans text-black pb-12 print:pb-0">
                
                {/* PAGE 1: Summary & Trends */}
                <A4Page>
                  {/* Header */}
                  <div className="bg-black text-white p-8 rounded-xl flex items-center justify-between mb-8 print:break-inside-avoid">
                    <img src="/logo_transp.png" alt="Oqulix Logo" className="h-10 object-contain" />
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Generated Report</div>
                      <div className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                  </div>

                  {/* Summary Sentence */}
                  <div className="border-l-4 border-black pl-5 mb-10 print:break-inside-avoid">
                    <p className="text-[16px] text-zinc-700 leading-relaxed font-serif">
                      This document contains a comprehensive analysis of business pipeline activity from <strong className="text-black">{fromMonth}</strong> to <strong className="text-black">{toMonth}</strong>. 
                      It includes performance data for <strong className="text-black capitalize">{Object.entries(selectedTypes).filter(x => x[1]).map(x => x[0].replace('adLeads', 'Ad Leads')).join(', ')}</strong> managed by <strong className="text-black">{Object.entries(selectedEmployees).filter(x => x[1]).length}</strong> selected associates.
                    </p>
                  </div>

                  {/* Main Stats */}
                  <div className="grid grid-cols-3 gap-6 mb-12 print:break-inside-avoid">
                    <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200 text-center shadow-sm">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Total Leads</div>
                      <div className="text-3xl font-black text-blue-600">{filteredData.leads.length}</div>
                    </div>
                    <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200 text-center shadow-sm">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Total Ad Leads</div>
                      <div className="text-3xl font-black text-purple-600">{filteredData.adLeads.length}</div>
                    </div>
                    <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200 text-center shadow-sm">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Total Distributors</div>
                      <div className="text-3xl font-black text-amber-600">{filteredData.distributors.length}</div>
                    </div>
                  </div>

                  {/* Associate Performance Summary */}
                  <div className="mb-8 print:break-inside-avoid">
                    <h2 className="text-[18px] font-bold text-black border-b-2 border-black pb-2 mb-6 uppercase tracking-wider">Associate Summary View</h2>
                    
                    <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden print:border-0 print:shadow-none">
                      {Object.entries(employeeStats).sort((a, b) => b[1].total.all - a[1].total.all).map(([emp, stats]) => {
                        if (stats.total.all === 0) return null;
                        
                        const leadPct = (stats.total.leads / stats.total.all) * 100 || 0;
                        const adPct = (stats.total.adLeads / stats.total.all) * 100 || 0;
                        
                        const pieStyle = {
                          background: `conic-gradient(
                            #6366f1 0% ${leadPct}%, 
                            #f43f5e ${leadPct}% ${leadPct + adPct}%, 
                            #f59e0b ${leadPct + adPct}% 100%
                          )`
                        };

                        return (
                          <div key={emp} className="flex items-center justify-between p-4 border-b border-zinc-100 last:border-0">
                            <h3 className="text-[13px] font-bold text-black w-48 truncate">{emp}</h3>
                            
                            <div className="flex-1 flex items-center justify-end gap-6 mr-6">
                              {selectedTypes.leads && (
                                <div className="text-[11px] font-semibold text-zinc-500 w-16 text-right">
                                  <span className="text-indigo-600 font-bold">{stats.total.leads}</span> L
                                </div>
                              )}
                              {selectedTypes.adLeads && (
                                <div className="text-[11px] font-semibold text-zinc-500 w-16 text-right">
                                  <span className="text-rose-600 font-bold">{stats.total.adLeads}</span> A
                                </div>
                              )}
                              {selectedTypes.distributors && (
                                <div className="text-[11px] font-semibold text-zinc-500 w-16 text-right">
                                  <span className="text-amber-600 font-bold">{stats.total.distributors}</span> D
                                </div>
                              )}
                              <div className="text-[12px] font-bold text-black w-16 text-right">
                                {stats.total.all}
                              </div>
                            </div>

                            <div className="shrink-0 w-8 h-8 rounded-full shadow-inner border border-zinc-200" style={pieStyle}></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Associate Line Graphs */}
                  <div className="print:break-inside-avoid">
                    <h2 className="text-[18px] font-bold text-black border-b-2 border-black pb-2 mb-6 uppercase tracking-wider">Performance Trends</h2>
                    
                    {/* Chart Legend */}
                    <div className="flex items-center gap-6 mb-8 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                      <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">Legend:</span>
                      <div className="flex items-center gap-2 text-[12px] font-bold text-black">
                        <span className="w-4 h-1 rounded-full bg-blue-600"></span> Total Pipeline Activity
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {Object.entries(employeeStats).sort((a, b) => b[1].total.all - a[1].total.all).map(([emp, stats]) => {
                        if (stats.total.all === 0 || reportMonths.length < 2) return null;

                        const width = 300;
                        const height = 120;
                        const padding = 15;
                        
                        const data = reportMonths.map(m => {
                          const s = stats.months[m] || { leads: 0, adLeads: 0, distributors: 0 };
                          return {
                            leads: s.leads,
                            adLeads: s.adLeads,
                            distributors: s.distributors,
                            total: s.leads + s.adLeads + s.distributors
                          };
                        });

                        const maxY = Math.max(...data.map(d => d.total), 1);
                        
                        const getPoints = (key) => {
                          return data.map((d, i) => {
                            const x = padding + (i * (width - 2 * padding) / Math.max(1, reportMonths.length - 1));
                            const y = height - padding - ((d[key] / maxY) * (height - 2 * padding));
                            return `${x},${y}`;
                          }).join(' ');
                        };

                        return (
                          <div key={`chart-${emp}`} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                            <h3 className="text-[13px] font-bold text-black mb-4 truncate">{emp}</h3>
                            <div className="relative">
                              {/* Y-Axis max label */}
                              <div className="absolute top-0 left-0 text-[9px] font-bold text-zinc-400">{maxY}</div>
                              <div className="absolute bottom-2 left-0 text-[9px] font-bold text-zinc-400">0</div>
                              
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                                {/* Grid lines */}
                                <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#f4f4f5" strokeWidth="1" />
                                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#f4f4f5" strokeWidth="1" />
                                <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#f4f4f5" strokeWidth="1" />
                                
                                {/* Total Line */}
                                <polyline fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={getPoints('total')} />
                                
                                {/* Points for Total Line to make it pop */}
                                {data.map((d, i) => {
                                  const x = padding + (i * (width - 2 * padding) / Math.max(1, reportMonths.length - 1));
                                  const y = height - padding - ((d.total / maxY) * (height - 2 * padding));
                                  return <circle key={i} cx={x} cy={y} r="2.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1" />;
                                })}
                              </svg>
                              
                              {/* X-Axis labels (First and Last month) */}
                              <div className="flex justify-between mt-2 text-[9px] font-bold text-zinc-400">
                                <span>{formatMonthLabel(reportMonths[0])}</span>
                                {reportMonths.length > 2 && <span>{formatMonthLabel(reportMonths[Math.floor(reportMonths.length/2)])}</span>}
                                <span>{formatMonthLabel(reportMonths[reportMonths.length - 1])}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {reportMonths.length < 2 && (
                      <div className="text-[13px] text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                        Line graphs require at least 2 months of selected data to show a trend. Please select a wider date range.
                      </div>
                    )}
                  </div>
                </A4Page>

                {/* PAGE 2: Comprehensive Month-by-Month Table */}
                <A4Page>
                  <div className="print:break-before-page">
                  <h2 className="text-[18px] font-bold text-black border-b-2 border-black pb-2 mb-6 uppercase tracking-wider">Month-by-Month Breakdown</h2>
                  
                  <div className="space-y-8">
                    {(() => {
                      const chunkArray = (arr, size) => {
                        const res = [];
                        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
                        return res;
                      };
                      
                      const monthChunks = chunkArray(reportMonths, 4);
                      if (monthChunks.length === 0) return <div className="text-sm text-zinc-500">No data for selected range.</div>;

                      return monthChunks.map((chunk, chunkIdx) => {
                        const isLastChunk = chunkIdx === monthChunks.length - 1;
                        
                        return (
                          <div key={chunkIdx} className="overflow-x-hidden print:break-inside-avoid border border-zinc-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse bg-white text-[10px]">
                              <thead>
                                <tr>
                                  <th rowSpan="2" className="border-b border-r border-zinc-200 p-2 font-bold text-zinc-700 bg-zinc-50 uppercase tracking-wider w-[140px] truncate">
                                    EMPLOYEE
                                  </th>
                                  {chunk.map(m => (
                                    <th key={m} colSpan={Object.values(selectedTypes).filter(Boolean).length} className="border-b border-r border-zinc-200 p-2 font-bold text-zinc-700 bg-zinc-50 uppercase tracking-wider text-center">
                                      {formatMonthLabel(m)}
                                    </th>
                                  ))}
                                  {isLastChunk && (
                                    <th colSpan={Object.values(selectedTypes).filter(Boolean).length} className="border-b border-zinc-200 p-2 font-bold text-zinc-700 bg-zinc-100 uppercase tracking-wider text-center">
                                      TOTAL
                                    </th>
                                  )}
                                </tr>
                                <tr>
                                  {chunk.map(m => (
                                    <React.Fragment key={`sub-${m}`}>
                                      {selectedTypes.leads && <th className="border-b border-r border-zinc-200 p-1.5 font-bold text-zinc-500 text-center bg-zinc-50/50">LEADS</th>}
                                      {selectedTypes.adLeads && <th className="border-b border-r border-zinc-200 p-1.5 font-bold text-zinc-500 text-center bg-zinc-50/50">ADS</th>}
                                      {selectedTypes.distributors && <th className="border-b border-r border-zinc-200 p-1.5 font-bold text-zinc-500 text-center bg-zinc-50/50">DISTS</th>}
                                    </React.Fragment>
                                  ))}
                                  {isLastChunk && (
                                    <>
                                      {selectedTypes.leads && <th className="border-b border-r border-zinc-200 p-1.5 font-bold text-black bg-zinc-100 text-center">LEADS</th>}
                                      {selectedTypes.adLeads && <th className="border-b border-r border-zinc-200 p-1.5 font-bold text-black bg-zinc-100 text-center">ADS</th>}
                                      {selectedTypes.distributors && <th className="border-b border-zinc-200 p-1.5 font-bold text-black bg-zinc-100 text-center">DISTS</th>}
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(employeeStats).sort((a, b) => b[1].total.all - a[1].total.all).map(([emp, stats], empIdx, arr) => {
                                  if (stats.total.all === 0) return null;
                                  const isLastRow = empIdx === arr.length - 1;
                                  return (
                                    <tr key={emp} className={isLastRow ? '' : 'border-b border-zinc-200'}>
                                      <td className={`border-r border-zinc-200 p-2 font-bold text-zinc-900 bg-zinc-50/30 truncate max-w-[140px]`} title={emp}>{emp}</td>
                                      {chunk.map(m => {
                                        const mStats = stats.months[m];
                                        return (
                                          <React.Fragment key={`${emp}-${m}`}>
                                            {selectedTypes.leads && (
                                              <td className={`border-r border-zinc-200 p-1.5 text-center font-medium ${mStats.leads > 0 ? 'text-indigo-600 bg-indigo-50/30' : 'text-zinc-300'}`}>
                                                {mStats.leads}
                                              </td>
                                            )}
                                            {selectedTypes.adLeads && (
                                              <td className={`border-r border-zinc-200 p-1.5 text-center font-medium ${mStats.adLeads > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-zinc-300'}`}>
                                                {mStats.adLeads}
                                              </td>
                                            )}
                                            {selectedTypes.distributors && (
                                              <td className={`border-r border-zinc-200 p-1.5 text-center font-medium ${mStats.distributors > 0 ? 'text-amber-600 bg-amber-50/30' : 'text-zinc-300'}`}>
                                                {mStats.distributors}
                                              </td>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                      
                                      {/* Totals - Only on last chunk */}
                                      {isLastChunk && (
                                        <>
                                          {selectedTypes.leads && (
                                            <td className={`border-r border-zinc-200 p-1.5 text-center font-bold bg-zinc-50 ${stats.total.leads > 0 ? 'text-indigo-700' : 'text-zinc-400'}`}>
                                              {stats.total.leads}
                                            </td>
                                          )}
                                          {selectedTypes.adLeads && (
                                            <td className={`border-r border-zinc-200 p-1.5 text-center font-bold bg-zinc-50 ${stats.total.adLeads > 0 ? 'text-rose-700' : 'text-zinc-400'}`}>
                                              {stats.total.adLeads}
                                            </td>
                                          )}
                                          {selectedTypes.distributors && (
                                            <td className={`p-1.5 text-center font-bold bg-zinc-50 ${stats.total.distributors > 0 ? 'text-amber-700' : 'text-zinc-400'}`}>
                                              {stats.total.distributors}
                                            </td>
                                          )}
                                        </>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  </div>
                </A4Page>

                {/* PAGE 3+: Raw Data Section */}
                {Object.entries(employeeRawData).sort((a, b) => a[0].localeCompare(b[0])).map(([emp, monthsData]) => {
                  const hasAnyData = Object.values(monthsData).some(arr => arr.length > 0);
                  if (!hasAnyData) return null;

                  return (
                    <A4Page key={`raw-${emp}`}>
                      <div className="print:break-before-page">
                      <div className="bg-black text-white p-5 rounded-xl mb-8 flex items-center justify-between print:break-after-avoid shadow-lg shadow-black/10">
                        <h2 className="text-[18px] font-black uppercase tracking-widest">{emp}</h2>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Detailed Pipeline Log</span>
                      </div>

                      {reportMonths.map(m => {
                        const items = monthsData[m];
                        if (!items || items.length === 0) return null;

                        return (
                          <div key={`${emp}-${m}`} className="mb-10 print:break-inside-avoid">
                            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                              <h3 className="text-[15px] font-bold text-black uppercase tracking-wider">
                                {formatMonthLabel(m)}
                              </h3>
                              <div className="flex gap-4 text-[11px] font-bold items-center">
                                {items.filter(i => {
                                  const phone = i.contactNo || i.phone || i.contact || i.contactNumber || 'N/A';
                                  return isPhoneIrregular(phone);
                                }).length > 0 && (
                                  <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {items.filter(i => isPhoneIrregular(i.contactNo || i.phone || i.contact || i.contactNumber || 'N/A')).length} Flags
                                  </span>
                                )}
                                {items.filter(i => i._type === 'leads').length > 0 && (
                                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{items.filter(i => i._type === 'leads').length} Leads</span>
                                )}
                                {items.filter(i => i._type === 'adLeads').length > 0 && (
                                  <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{items.filter(i => i._type === 'adLeads').length} Ad Leads</span>
                                )}
                                {items.filter(i => i._type === 'distributors').length > 0 && (
                                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{items.filter(i => i._type === 'distributors').length} Distributors</span>
                                )}
                              </div>
                            </div>
                            
                            <table className="w-full text-left border-collapse border border-zinc-200 text-[11px]">
                              <thead className="bg-zinc-50">
                                <tr>
                                  <th className="border border-zinc-200 p-2.5 font-bold text-zinc-700 uppercase tracking-wider w-[40px] text-center">#</th>
                                  <th className="border border-zinc-200 p-2.5 font-bold text-zinc-700 uppercase tracking-wider w-[90px]">Date</th>
                                  <th className="border border-zinc-200 p-2.5 font-bold text-zinc-700 uppercase tracking-wider w-[120px]">Data Type</th>
                                  <th className="border border-zinc-200 p-2.5 font-bold text-zinc-700 uppercase tracking-wider">Name / Company</th>
                                  <th className="border border-zinc-200 p-2.5 font-bold text-zinc-700 uppercase tracking-wider">Contact</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  let typeLabel = '';
                                  let typeColor = '';
                                  if (item._type === 'leads') { typeLabel = 'Regular Lead'; typeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'; }
                                  if (item._type === 'adLeads') { typeLabel = 'Ad Lead'; typeColor = 'bg-rose-50 text-rose-700 border-rose-200'; }
                                  if (item._type === 'distributors') { typeLabel = 'Distributor'; typeColor = 'bg-amber-50 text-amber-700 border-amber-200'; }

                                  const dateStr = item.date || (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toISOString().slice(0,10) : 'N/A');
                                  
                                  const nameBase = item.clientName || item.name || item.distributorName || item.companyName || '';
                                  const instName = item.institutionName ? ` (${item.institutionName})` : '';
                                  const name = (nameBase + instName).trim() || item.institutionName || 'N/A';
                                  
                                  const phone = item.contactNo || item.phone || item.contact || item.contactNumber || 'N/A';

                                  return (
                                    <tr key={idx} className="border-b border-zinc-200 bg-white">
                                      <td className="border border-zinc-200 p-2.5 text-zinc-500 font-semibold text-center">{idx + 1}</td>
                                      <td className="border border-zinc-200 p-2.5 text-zinc-700 whitespace-nowrap font-medium">{dateStr}</td>
                                      <td className="border border-zinc-200 p-2.5">
                                        <span className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm ${typeColor}`}>
                                          {typeLabel}
                                        </span>
                                      </td>
                                      <td className="border border-zinc-200 p-2.5 font-bold text-black">{name}</td>
                                      <td className="border border-zinc-200 p-2.5 text-zinc-700">
                                        <div className="flex items-center gap-1.5">
                                          {phone}
                                          {isPhoneIrregular(phone) && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                      </div>
                    </A4Page>
                  );
                })}

              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-100 bg-white flex items-center justify-between shrink-0">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-5 py-2.5 text-[13px] font-semibold text-zinc-500 hover:text-black">Cancel</button>
              <button 
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-lg shadow-black/10"
              >
                Generate Preview <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-5 py-2.5 text-[13px] font-semibold text-zinc-500 hover:text-black">Back to Config</button>
              <button 
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </>
          )}
        </div>

      </div>
      
      {/* Print Styles for A4 PDF Output */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #report-preview-content, #report-preview-content * {
            visibility: visible;
          }
          #report-preview-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportGenerator;
