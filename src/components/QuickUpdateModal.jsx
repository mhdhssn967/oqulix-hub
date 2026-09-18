import React, { useState, useEffect } from 'react';
import { X, Loader2, Phone, MessageSquare, Copy, CheckCircle, User, ArrowRightLeft, Megaphone, TrendingUp, Clock } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Swal from 'sweetalert2';

// Helper for status colors (copied from CRM.jsx)
const getStatusColor = (status) => {
  if (!status) return 'bg-zinc-100 text-zinc-700';
  const s = status.toLowerCase();
  if (s.includes('new lead')) return 'bg-blue-100 text-blue-700';
  if (s.includes('contacted') && !s.includes('no response')) return 'bg-amber-100 text-amber-700';
  if (s.includes('no response')) return 'bg-red-100 text-red-700';
  if (s.includes('interested')) return 'bg-purple-100 text-purple-700';
  if (s.includes('follow up') || s.includes('follow-up')) return 'bg-orange-100 text-orange-700';
  if (s.includes('quotation sent')) return 'bg-cyan-100 text-cyan-700';
  if (s.includes('awaiting decision')) return 'bg-indigo-100 text-indigo-700';
  if (s.includes('token')) return 'bg-teal-100 text-teal-700';
  if (s.includes('closed') || s.includes('won')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('lost') || s.includes('not interested')) return 'bg-rose-100 text-rose-700';
  if (s.includes('inactive') || s.includes('terminated')) return 'bg-zinc-200 text-zinc-600';
  return 'bg-zinc-100 text-zinc-700';
};

export default function QuickUpdateModal({ 
  lead, 
  onClose, 
  onSuccess, 
  companyId, 
  activeSegment, 
  isAdmin, 
  isHR,
  activeTab, // either 'regular', 'ads', 'distributors', or inferred from lead._type
  onFullProfile,
  onTransfer,
  onConvertToAd,
  onTransferToRegular,
  onPromoteDistributor
}) {
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [updateStatusDate, setUpdateStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Infer collection name based on lead._type or activeTab
  let collectionName = 'leads';
  if (lead._type === 'adLead' || activeTab === 'ads') collectionName = 'adLeads';
  if (lead._type === 'distributor' || activeTab === 'distributors') collectionName = 'distributors';

  useEffect(() => {
    if (lead) {
      setUpdateStatus(lead.currentStatus || 'New Lead');
      
      let lastDate = new Date().toISOString().split('T')[0];
      if (lead.statusHistory && lead.statusHistory.length > 0) {
        const lastEntry = lead.statusHistory[lead.statusHistory.length - 1];
        if (lastEntry.date) {
          lastDate = new Date(lastEntry.date).toISOString().split('T')[0];
        }
      } else if (lead.date) {
        lastDate = new Date(lead.date).toISOString().split('T')[0];
      } else if (lead.createdAt) {
        const dateVal = lead.createdAt.seconds ? lead.createdAt.seconds * 1000 : lead.createdAt;
        lastDate = new Date(dateVal).toISOString().split('T')[0];
      }
      setUpdateStatusDate(lastDate);
    }
  }, [lead]);

  const handleQuickUpdate = async (e) => {
    e.preventDefault();
    if (!companyId || !lead) return;
    setIsSubmitting(true);
    
    try {
      const docRef = doc(db, 'userData', companyId, 'segments', activeSegment, 'crmData', collectionName, 'items', lead.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = snap.data();
        
        const effectiveDate = (isAdmin || isHR) && updateStatusDate ? new Date(updateStatusDate) : new Date();
        const dateStr = effectiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const remarkAddition = updateRemarks.trim() ? `[${dateStr}] ${updateRemarks}` : '';
        const newRemarks = remarkAddition 
          ? (item.remarks ? `${item.remarks}\n${remarkAddition}` : remarkAddition)
          : item.remarks;
          
        let currentHistory = item.statusHistory || [];
        if (currentHistory.length === 0) {
          let initialDate = new Date().toISOString();
          const oldDateRaw = item.date || item.lastContacted || item.createdAt;
          if (oldDateRaw) {
            if (oldDateRaw.seconds) initialDate = new Date(oldDateRaw.seconds * 1000).toISOString();
            else if (!isNaN(new Date(oldDateRaw))) initialDate = new Date(oldDateRaw).toISOString();
          }
          currentHistory.push({
            date: initialDate,
            status: item.currentStatus || 'New Lead',
            remarks: item.remarks || ''
          });
        }

        const historyEntry = {
          date: effectiveDate.toISOString(),
          status: updateStatus,
          remarks: updateRemarks.trim()
        };
        const statusHistory = [...currentHistory, historyEntry];

        const updatedData = {
          currentStatus: updateStatus,
          remarks: newRemarks,
          statusHistory,
          lastContacted: effectiveDate.toISOString().split('T')[0],
          lastFollowedUp: effectiveDate.toISOString().split('T')[0],
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(docRef, updatedData);
        if (onSuccess) onSuccess(updatedData);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white tracking-tight">Quick Update</h2>
            <p className="text-zinc-400 text-[13px] mt-1 pr-4">{lead.clientName || lead.name || lead.distributorName || 'Lead'}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2 z-20">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleQuickUpdate} className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Update Status</label>
            <select 
              value={updateStatus} 
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] transition-all text-zinc-800 cursor-pointer"
            >
              {collectionName === 'distributors' ? (
                <>
                  <option value="Haven't yet contacted">Haven't yet contacted</option>
                  <option value="Called, no response">Called, no response</option>
                  <option value="Contacted and discussed via phone">Contacted and discussed via phone</option>
                  <option value="Online demo done">Online demo done</option>
                  <option value="Live demo done">Live demo done</option>
                  <option value="Hospital presentation done">Hospital presentation done</option>
                  <option value="Agreement Sent & awaiting response">Agreement Sent & waiting</option>
                  <option value="Agreement Signed">Agreement Signed</option>
                  <option value="Purchased Demo Piece">Purchased Demo Piece</option>
                  <option value="Doing Sales">Doing Sales</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Terminated">Terminated</option>
                </>
              ) : (
                <>
                  <option value="New Lead">New Lead</option>
                  <option value="Called, no response">Called, No Response</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Connected via whatsapp">Connected via whatsapp</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow up needed">Follow-Up Needed</option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Awaiting Decision">Awaiting Decision</option>
                  <option value="Token Recieved">Token Recieved</option>
                  <option value="Deal Closed">Converted (Deal Won)</option>
                  <option value="Deal Lost">Not Interested (Deal Lost)</option>
                </>
              )}
            </select>
          </div>

          {(isAdmin || isHR) && (
            <div>
              <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Status Date</label>
              <input
                type="date"
                value={updateStatusDate}
                onChange={(e) => setUpdateStatusDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none text-[14px] transition-all text-zinc-800"
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Add Remarks (Optional)</label>
            <textarea 
              value={updateRemarks} 
              onChange={(e) => setUpdateRemarks(e.target.value)}
              rows="3"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[14px] text-zinc-900 focus:outline-none focus:bg-white focus:border-black transition-colors resize-none placeholder:text-zinc-400"
              placeholder="Note down what was discussed..."
            ></textarea>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <a 
              href={`tel:${(lead?.contactNo || lead?.contactNumber || lead?.phone || '').replace(/[^0-9+]/g, '')}`} 
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a 
              href={`https://wa.me/${(lead?.contactNo || lead?.contactNumber || lead?.phone || '').replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#25D366] hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <button 
              type="button" 
              onClick={() => {
                const phone = lead?.contactNo || lead?.contactNumber || lead?.phone || '';
                if (phone) {
                  navigator.clipboard.writeText(phone);
                  Swal.fire({ title: 'Copied!', text: 'Phone number copied to clipboard', icon: 'success', timer: 1000, showConfirmButton: false });
                } else {
                  Swal.fire({ title: 'No Phone', text: 'This lead does not have a phone number.', icon: 'warning', timer: 1500, showConfirmButton: false });
                }
              }} 
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button type="submit" disabled={isSubmitting} className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><CheckCircle className="w-4 h-4" /> Update Status</>}
            </button>
            <div className="flex gap-2">
              {onFullProfile && (
                <button 
                  type="button" 
                  onClick={() => onFullProfile(lead)} 
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" /> Full Profile
                </button>
              )}
              {onTransfer && (
                <button 
                  type="button" 
                  onClick={() => onTransfer(lead)} 
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                </button>
              )}
            </div>
            {onConvertToAd && (
              <button 
                type="button"
                onClick={() => onConvertToAd(lead)} 
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Megaphone className="w-3.5 h-3.5" /> Convert to Ad
              </button>
            )}
            {onTransferToRegular && (
              <button 
                type="button"
                onClick={() => onTransferToRegular(lead)} 
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer to Regular
              </button>
            )}
            {onPromoteDistributor && !lead.isActiveDistributor && (
              <button 
                type="button"
                onClick={() => onPromoteDistributor(lead)} 
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Promote Dist.
              </button>
            )}
          </div>

          {lead.statusHistory && lead.statusHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <h3 className="text-[11px] font-bold text-zinc-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                Recent History
              </h3>
              <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {[...lead.statusHistory].reverse().map((history, idx) => {
                  const colorClass = getStatusColor(history.status);
                  const textClass = colorClass.split(' ')[1] || 'text-zinc-700';
                  const dotColor = textClass.replace('text-', 'bg-');
                  
                  return (
                    <div key={idx} className="flex gap-2 items-stretch relative">
                      <div className="w-[3.5rem] shrink-0 text-right pt-0.5">
                        <div className="text-[10px] font-bold text-zinc-700">
                          {new Date(history.date).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[9px] font-medium text-zinc-400 mt-0.5">
                          {new Date(history.date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div className="relative flex flex-col items-center mx-1">
                        <div className={`w-2 h-2 rounded-full ${dotColor} z-10 mt-1.5 ring-4 ring-white`}></div>
                        {idx !== lead.statusHistory.length - 1 && (
                          <div className="w-px h-full bg-zinc-200 absolute top-3"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${colorClass} mb-1.5`}>
                          {history.status}
                        </div>
                        {history.remarks && (
                          <p className="text-[11px] text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-100 whitespace-pre-wrap leading-relaxed">
                            {history.remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
