import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { uploadResumeToR2, deleteResumeFromR2, isR2Configured } from '../utils/r2Storage';
import Swal from 'sweetalert2';
import {
  Folder,
  FolderOpen,
  Plus,
  Search,
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  IndianRupee,
  Users,
  Star,
  FileText,
  Upload,
  ExternalLink,
  Trash2,
  Edit3,
  ArrowLeft,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Building2,
  Home,
  Sparkles,
  UserPlus,
  Filter,
  Download,
  Eye,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STATUS_BADGES = {
  Open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-amber-50 text-amber-700 border-amber-200',
  Closed: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const CANDIDATE_STAGES = [
  'New',
  'Shortlisted',
  'Interview Scheduled',
  'Interviewed',
  'Offered',
  'Hired',
  'Rejected',
];

const STAGE_COLORS = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Shortlisted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Interview Scheduled': 'bg-purple-50 text-purple-700 border-purple-200',
  Interviewed: 'bg-amber-50 text-amber-700 border-amber-200',
  Offered: 'bg-teal-50 text-teal-700 border-teal-200',
  Hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-600 border-red-200',
};

export default function Hiring() {
  const { companyId, user, employeeData } = useAuthStore();
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Folder (Position) state
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Search & Filter states for Positions
  const [posSearch, setPosSearch] = useState('');
  const [posStatusFilter, setPosStatusFilter] = useState('All');
  const [posWorkModeFilter, setPosWorkModeFilter] = useState('All');

  // Search & Filter states for Candidates inside a folder
  const [candSearch, setCandSearch] = useState('');
  const [candStageFilter, setCandStageFilter] = useState('All');
  const [candMinRating, setCandMinRating] = useState(0);

  // Position Modal State
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [isSavingPos, setIsSavingPos] = useState(false);

  const initialPosForm = {
    title: '',
    department: '',
    dateAdded: new Date().toISOString().split('T')[0],
    experienceType: 'Fresher', // 'Fresher' | 'Experienced' | 'Both'
    yearsOfExperience: '',
    workMode: 'In Office', // 'In Office' | 'Work From Home' | 'Hybrid'
    officeLocation: '',
    hasProbation: 'Yes', // 'Yes' | 'No'
    probationDuration: '3 Months',
    probationPayType: 'Stipend', // 'Stipend' | 'Salary' | 'Unpaid'
    probationAmount: '',
    compensationType: 'Salary', // 'Salary' | 'Stipend' | 'Commission Only'
    payAmount: '',
    payFrequency: 'Per Month', // 'Per Month' | 'Per Annum'
    noticePeriod: 'Immediate',
    openings: '1',
    status: 'Open', // 'Open' | 'On Hold' | 'Closed'
    skillsRequired: '',
    description: '',
  };
  const [posForm, setPosForm] = useState(initialPosForm);

  // Candidate Modal State
  const [isCandModalOpen, setIsCandModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [isSavingCand, setIsSavingCand] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const fileInputRef = useRef(null);

  // Resume Preview Modal State
  const [previewCandidate, setPreviewCandidate] = useState(null);

  const initialCandForm = {
    name: '',
    place: '',
    phone: '',
    email: '',
    rating: 7,
    stage: 'New',
    experienceYears: '',
    currentCtc: '',
    expectedPay: '',
    noticePeriod: '',
    source: 'LinkedIn',
    portfolioUrl: '',
    remarks: '',
    appliedDate: new Date().toISOString().split('T')[0],
  };
  const [candForm, setCandForm] = useState(initialCandForm);

  const r2Ready = isR2Configured();

  // Real-time listener for Hiring Positions & Candidates
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const posQuery = query(
      collection(db, `userData/${companyId}/hiringPositions`),
      orderBy('createdAt', 'desc')
    );
    const candQuery = query(
      collection(db, `userData/${companyId}/hiringCandidates`),
      orderBy('createdAt', 'desc')
    );

    const unsubPos = onSnapshot(
      posQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPositions(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading hiring positions:', err);
        setLoading(false);
      }
    );

    const unsubCand = onSnapshot(
      candQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCandidates(list);
      },
      (err) => {
        console.error('Error loading candidates:', err);
      }
    );

    return () => {
      unsubPos();
      unsubCand();
    };
  }, [companyId]);

  // Keep selectedPosition synced with live updates
  useEffect(() => {
    if (selectedPosition) {
      const updated = positions.find((p) => p.id === selectedPosition.id);
      if (updated) setSelectedPosition(updated);
    } else {
      setIsDescExpanded(false);
    }
  }, [positions, selectedPosition?.id]);

  // ---------------- POSITION HANDLERS ----------------
  const openCreatePositionModal = () => {
    setEditingPosition(null);
    setPosForm({
      ...initialPosForm,
      dateAdded: new Date().toISOString().split('T')[0],
    });
    setIsPosModalOpen(true);
  };

  const openEditPositionModal = (pos, e) => {
    if (e) e.stopPropagation();
    setEditingPosition(pos);
    setPosForm({
      title: pos.title || '',
      department: pos.department || '',
      dateAdded: pos.dateAdded || new Date().toISOString().split('T')[0],
      experienceType: pos.experienceType || 'Fresher',
      yearsOfExperience: pos.yearsOfExperience || '',
      workMode: pos.workMode || 'In Office',
      officeLocation: pos.officeLocation || '',
      hasProbation: pos.hasProbation || 'Yes',
      probationDuration: pos.probationDuration || '3 Months',
      probationPayType: pos.probationPayType || 'Stipend',
      probationAmount: pos.probationAmount || '',
      compensationType: pos.compensationType || 'Salary',
      payAmount: pos.payAmount || '',
      payFrequency: pos.payFrequency || 'Per Month',
      noticePeriod: pos.noticePeriod || 'Immediate',
      openings: pos.openings || '1',
      status: pos.status || 'Open',
      skillsRequired: pos.skillsRequired || '',
      description: pos.description || '',
    });
    setIsPosModalOpen(true);
  };

  const handleSavePosition = async (e) => {
    e.preventDefault();
    if (!companyId || !posForm.title.trim()) return;
    setIsSavingPos(true);

    try {
      const payload = {
        ...posForm,
        title: posForm.title.trim(),
        yearsOfExperience:
          posForm.experienceType === 'Fresher' ? '0' : posForm.yearsOfExperience,
        updatedAt: serverTimestamp(),
      };

      if (editingPosition) {
        await updateDoc(
          doc(db, `userData/${companyId}/hiringPositions`, editingPosition.id),
          payload
        );
        Swal.fire({
          icon: 'success',
          title: 'Position Updated',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await addDoc(collection(db, `userData/${companyId}/hiringPositions`), {
          ...payload,
          createdBy: employeeData?.name || user?.email || 'HR/Admin',
          createdAt: serverTimestamp(),
        });
        Swal.fire({
          icon: 'success',
          title: 'Position Folder Created',
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsPosModalOpen(false);
    } catch (error) {
      console.error('Error saving position:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save position details.',
      });
    } finally {
      setIsSavingPos(false);
    }
  };

  const handleDeletePosition = async (pos, e) => {
    if (e) e.stopPropagation();
    const posCandidates = candidates.filter((c) => c.positionId === pos.id);

    const confirm = await Swal.fire({
      title: `Delete "${pos.title}"?`,
      text:
        posCandidates.length > 0
          ? `This folder contains ${posCandidates.length} candidate(s). Deleting the folder will also remove all associated candidates and their resumes.`
          : 'Are you sure you want to delete this position folder?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Delete Folder',
    });

    if (!confirm.isConfirmed) return;

    try {
      for (const cand of posCandidates) {
        if (cand.resumeKey) {
          await deleteResumeFromR2(cand.resumeKey);
        }
        await deleteDoc(doc(db, `userData/${companyId}/hiringCandidates`, cand.id));
      }
      await deleteDoc(doc(db, `userData/${companyId}/hiringPositions`, pos.id));
      if (selectedPosition?.id === pos.id) {
        setSelectedPosition(null);
      }
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Position folder and candidates deleted.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error deleting position:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Could not delete folder.' });
    }
  };

  // ---------------- CANDIDATE HANDLERS ----------------
  const openAddCandidateModal = () => {
    setEditingCandidate(null);
    setResumeFile(null);

    const defaultExpectedPay = selectedPosition?.payAmount || '';
    const defaultNoticePeriod = selectedPosition?.noticePeriod || '';
    const defaultExperience =
      selectedPosition?.experienceType === 'Fresher'
        ? 'Fresher'
        : selectedPosition?.yearsOfExperience || '';

    setCandForm({
      ...initialCandForm,
      experienceYears: defaultExperience,
      expectedPay: defaultExpectedPay,
      noticePeriod: defaultNoticePeriod,
      appliedDate: new Date().toISOString().split('T')[0],
    });
    setIsCandModalOpen(true);
  };

  const openEditCandidateModal = (cand) => {
    setEditingCandidate(cand);
    setResumeFile(null);
    setCandForm({
      name: cand.name || '',
      place: cand.place || '',
      phone: cand.phone || '',
      email: cand.email || '',
      rating: cand.rating ?? 7,
      stage: cand.stage || 'New',
      experienceYears: cand.experienceYears || '',
      currentCtc: cand.currentCtc || '',
      expectedPay: cand.expectedPay || '',
      noticePeriod: cand.noticePeriod || '',
      source: cand.source || 'LinkedIn',
      portfolioUrl: cand.portfolioUrl || '',
      remarks: cand.remarks || '',
      appliedDate: cand.appliedDate || new Date().toISOString().split('T')[0],
    });
    setIsCandModalOpen(true);
  };

  const handleSaveCandidate = async (e) => {
    e.preventDefault();
    if (!companyId || !selectedPosition || !candForm.name.trim()) return;
    setIsSavingCand(true);

    try {
      let resumeData = editingCandidate
        ? {
            resumeUrl: editingCandidate.resumeUrl || '',
            resumeKey: editingCandidate.resumeKey || '',
            resumeFileName: editingCandidate.resumeFileName || '',
            resumeFileSize: editingCandidate.resumeFileSize || 0,
          }
        : {
            resumeUrl: '',
            resumeKey: '',
            resumeFileName: '',
            resumeFileSize: 0,
          };

      // Upload new resume to Cloudflare R2 if selected
      if (resumeFile) {
        if (!r2Ready) {
          throw new Error(
            'Cloudflare R2 credentials are not set in .env yet. Please configure R2 in your .env file and restart the dev server before uploading resumes.'
          );
        }

        const oldKey = editingCandidate?.resumeKey;
        const uploaded = await uploadResumeToR2(
          resumeFile,
          selectedPosition.id,
          candForm.name
        );
        resumeData = {
          resumeUrl: uploaded.url,
          resumeKey: uploaded.key,
          resumeFileName: uploaded.fileName,
          resumeFileSize: uploaded.fileSize,
        };

        // Clean up previous resume in the background after the new upload succeeds
        if (oldKey) {
          deleteResumeFromR2(oldKey).catch(() => {});
        }
      }

      const payload = {
        ...candForm,
        name: candForm.name.trim(),
        rating: Number(candForm.rating) || 0,
        positionId: selectedPosition.id,
        positionTitle: selectedPosition.title,
        ...resumeData,
        updatedAt: serverTimestamp(),
      };

      if (editingCandidate) {
        await updateDoc(
          doc(db, `userData/${companyId}/hiringCandidates`, editingCandidate.id),
          payload
        );
        Swal.fire({
          icon: 'success',
          title: 'Candidate Updated',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await addDoc(collection(db, `userData/${companyId}/hiringCandidates`), {
          ...payload,
          addedBy: employeeData?.name || user?.email || 'HR/Admin',
          createdAt: serverTimestamp(),
        });
        Swal.fire({
          icon: 'success',
          title: 'Candidate Added',
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setIsCandModalOpen(false);
      setResumeFile(null);
    } catch (error) {
      console.error('Error saving candidate:', error);
      Swal.fire({
        icon: 'error',
        title: 'Upload / Save Failed',
        text: error.message || 'Failed to save candidate details.',
      });
    } finally {
      setIsSavingCand(false);
    }
  };

  const handleStageQuickChange = async (candId, newStage) => {
    try {
      await updateDoc(doc(db, `userData/${companyId}/hiringCandidates`, candId), {
        stage: newStage,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleDeleteCandidate = async (cand) => {
    const confirm = await Swal.fire({
      title: `Remove ${cand.name}?`,
      text: 'This will remove the candidate and delete their uploaded resume from Cloudflare R2.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Delete Candidate',
    });

    if (!confirm.isConfirmed) return;

    try {
      if (cand.resumeKey) {
        await deleteResumeFromR2(cand.resumeKey);
      }
      await deleteDoc(doc(db, `userData/${companyId}/hiringCandidates`, cand.id));
      Swal.fire({
        icon: 'success',
        title: 'Removed',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete candidate.' });
    }
  };

  // ---------------- COMPUTED STATS & FILTERS ----------------
  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      (pos.title || '').toLowerCase().includes(posSearch.toLowerCase()) ||
      (pos.department || '').toLowerCase().includes(posSearch.toLowerCase()) ||
      (pos.skillsRequired || '').toLowerCase().includes(posSearch.toLowerCase());
    const matchesStatus = posStatusFilter === 'All' || pos.status === posStatusFilter;
    const matchesWorkMode =
      posWorkModeFilter === 'All' || pos.workMode === posWorkModeFilter;
    return matchesSearch && matchesStatus && matchesWorkMode;
  });

  const folderCandidates = selectedPosition
    ? candidates.filter((c) => c.positionId === selectedPosition.id)
    : [];

  const filteredCandidates = folderCandidates.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(candSearch.toLowerCase()) ||
      (c.place || '').toLowerCase().includes(candSearch.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(candSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(candSearch.toLowerCase()) ||
      (c.remarks || '').toLowerCase().includes(candSearch.toLowerCase());
    const matchesStage = candStageFilter === 'All' || c.stage === candStageFilter;
    const matchesRating = (Number(c.rating) || 0) >= Number(candMinRating);
    return matchesSearch && matchesStage && matchesRating;
  });

  const getCandidateCountForPosition = (posId) =>
    candidates.filter((c) => c.positionId === posId).length;

  const getShortlistedCountForPosition = (posId) =>
    candidates.filter(
      (c) =>
        c.positionId === posId &&
        ['Shortlisted', 'Interview Scheduled', 'Interviewed', 'Offered', 'Hired'].includes(
          c.stage
        )
    ).length;

  const getRatingBadgeStyle = (rating) => {
    const num = Number(rating) || 0;
    if (num >= 8) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (num >= 5) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
          <p className="text-sm text-zinc-500 font-medium">Loading Hiring Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cloudflare R2 Configuration Warning Banner */}
      {!r2Ready && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-sm text-amber-900">
              Cloudflare R2 Resume Storage Not Configured Yet
            </p>
            <p>
              You can create position folders and add candidates right now, but uploading PDF/DOCX resumes requires adding your Cloudflare R2 credentials (`VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, `VITE_R2_SECRET_ACCESS_KEY`, `VITE_R2_BUCKET_NAME`, `VITE_R2_PUBLIC_URL`) in the `.env` file.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: ALL POSITION FOLDERS                                              */}
      {/* ========================================================================= */}
      {!selectedPosition ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                Hiring & Recruitment Portal
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Organize job positions as folders, track applicants, rate candidates, and store resumes in Cloudflare R2.
              </p>
            </div>
            <button
              onClick={openCreatePositionModal}
              className="inline-flex items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Position Folder
            </button>
          </div>

          {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Total Folders
                </span>
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <Folder className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900 mt-2">{positions.length}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {positions.filter((p) => p.status === 'Open').length} Open Positions
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Total Candidates
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900 mt-2">{candidates.length}</div>
              <div className="text-xs text-zinc-500 mt-1">
                Across all position folders
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Top Rated (8+/10)
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Star className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900 mt-2">
                {candidates.filter((c) => Number(c.rating) >= 8).length}
              </div>
              <div className="text-xs text-zinc-500 mt-1">High-potential applicants</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Hired / Offered
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900 mt-2">
                {
                  candidates.filter((c) => ['Offered', 'Hired'].includes(c.stage))
                    .length
                }
              </div>
              <div className="text-xs text-zinc-500 mt-1">Selected candidates</div>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search position title, department, or skills..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              <select
                value={posStatusFilter}
                onChange={(e) => setPosStatusFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={posWorkModeFilter}
                onChange={(e) => setPosWorkModeFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none"
              >
                <option value="All">All Work Modes</option>
                <option value="In Office">In Office</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Folders Grid */}
          {filteredPositions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                <Folder className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                No Hiring Position Folders Found
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto mt-1 mb-5">
                Create your first job position folder with experience level, work mode, probation, and stipend/salary details to start adding candidates.
              </p>
              <button
                onClick={openCreatePositionModal}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Position Folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredPositions.map((pos) => {
                const totalCand = getCandidateCountForPosition(pos.id);
                const shortlistedCand = getShortlistedCountForPosition(pos.id);

                return (
                  <div
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos)}
                    className="group bg-white rounded-2xl border border-zinc-200/90 hover:border-zinc-900 shadow-xs hover:shadow-md transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Top Folder Tab Bar */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors shrink-0">
                            <Folder className="w-6 h-6 fill-amber-400/30" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  STATUS_BADGES[pos.status] || STATUS_BADGES.Open
                                }`}
                              >
                                {pos.status || 'Open'}
                              </span>
                              {pos.department && (
                                <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                                  {pos.department}
                                </span>
                              )}
                            </div>
                            <h3
                              className="text-sm font-bold text-zinc-900 mt-1 group-hover:text-black line-clamp-2 leading-snug"
                              title={pos.title}
                            >
                              {pos.title}
                            </h3>
                          </div>
                        </div>

                        {/* Folder Edit / Delete Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={(e) => openEditPositionModal(pos, e)}
                            title="Edit Position Details"
                            className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePosition(pos, e)}
                            title="Delete Folder"
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Key Attributes Grid */}
                      <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 bg-zinc-50/80 rounded-xl border border-zinc-100 text-xs">
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Briefcase className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate font-medium">
                            {pos.experienceType === 'Experienced'
                              ? `Exp (${pos.yearsOfExperience || '1+'} yrs)`
                              : pos.experienceType === 'Both'
                              ? `Fresher / Exp (${pos.yearsOfExperience || 'Any'})`
                              : 'Fresher'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-600">
                          {pos.workMode === 'Work From Home' ? (
                            <Home className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span className="truncate font-medium">{pos.workMode}</span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-600">
                          <IndianRupee className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate font-medium">
                            {pos.compensationType}: {pos.payAmount || 'TBD'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-600">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate font-medium">
                            Probation:{' '}
                            {pos.hasProbation === 'Yes'
                              ? `${pos.probationDuration || 'Yes'}${
                                  pos.probationAmount ? ` (${pos.probationAmount})` : ''
                                }`
                              : 'No'}
                          </span>
                        </div>
                      </div>

                      {pos.skillsRequired && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {pos.skillsRequired
                            .split(',')
                            .slice(0, 4)
                            .map((skill, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md"
                              >
                                {skill.trim()}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Added {pos.dateAdded || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg">
                          <Users className="w-3.5 h-3.5 text-zinc-600" />
                          {totalCand} {totalCand === 1 ? 'Candidate' : 'Candidates'}
                        </span>
                        {shortlistedCand > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                            {shortlistedCand} Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: INSIDE SELECTED POSITION FOLDER (CANDIDATES LIST & DETAILS)       */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Breadcrumb & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPosition(null)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-medium text-zinc-700 transition-colors shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                All Folders
              </button>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span>/</span>
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-zinc-900">
                  {selectedPosition.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={(e) => openEditPositionModal(selectedPosition, e)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edit Position
              </button>
              <button
                onClick={openAddCandidateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Add Candidate
              </button>
            </div>
          </div>

          {/* Position Details Summary Banner */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-6 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <FolderOpen className="w-7 h-7 fill-amber-400/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        STATUS_BADGES[selectedPosition.status] || STATUS_BADGES.Open
                      }`}
                    >
                      {selectedPosition.status || 'Open'}
                    </span>
                    {selectedPosition.department && (
                      <span className="text-xs font-medium bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full">
                        {selectedPosition.department}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      Added on {selectedPosition.dateAdded || 'N/A'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 mt-1">
                    {selectedPosition.title}
                  </h2>
                  {selectedPosition.description && (
                    <div className="mt-1.5 max-w-3xl">
                      <p
                        className={`text-sm text-zinc-600 whitespace-pre-line ${
                          !isDescExpanded ? 'line-clamp-3' : ''
                        }`}
                      >
                        {selectedPosition.description}
                      </p>
                      {(selectedPosition.description.split('\n').length > 3 ||
                        selectedPosition.description.length > 180) && (
                        <button
                          type="button"
                          onClick={() => setIsDescExpanded((prev) => !prev)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer"
                        >
                          {isDescExpanded ? (
                            <>
                              Show Less <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Read More <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Openings
                  </div>
                  <div className="text-lg font-bold text-zinc-900">
                    {selectedPosition.openings || 1}
                  </div>
                </div>
                <div className="text-right px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Applicants
                  </div>
                  <div className="text-lg font-bold text-zinc-900">
                    {folderCandidates.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5 text-sm">
              <div>
                <div className="text-xs text-zinc-400 font-medium">Experience Level</div>
                <div className="font-semibold text-zinc-900 mt-0.5">
                  {selectedPosition.experienceType}
                  {selectedPosition.experienceType !== 'Fresher' &&
                    selectedPosition.yearsOfExperience &&
                    ` (${selectedPosition.yearsOfExperience} yrs)`}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400 font-medium">Work Mode & Place</div>
                <div className="font-semibold text-zinc-900 mt-0.5">
                  {selectedPosition.workMode}
                  {selectedPosition.officeLocation
                    ? ` — ${selectedPosition.officeLocation}`
                    : ''}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400 font-medium">
                  Regular {selectedPosition.compensationType || 'Pay'}
                </div>
                <div className="font-semibold text-zinc-900 mt-0.5">
                  {selectedPosition.payAmount || 'Not specified'}{' '}
                  <span className="text-xs font-normal text-zinc-500">
                    ({selectedPosition.payFrequency || 'Per Month'})
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400 font-medium">Probation Period</div>
                <div className="font-semibold text-zinc-900 mt-0.5">
                  {selectedPosition.hasProbation === 'Yes'
                    ? `${selectedPosition.probationDuration || 'Yes'}`
                    : 'No Probation'}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400 font-medium">
                  Probation Stipend / Pay
                </div>
                <div className="font-semibold text-zinc-900 mt-0.5">
                  {selectedPosition.hasProbation === 'Yes'
                    ? `${selectedPosition.probationPayType || 'Stipend'}: ${
                        selectedPosition.probationAmount || 'Same as regular'
                      }`
                    : 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400 font-medium">Notice Period</div>
                <div className="font-semibold text-zinc-900 mt-0.5">
                  {selectedPosition.noticePeriod || 'Immediate'}
                </div>
              </div>
            </div>

            {selectedPosition.skillsRequired && (
              <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-zinc-400">Required Skills:</span>
                {selectedPosition.skillsRequired.split(',').map((s, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-lg font-medium"
                  >
                    {s.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Candidate Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name, place, phone, email, remarks..."
                value={candSearch}
                onChange={(e) => setCandSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              <select
                value={candStageFilter}
                onChange={(e) => setCandStageFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none"
              >
                <option value="All">All Stages</option>
                {CANDIDATE_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <select
                value={candMinRating}
                onChange={(e) => setCandMinRating(Number(e.target.value))}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none"
              >
                <option value={0}>Any Rating (0-10)</option>
                <option value={5}>Rated 5+ / 10</option>
                <option value={7}>Rated 7+ / 10</option>
                <option value={8}>Rated 8+ / 10 (Top)</option>
                <option value={9}>Rated 9+ / 10</option>
              </select>
            </div>
          </div>

          {/* Candidates Table / Cards */}
          {filteredCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                No Candidates in This Folder Yet
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto mt-1 mb-5">
                Add candidates with their contact details, location, rating out of 10, remarks, and upload their resume to Cloudflare R2.
              </p>
              <button
                onClick={openAddCandidateModal}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Add First Candidate
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="py-3.5 px-4">Candidate & Place</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Rate (/10)</th>
                      <th className="py-3.5 px-4">Stage</th>
                      <th className="py-3.5 px-4">Exp & Expectations</th>
                      <th className="py-3.5 px-4">Resume (R2)</th>
                      <th className="py-3.5 px-4">Remarks</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {filteredCandidates.map((cand) => (
                      <tr
                        key={cand.id}
                        className="hover:bg-zinc-50/60 transition-colors group"
                      >
                        {/* Name & Place */}
                        <td className="py-4 px-4 align-top">
                          <div className="font-semibold text-zinc-900">{cand.name}</div>
                          {cand.place && (
                            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span>{cand.place}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-zinc-400 mt-1">
                            Added: {cand.appliedDate || 'N/A'}
                            {cand.source ? ` • ${cand.source}` : ''}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-4 align-top space-y-1">
                          {cand.phone && (
                            <a
                              href={`tel:${cand.phone}`}
                              className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-black font-medium"
                            >
                              <Phone className="w-3.5 h-3.5 text-zinc-400" />
                              {cand.phone}
                            </a>
                          )}
                          {cand.email && (
                            <a
                              href={`mailto:${cand.email}`}
                              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-black"
                            >
                              <Mail className="w-3.5 h-3.5 text-zinc-400" />
                              {cand.email}
                            </a>
                          )}
                          {cand.portfolioUrl && (
                            <a
                              href={cand.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Portfolio / LinkedIn
                            </a>
                          )}
                        </td>

                        {/* Rating out of 10 */}
                        <td className="py-4 px-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${getRatingBadgeStyle(
                              cand.rating
                            )}`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {cand.rating ?? '-'} / 10
                          </span>
                        </td>

                        {/* Hiring Stage */}
                        <td className="py-4 px-4 align-top">
                          <select
                            value={cand.stage || 'New'}
                            onChange={(e) =>
                              handleStageQuickChange(cand.id, e.target.value)
                            }
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${
                              STAGE_COLORS[cand.stage || 'New'] || STAGE_COLORS.New
                            }`}
                          >
                            {CANDIDATE_STAGES.map((st) => (
                              <option
                                key={st}
                                value={st}
                                className="bg-white text-zinc-800"
                              >
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Experience & Pay Expectations */}
                        <td className="py-4 px-4 align-top text-xs text-zinc-600 space-y-0.5">
                          <div>
                            <span className="text-zinc-400">Exp:</span>{' '}
                            <span className="font-medium text-zinc-800">
                              {cand.experienceYears || 'Fresher'}
                            </span>
                          </div>
                          {cand.expectedPay && (
                            <div>
                              <span className="text-zinc-400">Expected:</span>{' '}
                              <span className="font-medium text-zinc-800">
                                {cand.expectedPay}
                              </span>
                            </div>
                          )}
                          {cand.noticePeriod && (
                            <div>
                              <span className="text-zinc-400">Notice:</span>{' '}
                              <span className="font-medium text-zinc-800">
                                {cand.noticePeriod}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Resume */}
                        <td className="py-4 px-4 align-top">
                          {cand.resumeUrl ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setPreviewCandidate(cand)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </button>
                                <a
                                  href={cand.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                                  title="Open Resume in New Tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <span
                                className="text-[11px] text-zinc-400 truncate max-w-[140px]"
                                title={cand.resumeFileName}
                              >
                                {cand.resumeFileName || 'Resume attached'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">
                              No resume uploaded
                            </span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-4 px-4 align-top max-w-xs">
                          {cand.remarks ? (
                            <p className="text-xs text-zinc-600 whitespace-pre-line line-clamp-3">
                              {cand.remarks}
                            </p>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 align-top text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditCandidateModal(cand)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Candidate"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(cand)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT POSITION FOLDER                                    */}
      {/* ========================================================================= */}
      {isPosModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-zinc-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    {editingPosition ? 'Edit Position Folder' : 'Create Position Folder'}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Specify job requirements, work mode, probation, and stipend/payment details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPosModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="p-6 space-y-5">
              {/* Row 1: Position Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Position Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inside Sales Executive, React Developer"
                    value={posForm.title}
                    onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Department / Team
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sales, Marketing, Tech, Operations"
                    value={posForm.department}
                    onChange={(e) =>
                      setPosForm({ ...posForm, department: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Row 2: Date Added, Openings, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Date Added <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={posForm.dateAdded}
                    onChange={(e) =>
                      setPosForm({ ...posForm, dateAdded: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    No. of Openings <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={posForm.openings}
                    onChange={(e) => setPosForm({ ...posForm, openings: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Hiring Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={posForm.status}
                    onChange={(e) => setPosForm({ ...posForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  >
                    <option value="Open">Open</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Experience Requirement */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Experience & Work Mode
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Fresher or Experienced? <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={posForm.experienceType}
                      onChange={(e) =>
                        setPosForm({ ...posForm, experienceType: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      <option value="Fresher">Fresher Only</option>
                      <option value="Experienced">Experienced Only</option>
                      <option value="Both">Both (Fresher & Experienced)</option>
                    </select>
                  </div>

                  {posForm.experienceType !== 'Fresher' && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Required Years of Experience <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1-3 years, 2+ years"
                        value={posForm.yearsOfExperience}
                        onChange={(e) =>
                          setPosForm({ ...posForm, yearsOfExperience: e.target.value })
                        }
                        className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      In Office or Work From Home? <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={posForm.workMode}
                      onChange={(e) =>
                        setPosForm({ ...posForm, workMode: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      <option value="In Office">In Office</option>
                      <option value="Work From Home">Work From Home (WFH)</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Office / Target Location (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kozhikode, Kochi, Remote"
                      value={posForm.officeLocation}
                      onChange={(e) =>
                        setPosForm({ ...posForm, officeLocation: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Notice Period / Availability <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Immediate, 15 Days, 30 Days"
                      value={posForm.noticePeriod}
                      onChange={(e) =>
                        setPosForm({ ...posForm, noticePeriod: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Probation & Stipend / Payment Details */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Probation, Stipend & Payment Details
                </div>

                {/* Probation Config */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Has Probation Period? <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={posForm.hasProbation}
                      onChange={(e) =>
                        setPosForm({ ...posForm, hasProbation: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {posForm.hasProbation === 'Yes' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Probation Duration <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 3 Months, 6 Months"
                          value={posForm.probationDuration}
                          onChange={(e) =>
                            setPosForm({ ...posForm, probationDuration: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Probation Stipend / Pay Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. ₹8,000/mo stipend"
                          value={posForm.probationAmount}
                          onChange={(e) =>
                            setPosForm({ ...posForm, probationAmount: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Regular Payment Config */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200/60">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={posForm.compensationType}
                      onChange={(e) =>
                        setPosForm({ ...posForm, compensationType: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      <option value="Salary">Full-Time Salary</option>
                      <option value="Stipend">Internship Stipend</option>
                      <option value="Retainer + Incentive">Fixed + Incentive</option>
                      <option value="Commission Only">Commission / Freelance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      How Much (Amount / Range) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ₹15,000 - ₹22,000"
                      value={posForm.payAmount}
                      onChange={(e) =>
                        setPosForm({ ...posForm, payAmount: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Payment Frequency <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={posForm.payFrequency}
                      onChange={(e) =>
                        setPosForm({ ...posForm, payFrequency: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      <option value="Per Month">Per Month</option>
                      <option value="Per Annum (CTC)">Per Annum (CTC)</option>
                      <option value="Per Project">Per Project / Task</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 5: Skills & Job Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Key Skills / Languages Required (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. English, Hindi, Cold Calling, Excel, React"
                  value={posForm.skillsRequired}
                  onChange={(e) =>
                    setPosForm({ ...posForm, skillsRequired: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Additional Details / Job Description / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Working hours, incentives, targets, qualification requirements, etc."
                  value={posForm.description}
                  onChange={(e) =>
                    setPosForm({ ...posForm, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPosModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPos}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPos && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPosition ? 'Update Folder' : 'Create Position Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT CANDIDATE IN FOLDER                                   */}
      {/* ========================================================================= */}
      {isCandModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-zinc-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-zinc-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
                </h2>
                <p className="text-xs text-zinc-500">
                  Folder: <span className="font-semibold text-zinc-800">{selectedPosition?.title}</span>
                </p>
              </div>
              <button
                onClick={() => setIsCandModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Candidate Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Nair"
                    value={candForm.name}
                    onChange={(e) => setCandForm({ ...candForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Place / City (if available)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Calicut, Ernakulam, Bangalore"
                    value={candForm.place}
                    onChange={(e) => setCandForm({ ...candForm, place: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Phone / WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={candForm.phone}
                    onChange={(e) => setCandForm({ ...candForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="candidate@email.com"
                    value={candForm.email}
                    onChange={(e) => setCandForm({ ...candForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Rate out of 10 & Stage */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-700">
                      Rate Candidate Out of 10 <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRatingBadgeStyle(
                        candForm.rating
                      )}`}
                    >
                      {candForm.rating} / 10
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCandForm({ ...candForm, rating: num })}
                        className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          Number(candForm.rating) === num
                            ? 'bg-black text-white border-black shadow-xs scale-105'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200/60">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Stage / Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={candForm.stage}
                      onChange={(e) =>
                        setCandForm({ ...candForm, stage: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      {CANDIDATE_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={candForm.source}
                      onChange={(e) =>
                        setCandForm({ ...candForm, source: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Indeed">Indeed</option>
                      <option value="Naukri">Naukri</option>
                      <option value="Referral">Employee Referral</option>
                      <option value="Instagram / Meta Ads">Instagram / Meta</option>
                      <option value="Walk-in / Direct">Walk-in / Direct</option>
                      <option value="Campus / College">Campus / College</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Applied Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={candForm.appliedDate}
                      onChange={(e) =>
                        setCandForm({ ...candForm, appliedDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* Experience, Expected Pay, Notice Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Experience (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresher, 1.5 Years"
                    value={candForm.experienceYears}
                    onChange={(e) =>
                      setCandForm({ ...candForm, experienceYears: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Expected Pay / Stipend
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹18,000/mo"
                    value={candForm.expectedPay}
                    onChange={(e) =>
                      setCandForm({ ...candForm, expectedPay: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Notice Period / Availability
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Immediate, 15 Days"
                    value={candForm.noticePeriod}
                    onChange={(e) =>
                      setCandForm({ ...candForm, noticePeriod: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Resume Upload (Cloudflare R2) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Resume Upload (Cloudflare R2 Storage)
                </label>
                <div
                  onClick={(e) => {
                    if (e.target !== fileInputRef.current) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="border-2 border-dashed border-zinc-300 hover:border-black rounded-xl p-4 text-center cursor-pointer transition-colors bg-zinc-50/60"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onClick={(e) => {
                      e.target.value = null;
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setResumeFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
                  {resumeFile ? (
                    <div className="text-sm font-semibold text-emerald-700">
                      Selected: {resumeFile.name} (
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ) : editingCandidate?.resumeFileName ? (
                    <div className="text-xs text-zinc-600">
                      Current Resume:{' '}
                      <span className="font-semibold text-zinc-900">
                        {editingCandidate.resumeFileName}
                      </span>{' '}
                      — Click to replace
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-zinc-700">
                        Click to choose Resume file (PDF, DOC, DOCX)
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Uploaded directly to your Cloudflare R2 bucket
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Portfolio Link & Remarks */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  LinkedIn / Portfolio / Drive Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={candForm.portfolioUrl}
                  onChange={(e) =>
                    setCandForm({ ...candForm, portfolioUrl: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  HR Remarks / Interview Feedback / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Communication skills, attitude, technical assessment notes, salary negotiation remarks..."
                  value={candForm.remarks}
                  onChange={(e) => setCandForm({ ...candForm, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCandModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCand}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCand && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCandidate ? 'Save Changes' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: IN-APP RESUME VIEWER                                             */}
      {/* ========================================================================= */}
      {previewCandidate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {previewCandidate.name} — Resume
                </h3>
                <p className="text-xs text-zinc-500">
                  {previewCandidate.resumeFileName} • Rate: {previewCandidate.rating}/10
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewCandidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab / Download
                </a>
                <button
                  onClick={() => setPreviewCandidate(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-zinc-100">
              <iframe
                src={previewCandidate.resumeUrl}
                title="Candidate Resume Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

