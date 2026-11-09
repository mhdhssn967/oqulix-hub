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
  Sparkles, 
  Edit2,
  FolderOpen
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

  // Navigation state: currentFolderId is null at root, or string folder ID when inside a folder
  const [currentFolderId, setCurrentFolderId] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('amber');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState(null); // Parent folder ID for nested subfolders
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docCustomName, setDocCustomName] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [targetFolderIdForUpload, setTargetFolderIdForUpload] = useState('');
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

  // Current folder object (when inside a folder)
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return folders.find(f => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Build full ancestor breadcrumb chain: [ {id, name}, {id, name}, ... ]
  const folderBreadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    const chain = [];
    let curr = folders.find(f => f.id === currentFolderId);
    while (curr) {
      chain.unshift(curr);
      if (curr.parentId) {
        curr = folders.find(f => f.id === curr.parentId);
      } else {
        curr = null;
      }
    }
    return chain;
  }, [folders, currentFolderId]);

  // Subfolders in current level
  const currentSubfolders = useMemo(() => {
    let list = folders.filter(f => {
      if (currentFolderId === null) {
        return !f.parentId; // root folders (parentId undefined or null)
      }
      return f.parentId === currentFolderId;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => 
        (f.name || '').toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [folders, currentFolderId, searchQuery]);

  // Documents inside current folder (only displayed when inside a folder)
  const currentDocuments = useMemo(() => {
    if (!currentFolderId) return [];
    let list = documents.filter(d => d.folderId === currentFolderId);

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

  // Recursively gather all descendant folder IDs
  const getAllDescendantFolderIds = (folderId, allFolders) => {
    const directChildren = allFolders.filter(f => f.parentId === folderId);
    let ids = directChildren.map(f => f.id);
    for (const child of directChildren) {
      ids = ids.concat(getAllDescendantFolderIds(child.id, allFolders));
    }
    return ids;
  };

  // Open New Folder Modal with proper parent context
  const handleOpenNewFolderModal = () => {
    setNewFolderParentId(currentFolderId || null);
    setIsNewFolderModalOpen(true);
  };

  // Create Folder (Root or Subfolder inside current folder)
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!companyId) return;

    setIsSubmittingFolder(true);
    try {
      const parentIdToUse = newFolderParentId || null;

      const newFolderData = {
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        color: newFolderColor,
        parentId: parentIdToUse,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || 'admin',
        createdByName: user?.displayName || user?.email || 'Admin',
      };

      const docRef = await addDoc(collection(db, `userData/${companyId}/documentFolders`), newFolderData);
      const createdFolder = { id: docRef.id, ...newFolderData, createdAt: new Date() };
      setFolders(prev => [...prev, createdFolder]);
      setIsNewFolderModalOpen(false);
      setNewFolderName('');
      setNewFolderDesc('');

      // Open the newly created folder
      setCurrentFolderId(docRef.id);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: parentIdToUse ? 'Subfolder created successfully' : 'Folder created successfully',
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

  // Delete Folder (Cascading: deletes subfolders and all their documents)
  const handleDeleteFolder = async (e, folder) => {
    e.stopPropagation();

    // Find all descendant folders
    const descendantFolderIds = getAllDescendantFolderIds(folder.id, folders);
    const allFolderIdsToDelete = [folder.id, ...descendantFolderIds];

    const affectedDocs = documents.filter(d => allFolderIdsToDelete.includes(d.folderId));
    const subfolderCount = descendantFolderIds.length;

    let warningText = `Are you sure you want to delete "${folder.name}"?`;
    if (affectedDocs.length > 0 || subfolderCount > 0) {
      warningText = `This will delete "${folder.name}"`;
      if (subfolderCount > 0) warningText += `, ${subfolderCount} subfolder(s)`;
      if (affectedDocs.length > 0) warningText += `, and ${affectedDocs.length} document(s)`;
      warningText += `. This action cannot be undone.`;
    }

    const confirm = await Swal.fire({
      title: 'Delete Folder?',
      text: warningText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, delete all'
    });

    if (!confirm.isConfirmed) return;

    try {
      // 1. Delete all docs in this folder and its subfolders from Cloudflare R2 and Firestore
      for (const d of affectedDocs) {
        if (d.r2Key) {
          await deleteDocumentFromR2(d.r2Key).catch(() => {});
        }
        await deleteDoc(doc(db, `userData/${companyId}/documentFiles`, d.id));
      }

      // 2. Delete all folder records
      for (const fId of allFolderIdsToDelete) {
        await deleteDoc(doc(db, `userData/${companyId}/documentFolders`, fId));
      }

      setFolders(prev => prev.filter(f => !allFolderIdsToDelete.includes(f.id)));
      setDocuments(prev => prev.filter(d => !allFolderIdsToDelete.includes(d.folderId)));

      if (allFolderIdsToDelete.includes(currentFolderId)) {
        // Navigate back to the parent of the deleted folder, or root if it was top-level
        setCurrentFolderId(folder.parentId || null);
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

  // Trigger file picker. Enforces that a folder exists before allowing upload.
  const handleTriggerUpload = () => {
    if (folders.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Folder Required',
        text: 'Please create a folder first before uploading documents. Documents must belong to a folder.',
        confirmButtonText: 'Create Folder',
        showCancelButton: true,
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          handleOpenNewFolderModal();
        }
      });
      return;
    }
    fileInputRef.current?.click();
  };

  // When user selects a file from disk, prompt them with the modal to enter a Document Name and choose target folder
  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Suggest a clean default document name without file extension
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const readableDefaultName = baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

    setSelectedFile(file);
    setDocCustomName(readableDefaultName);
    setDocDescription('');
    // Default to the currently open folder, or the first available folder
    setTargetFolderIdForUpload(currentFolderId || folders[0]?.id || '');
    setIsUploadModalOpen(true);

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

    if (!targetFolderIdForUpload) {
      Swal.fire('Folder Required', 'Please select a destination folder for this document.', 'warning');
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
    const targetFolder = targetFolderIdForUpload;

    try {
      // 1. Upload file binary to Cloudflare R2
      const r2Result = await uploadDocumentToR2(selectedFile, companyId, targetFolder);

      // 2. Save Document record to Firestore with the user's custom document name
      const fileDoc = {
        name: docCustomName.trim(),
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

      // If user was viewing another folder, transition into the folder they uploaded into
      if (currentFolderId !== targetFolder) {
        setCurrentFolderId(targetFolder);
      }

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

  // Helper to format hierarchical folder path names in dropdowns
  const getFolderPathName = (folderItem) => {
    const parts = [folderItem.name];
    let parent = folders.find(f => f.id === folderItem.parentId);
    while (parent) {
      parts.unshift(parent.name);
      parent = folders.find(f => f.id === parent.parentId);
    }
    return parts.join(' / ');
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
          </div>
          <p className="text-[15px] text-zinc-500 mt-1.5">
            Organize company files in folders, upload attachments, and generate standardized templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* New Folder Button */}
          <button 
            onClick={handleOpenNewFolderModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-800 rounded-xl text-[13px] font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>{currentFolderId ? 'New Subfolder' : 'New Folder'}</span>
          </button>

          {/* Upload Document Button */}
          <button 
            onClick={handleTriggerUpload}
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
        {/* Hierarchical Breadcrumb Chain */}
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 overflow-x-auto py-1">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${currentFolderId === null ? 'bg-zinc-100 font-bold text-black' : 'hover:bg-zinc-50 text-zinc-500'}`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>All Folders</span>
          </button>

          {folderBreadcrumbs.map((crumb, idx) => {
            const isLast = idx === folderBreadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                {isLast ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shrink-0">
                    <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-200" />
                    <span className="truncate max-w-[200px]">{crumb.name}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-50 text-zinc-600 font-medium transition-colors shrink-0 cursor-pointer"
                  >
                    <Folder className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate max-w-[160px]">{crumb.name}</span>
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentFolderId ? `Search in ${currentFolder?.name}...` : "Search folders..."}
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
          {/* SUBFOLDERS / FOLDERS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <span>{currentFolderId ? 'Subfolders' : 'Company Folders'}</span>
                <span className="text-[11px] font-black bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                  {currentSubfolders.length}
                </span>
              </h3>

              {currentFolderId && (
                <button
                  onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
                  className="flex items-center gap-1 text-[12px] font-bold text-zinc-500 hover:text-black transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{currentFolder?.parentId ? 'Back to parent folder' : 'Back to all folders'}</span>
                </button>
              )}
            </div>

            {currentSubfolders.length === 0 && currentFolderId === null ? (
              <div className="bg-white p-12 border border-zinc-200/80 rounded-2xl text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <Folder className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h4 className="text-[16px] font-bold text-zinc-800">No folders created yet</h4>
                <p className="text-[13px] text-zinc-500 max-w-md mx-auto mt-1 mb-5">
                  Every document in the system must be organized into a folder (e.g. Legal, HR, Client Proposals, Registration). Create your first folder to begin.
                </p>
                <button 
                  onClick={handleOpenNewFolderModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[13px] font-bold rounded-xl shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <span>Create First Folder</span>
                </button>
              </div>
            ) : currentSubfolders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentSubfolders.map((folder) => {
                  const colorScheme = FOLDER_COLORS.find(c => c.id === folder.color) || FOLDER_COLORS[0];
                  const childSubfolderCount = folders.filter(f => f.parentId === folder.id).length;
                  const docCount = documents.filter(d => d.folderId === folder.id).length;
                  
                  return (
                    <div 
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={`group relative p-5 rounded-2xl border ${colorScheme.border} ${colorScheme.bg} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-3 rounded-xl bg-white/90 border border-black/5 shadow-xs">
                          <Folder className={`w-7 h-7 ${colorScheme.icon}`} fill={colorScheme.fill} />
                        </div>
                        <button 
                          onClick={(e) => handleDeleteFolder(e, folder)}
                          title="Delete Folder"
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-[15px] font-bold text-zinc-900 group-hover:text-black truncate">
                          {folder.name}
                        </h4>
                        {folder.description && (
                          <p className="text-[12px] text-zinc-500 line-clamp-1 mt-0.5">{folder.description}</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                          <span>
                            {childSubfolderCount > 0 ? `${childSubfolderCount} subfolder${childSubfolderCount === 1 ? '' : 's'} • ` : ''}
                            {docCount} file{docCount === 1 ? '' : 's'}
                          </span>
                          <span className="flex items-center gap-0.5 text-zinc-600 group-hover:text-black group-hover:translate-x-0.5 transition-all">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* DOCUMENTS SECTION (When inside a folder) */}
          {currentFolderId && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span>Documents in {currentFolder?.name}</span>
                  </h3>
                  <span className="text-[11px] font-black bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                    {currentDocuments.length}
                  </span>
                </div>
              </div>

              {currentDocuments.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-center">
                  <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <h4 className="text-[15px] font-semibold text-zinc-800">
                    No documents uploaded to "{currentFolder?.name}" yet
                  </h4>
                  <p className="text-[13px] text-zinc-500 max-w-md mx-auto mt-1 mb-5">
                    Upload contracts, agreements, registration files, and company records directly into this folder.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={handleTriggerUpload}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[13px] font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                    <button
                      onClick={handleOpenNewFolderModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-[13px] font-semibold hover:bg-zinc-50 transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4 text-amber-500" />
                      <span>Create Subfolder</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          <th className="px-5 py-3.5">Document Name</th>
                          <th className="px-5 py-3.5">Size</th>
                          <th className="px-5 py-3.5">Uploaded By</th>
                          <th className="px-5 py-3.5">Uploaded Date</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {currentDocuments.map((docItem) => {
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
                                      className="text-[14px] font-bold text-zinc-900 hover:text-indigo-600 transition-colors truncate max-w-[320px] sm:max-w-[440px]"
                                      title={docItem.name}
                                    >
                                      {docItem.name}
                                    </a>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {docItem.originalFileName && (
                                        <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]" title={`Original file: ${docItem.originalFileName}`}>
                                          {docItem.originalFileName}
                                        </span>
                                      )}
                                      {docItem.description && (
                                        <span className="text-[11px] text-zinc-500 italic truncate max-w-[240px]">
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
          )}
        </div>
      )}

      {/* Upload Document Modal (Prompts for Document Name and Target Folder) */}
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
                  <p className="text-[12px] text-zinc-500">Provide a document name and select destination folder</p>
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
                  className="text-[11px] font-bold text-indigo-600 hover:underline shrink-0 cursor-pointer"
                >
                  Change file
                </button>
              </div>

              {/* Document Name Input */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Document Title / Name *
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

              {/* Destination Folder (Required) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Destination Folder *
                </label>
                <select
                  required
                  value={targetFolderIdForUpload}
                  onChange={(e) => setTargetFolderIdForUpload(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] font-semibold outline-none focus:border-black focus:bg-white transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select a Folder --</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>📁 {getFolderPathName(f)}</option>
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
                  placeholder="e.g. Signed by Director on Nov 2026"
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
                      <span>Uploading to Folder...</span>
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

      {/* New Folder Modal (Supports creating inside current folder or at root) */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-zinc-900">
                    {newFolderParentId ? 'Create New Subfolder' : 'Create New Folder'}
                  </h3>
                  {newFolderParentId && (
                    <p className="text-[12px] text-zinc-500">
                      Inside: <span className="font-semibold text-zinc-800">{folders.find(f => f.id === newFolderParentId)?.name}</span>
                    </p>
                  )}
                </div>
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
                  placeholder={newFolderParentId ? "e.g. 2026 Invoices, NDA Agreements" : "e.g. Legal Contracts, Client Proposals"}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] font-medium outline-none focus:border-black focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              {/* Parent Folder Location selector if user wants to change destination */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1.5">
                  Location (Parent Folder)
                </label>
                <select
                  value={newFolderParentId || ''}
                  onChange={(e) => setNewFolderParentId(e.target.value ? e.target.value : null)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[13px] font-medium outline-none focus:border-black focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">📁 Root Level (Main Directory)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>📁 Inside {getFolderPathName(f)}</option>
                  ))}
                </select>
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
                  <span>{newFolderParentId ? 'Create Subfolder' : 'Create Folder'}</span>
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