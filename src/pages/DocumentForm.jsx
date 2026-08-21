import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Plus, X } from 'lucide-react';
import Swal from 'sweetalert2';
import DocumentPreview from '../components/DocumentPreview';
import DocumentTextEditor from '../components/DocumentTextEditor';

// We dynamically import the configuration. In a real app with many forms, this might be a dynamic fetch.
import happyMovesQuotation from '../config/forms/happy_moves_quotation.json';

const formConfigs = {
  'happy_moves_quotation': happyMovesQuotation
};

export default function DocumentForm() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [textData, setTextData] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('details'); // details, editor, preview

  // We assume user ID is hardcoded for clients query based on previous codebase patterns
  const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

  useEffect(() => {
    const fetchConfig = async () => {
      const selectedConfig = formConfigs[docId];
      if (!selectedConfig) {
        Swal.fire('Error', 'Form configuration not found!', 'error');
        navigate('/documents');
        return;
      }
      setConfig(selectedConfig);

      // Initialize form state
      const initialData = {};
      const today = new Date();

      selectedConfig.groups.forEach(group => {
        group.fields.forEach(field => {
          if (field.id === 'date') {
            initialData[field.id] = today.toISOString().split('T')[0];
          } else if (field.id === 'validUntil') {
            const next30Days = new Date(today);
            next30Days.setDate(next30Days.getDate() + 30);
            initialData[field.id] = next30Days.toISOString().split('T')[0];
          } else if (field.type === 'itemsList') {
            initialData[field.id] = field.defaultItems ? JSON.parse(JSON.stringify(field.defaultItems)) : [];
          } else if (field.defaultValue !== undefined) {
            initialData[field.id] = field.defaultValue;
          } else {
            initialData[field.id] = '';
          }
        });
      });
      setFormData(initialData);

      // Check if we need to load clients
      const needsClients = selectedConfig.groups.some(g => g.fields.some(f => f.source === 'clients'));
      if (needsClients) {
        try {
          const leadsRef = collection(db, 'userData', userId, 'segments', 'happymoves', 'crmData', 'leads', 'items');
          const snap = await getDocs(leadsRef);
          if (!snap.empty) {
            const items = snap.docs.map(d => ({id: d.id, ...d.data()}));
            const leadsData = items.map(item => ({
              id: item.id,
              clientName: item.clientName || item.name || 'Unnamed Lead'
            }));
            leadsData.sort((a, b) => a.clientName.localeCompare(b.clientName));
            setClients(leadsData);
          }
        } catch (error) {
          console.error("Error fetching leads", error);
        }
      }
      setLoading(false);
    };
    fetchConfig();
  }, [docId, navigate]);

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldId]: value };
      
      if (fieldId === 'date' && value) {
        const newDate = new Date(value);
        if (!isNaN(newDate.getTime())) {
          const next30Days = new Date(newDate);
          next30Days.setDate(next30Days.getDate() + 30);
          newData['validUntil'] = next30Days.toISOString().split('T')[0];
        }
      }
      
      return newData;
    });
  };

  const handleSubmitDetails = (e) => {
    e.preventDefault();
    setStep('editor');
  };

  const handleSaveTexts = (texts) => {
    setTextData(texts);
    setStep('preview');
  };

  const handleItemChange = (fieldId, index, key, value) => {
    setFormData(prev => {
      const newItems = [...(prev[fieldId] || [])];
      newItems[index] = { ...newItems[index], [key]: value };
      return { ...prev, [fieldId]: newItems };
    });
  };

  const handleAddItem = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), { name: '', quantity: 1, price: 0 }]
    }));
  };

  const handleRemoveItem = (fieldId, index) => {
    setFormData(prev => {
      const newItems = [...(prev[fieldId] || [])];
      newItems.splice(index, 1);
      return { ...prev, [fieldId]: newItems };
    });
  };

  const renderItemsList = (field) => {
    const items = formData[field.id] || [];
    return (
      <div className="md:col-span-2 space-y-3 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
        <div className="flex text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          <div className="flex-1">Item Description</div>
          <div className="w-20 text-center">Qty</div>
          {!field.hidePrice && <div className="w-32 text-right">Unit Price (₹)</div>}
          <div className="w-8"></div>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1">
              <input 
                type="text" 
                value={item.name} 
                onChange={(e) => handleItemChange(field.id, index, 'name', e.target.value)} 
                placeholder="Product/Service"
                className="w-full bg-transparent border-0 border-b border-zinc-300 focus:ring-0 focus:border-black text-sm px-0 py-1"
                required
              />
            </div>
            <div className="w-20">
              <input 
                type="number" 
                value={item.quantity} 
                onChange={(e) => handleItemChange(field.id, index, 'quantity', e.target.value)} 
                className="w-full bg-transparent border-0 border-b border-zinc-300 focus:ring-0 focus:border-black text-sm px-0 py-1 text-center"
                min="1"
                required
              />
            </div>
            {!field.hidePrice && (
              <div className="w-32">
                <input 
                  type="number" 
                  value={item.price} 
                  onChange={(e) => handleItemChange(field.id, index, 'price', e.target.value)} 
                  className="w-full bg-transparent border-0 border-b border-zinc-300 focus:ring-0 focus:border-black text-sm px-0 py-1 text-right"
                  min="0"
                  required
                />
              </div>
            )}
            <button 
              type="button" 
              onClick={() => handleRemoveItem(field.id, index)}
              className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors w-8 flex justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="pt-2">
          <button 
            type="button"
            onClick={() => handleAddItem(field.id)}
            className="text-sm text-black font-semibold flex items-center gap-1 hover:underline"
          >
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>
      </div>
    );
  };

  const renderField = (field) => {
    const commonClasses = "w-full py-2 bg-transparent border-0 border-b-2 border-zinc-200 rounded-none text-sm focus:outline-none focus:ring-0 focus:border-black transition-all px-0";
    
    switch (field.type) {
      case 'select':
        if (field.source === 'clients') {
          return (
            <div className="relative">
              <input
                list={`list-${field.id}`}
                required={field.required}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className={commonClasses}
                placeholder={`Search ${field.label.toLowerCase()}...`}
                autoComplete="off"
              />
              <datalist id={`list-${field.id}`}>
                {clients.map(client => (
                  <option key={client.id} value={client.clientName} />
                ))}
              </datalist>
            </div>
          );
        }
        return <select className={commonClasses}><option>Unknown Source</option></select>;
        
      case 'date':
        return (
          <input
            type="date"
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
        
      case 'itemsList':
        return renderItemsList(field);
        
      default:
        return (
          <input
            type="text"
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const renderStepper = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-zinc-900 font-semibold">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm mr-2">1</div>
          <span className="text-sm">Fill Details</span>
        </div>
        <div className="h-px w-12 bg-zinc-300"></div>
        <div className={`flex items-center font-semibold ${step === 'editor' || step === 'preview' ? 'text-zinc-900' : 'text-zinc-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 ${step === 'editor' || step === 'preview' ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-500'}`}>2</div>
          <span className="text-sm">Edit Quotation</span>
        </div>
        <div className="h-px w-12 bg-zinc-300"></div>
        <div className={`flex items-center font-semibold ${step === 'preview' ? 'text-zinc-900' : 'text-zinc-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 ${step === 'preview' ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-500'}`}>3</div>
          <span className="text-sm">Preview</span>
        </div>
      </div>
    </div>
  );

  if (step === 'preview') {
    return (
      <div className="w-full pb-20">
        <div className="px-4 sm:px-8 pt-8">
          {renderStepper()}
        </div>
        <DocumentPreview config={config} formData={formData} textData={textData} onBack={() => setStep('editor')} />
      </div>
    );
  }

  if (step === 'editor') {
    return (
      <div className="w-full px-4 sm:px-8 pb-20 pt-8">
        {renderStepper()}
        <DocumentTextEditor initialTexts={textData} onSave={handleSaveTexts} onBack={() => setStep('details')} />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 pb-20 pt-8">
      {renderStepper()}
      <header className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate('/documents')}
          className="p-2 bg-white border border-zinc-200 rounded-full text-zinc-500 hover:text-black hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{config.title}</h1>
          <p className="text-sm text-zinc-500 mt-1">Fill in the details below to generate your document.</p>
        </div>
      </header>

      <form onSubmit={handleSubmitDetails} className="space-y-6">
        {config.groups.map((group, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">{group.name}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {group.fields.map(field => (
                  <div key={field.id} className={`${(field.type === 'text' && field.id.includes('Address')) || field.type === 'itemsList' ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                    {field.type !== 'itemsList' && (
                      <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5 flex justify-between">
                        <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                      </label>
                    )}
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Next Step
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
