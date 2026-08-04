import React, { useState } from 'react';
import { Plus, X, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import documentTypes from '../config/documentTypes.json';

export default function Documents() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div>
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">Documents</h1>
          <p className="text-[15px] text-zinc-500 mt-1.5">Manage your Documents here.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[14px] font-medium hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Document
        </button>
      </header>
      <div className="bg-white p-12 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-center text-zinc-400">
        Documents module coming soon.
      </div>

      {/* Document Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">Create New Document</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-[14px] text-zinc-500 mb-4">Select the type of document you want to create:</p>
              
              <div className="space-y-3">
                {documentTypes.map((doc) => (
                  <button 
                    key={doc.id}
                    onClick={() => {
                      setIsModalOpen(false);
                      navigate(`/documents/create/${doc.id}`);
                    }}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-zinc-200 hover:border-black/20 hover:shadow-sm bg-white transition-all text-left group"
                  >
                    <div className="p-2.5 bg-zinc-100 text-zinc-600 rounded-lg group-hover:bg-black group-hover:text-white transition-colors shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold text-zinc-900 mb-0.5">{doc.name}</h3>
                      <p className="text-[13px] text-zinc-500">{doc.description}</p>
                    </div>
                    <div className="shrink-0 self-center">
                      <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-black transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
