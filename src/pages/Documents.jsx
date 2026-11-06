import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderPlus, 
  Upload, 
  Folder, 
  FileText, 
  ArrowRight, 
  Trash2, 
  Download, 
  ExternalLink, 
  ChevronRight, 
  Search, 
  X, 
  Loader2, 
  File, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode, 
  ArrowLeft,
  HardDrive,
  Sparkles,
  Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { uploadDocumentToR2, deleteDocumentFromR2, isR2Configured } from '../utils/r2Storage';
import Swal from 'sweetalert2';
import documentTypes from '../config/documentTypes.json';

// Helper to format byte sizes
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper to choose file icon
function getFileIcon(fileName = '', fileType = '') {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext) || fileType.startsWith('image/')) {
    return <ImageIcon className="w-5 h-5 text-indigo-500" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || fileType.includes('spreadsheet') || fileType.includes('csv')) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  if (['pdf'].includes(ext) || fileType.includes('pdf')) {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  if (['json', 'js', 'html', 'css', 'ts'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-amber-500" />;
  }
  return <File className="w-5 h-5 text-zinc-500" />;
}

// Folder color options for visual variety
const FOLDER_COLORS = [
  { id: 'amber', bg: 'bg-amber-50', border: 'border-amber-200/80', icon: 'text-amber-500', fill: '#fef3c7' },
  { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-200/80', icon: 'text-blue-500', fill: '#dbeafe' },
  { id: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200/80', icon: 'text-indigo-500', fill: '#e0e7ff' },
  { id: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200/80', icon: 'text-emerald-500', fill: '#d1fae5' },
  { id: 'purple', bg: 'bg-purple-50', border: 'border-purple-200/80', icon: 'text-purple-500', fill: '#f3e8ff' },
  { id: 'rose', bg: 'bg-rose-50', border: 'border-rose-200/80', icon: 'text-rose-500', fill: '#ffe4e6' },
];

export default function Documents() {
  const navigate = useNavigate();
  const { user, companyId } = useAuthStore();
  const fileInputRef = useRef(null);

  // Data states
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation states
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root directory

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('amber');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docCustomName, setDocCustomName] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [targetFolderIdForUpload, setTargetFolderIdForUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Rename Document Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDocName, setEditDocName] = useState('');

  // Fetch Folders & Documents
  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // 1. Fetch folders
      const foldersRef = collection(db, `userData/${companyId}/documentFolders`);
      const foldersSnap = await getDocs(foldersRef);
      const fList = foldersSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setFolders(fList);

      // 2. Fetch documents
      const docsRef = collection(db, `userData/${companyId}/documentFiles`);
      const docsSnap = await getDocs(docsRef);
      const dList = docsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setDocuments(dList);
    } catch (err) {
      console.error('Error fetching document data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  // Current folder object (if inside a folder)
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return folders.find(f => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Documents inside current view
  const currentDocuments = useMemo(() => {
    let list = documents.filter(d => {
      if (currentFolderId === null) {
        return !d.folderId || d.folderId === 'root';
      }
      return d.folderId === currentFolderId;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        (d.name || '').toLowerCase().includes(q) ||
        (d.originalFileName || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.uploadedByName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [documents, currentFolderId, searchQuery]);

  // Subfolders (if at root or support nested)
  const displayedFolders = useMemo(() => {
    if (currentFolderId !== null) return []; // 1-level folders for sleek usability
    let list = folders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => (f.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [folders, currentFolderId, searchQuery]);

  // Create Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!companyId) return;

    setIsSubmittingFolder(true);
    try {
      const newFolderData = {
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        color: newFolderColor,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || 'admin',
        createdByName: user?.displayName || user?.email || 'Admin',
      };

      const docRef = await addDoc(collection(db, `userData/${companyId}/documentFolders`), newFolderData);
      setFolders(prev => [...prev, { id: docRef.id, ...newFolderData, createdAt: new Date() }]);
      setIsNewFolderModalOpen(false);
      setNewFolderName('');
      setNewFolderDesc('');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Folder created successfully',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('Failed to create folder:', err);
      Swal.fire('Error', 'Failed to create folder.', 'error');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  // Delete Folder
  const handleDeleteFolder = async (e, folder) => {
    e.stopPropagation();
    const docCount = documents.filter(d => d.folderId === folder.id).length;
    const confirm = await Swal.fire({
      title: 'Delete Folder?',
      text: docCount > 0 
        ? `This folder contains ${docCount} file(s). Deleting the folder will also remove its files.` 
        : `Are you sure you want to delete "${folder.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, delete it'
    });

    if (!confirm.isConfirmed) return;

    try {
      // 1. Delete all docs in this folder from Cloudflare R2 and Firestore
      const folderDocs = documents.filter(d => d.folderId === folder.id);
      for (const d of folderDocs) {
        if (d.r2Key) {
          await deleteDocumentFromR2(d.r2Key).catch(() => {});
        }
        await deleteDoc(doc(db, `userData/${companyId}/documentFiles`, d.id));
      }

      // 2. Delete folder doc
      await deleteDoc(doc(db, `userData/${companyId}/documentFolders`, folder.id));

      setFolders(prev => prev.filter(f => f.id !== folder.id));
      setDocuments(prev => prev.filter(d => d.folderId !== folder.id));

      if (currentFolderId === folder.id) {
        setCurrentFolderId(null);
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Folder deleted',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to delete folder.', 'error');
    }
  };

  // When user selects a file from disk, prompt them with the modal to enter a Document Name
  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Suggest a clean default document name without file extension
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const readableDefaultName = baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

    setSelectedFile(file);
    setDocCustomName(readableDefaultName);
    setDocDescription('');
    setTargetFolderIdForUpload(currentFolderId || 'root');
    setIsUploadModalOpen(true);

    // Reset native input so user can pick the same file again if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Upload with Document Name to Cloudflare R2 + Firestore
  const handleConfirmUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (!docCustomName.trim()) {
      Swal.fire('Document Name Required', 'Please provide a name for this document.', 'warning');
      return;
    }

    if (!isR2Configured()) {
      Swal.fire({
        icon: 'error',
        title: 'Storage Not Configured',
        text: 'Please check your Cloudflare R2 environment variables.'
      });
      return;
    }

    setIsUploading(true);
    const targetFolder = targetFolderIdForUpload || 'root';

    try {
      // 1. Upload file binary to Cloudflare R2
      const r2Result = await uploadDocumentToR2(selectedFile, companyId, targetFolder);

      // 2. Save Document record to Firestore with the user's custom document name
      const fileDoc = {
        name: docCustomName.trim(), // Custom human readable document title
        originalFileName: selectedFile.name,
        description: docDescription.trim(),
        folderId: targetFolder,
        size: selectedFile.size,
        type: selectedFile.type || 'application/octet-stream',
        url: r2Result.url,
        r2Key: r2Result.key,
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.uid || 'admin',
        uploadedByName: user?.displayName || user?.email || 'Admin',
      };

      const docRef = await addDoc(collection(db, `userData/${companyId}/documentFiles`), fileDoc);
      setDocuments(prev => [{ id: docRef.id, ...fileDoc, uploadedAt: new Date() }, ...prev]);

      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocCustomName('');
      setDocDescription('');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Document uploaded successfully!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('File upload failed:', err);
      Swal.fire('Upload Failed', err.message || 'Error uploading document to Cloudflare.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Rename Document
  const handleRenameDocument = async (e) => {
    e.preventDefault();
    if (!editingDoc || !editDocName.trim()) return;

    try {
      await updateDoc(doc(db, `userData/${companyId}/documentFiles`, editingDoc.id), {
        name: editDocName.trim(),
        updatedAt: serverTimestamp()
      });

      setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { ...d, name: editDocName.trim() } : d));
      setEditingDoc(null);
      setEditDocName('');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Document renamed',
        showConfirmButton: false,
        timer: 1800
      });
    } catch (err) {
      console.error('Failed to rename document:', err);
      Swal.fire('Error', 'Failed to rename document.', 'error');
    }
  };

  // Delete Document
  const handleDeleteDocument = async (e, docItem) => {
    e.stopPropagation();
    const confirm = await Swal.fire({
      title: 'Delete Document?',
      text: `Are you sure you want to delete "${docItem.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, delete'
    });

    if (!confirm.isConfirmed) return;

    try {
      if (docItem.r2Key) {
        await deleteDocumentFromR2(docItem.r2Key).catch(() => {});
      }
      await deleteDoc(doc(db, `userData/${companyId}/documentFiles`, docItem.id));
      setDocuments(prev => prev.filter(d => d.id !== docItem.id));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Document deleted',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to delete document.', 'error');
    }
  };

  return (
    <div className="pb-12 min-h-screen">
      {/* Hidden File Input for Cloudflare R2 Uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFilePicked} 
        className="hidden" 
      />

      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-black tracking-tight">Documents</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <HardDrive className="w-3 h-3 text-amber-600" /> Cloud Storage
            </span>
          </div>
          <p className="text-[15px] text-zinc-500 mt-1.5">
            Organize company files in folders, upload attachments, and generate standardized templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* New Folder Button */}
          <button 
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-800 rounded-xl text-[13px] font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>New Folder</span>
          </button>

          {/* Upload Document Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[13px] font-semibold hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{currentFolderId ? `Upload to ${currentFolder?.name || 'Folder'}` : 'Upload Document'}</span>
          </button>

          {/* Create Document Template Button */}
          <button 
            onClick={() => setIsCreateDocModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-xl text-[13px] font-semibold hover:from-black hover:to-zinc-900 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Create from Template</span>
          </button>
        </div>
      </header>

      {/* Breadcrumb Navigation & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 overflow-x-auto py-1">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${currentFolderId === null ? 'bg-zinc-100 font-bold text-black' : 'hover:bg-zinc-50 text-zinc-500'}`}
          >
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            <span>Root Storage</span>
          </button>

          {currentFolder && (
            <>
              <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200/80">
                <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-200" />
                <span className="truncate max-w-[200px]">{currentFolder.name}</span>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentFolderId ? `Search in ${currentFolder?.name}...` : "Search all folders & files..."}
            className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] outline-none focus:border-black focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-16 rounded-2xl border border-zinc-200/80 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
          <p className="text-[14px] text-zinc-500 font-medium">Loading documents from Cloud Storage...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section (Only shown at root level or when searching) */}
          {currentFolderId === null && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Folders</span>
                  <span className="text-[11px] font-black bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                    {displayedFolders.length}
                  </span>
                </h3>
              </div>

              {displayedFolders.length === 0 ? (
                <div className="p-8 border border-dashed border-zinc-200 rounded-2xl text-center bg-zinc-50/50">
                  <Folder className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-[13px] font-semibold text-zinc-700">No folders yet</p>
                  <p className="text-[12px] text-zinc-400 mt-0.5 mb-3">Create folders to categorize contracts, registrations, client proposals, etc.</p>
                  <button 
                    onClick={() => setIsNewFolderModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white text-[12px] font-bold rounded-lg shadow-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Create First Folder</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedFolders.map((folder) => {
                    const colorScheme = FOLDER_COLORS.find(c => c.id === folder.color) || FOLDER_COLORS[0];
                    const count = documents.filter(d => d.folderId === folder.id).length;
                    
                    return (
                      <div 
                        key={folder.id}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className={`group relative p-4 rounded-2xl border ${colorScheme.border} ${colorScheme.bg} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="p-2.5 rounded-xl bg-white/80 border border-black/5 shadow-xs">
                            <Folder className={`w-6 h-6 ${colorScheme.icon}`} fill={colorScheme.fill} />
                          </div>
                          <button 
                            onClick={(e) => handleDeleteFolder(e, folder)}
                            title="Delete Folder"
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3">
                          <h4 className="text-[14px] font-bold text-zinc-900 group-hover:text-black truncate">
                            {folder.name}
                          </h4>
                          {folder.description && (
                            <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{folder.description}</p>
                          )}
                          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
                            <span>{count} file{count === 1 ? '' : 's'}</span>
                            <span className="flex items-center gap-0.5 text-zinc-400 group-hover:text-zinc-700 transition-colors">
                              Open <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Files / Documents Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider">
                  {currentFolderId ? `${currentFolder?.name || 'Folder'} Files` : 'Root Documents'}
                </h3>
                <span className="text-[11px] font-black bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                  {currentDocuments.length}
                </span>
              </div>

              {currentFolderId && (
                <button 
                  onClick={() => setCurrentFolderId(null)}
                  className="flex items-center gap-1 text-[12px] font-bold text-zinc-500 hover:text-black transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to all folders
                </button>
              )}
            </div>

            {currentDocuments.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-center">
                <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h4 className="text-[15px] font-semibold text-zinc-800">
                  {currentFolderId ? `No files in "${currentFolder?.name}" yet` : 'No root documents found'}
                </h4>
                <p className="text-[13px] text-zinc-500 max-w-md mx-auto mt-1 mb-5">
                  Upload contracts, agreements, identification, and company records directly with custom document titles.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[13px] font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        <th className="px-5 py-3.5">Document Name</th>
                        <th className="px-5 py-3.5">Size</th>
                        <th className="px-5 py-3.5">Folder</th>
                        <th className="px-5 py-3.5">Uploaded By</th>
                        <th className="px-5 py-3.5">Uploaded Date</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {currentDocuments.map((docItem) => {
                        const fileFolder = folders.find(f => f.id === docItem.folderId);
                        const uploadedDateStr = docItem.uploadedAt?.toDate 
                          ? docItem.uploadedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : (docItem.uploadedAt ? new Date(docItem.uploadedAt).toLocaleDateString() : 'Recent');

                        return (
                          <tr key={docItem.id} className="hover:bg-zinc-50/60 transition-colors group">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-zinc-100 shrink-0">
                                  {getFileIcon(docItem.originalFileName || docItem.name, docItem.type)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <a 
                                    href={docItem.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[14px] font-bold text-zinc-900 hover:text-indigo-600 transition-colors truncate max-w-[280px] sm:max-w-[360px]"
                                    title={docItem.name}
                                  >
                                    {docItem.name}
                                  </a>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {docItem.originalFileName && (
                                      <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[200px]" title={`Original file: ${docItem.originalFileName}`}>
                                        {docItem.originalFileName}
                                      </span>
                                    )}
                                    {docItem.description && (
                                      <span className="text-[11px] text-zinc-500 italic truncate max-w-[200px]">
                                        • {docItem.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-[13px] font-semibold text-zinc-600">
                              {formatFileSize(docItem.size)}
                            </td>

                            <td className="px-5 py-4">
                              {fileFolder ? (
                                <button 
                                  onClick={() => setCurrentFolderId(fileFolder.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  <Folder className="w-3 h-3 text-amber-500 fill-amber-200" />
                                  <span>{fileFolder.name}</span>
                                </button>
                              ) : (
                                <span className="text-[12px] font-medium text-zinc-400 italic">Root</span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-[12.5px] font-medium text-zinc-600">
                              {docItem.uploadedByName || 'Admin'}
                            </td>

                            <td className="px-5 py-4 text-[12.5px] font-medium text-zinc-500">
                              {uploadedDateStr}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingDoc(docItem);
                                    setEditDocName(docItem.name);
                                  }}
                                  title="Rename Document"
                                  className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <a 
                                  href={docItem.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open in new tab"
                                  className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <a 
                                  href={docItem.url}
                                  download={docItem.originalFileName || docItem.name}
                                  title="Download File"
                                  className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button 
                                  onClick={(e) => handleDeleteDocument(e, docItem)}
                                  title="Delete Document"
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Document Modal (Prompts for Document Name) */}
      {isUploadModalOpen && selectedFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-black text-white rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-zinc-900">Upload New Document</h3>
                  <p className="text-[12px] text-zinc-500">Provide a descriptive document title</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                }}
                disabled={isUploading}
                className="text-zinc-400 hover:text-black transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpload} className="p-6 space-y-4">
              {/* File Info Pill */}
              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-white rounded-lg border border-zinc-200 shadow-xs shrink-0">
                    {getFileIcon(selectedFile.name, selectedFile.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-zinc-800 truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'file'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-indigo-600 hover:underline shrink-0"
                >
                  Change file
                </button>
              </div>

              {/* Document Name Input */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Document Title / Display Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Master Service Agreement 2026, GST Registration Certificate"
                  value={docCustomName}
                  onChange={(e) => setDocCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[13.5px] font-semibold outline-none focus:border-black focus:bg-white transition-all shadow-xs"
                  autoFocus
                />
              </div>

              {/* Destination Folder */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Destination Folder
                </label>
                <select
                  value={targetFolderIdForUpload || 'root'}
                  onChange={(e) => setTargetFolderIdForUpload(e.target.value === 'root' ? null : e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] font-medium outline-none focus:border-black focus:bg-white transition-all cursor-pointer"
                >
                  <option value="root">Root Storage (No folder)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>📁 {f.name}</option>
                  ))}
                </select>
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Description / Remarks (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Signed by CEO on Nov 2026"
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-100">
                <button 
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-black text-white rounded-xl text-[13px] font-bold hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Uploading to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-100 text-zinc-800 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-[15px] font-bold text-zinc-900">Rename Document</h3>
              </div>
              <button 
                onClick={() => setEditingDoc(null)}
                className="text-zinc-400 hover:text-black transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenameDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Document Name *
                </label>
                <input 
                  type="text"
                  required
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[13.5px] font-semibold outline-none focus:border-black focus:bg-white transition-all"
                  autoFocus
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Original file: {editingDoc.originalFileName || editingDoc.name}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-100">
                <button 
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-xl text-[13px] font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-bold text-zinc-900">Create New Folder</h3>
              </div>
              <button 
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-zinc-400 hover:text-black transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Folder Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Legal Contracts, Client Proposals"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] font-medium outline-none focus:border-black focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Description (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Storage for signed company agreements"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Folder Color Accent
                </label>
                <div className="flex items-center gap-2.5 pt-1">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        newFolderColor === c.id ? 'ring-2 ring-black scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.fill, borderColor: c.border.split(' ')[0] }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-100">
                <button 
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingFolder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-[13px] font-bold hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingFolder && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Create Folder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Selection / Template Modal */}
      {isCreateDocModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-zinc-900">Create Document from Template</h2>
              </div>
              <button 
                onClick={() => setIsCreateDocModalOpen(false)} 
                className="text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-[13px] text-zinc-500 mb-4">Select an interactive document template to fill and generate:</p>
              
              <div className="space-y-3">
                {documentTypes.map((docItem) => (
                  <button 
                    key={docItem.id}
                    onClick={() => {
                      setIsCreateDocModalOpen(false);
                      navigate(`/documents/create/${docItem.id}`);
                    }}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-zinc-200 hover:border-black/20 hover:shadow-sm bg-white transition-all text-left group cursor-pointer"
                  >
                    <div className="p-2.5 bg-zinc-100 text-zinc-600 rounded-lg group-hover:bg-black group-hover:text-white transition-colors shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[14px] font-bold text-zinc-900 mb-0.5">{docItem.name}</h3>
                      <p className="text-[12px] text-zinc-500">{docItem.description}</p>
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