import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Search, Loader2, ArrowLeft, Target, MapPin, Phone, MoreHorizontal, X, Plus, Calendar, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';

export default function ActiveDistributors() {
  const { companyId, user, isAdmin, isManager, isHR } = useAuthStore();
  const navigate = useNavigate();
  const [activeDistributors, setActiveDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState('happymoves');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [clientFormData, setClientFormData] = useState({ clientName: '', region: '', onboardedDate: new Date().toISOString().split('T')[0], source: 'Onboarded by Distributor', currentStatus: 'Active' });
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [statusUpdateClient, setStatusUpdateClient] = useState(null);
  const [statusUpdateFormData, setStatusUpdateFormData] = useState({ currentStatus: '' });
  const [viewHistoryClient, setViewHistoryClient] = useState(null);

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!companyId || !selectedDistributor) return;
    
    setIsSubmittingClient(true);
    try {
      const docRef = doc(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'activeDistributors', 'items', selectedDistributor.id);
      
      const newClient = {
        ...clientFormData,
        addedAt: new Date().toISOString(),
        id: Date.now().toString()
      };

      await updateDoc(docRef, {
        onboardedClients: arrayUnion(newClient)
      });

      // Update local state
      const updatedDistributors = activeDistributors.map(d => {
        if (d.id === selectedDistributor.id) {
          const existingClients = d.onboardedClients || [];
          const updatedDistributor = { ...d, onboardedClients: [...existingClients, newClient] };
          setSelectedDistributor(updatedDistributor); 
          return updatedDistributor;
        }
        return d;
      });
      
      setActiveDistributors(updatedDistributors);
      setClientFormData({ clientName: '', region: '', onboardedDate: new Date().toISOString().split('T')[0], source: 'Onboarded by Distributor', currentStatus: 'Active' });
      
    } catch (err) {
      console.error("Error adding client:", err);
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleUpdateClientStatus = async (e) => {
    e.preventDefault();
    if (!companyId || !selectedDistributor || !statusUpdateClient) return;
    
    setIsSubmittingClient(true);
    try {
      const docRef = doc(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'activeDistributors', 'items', selectedDistributor.id);
      
      const updatedClients = selectedDistributor.onboardedClients.map(client => {
        if (client.id === statusUpdateClient.id) {
          const newHistoryEntry = {
            oldStatus: client.currentStatus || 'Active',
            newStatus: statusUpdateFormData.currentStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.name || 'Unknown User'
          };
          return {
            ...client,
            currentStatus: statusUpdateFormData.currentStatus,
            statusHistory: [...(client.statusHistory || []), newHistoryEntry]
          };
        }
        return client;
      });

      await updateDoc(docRef, {
        onboardedClients: updatedClients
      });

      // Update local state
      const updatedDistributors = activeDistributors.map(d => {
        if (d.id === selectedDistributor.id) {
          const updatedDistributor = { ...d, onboardedClients: updatedClients };
          setSelectedDistributor(updatedDistributor); 
          return updatedDistributor;
        }
        return d;
      });
      
      setActiveDistributors(updatedDistributors);
      setStatusUpdateClient(null);
      
    } catch (err) {
      console.error("Error updating client status:", err);
    } finally {
      setIsSubmittingClient(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const activeDistributorsColRef = collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'activeDistributors', 'items');
        const snap = await getDocs(activeDistributorsColRef);
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (!isAdmin && !isManager && !isHR && user?.uid && user.uid !== '2K5X44krNabacvlJFgpvsVpDQHi1') {
          data = data.filter(item => item.userId === user.uid || item.assignedToUid === user.uid);
        }

        data.sort((a, b) => {
          const dateA = new Date(a.date || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt) || 0);
          const dateB = new Date(b.date || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt) || 0);
          return dateB - dateA;
        });
        setActiveDistributors(data);
      } catch (err) {
        console.error("Error fetching active distributors:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, activeSegment]);

  const filteredDistributors = activeDistributors.filter(item => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const searchString = Object.values(item).filter(v => typeof v !== 'object' && v !== null && v !== undefined).join(' ').toLowerCase();
      const strippedQuery = lowerQuery.replace(/\s+/g, '');
      const strippedSearchString = searchString.replace(/\s+/g, '');
      
      if (!searchString.includes(lowerQuery) && !strippedSearchString.includes(strippedQuery)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] min-h-screen">
      <div className="flex-1 p-6 lg:p-8 w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1 mb-6 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/80 w-fit shadow-inner">
              <button 
                onClick={() => setActiveSegment('happymoves')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-300 ${activeSegment === 'happymoves' ? 'bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeSegment === 'happymoves' ? 'bg-emerald-500' : 'bg-transparent'}`} />
                Happy Moves
              </button>
              <button 
                onClick={() => setActiveSegment('gamefaktory')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-300 ${activeSegment === 'gamefaktory' ? 'bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeSegment === 'gamefaktory' ? 'bg-blue-500' : 'bg-transparent'}`} />
                Game Faktory
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/crm')} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors group">
                <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
              </button>
              <div>
                <h1 className="text-3xl font-semibold text-black tracking-tight">Active Distributors</h1>
                <p className="text-[15px] text-zinc-500 mt-1.5">Manage your active distributors and their agreement terms.</p>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col sm:flex-row items-center gap-4 bg-zinc-50/30">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search active distributors..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200/80 rounded-xl text-[13px] font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center p-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredDistributors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-zinc-900 font-semibold mb-1">No Active Distributors Found</h3>
              <p className="text-zinc-500 text-sm">Convert a regular distributor in the CRM to see them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Active Distributor</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Contact Details</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Agreement Terms</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Performance Targets</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredDistributors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((dist, index) => (
                    <tr key={dist.id} onClick={() => setSelectedDistributor(dist)} className="transition-colors group hover:bg-zinc-50/50 cursor-pointer">
                      <td className="px-5 py-4 text-[13px] text-zinc-500 font-medium relative">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-black text-[14px] flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-500" />
                          {dist.distributorName || 'N/A'}
                        </div>
                        <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {dist.region || dist.state || 'N/A'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[13px] font-medium text-zinc-900">{dist.contactPersonName || 'N/A'}</div>
                        <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> 
                          <span>{dist.contactNumber || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] font-medium text-zinc-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Date: {dist.agreementDate || 'N/A'}</span>
                          <span className="text-[12px] text-zinc-500 ml-3">Duration: <strong className="text-zinc-700">{dist.agreementDurationMonths} Months</strong></span>
                          <span className="text-[12px] text-zinc-500 ml-3">Exclusivity: <strong className="text-zinc-700">{dist.territoryExclusivity}</strong></span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] font-medium text-zinc-700">Min Target: {dist.minimumTarget || 'N/A'}</span>
                          <span className="text-[12px] text-zinc-500">Distributor Price: <span className="font-bold text-emerald-600">{dist.distributorPrice || 'N/A'}</span></span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination totalItems={filteredDistributors.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
            </div>
          )}
        </div>
      </div>

      {/* Onboarded Clients Modal */}
      {selectedDistributor && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm" onClick={() => !isSubmittingClient && setSelectedDistributor(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 flex items-center justify-between relative overflow-hidden shrink-0">
               <div className="relative z-10 flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                   <Target className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-white tracking-tight">{selectedDistributor.distributorName || 'Distributor Details'}</h2>
                   <p className="text-emerald-100 text-sm mt-1">Manage onboarded clients and view distributor performance.</p>
                 </div>
               </div>
               <button onClick={() => !isSubmittingClient && setSelectedDistributor(null)} className="text-emerald-100 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2 z-20">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8 bg-zinc-50/30">
              
              {/* Add Client Form */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                <h3 className="text-[14px] font-bold text-zinc-800 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Log New Onboarded Client
                </h3>
                <form onSubmit={handleAddClient} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Client Name *</label>
                      <input type="text" value={clientFormData.clientName} onChange={(e) => setClientFormData({...clientFormData, clientName: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" placeholder="e.g. Acme Corp" required />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Region *</label>
                      <input type="text" value={clientFormData.region} onChange={(e) => setClientFormData({...clientFormData, region: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" placeholder="e.g. North America" required />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Onboarded Date *</label>
                      <input type="date" value={clientFormData.onboardedDate} onChange={(e) => setClientFormData({...clientFormData, onboardedDate: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" required />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Source *</label>
                      <select value={clientFormData.source} onChange={(e) => setClientFormData({...clientFormData, source: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" required>
                        <option value="Onboarded by Distributor">Onboarded by Distributor</option>
                        <option value="Transferred by Company">Transferred by Company</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Initial Status *</label>
                      <select value={clientFormData.currentStatus} onChange={(e) => setClientFormData({...clientFormData, currentStatus: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors" required>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={isSubmittingClient} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {isSubmittingClient ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Client</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Client List */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[14px] font-bold text-zinc-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Previously Onboarded Clients
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] ml-2">{(selectedDistributor.onboardedClients || []).length}</span>
                </h3>
                
                {!(selectedDistributor.onboardedClients || []).length ? (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center flex flex-col items-center">
                    <User className="w-8 h-8 text-zinc-300 mb-3" />
                    <p className="text-[14px] font-medium text-zinc-900">No clients onboarded yet.</p>
                    <p className="text-[12px] text-zinc-500 mt-1">Clients logged above will appear here.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/50">
                          <th className="px-4 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Client Name</th>
                          <th className="px-4 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Region</th>
                          <th className="px-4 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Date Onboarded</th>
                          <th className="px-4 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Source</th>
                          <th className="px-4 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(selectedDistributor.onboardedClients || []).slice().reverse().map((client, idx) => (
                          <tr key={client.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-4 py-3 text-[13px] font-medium text-zinc-900">{client.clientName}</td>
                            <td className="px-4 py-3 text-[13px] text-zinc-500">
                              <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-zinc-400" />{client.region}</div>
                            </td>
                            <td className="px-4 py-3 text-[13px] text-zinc-500">
                              <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-zinc-400" />{client.onboardedDate}</div>
                            </td>
                            <td className="px-4 py-3 text-[13px] text-zinc-500">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${client.source === 'Transferred by Company' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{client.source || 'Onboarded by Distributor'}</span>
                            </td>
                            <td className="px-4 py-3 text-[13px] text-zinc-500">
                               <span className="font-semibold text-zinc-700">{client.currentStatus || 'Active'}</span>
                            </td>
                            <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                               <button onClick={() => { setStatusUpdateClient(client); setStatusUpdateFormData({ currentStatus: client.currentStatus || 'Active' }); }} className="text-[12px] text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors">Update Status</button>
                               <button onClick={() => setViewHistoryClient(client)} className="text-[12px] text-zinc-600 hover:text-zinc-800 font-medium bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors">History</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusUpdateClient && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !isSubmittingClient && setStatusUpdateClient(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-800">Update Status</h3>
              <button onClick={() => !isSubmittingClient && setStatusUpdateClient(null)} className="text-zinc-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateClientStatus} className="p-5">
              <p className="text-[13px] text-zinc-500 mb-4">Updating status for <strong>{statusUpdateClient.clientName}</strong>.</p>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">New Status</label>
              <select value={statusUpdateFormData.currentStatus} onChange={(e) => setStatusUpdateFormData({currentStatus: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[13px] font-medium text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors mb-6" required>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
                <option value="Lost">Lost</option>
              </select>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setStatusUpdateClient(null)} disabled={isSubmittingClient} className="px-4 py-2 rounded-lg text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmittingClient} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center gap-2">
                  {isSubmittingClient ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status History Modal */}
      {viewHistoryClient && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewHistoryClient(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-zinc-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  Status History
                </h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">{viewHistoryClient.clientName}</p>
              </div>
              <button onClick={() => setViewHistoryClient(null)} className="text-zinc-400 hover:text-black bg-white shadow-sm border border-zinc-200 rounded-full p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {!(viewHistoryClient.statusHistory || []).length ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-zinc-500">No status changes recorded yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-zinc-200 ml-3 space-y-6">
                  {(viewHistoryClient.statusHistory || []).slice().reverse().map((entry, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-emerald-500"></div>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Status Changed</span>
                          <span className="text-[11px] text-zinc-400">{new Date(entry.updatedAt).toLocaleDateString()} {new Date(entry.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="text-[13px] text-zinc-800 mt-2 flex items-center gap-2">
                          <span className="text-zinc-500 line-through">{entry.oldStatus}</span>
                          <ArrowLeft className="w-3 h-3 text-zinc-300 rotate-180" />
                          <span className="font-bold text-emerald-700">{entry.newStatus}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-2">
                          Updated by <span className="font-medium text-zinc-700">{entry.updatedBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
