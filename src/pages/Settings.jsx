import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, X, Save, Settings as SettingsIcon, LayoutGrid } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    category: [],
    service: [],
    source: [],
    type: []
  });
  const [newItems, setNewItems] = useState({
    category: '',
    service: '',
    source: '',
    type: ''
  });

  const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const docRef = doc(db, `userData/${userId}/preferences/prefs`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.fields) {
            setFields({
              category: data.fields.category || [],
              service: data.fields.service || [],
              source: data.fields.source || [],
              type: data.fields.type || []
            });
          }
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, [userId]);

  const handleDelete = (fieldKey, itemToDelete) => {
    setFields(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].filter(item => item !== itemToDelete)
    }));
  };

  const handleAdd = (fieldKey) => {
    const item = newItems[fieldKey].trim();
    if (!item) return;
    
    if (fields[fieldKey].includes(item)) {
      Swal.fire({
        icon: 'error',
        title: 'Duplicate Entry',
        text: 'This item already exists in the list.',
        confirmButtonColor: '#000'
      });
      return;
    }

    setFields(prev => ({
      ...prev,
      [fieldKey]: [...prev[fieldKey], item].sort()
    }));
    
    setNewItems(prev => ({ ...prev, [fieldKey]: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, `userData/${userId}/preferences/prefs`);
      await updateDoc(docRef, {
        fields: fields
      });
      Swal.fire({
        icon: 'success',
        title: 'Preferences Saved',
        text: 'Your changes have been successfully saved.',
        confirmButtonColor: '#000',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save preferences.',
        confirmButtonColor: '#000'
      });
    } finally {
      setSaving(false);
    }
  };

  const renderFieldEditor = (fieldKey, title, description) => (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {fields[fieldKey].map(item => (
          <div key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-800 text-sm font-medium rounded-lg border border-zinc-200">
            {item}
            <button
              onClick={() => handleDelete(fieldKey, item)}
              className="text-zinc-400 hover:text-red-500 transition-colors ml-1 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {fields[fieldKey].length === 0 && (
          <span className="text-sm text-zinc-400 italic py-1.5">No items found</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={newItems[fieldKey]}
          onChange={(e) => setNewItems(prev => ({ ...prev, [fieldKey]: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd(fieldKey)}
          placeholder={`Add new ${title.toLowerCase()}...`}
          className="flex-1 max-w-sm px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 bg-white"
        />
        <button
          onClick={() => handleAdd(fieldKey)}
          disabled={!newItems[fieldKey].trim()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-2rem)] pb-10">
      {/* Sidebar Layout */}
      <div className="w-64 pr-8 border-r border-zinc-200/60 mr-8 flex-shrink-0">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold text-black tracking-tight">Settings</h1>
          <p className="text-[14px] text-zinc-500 mt-1.5">Manage your CRM settings.</p>
        </header>

        <nav className="space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
            <LayoutGrid className="w-4 h-4" />
            Preferences
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl text-sm font-medium transition-colors cursor-not-allowed opacity-50" title="Coming soon">
            <SettingsIcon className="w-4 h-4" />
            General
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-4">
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#fbfbfe]/90 backdrop-blur-md py-4 z-10 border-b border-zinc-100">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Preferences Editor</h2>
            <p className="text-sm text-zinc-500 mt-1">Add or remove dropdown options for categories, sources, and more.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {renderFieldEditor('category', 'Category', 'Used to classify transactions into broad operational groups.')}
            {renderFieldEditor('source', 'Source', 'The origin bank account or payment gateway.')}
            {renderFieldEditor('type', 'Type', 'The overarching department or division type.')}
            {renderFieldEditor('service', 'Service', 'The specific service, client project, or product related to the transaction.')}
          </div>
        )}
      </div>
    </div>
  );
}
