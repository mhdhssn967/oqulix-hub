import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { Search, Loader2, ArrowLeft, Target, MapPin, Phone, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';

export default function ActiveDistributors() {
  const { companyId } = useAuthStore();
  const navigate = useNavigate();
  const [activeDistributors, setActiveDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState('happymoves');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const activeDistributorsColRef = collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'activeDistributors', 'items');
        const snap = await getDocs(activeDistributorsColRef);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      if (!searchString.includes(lowerQuery)) return false;
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
                    <tr key={dist.id} className="transition-colors group hover:bg-zinc-50/50">
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
                          <span className="text-[12px] text-zinc-500 ml-3">Duration: <strong className="text-zinc-700">{dist.agreementDurationYears} Yrs</strong></span>
                          <span className="text-[12px] text-zinc-500 ml-3">Exclusivity: <strong className="text-zinc-700">{dist.territoryExclusivity}</strong></span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] font-medium text-zinc-700">Min Target: {dist.minimumTarget || 'N/A'}</span>
                          <span className="text-[12px] text-zinc-500">Commission: <span className="font-bold text-emerald-600">{dist.commissionRate || 'N/A'}</span></span>
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
    </div>
  );
}
