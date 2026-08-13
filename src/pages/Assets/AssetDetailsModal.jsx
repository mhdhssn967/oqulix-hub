import React, { useState } from 'react';
import { X, UserPlus, ArrowDownLeft, Wrench, Edit, MonitorSmartphone, Calendar, CreditCard, ShoppingBag, Clock, History, PenTool, CheckCircle, Package } from 'lucide-react';
import HandoverModal from './HandoverModal';
import ReturnModal from './ReturnModal';
import MaintenanceModal from './MaintenanceModal';

export default function AssetDetailsModal({ asset, isOpen, onClose, employees }) {
  const [activeTab, setActiveTab] = useState('details'); // details, history, maintenance
  const [showHandover, setShowHandover] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  // Optional: add showEdit state to toggle edit mode, skipped for brevity

  if (!isOpen || !asset) return null;

  const getEmployeeName = (uid) => {
    if (uid === 'in_office') return 'In Office';
    const emp = employees.find(e => e.id === uid);
    return emp ? emp.name : 'Unknown Employee';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-green-100 text-green-700';
      case 'Handed Over': return 'bg-blue-100 text-blue-700';
      case 'Under Maintenance': return 'bg-orange-100 text-orange-700';
      case 'Damaged': return 'bg-red-100 text-red-700';
      case 'Lost': return 'bg-gray-100 text-gray-700';
      case 'Retired': return 'bg-zinc-200 text-zinc-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getConditionColor = (cond) => {
    switch(cond) {
      case 'New': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Excellent': return 'text-teal-600 bg-teal-50 border-teal-200';
      case 'Good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Damaged': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-200';
    }
  };

  const assignmentHistory = (asset.history || []).filter(h => h.type !== 'maintenance').sort((a, b) => b.date.seconds - a.date.seconds);
  const maintenanceHistory = (asset.history || []).filter(h => h.type === 'maintenance').sort((a, b) => b.date.seconds - a.date.seconds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-md">
              <MonitorSmartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {asset.name} {asset.quantity > 1 && <span className="text-[13px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md ml-1">x{asset.quantity}</span>}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusColor(asset.status)}`}>
                  {asset.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-zinc-500 font-medium">
                <span>{asset.type}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                <span className="font-mono bg-zinc-200/50 px-1.5 py-0.5 rounded text-zinc-600">{asset.id}</span>
                {asset.handledBy && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                    <span className="text-blue-600 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      {getEmployeeName(asset.handledBy)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Actions Bar */}
        <div className="px-5 py-3 border-b border-zinc-100 bg-white flex flex-wrap gap-2 shrink-0">
          {!asset.handledBy ? (
            <button onClick={() => setShowHandover(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[13px] font-semibold transition-colors">
              <UserPlus className="w-4 h-4" />
              Handover
            </button>
          ) : (
            <>
              <button onClick={() => setShowReturn(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[13px] font-semibold transition-colors">
                <ArrowDownLeft className="w-4 h-4" />
                Return Asset
              </button>
              <button onClick={() => setShowHandover(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[13px] font-semibold transition-colors">
                <UserPlus className="w-4 h-4" />
                Reassign
              </button>
            </>
          )}
          
          <button onClick={() => setShowMaintenance(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-[13px] font-semibold transition-colors ml-auto md:ml-0">
            <Wrench className="w-4 h-4" />
            Add Maintenance
          </button>
          
          {/* Edit button placeholder */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 rounded-lg text-[13px] font-semibold transition-colors border border-zinc-200">
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-5 shrink-0 pt-2">
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === 'details' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Asset Details
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === 'history' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Assignment History
          </button>
          <button 
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'maintenance' ? 'border-black text-black' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Maintenance Log
            {maintenanceHistory.length > 0 && (
              <span className="bg-zinc-100 text-zinc-600 px-1.5 rounded-full text-[10px]">{maintenanceHistory.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/30">
          
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Info Card */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-[14px] font-bold text-zinc-900 border-b border-zinc-100 pb-2">General Information</h3>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <span className="block text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Condition</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-semibold border ${getConditionColor(asset.condition)}`}>
                      {asset.condition}
                    </span>
                  </div>
                  {asset.conditionNote && (
                    <div>
                      <span className="block text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Note</span>
                      <span className="text-[13px] text-zinc-800 font-medium">{asset.conditionNote}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><ShoppingBag className="w-3 h-3"/> Bought From</span>
                    <span className="text-[13px] text-zinc-800 font-medium">{asset.boughtFrom || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Bought On</span>
                    <span className="text-[13px] text-zinc-800 font-medium">{asset.boughtOn ? new Date(asset.boughtOn.seconds * 1000).toLocaleDateString() : '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/> Price</span>
                    <span className="text-[13px] text-zinc-800 font-medium">{asset.price ? `₹${asset.price.toLocaleString()}` : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Accessories Card */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-[14px] font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center justify-between">
                  Included Accessories
                  <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full text-[11px]">{asset.accessories?.length || 0}</span>
                </h3>
                
                {asset.accessories && asset.accessories.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {asset.accessories.map((acc, i) => (
                      <li key={i} className="flex items-center gap-2 text-[13px] text-zinc-700 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-100">
                        <Package className="w-4 h-4 text-zinc-400" />
                        {acc}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-zinc-400">
                    <Package className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-[13px]">No accessories listed.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              {assignmentHistory.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Condition</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {assignmentHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3 text-[13px] text-zinc-600">
                          {new Date(h.date.seconds * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-[13px] font-medium text-zinc-900">
                          {getEmployeeName(h.employee)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            h.action === 'Returned' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {h.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-zinc-600">{h.condition}</td>
                        <td className="px-5 py-3 text-[13px] text-zinc-500 max-w-[200px] truncate" title={h.notes}>{h.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-zinc-500 text-[14px]">
                  <History className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                  No assignment history available.
                </div>
              )}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="flex flex-col gap-4">
              {maintenanceHistory.length > 0 ? (
                maintenanceHistory.map((m, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${m.maintenanceStatus === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                          {m.maintenanceStatus === 'Completed' ? <CheckCircle className="w-4 h-4"/> : <PenTool className="w-4 h-4"/>}
                        </div>
                        <span className="text-[14px] font-bold text-zinc-900">{m.issue}</span>
                      </div>
                      <span className="text-[12px] text-zinc-500 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(m.date.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-[13px] text-zinc-700">{m.description || 'No description provided.'}</p>
                    
                    <div className="flex gap-4 mt-1">
                      {m.cost > 0 && (
                        <span className="text-[12px] font-semibold text-zinc-600 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                          Cost: ₹{m.cost.toLocaleString()}
                        </span>
                      )}
                      {m.provider && (
                        <span className="text-[12px] font-semibold text-zinc-600 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                          Provider: {m.provider}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-500 text-[14px]">
                  <Wrench className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                  No maintenance records found.
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <HandoverModal isOpen={showHandover} onClose={() => setShowHandover(false)} asset={asset} employees={employees} />
      <ReturnModal isOpen={showReturn} onClose={() => setShowReturn(false)} asset={asset} />
      <MaintenanceModal isOpen={showMaintenance} onClose={() => setShowMaintenance(false)} asset={asset} />
      
    </div>
  );
}
