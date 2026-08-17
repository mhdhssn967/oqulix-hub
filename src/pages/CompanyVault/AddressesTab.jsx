import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import CopyButton from './CopyButton';
import { MapPin, Plus, Trash2, Map } from 'lucide-react';

export default function AddressesTab({ data, canEdit, searchTerm }) {
  const { companyId } = useAuthStore();
  const [addresses, setAddresses] = useState(data.addresses || []);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'Registered Office',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pin: '',
    country: 'India'
  });

  const handleSave = async (updatedAddresses) => {
    if (!companyId) return;
    try {
      const detailsRef = doc(db, `userData/${companyId}/companyInfo`, 'details');
      await setDoc(detailsRef, { addresses: updatedAddresses }, { merge: true });
    } catch (err) {
      console.error("Error saving addresses:", err);
    }
  };

  const handleAdd = () => {
    const newAddresses = [...addresses, { ...formData, id: Date.now().toString() }];
    setAddresses(newAddresses);
    handleSave(newAddresses);
    setIsAdding(false);
    setFormData({ type: 'Registered Office', line1: '', line2: '', city: '', state: '', pin: '', country: 'India' });
  };

  const handleDelete = (id) => {
    const newAddresses = addresses.filter(a => a.id !== id);
    setAddresses(newAddresses);
    handleSave(newAddresses);
  };

  const filteredAddresses = addresses.filter(a => 
    (a.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.state || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-800"><MapPin className="w-5 h-5 text-red-500"/> Office Addresses</h2>
        {canEdit && (
          <button onClick={() => setIsAdding(true)} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/> Add Address
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-2 max-w-2xl">
          <h3 className="text-[13px] font-bold text-zinc-800 mb-3">Add New Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Address Type</label>
              <input type="text" placeholder="e.g. Registered Office, Corporate Office, Branch" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Address Line 1 *</label>
              <input type="text" value={formData.line1} onChange={e => setFormData({...formData, line1: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Address Line 2</label>
              <input type="text" value={formData.line2} onChange={e => setFormData({...formData, line2: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">City *</label>
              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">State *</label>
              <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">PIN / ZIP Code *</label>
              <input type="text" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Country</label>
              <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!formData.line1 || !formData.city || !formData.pin} className="px-3 py-1.5 bg-black text-white text-[12px] font-semibold rounded-md disabled:opacity-50">Save Address</button>
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-[12px] font-semibold rounded-md">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAddresses.length > 0 ? filteredAddresses.map(addr => {
          const fullAddress = [addr.line1, addr.line2, `${addr.city}, ${addr.state} ${addr.pin}`, addr.country].filter(Boolean).join('\n');
          return (
            <div key={addr.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 relative group flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <span className="text-[14px] font-bold text-zinc-800 flex items-center gap-1.5"><Map className="w-4 h-4 text-zinc-400"/> {addr.type}</span>
                <div className="flex items-center gap-2">
                  <CopyButton text={fullAddress} label="Copy Full Address" />
                  {canEdit && (
                    <button onClick={() => handleDelete(addr.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100" title="Delete">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[14px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {fullAddress}
              </div>
            </div>
          );
        }) : (
          <div className="md:col-span-2 p-8 text-center text-zinc-400 text-[14px] italic border-2 border-dashed border-zinc-200 rounded-xl">
            No addresses configured yet.
          </div>
        )}
      </div>
    </div>
  );
}
