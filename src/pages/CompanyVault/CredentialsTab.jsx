import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import CopyButton from './CopyButton';
import { KeyRound, Plus, Trash2, Eye, EyeOff, Globe, ExternalLink, ShieldAlert } from 'lucide-react';

export default function CredentialsTab({ data, canEdit, searchTerm }) {
  const { companyId } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track which passwords are visible
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [formData, setFormData] = useState({
    service: '',
    category: 'SaaS / Software',
    username: '',
    password: '',
    url: '',
    purpose: '',
    owner: ''
  });

  const categories = [
    "Email", "Hosting", "Domain", "Development", "Cloud Services", 
    "Social Media", "Finance", "Government", "SaaS / Software", "Other"
  ];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, `userData/${companyId}/vault`), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setFormData({
        service: '', category: 'SaaS / Software', username: '', password: '', url: '', purpose: '', owner: ''
      });
      // Optionally log audit here
    } catch (err) {
      console.error("Error adding credential:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!companyId) return;
    try {
      await deleteDoc(doc(db, `userData/${companyId}/vault`, id));
      // Optionally log audit here
    } catch (err) {
      console.error("Error deleting credential:", err);
    }
  };

  const togglePassword = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter passwords - Note: NOT searching password fields for security
  const filteredCreds = data.filter(c => 
    (c.service || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      
      {/* Security Warning */}
      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[13px] font-bold text-yellow-800">Secure Vault Area</h4>
          <p className="text-[12px] text-yellow-700 mt-1">This information is highly sensitive. Do not share credentials externally. Passwords are hidden by default.</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-800"><KeyRound className="w-5 h-5 text-yellow-500"/> Company Credentials</h2>
        {canEdit && (
          <button onClick={() => setIsAdding(true)} className="px-3 py-1.5 text-[12px] font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5"/> Add Credential
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 mb-2 max-w-3xl shadow-xl">
          <h3 className="text-[14px] font-bold text-white mb-4 border-b border-zinc-700 pb-2">Add Secure Credential</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Service / Account Name *</label>
              <input type="text" placeholder="e.g. Google Workspace" required value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Category</label>
              <input type="text" list="cat-list" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500" />
              <datalist id="cat-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Login Email / Username *</label>
              <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Password *</label>
              <input type="text" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500 font-mono" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Login URL</label>
              <input type="url" placeholder="https://" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Owner / Responsible</label>
              <input type="text" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">Purpose / Notes</label>
              <input type="text" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-[13px] outline-none focus:border-yellow-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black text-[12px] font-bold rounded-md disabled:opacity-50">Save Credential</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-[12px] font-semibold rounded-md border border-zinc-700">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredCreds.length > 0 ? filteredCreds.map(cred => {
          const isVisible = visiblePasswords[cred.id];
          return (
            <div key={cred.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 relative group flex flex-col gap-4">
              <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-100 px-1.5 py-0.5 rounded-sm">{cred.category}</span>
                  <h3 className="text-[15px] font-bold text-zinc-900 mt-1">{cred.service}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {cred.url && (
                    <a href={cred.url} target="_blank" rel="noreferrer" className="p-1.5 bg-zinc-50 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Open Login URL">
                      <ExternalLink className="w-4 h-4"/>
                    </a>
                  )}
                  {canEdit && (
                    <button onClick={() => handleDelete(cred.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100" title="Delete Credential">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Username */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Username / Email</span>
                  <div className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2">
                    <span className="text-[13px] font-semibold text-zinc-900 font-mono break-all">{cred.username}</span>
                    <CopyButton text={cred.username} label="" className="!p-1 shrink-0" />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Password</span>
                  <div className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2">
                    <span className="text-[14px] font-bold text-zinc-900 font-mono tracking-widest mt-0.5">
                      {isVisible ? cred.password : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => togglePassword(cred.id)} className="p-1 text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors" title={isVisible ? "Hide" : "Reveal"}>
                        {isVisible ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
                      </button>
                      <CopyButton text={cred.password} label="" className="!p-1" />
                    </div>
                  </div>
                </div>

                {(cred.purpose || cred.owner) && (
                  <div className="text-[12px] text-zinc-600 mt-1">
                    {cred.owner && <div><span className="font-semibold text-zinc-500">Owner:</span> {cred.owner}</div>}
                    {cred.purpose && <div><span className="font-semibold text-zinc-500">Note:</span> {cred.purpose}</div>}
                  </div>
                )}
              </div>

            </div>
          );
        }) : (
          <div className="md:col-span-3 p-8 text-center text-zinc-400 text-[14px] italic border-2 border-dashed border-zinc-200 rounded-xl">
            No credentials stored.
          </div>
        )}
      </div>
    </div>
  );
}
