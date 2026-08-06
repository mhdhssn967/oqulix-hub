import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';

export default function RequestModal({ isOpen, onClose }) {
  const { user, companyId, employeeData, isAdmin } = useAuthStore();
  const [type, setType] = useState('Leave');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      Swal.fire({ title: 'Error', text: 'Please enter a reason.', icon: 'error' });
      return;
    }
    if (!companyId || !user) return;

    setIsSubmitting(true);
    try {
      const ref = collection(db, `userData/${companyId}/hrNotifications`);
      await addDoc(ref, {
        employeeId: user.uid,
        employeeName: isAdmin ? 'Admin' : (employeeData?.name || user.displayName || user.email.split('@')[0]),
        type,
        date,
        reason: reason.trim(),
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      Swal.fire({ title: 'Success', text: 'Request submitted successfully.', icon: 'success', timer: 1500, showConfirmButton: false });
      onClose();
      // Reset form
      setType('Leave');
      setReason('');
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Failed to submit request.', icon: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && onClose()}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-semibold text-zinc-900">Submit Request</h2>
          <button onClick={() => !isSubmitting && onClose()} className="text-zinc-400 hover:text-black transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Request Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all cursor-pointer"
            >
              <option value="Leave">Apply for Leave</option>
              <option value="WFH">Work From Home (WFH)</option>
              <option value="Field">Field Work</option>
            </select>
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all cursor-pointer"
            />
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[13px] focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-4 text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="py-2 px-4 text-[13px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
