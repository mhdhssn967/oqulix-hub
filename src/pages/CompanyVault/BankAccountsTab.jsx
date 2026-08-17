import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import CopyButton from './CopyButton';
import { Landmark, Plus, Trash2, Building, CreditCard } from 'lucide-react';

export default function BankAccountsTab({ data, canEdit, searchTerm }) {
  const { companyId } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    accountType: 'Current',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
    notes: ''
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, `userData/${companyId}/bankAccounts`), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setFormData({
        accountName: '', bankName: '', branch: '', accountNumber: '', accountType: 'Current', ifscCode: '', accountHolderName: '', upiId: '', notes: ''
      });
    } catch (err) {
      console.error("Error adding bank account:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!companyId) return;
    try {
      await deleteDoc(doc(db, `userData/${companyId}/bankAccounts`, id));
    } catch (err) {
      console.error("Error deleting bank account:", err);
    }
  };

  const filteredBanks = data.filter(b => 
    (b.bankName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.accountName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.accountNumber || '').includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-800"><Landmark className="w-5 h-5 text-emerald-600"/> Bank Accounts</h2>
        {canEdit && (
          <button onClick={() => setIsAdding(true)} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/> Add Bank Account
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-zinc-50 p-5 rounded-xl border border-zinc-200 mb-2 max-w-3xl">
          <h3 className="text-[13px] font-bold text-zinc-800 mb-4 border-b border-zinc-200 pb-2">Add New Bank Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Account Label / Name *</label>
              <input type="text" placeholder="e.g. Primary Operating Account" required value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Bank Name *</label>
              <input type="text" required value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Account Holder Name *</label>
              <input type="text" required value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Account Number *</label>
              <input type="text" required value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">IFSC Code *</label>
              <input type="text" required value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Branch</label>
              <input type="text" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Account Type</label>
              <select value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black">
                <option>Current</option>
                <option>Savings</option>
                <option>Overdraft (OD)</option>
                <option>Cash Credit (CC)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">UPI ID (Optional)</label>
              <input type="text" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Notes</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-black text-white text-[12px] font-semibold rounded-md disabled:opacity-50">Save Account</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-zinc-200 text-zinc-700 text-[12px] font-semibold rounded-md">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {filteredBanks.length > 0 ? filteredBanks.map(bank => {
          const bankDetailsText = `Account Name: ${bank.accountHolderName}\nBank: ${bank.bankName}\nAccount Number: ${bank.accountNumber}\nIFSC: ${bank.ifscCode}\nBranch: ${bank.branch || 'N/A'}`;
          
          return (
            <div key={bank.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 relative group flex flex-col md:flex-row gap-6 md:items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3">
                  <span className="text-[15px] font-bold text-zinc-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-600"/> {bank.bankName} 
                    <span className="text-[12px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full ml-2">{bank.accountName}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <CopyButton text={bankDetailsText} label="Copy Bank Details" />
                    {canEdit && (
                      <button onClick={() => handleDelete(bank.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100" title="Delete Account">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                  <BankField label="Account Holder Name" value={bank.accountHolderName} />
                  <BankField label="Account Number" value={bank.accountNumber} copyable />
                  <BankField label="IFSC Code" value={bank.ifscCode} copyable />
                  <BankField label="Account Type" value={bank.accountType} />
                  <BankField label="Branch" value={bank.branch} />
                  {bank.upiId && <BankField label="UPI ID" value={bank.upiId} copyable />}
                  {bank.notes && <div className="md:col-span-2 lg:col-span-3 text-[13px] text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-100 mt-2">{bank.notes}</div>}
                </div>
              </div>

            </div>
          );
        }) : (
          <div className="p-8 text-center text-zinc-400 text-[14px] italic border-2 border-dashed border-zinc-200 rounded-xl">
            No bank accounts found.
          </div>
        )}
      </div>
    </div>
  );
}

function BankField({ label, value, copyable }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 group/field">
        <span className="text-[14px] font-semibold text-zinc-900 font-mono">{value || 'N/A'}</span>
        {copyable && value && (
          <div className="opacity-0 group-hover/field:opacity-100 transition-opacity">
            <CopyButton text={value} label="" className="!p-1" />
          </div>
        )}
      </div>
    </div>
  );
}
