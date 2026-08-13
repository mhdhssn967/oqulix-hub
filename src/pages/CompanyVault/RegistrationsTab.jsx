import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import CopyButton from './CopyButton';
import { FileBadge, Plus, Trash2, Calendar } from 'lucide-react';

export default function RegistrationsTab({ data, canEdit, searchTerm }) {
  const { companyId } = useAuthStore();
  const [registrations, setRegistrations] = useState(data.registrations || []);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'GST Number',
    number: '',
    issueDate: '',
    expiryDate: '',
    notes: ''
  });

  const handleSave = async (updatedRegs) => {
    if (!companyId) return;
    try {
      const detailsRef = doc(db, `userData/${companyId}/companyInfo`, 'details');
      await setDoc(detailsRef, { registrations: updatedRegs }, { merge: true });
    } catch (err) {
      console.error("Error saving registrations:", err);
    }
  };

  const handleAdd = () => {
    const newRegs = [...registrations, { ...formData, id: Date.now().toString() }];
    setRegistrations(newRegs);
    handleSave(newRegs);
    setIsAdding(false);
    setFormData({ type: 'GST Number', number: '', issueDate: '', expiryDate: '', notes: '' });
  };

  const handleDelete = (id) => {
    const newRegs = registrations.filter(r => r.id !== id);
    setRegistrations(newRegs);
    handleSave(newRegs);
  };

  const filteredRegs = registrations.filter(r => 
    (r.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const predefinedTypes = [
    "GST Number", "PAN Number", "TAN Number", "CIN / LLPIN", 
    "Incorporation Number", "MSME / Udyam Number", 
    "Startup India Registration", "IEC Number", "Other"
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-800"><FileBadge className="w-5 h-5 text-indigo-500"/> Registrations & Documents</h2>
        {canEdit && (
          <button onClick={() => setIsAdding(true)} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/> Add Record
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-2 max-w-2xl">
          <h3 className="text-[13px] font-bold text-zinc-800 mb-3 border-b border-zinc-200 pb-2">Add Registration / ID</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Document / Registration Type *</label>
              <input type="text" list="reg-types" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
              <datalist id="reg-types">
                {predefinedTypes.map(t => <option key={t} value={t}/>)}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Number / ID *</label>
              <input type="text" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Issue Date</label>
              <input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Expiry Date</label>
              <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Notes</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!formData.type || !formData.number} className="px-3 py-1.5 bg-black text-white text-[12px] font-semibold rounded-md disabled:opacity-50">Save Record</button>
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-[12px] font-semibold rounded-md">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRegs.length > 0 ? filteredRegs.map(reg => {
          const isExpiringSoon = reg.expiryDate && (new Date(reg.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) < 30 && (new Date(reg.expiryDate) - new Date()) > 0;
          const isExpired = reg.expiryDate && (new Date(reg.expiryDate) < new Date());

          return (
            <div key={reg.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 relative group flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <span className="text-[13px] font-bold text-zinc-500 uppercase tracking-wider">{reg.type}</span>
                <CopyButton text={reg.number} label="" className="!p-1" />
              </div>
              
              <div className="text-[16px] font-bold text-black font-mono break-all">{reg.number}</div>
              
              {(reg.issueDate || reg.expiryDate) && (
                <div className="flex flex-col gap-1 mt-1 text-[11px] font-semibold text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                  {reg.issueDate && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Issued: {new Date(reg.issueDate).toLocaleDateString()}</span>}
                  {reg.expiryDate && (
                    <span className={`flex items-center gap-1.5 ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : ''}`}>
                      <Calendar className="w-3.5 h-3.5"/> Expires: {new Date(reg.expiryDate).toLocaleDateString()}
                      {isExpiringSoon && !isExpired && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] ml-1">SOON</span>}
                      {isExpired && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] ml-1">EXPIRED</span>}
                    </span>
                  )}
                </div>
              )}
              
              {reg.notes && <div className="text-[12px] text-zinc-600 italic mt-1">{reg.notes}</div>}

              {canEdit && (
                <button onClick={() => handleDelete(reg.id)} className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100" title="Delete">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              )}
            </div>
          );
        }) : (
          <div className="md:col-span-3 p-8 text-center text-zinc-400 text-[14px] italic border-2 border-dashed border-zinc-200 rounded-xl">
            No registrations added.
          </div>
        )}
      </div>
    </div>
  );
}
