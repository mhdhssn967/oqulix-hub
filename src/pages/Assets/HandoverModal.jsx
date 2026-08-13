import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { X, Loader2, UserPlus } from 'lucide-react';

export default function HandoverModal({ isOpen, onClose, asset, employees }) {
  const { companyId } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    condition: asset.condition,
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !formData.employeeId) return;
    setIsSubmitting(true);

    try {
      const historyEntry = {
        date: new Date(),
        employee: formData.employeeId,
        action: asset.handledBy ? 'Reassigned' : 'Handed Over',
        condition: formData.condition,
        notes: formData.notes
      };

      const assetRef = doc(db, `userData/${companyId}/assets`, asset.id);
      await updateDoc(assetRef, {
        handledBy: formData.employeeId,
        status: 'Handed Over',
        condition: formData.condition,
        history: arrayUnion(historyEntry)
      });
      
      onClose();
    } catch (err) {
      console.error("Error handing over asset:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col z-10">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-blue-50">
          <div className="flex items-center gap-2 text-blue-700">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-[15px] font-semibold">Handover Asset</h2>
          </div>
          <button type="button" onClick={() => !isSubmitting && onClose()} className="text-blue-400 hover:text-blue-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Select Employee *</label>
            <select 
              required value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">-- Select Employee --</option>
              {employees.filter(e => e.id !== asset.handledBy).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Verify Condition</label>
            <select 
              required value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="New">New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase mb-1.5">Notes</label>
            <textarea 
              value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-20"
              placeholder="e.g. Handed over charger as well."
            ></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => !isSubmitting && onClose()} className="flex-1 py-2 text-[13px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex justify-center items-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Handover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
