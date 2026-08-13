import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, onSnapshot, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { Plus, Search, Filter, Loader2, MonitorSmartphone, QrCode } from 'lucide-react';
import AddAssetModal from './AddAssetModal';
import AssetDetailsModal from './AssetDetailsModal';

export default function Assets() {
  const { companyId } = useAuthStore();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCondition, setFilterCondition] = useState('All');
  const [filterHandler, setFilterHandler] = useState('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Fetch employees
  useEffect(() => {
    if (!companyId) return;
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, `userData/${companyId}/employees`));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, [companyId]);

  // Listen to assets
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const q = query(collection(db, `userData/${companyId}/assets`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssets(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching assets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  // Dashboard Stats
  const stats = {
    Total: assets.length,
    Available: assets.filter(a => a.status === 'Available').length,
    'Handed Over': assets.filter(a => a.status === 'Handed Over').length,
    Maintenance: assets.filter(a => a.status === 'Under Maintenance').length,
    Damaged: assets.filter(a => a.status === 'Damaged').length,
    Lost: assets.filter(a => a.status === 'Lost').length,
    Retired: assets.filter(a => a.status === 'Retired').length,
  };

  // Helper to get employee name
  const getEmployeeName = (uid) => {
    const emp = employees.find(e => e.id === uid);
    return emp ? emp.name : 'Unknown';
  };

  // Filtering
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (asset.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (asset.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (asset.handledBy ? getEmployeeName(asset.handledBy).toLowerCase().includes(searchTerm.toLowerCase()) : false);
                          
    const matchesType = filterType === 'All' || asset.type === filterType;
    const matchesStatus = filterStatus === 'All' || asset.status === filterStatus;
    const matchesCondition = filterCondition === 'All' || asset.condition === filterCondition;
    const matchesHandler = filterHandler === 'All' || 
                           (filterHandler === 'Unassigned' ? !asset.handledBy : asset.handledBy === filterHandler);

    return matchesSearch && matchesType && matchesStatus && matchesCondition && matchesHandler;
  });

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
      case 'New': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Excellent': return 'bg-teal-50 text-teal-600 border-teal-200';
      case 'Good': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Fair': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'Damaged': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200';
    }
  };

  const statColors = {
    Total: 'bg-black text-white border-black',
    Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Handed Over': 'bg-blue-50 text-blue-700 border-blue-200',
    Maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
    Damaged: 'bg-red-50 text-red-700 border-red-200',
    Lost: 'bg-zinc-100 text-zinc-600 border-zinc-300',
    Retired: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Assets</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Manage company equipment, devices, and VR hardware.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[14px] font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </header>

      {/* Dashboard Stats as Colorful Pills */}
      <div className="flex flex-wrap gap-2.5">
        {Object.entries(stats).map(([label, count]) => (
          <div key={label} className={`rounded-full border px-4 py-1.5 flex items-center gap-2 ${statColors[label] || 'bg-white border-zinc-200 text-zinc-800'}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</span>
            <span className="text-[15px] font-black">{count}</span>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search assets, types, or handlers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          <select 
            value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none min-w-[120px]"
          >
            <option value="All">All Types</option>
            <option value="Laptop">Laptop</option>
            <option value="Tablet">Tablet</option>
            <option value="VR Headset">VR Headset</option>
            <option value="Mobile Phone">Mobile Phone</option>
            <option value="Monitor">Monitor</option>
            <option value="Other">Other</option>
          </select>
          
          <select 
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none min-w-[120px]"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Handed Over">Handed Over</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Damaged">Damaged</option>
            <option value="Lost">Lost</option>
            <option value="Retired">Retired</option>
          </select>

          <select 
            value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none min-w-[120px]"
          >
            <option value="All">All Conditions</option>
            <option value="New">New</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Damaged">Damaged</option>
          </select>
          
          <select 
            value={filterHandler} onChange={(e) => setFilterHandler(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none min-w-[120px]"
          >
            <option value="All">All Handlers</option>
            <option value="Unassigned">Unassigned</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset List */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-[14px]">
            <MonitorSmartphone className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            No assets found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Asset Info</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Type / ID</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status & Condition</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Handled By</th>
                  <th className="px-5 py-4 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Purchase Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                          <MonitorSmartphone className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-zinc-900">{asset.name}</span>
                          <span className="text-[12px] text-zinc-500 truncate max-w-[200px]" title={asset.accessories?.join(', ')}>
                            {asset.accessories && asset.accessories.length > 0 ? `${asset.accessories.length} accessories` : 'No accessories'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[13px] font-medium text-zinc-800">{asset.type}</span>
                        <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{asset.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getConditionColor(asset.condition)}`}>
                          {asset.condition}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {asset.handledBy ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center font-bold text-[10px]">
                            {getEmployeeName(asset.handledBy).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[13px] font-medium text-zinc-800">{getEmployeeName(asset.handledBy)}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-zinc-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 text-[12px]">
                        <span className="text-zinc-800 font-medium">₹{asset.price?.toLocaleString()}</span>
                        {asset.boughtOn && <span className="text-zinc-500">{new Date(asset.boughtOn.seconds * 1000).toLocaleDateString()}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddAssetModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          employees={employees}
        />
      )}

      {selectedAsset && (
        <AssetDetailsModal 
          asset={selectedAsset}
          isOpen={!!selectedAsset} 
          onClose={() => setSelectedAsset(null)} 
          employees={employees}
        />
      )}

    </div>
  );
}
