import React, { useState, useEffect } from 'react';
import { X, Loader2, Phone, MessageSquare, Copy, CheckCircle, User, ArrowRightLeft, Megaphone, TrendingUp, Clock, Calendar } from 'lucide-react';
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

const STORAGE_KEY = 'active_quick_update_lead';
const STORAGE_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

export function clearActiveQuickUpdateStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear sessionStorage:', e);
  }
}

export function getActiveQuickUpdateFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.timestamp && Date.now() - parsed.timestamp < STORAGE_EXPIRY_MS && parsed.lead) {
      return parsed;
    }
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to parse sessionStorage quick update:', e);
  }
  return null;
}

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
  const [updateNextFollowUp, setUpdateNextFollowUp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Infer collection name based on lead._type or activeTab
  let collectionName = 'leads';
  if (lead._type === 'adLead' || activeTab === 'ads') collectionName = 'adLeads';
  if (lead._type === 'distributor' || activeTab === 'distributors') collectionName = 'distributors';

  // Initialize values (checking stored draft if same lead)
  useEffect(() => {
    if (lead) {
      const stored = getActiveQuickUpdateFromStorage();
      const hasStoredDraft = stored && stored.lead?.id === lead.id;

      setUpdateStatus(hasStoredDraft && stored.status !== undefined ? stored.status : (lead.currentStatus || 'New Lead'));
      setUpdateNextFollowUp(hasStoredDraft && stored.nextFollowUp !== undefined ? stored.nextFollowUp : (lead.nextFollowUp || lead.followUpDate || ''));
      setUpdateRemarks(hasStoredDraft && stored.remarks !== undefined ? stored.remarks : '');

      let lastDate = new Date().toISOString().split('T')[0];
      if (hasStoredDraft && stored.statusDate) {
        lastDate = stored.statusDate;
      } else if (lead.statusHistory && lead.statusHistory.length > 0) {
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

  // Continuously sync active lead and user inputs into sessionStorage
  useEffect(() => {
    if (lead && lead.id) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          lead,
          status: updateStatus,
          remarks: updateRemarks,
          statusDate: updateStatusDate,
          nextFollowUp: updateNextFollowUp,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Failed to sync quick update to sessionStorage:', e);
      }
    }
  }, [lead, updateStatus, updateRemarks, updateStatusDate, updateNextFollowUp]);

  const handleClose = () => {
    clearActiveQuickUpdateStorage();
    if (onClose) onClose();
  };

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

        if (updateNextFollowUp !== undefined) {
          updatedData.nextFollowUp = updateNextFollowUp;
          if (collectionName === 'adLeads') {
            updatedData.followUpDate = updateNextFollowUp;
          }
        }
        
        await updateDoc(docRef, updatedData);
        clearActiveQuickUpdateStorage();
        if (onSuccess) onSuccess(updatedData);
      }
      handleClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4" onClick={handleClose}>
      <div 
        className="bg-white rounded-xl border border-zinc-200/80 shadow-2xl w-full max-w-md max-h-[88vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        {/* Sleek Minimal Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Quick Update</span>
              <span className="text-zinc-300">•</span>
              <span className="text-[11px] font-medium text-zinc-500 capitalize">{collectionName === 'adLeads' ? 'Ad Lead' : collectionName === 'distributors' ? 'Distributor' : 'Regular Lead'}</span>
            </div>
            <h2 className="text-[16px] font-semibold text-zinc-900 truncate mt-0.5">
              {lead.clientName || lead.name || lead.distributorName || 'Lead'}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={handleClose} 
            className="text-zinc-400 hover:text-zinc-800 transition-colors p-1.5 hover:bg-zinc-100 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Form Body */}
        <form onSubmit={handleQuickUpdate} className="p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          
          {/* Quick Communication Bar */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-zinc-50/80 border border-zinc-200/60 rounded-lg">
            <a 
              href={`tel:${(lead?.contactNo || lead?.contactNumber || lead?.phone || '').replace(/[^0-9+]/g, '')}`} 
              className="py-1.5 px-2 rounded-md text-[12px] font-medium text-zinc-700 hover:text-black hover:bg-white hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" /> Call
            </a>
            <a 
              href={`https://wa.me/${(lead?.contactNo || lead?.contactNumber || lead?.phone || '').replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="py-1.5 px-2 rounded-md text-[12px] font-medium text-zinc-700 hover:text-black hover:bg-white hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
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
              className="py-1.5 px-2 rounded-md text-[12px] font-medium text-zinc-700 hover:text-black hover:bg-white hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-500" /> Copy
            </button>
          </div>

          {/* Update Status */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Update Status</label>
            <select 
              value={updateStatus} 
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50/50 border border-zinc-200/80 rounded-lg focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[13px] font-medium transition-all text-zinc-800 cursor-pointer"
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

          {/* Dates Grid: Status Date (if Admin/HR) & Next Follow-Up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(isAdmin || isHR) && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Status Date</label>
                <input
                  type="date"
                  value={updateStatusDate}
                  onChange={(e) => setUpdateStatusDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50/50 border border-zinc-200/80 rounded-lg focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[13px] font-medium transition-all text-zinc-800"
                />
              </div>
            )}

            <div className={(isAdmin || isHR) ? '' : 'sm:col-span-2'}>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Next Follow-Up (Optional)</span>
                {updateNextFollowUp && (
                  <button
                    type="button"
                    onClick={() => setUpdateNextFollowUp('')}
                    className="text-[10px] lowercase text-zinc-400 hover:text-red-500 font-semibold"
                  >
                    clear
                  </button>
                )}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={updateNextFollowUp}
                  onChange={(e) => setUpdateNextFollowUp(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50/50 border border-zinc-200/80 rounded-lg focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[13px] font-medium transition-all text-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Add Remarks (Optional)</label>
            <textarea 
              value={updateRemarks} 
              onChange={(e) => setUpdateRemarks(e.target.value)}
              rows="2"
              className="w-full bg-zinc-50/50 border border-zinc-200/80 rounded-lg p-2.5 text-[13px] text-zinc-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-all resize-none placeholder:text-zinc-400"
              placeholder="Note down what was discussed..."
            ></textarea>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col gap-2 pt-1">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white bg-zinc-900 hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><CheckCircle className="w-3.5 h-3.5" /> Save Update</>}
            </button>

            {/* Ancillary Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {onFullProfile && (
                <button 
                  type="button" 
                  onClick={() => onFullProfile(lead)} 
                  className="flex-1 min-w-[110px] py-2 rounded-lg text-[12px] font-semibold text-zinc-700 bg-zinc-100/80 hover:bg-zinc-200/70 border border-zinc-200/50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-zinc-500" /> Full Profile
                </button>
              )}
              {onTransfer && (
                <button 
                  type="button" 
                  onClick={() => onTransfer(lead)} 
                  className="flex-1 min-w-[110px] py-2 rounded-lg text-[12px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-500" /> Reassign
                </button>
              )}
              {onConvertToAd && (
                <button 
                  type="button"
                  onClick={() => onConvertToAd(lead)} 
                  className="w-full py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100/60 transition-colors border border-blue-200/70 flex items-center justify-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" /> Convert to Ad Lead
                </button>
              )}
              {onPromoteDistributor && !lead.isActiveDistributor && (
                <button 
                  type="button"
                  onClick={() => onPromoteDistributor(lead)} 
                  className="w-full py-2 rounded-lg text-[12px] font-semibold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/60 transition-colors border border-emerald-200/70 flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Promote Distributor
                </button>
              )}
            </div>
          </div>

          {/* Recent History Timeline */}
          {lead.statusHistory && lead.statusHistory.length > 0 && (
            <div className="mt-2 pt-3 border-t border-zinc-100">
              <h3 className="text-[10px] font-bold text-zinc-400 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                Recent History
              </h3>
              <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {[...lead.statusHistory].reverse().map((history, idx) => {
                  const colorClass = getStatusColor(history.status);
                  const textClass = colorClass.split(' ')[1] || 'text-zinc-700';
                  const dotColor = textClass.replace('text-', 'bg-');
                  
                  return (
                    <div key={idx} className="flex gap-2 items-stretch relative text-[12px]">
                      <div className="w-[3.2rem] shrink-0 text-right pt-0.5">
                        <div className="text-[10px] font-bold text-zinc-700">
                          {new Date(history.date).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[9px] font-medium text-zinc-400">
                          {new Date(history.date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div className="relative flex flex-col items-center mx-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} z-10 mt-1.5 ring-2 ring-white`}></div>
                        {idx !== lead.statusHistory.length - 1 && (
                          <div className="w-px h-full bg-zinc-200 absolute top-2.5"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 pb-2">
                        <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${colorClass} mb-1`}>
                          {history.status}
                        </div>
                        {history.remarks && (
                          <p className="text-[11px] text-zinc-600 bg-zinc-50/70 p-2 rounded-md border border-zinc-100/80 whitespace-pre-wrap leading-relaxed">
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
