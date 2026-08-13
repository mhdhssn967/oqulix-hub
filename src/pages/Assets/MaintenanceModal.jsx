import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { X, Loader2, Wrench } from 'lucide-react';

export default function MaintenanceModal({ isOpen, onClose, asset }) {
  const { companyId } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    issue: '',
    description: '',
    cost: '',
    serviceProvider: '',
    status: 'In Progress', // In Progress or Completed
    changeAssetStatus: true // Whether to also change the main asset status to "Under Maintenance"
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSubmitting(true);

    try {
      const maintenanceRecord = {
        type: 'maintenance',
        date: new Date(formData.date),
        issue: formData.issue,
        description: formData.description,
        cost: parseFloat(formData.cost) || 0,
        provider: formData.serviceProvider,
        maintenanceStatus: formData.status
      };

      const updateData = {
        history: arrayUnion(maintenanceRecord)
      };

      if (formData.changeAssetStatus && formData.status === 'In Progress') {
        updateData.status = 'Under Maintenance';
      } else if (formData.status === 'Completed' && asset.status === 'Under Maintenance') {
        // If they are marking it completed, and it was under maintenance, set back to available (or keep current)
        updateData.status = asset.handledBy ? 'Handed Over' : 'Available';
      }

      const assetRef = doc(db, `userData/${companyId}/assets`, asset.id);
      await updateDoc(assetRef, updateData);
      
      onClose();
    } catch (err) {
      console.error("Error adding maintenance:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-10">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-orange-50">
          <div className="flex items-center gap-2 text-orange-700">
            <Wrench className="w-5 h-5" />
            <h2 className="text-[15px] font-semibold">Add Maintenance Record</h2>
          </div>
          <button type="button" onClick={() => !isSubmitting && onClose()} className="text-orange-400 hover:text-orange-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Date</label>
              <input 
                type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Maintenance Status</label>
              <select 
                required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              >
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Issue / Reason *</label>
            <input 
              type="text" required value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})}
              placeholder="e.g. Controller drift"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Description & Action Taken</label>
            <textarea 
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none h-16"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Cost (₹)</label>
              <input 
                type="number" min="0" step="0.01" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Service Provider</label>
              <input 
                type="text" value={formData.serviceProvider} onChange={(e) => setFormData({...formData, serviceProvider: e.target.value})}
                placeholder="e.g. Oculus Support"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          {formData.status === 'In Progress' && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={formData.changeAssetStatus} onChange={(e) => setFormData({...formData, changeAssetStatus: e.target.checked})} className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4" />
              <span className="text-[13px] text-zinc-700 font-medium">Update asset status to 'Under Maintenance'</span>
            </label>
          )}

          <div className="flex gap-2 pt-2 mt-2 border-t border-zinc-100">
            <button type="button" onClick={() => !isSubmitting && onClose()} className="flex-1 py-2 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-2 text-[13px] font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg flex justify-center items-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
