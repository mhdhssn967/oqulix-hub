import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import CopyButton from './CopyButton';
import { Contact, Plus, X, Phone, Mail, Trash2, CheckCircle2 } from 'lucide-react';

export default function ContactTab({ data, canEdit, searchTerm }) {
  const { companyId } = useAuthStore();
  const [contacts, setContacts] = useState(data.contacts || []);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'Email', // Email or Phone
    label: '',
    value: '',
    purpose: '',
    primary: false
  });

  const handleSave = async (updatedContacts) => {
    if (!companyId) return;
    try {
      const detailsRef = doc(db, `userData/${companyId}/companyInfo`, 'details');
      await setDoc(detailsRef, { contacts: updatedContacts }, { merge: true });
    } catch (err) {
      console.error("Error saving contacts:", err);
    }
  };

  const handleAdd = () => {
    const newContacts = [...contacts, { ...formData, id: Date.now().toString() }];
    setContacts(newContacts);
    handleSave(newContacts);
    setIsAdding(false);
    setFormData({ type: 'Email', label: '', value: '', purpose: '', primary: false });
  };

  const handleDelete = (id) => {
    const newContacts = contacts.filter(c => c.id !== id);
    setContacts(newContacts);
    handleSave(newContacts);
  };

  const setPrimary = (id, type) => {
    const newContacts = contacts.map(c => {
      if (c.type === type) {
        return { ...c, primary: c.id === id };
      }
      return c;
    });
    setContacts(newContacts);
    handleSave(newContacts);
  };

  const filteredContacts = contacts.filter(c => 
    (c.value || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const emails = filteredContacts.filter(c => c.type === 'Email');
  const phones = filteredContacts.filter(c => c.type === 'Phone');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-800"><Contact className="w-5 h-5 text-purple-600"/> Contact Information</h2>
        {canEdit && (
          <button onClick={() => setIsAdding(true)} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/> Add Contact
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-2">
          <h3 className="text-[13px] font-bold text-zinc-800 mb-3">Add New Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black">
                <option>Email</option>
                <option>Phone</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Label</label>
              <input type="text" placeholder="e.g. Office, HR, General" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">{formData.type} Address / Number</label>
              <input type={formData.type === 'Email' ? 'email' : 'text'} value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">Purpose / Notes</label>
              <input type="text" placeholder="e.g. For vendor inquiries" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-md text-[13px] outline-none focus:border-black" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!formData.value} className="px-3 py-1.5 bg-black text-white text-[12px] font-semibold rounded-md disabled:opacity-50">Save</button>
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-[12px] font-semibold rounded-md">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Emails Section */}
        <div>
          <h3 className="text-[14px] font-bold flex items-center gap-2 mb-4 text-zinc-800 border-b border-zinc-100 pb-2">
            <Mail className="w-4 h-4 text-zinc-400"/> Email Addresses
          </h3>
          <div className="flex flex-col gap-3">
            {emails.length > 0 ? emails.map(email => (
              <ContactCard key={email.id} contact={email} onDelete={() => handleDelete(email.id)} onSetPrimary={() => setPrimary(email.id, 'Email')} canEdit={canEdit} />
            )) : <div className="text-[13px] text-zinc-400 italic">No email addresses found.</div>}
          </div>
        </div>

        {/* Phones Section */}
        <div>
          <h3 className="text-[14px] font-bold flex items-center gap-2 mb-4 text-zinc-800 border-b border-zinc-100 pb-2">
            <Phone className="w-4 h-4 text-zinc-400"/> Phone Numbers
          </h3>
          <div className="flex flex-col gap-3">
            {phones.length > 0 ? phones.map(phone => (
              <ContactCard key={phone.id} contact={phone} onDelete={() => handleDelete(phone.id)} onSetPrimary={() => setPrimary(phone.id, 'Phone')} canEdit={canEdit} />
            )) : <div className="text-[13px] text-zinc-400 italic">No phone numbers found.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({ contact, onDelete, onSetPrimary, canEdit }) {
  return (
    <div className={`p-3 rounded-lg border ${contact.primary ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-zinc-200'} shadow-sm flex flex-col gap-2 relative group`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-zinc-700">{contact.label || 'Contact'}</span>
            {contact.primary && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3"/> Primary</span>}
          </div>
          <div className="text-[15px] font-semibold text-black mt-0.5">{contact.value}</div>
          {contact.purpose && <div className="text-[12px] text-zinc-500 mt-1">{contact.purpose}</div>}
        </div>
        <CopyButton text={contact.value} label="Copy" />
      </div>

      {canEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 -mt-2 -mr-1">
           <button onClick={onDelete} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100" title="Delete">
             <Trash2 className="w-3.5 h-3.5"/>
           </button>
           {!contact.primary && (
             <button onClick={onSetPrimary} className="p-1.5 bg-zinc-100 text-zinc-600 rounded-md hover:bg-zinc-200" title="Set as Primary">
               <CheckCircle2 className="w-3.5 h-3.5"/>
             </button>
           )}
        </div>
      )}
    </div>
  );
}
