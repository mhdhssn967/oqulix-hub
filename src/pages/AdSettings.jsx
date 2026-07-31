import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import { Plus, X, Megaphone, Trash2 } from 'lucide-react';

export default function AdSettings() {
  const { user, companyId } = useAuthStore();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [campaignName, setCampaignName] = useState('');
  const [segment, setSegment] = useState('');
  const [segments, setSegments] = useState(['General', 'Real Estate', 'E-commerce', 'Healthcare', 'B2B']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch segments
      const segSnap = await getDocs(collection(db, 'userData', companyId, 'segments'));
      if (!segSnap.empty) {
        const fetchedSegments = segSnap.docs.map(d => d.id);
        if (fetchedSegments.length > 0) {
          setSegments(fetchedSegments);
        }
      }

      // Fetch campaigns
      const campaignsRef = collection(db, 'userData', companyId, 'adCampaigns');
      const q = query(campaignsRef, orderBy('createdAt', 'desc'));
      const campSnap = await getDocs(q);
      const campData = campSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(campData);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Fallback in case orderBy requires an index not yet created
      try {
        const campaignsRef = collection(db, 'userData', companyId, 'adCampaigns');
        const campSnap = await getDocs(campaignsRef);
        const campData = campSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort manually
        campData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setCampaigns(campData);
      } catch (innerError) {
        console.error("Inner error fetching campaigns:", innerError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    if (!companyId) return;
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const campRef = doc(db, 'userData', companyId, 'adCampaigns', id);
      await updateDoc(campRef, { status: newStatus });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error("Error toggling status:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update campaign status.',
      });
    }
  };

  const handleDeleteCampaign = async (id, name) => {
    if (!companyId) return;
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete campaign "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000',
      cancelButtonColor: '#e4e4e7',
      confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'userData', companyId, 'adCampaigns', id));
        setCampaigns(prev => prev.filter(c => c.id !== id));
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Campaign has been deleted.',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error("Error deleting campaign:", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete campaign.',
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!campaignName.trim() || !segment) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please enter a campaign name and select a segment.',
      });
      return;
    }

    if (!companyId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Company ID is missing. Cannot add campaign.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignsRef = collection(db, 'userData', companyId, 'adCampaigns');
      await addDoc(campaignsRef, {
        name: campaignName.trim(),
        segment: segment,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        status: 'Active'
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Ad campaign added successfully!',
        timer: 1500,
        showConfirmButton: false
      });

      setCampaignName('');
      setSegment('');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding campaign:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add campaign.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col pb-10 p-6 md:p-8 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Ad Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and track your advertising campaigns.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Campaign
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
              <Megaphone className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">No Ad Campaigns</h3>
            <p className="text-sm text-zinc-500">Get started by creating your first ad campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200/80">
                <tr>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Campaign Name</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Segment</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">Created At</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-zinc-900">{camp.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200/60">
                        {camp.segment}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        camp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-zinc-100 text-zinc-700 border border-zinc-200/60'
                      }`}>
                        {camp.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                        {camp.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-zinc-500 whitespace-nowrap">
                      {formatDate(camp.createdAt)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-4">
                        <button 
                          onClick={() => handleToggleStatus(camp.id, camp.status)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${camp.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}
                          title={`Turn ${camp.status === 'Active' ? 'Off' : 'On'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${camp.status === 'Active' ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 p-1.5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Add New Ad Campaign</h2>
              <p className="text-sm text-zinc-500 mt-1">Create a new ad campaign for a specific segment.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-zinc-500 transition-all"
                  placeholder="e.g. Summer Sale 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1.5">
                  Segment
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-zinc-500 transition-all"
                >
                  <option value="" disabled>Select a segment</option>
                  {segments.map((seg, idx) => (
                    <option key={idx} value={seg}>{seg}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black text-white font-medium rounded-xl px-4 py-3 text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting ? 'Adding...' : 'Add Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
