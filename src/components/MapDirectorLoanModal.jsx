import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Landmark, User, ShieldAlert, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Swal from 'sweetalert2';

export const getDirectorsFromPreferences = (preferences) => {
  const sources = preferences?.source || [];
  return sources
    .filter(s => {
      if (!s || typeof s !== 'string') return false;
      const clean = s.trim().toLowerCase().replace(/\s+/g, ' ');
      return clean !== 'oqulix hdfc';
    })
    .map(s => s.trim());
};

const GRADIENTS = [
  'from-purple-500 to-violet-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600'
];

export const getInitials = (name) => {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function MapDirectorLoanModal({ 
  isOpen, 
  onClose, 
  transaction, 
  onSuccess, 
  companyId, 
  directors,
  preferences 
}) {
  const [selectedDirector, setSelectedDirector] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamically resolve director list from preferences.source (excluding 'Oqulix HDFC')
  const directorList = useMemo(() => {
    if (Array.isArray(directors) && directors.length > 0) {
      return directors;
    }
    return getDirectorsFromPreferences(preferences);
  }, [directors, preferences]);

  useEffect(() => {
    if (transaction) {
      setSelectedDirector(transaction.directorLoan || '');
      setNotes(transaction.directorLoanNotes || '');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const targetUserId = companyId || 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, `userData/${targetUserId}/financialData`, transaction.id);
      
      const payload = {
        directorLoan: selectedDirector || null,
        isDirectorLoan: Boolean(selectedDirector),
        directorLoanNotes: notes ? notes.trim() : '',
        directorLoanUpdatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, payload);

      Swal.fire({
        icon: 'success',
        title: selectedDirector ? `Mapped to ${selectedDirector}` : 'Mapping Cleared',
        text: selectedDirector 
          ? `₹${Number(transaction.amount || 0).toLocaleString('en-IN')} mapped to ${selectedDirector}'s Director Loan.`
          : 'Director loan mapping removed from this transaction.',
        timer: 1600,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      if (onSuccess) {
        onSuccess({
          ...transaction,
          ...payload
        });
      }
      onClose();
    } catch (error) {
      console.error("Error updating director loan mapping:", error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Could not save director loan mapping. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200/80 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Map Director Loan Deposit</h2>
              <p className="text-xs text-zinc-500">Assign this credit deposit to track director balances</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Transaction Summary Card */}
          <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">
                Deposit Transaction
              </div>
              <div className="text-sm font-medium text-zinc-800">
                {transaction.remarks || 'No remarks / description'}
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-3">
                <span>Date: <strong className="text-zinc-700">{transaction.date || 'N/A'}</strong></span>
                <span>•</span>
                <span>Original Source: <strong className="text-zinc-700">{transaction.source || 'N/A'}</strong></span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-zinc-500 font-medium">Credit Amount</div>
              <div className="text-xl font-bold text-purple-700 tracking-tight">
                ₹{Number(transaction.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Director Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Select Director
              </label>
              {selectedDirector && (
                <button
                  type="button"
                  onClick={() => setSelectedDirector('')}
                  className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear Mapping
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {directorList.length === 0 ? (
                <div className="col-span-full text-center py-6 px-4 text-xs text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  No director sources found in preferences (excluding Oqulix HDFC). Add director names under Preferences &gt; Sources.
                </div>
              ) : (
                directorList.map((dirName, idx) => {
                  const isSelected = selectedDirector === dirName;
                  const gradient = GRADIENTS[idx % GRADIENTS.length];
                  const initials = getInitials(dirName);

                  return (
                    <button
                      key={dirName}
                      type="button"
                      onClick={() => setSelectedDirector(dirName)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-2 ring-purple-600/20'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 truncate">
                          {dirName}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-medium">
                          Company Director
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Loan Reference / Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Working capital injection, personal account deposit"
              className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{selectedDirector ? `Save (${selectedDirector})` : 'Clear Mapping'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
