import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { X, Loader2, ArrowDownLeft } from 'lucide-react';

export default function ReturnModal({ isOpen, onClose, asset }) {
  const { companyId } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    condition: asset.condition,
    status: 'Available',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSubmitting(true);

    try {
      const historyEntry = {
        date: new Date(),
        employee: asset.handledBy,
        action: 'Returned',
        condition: formData.condition,
        notes: formData.notes
      };

      const assetRef = doc(db, `userData/${companyId}/assets`, asset.id);
      await updateDoc(assetRef, {
        handledBy: null,
        status: formData.status,
        condition: formData.condition,
        history: arrayUnion(historyEntry)
      });
      
      onClose();
    } catch (err) {
      console.error("Error returning asset:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col z-10">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-700">
            <ArrowDownLeft className="w-5 h-5" />
            <h2 className="text-[15px] font-semibold">Return Asset</h2>
          </div>
          <button type="button" onClick={() => !isSubmitting && onClose()} className="text-emerald-400 hover:text-emerald-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">New Condition</label>
            <select 
              required value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="New">New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Resulting Status</label>
            <select 
              required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="Available">Available</option>
              <option value="Under Maintenance">Under Maintenance (Needs repair)</option>
              <option value="Damaged">Damaged (Unusable)</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Return Notes</label>
            <textarea 
              value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-20"
              placeholder="e.g. Returned with all accessories."
            ></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => !isSubmitting && onClose()} className="flex-1 py-2 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-2 text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex justify-center items-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
