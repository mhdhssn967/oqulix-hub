import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  serverTimestamp, 
  getDocs,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { 
  MessageSquare, 
  X, 
  Minus, 
  Maximize2, 
  Search, 
  Send, 
  ArrowLeft, 
  User, 
  CheckCheck,
  Megaphone,
  Radio,
  Sparkles,
  Trash2
} from 'lucide-react';
import Swal from 'sweetalert2';

export function ChatPortal() {
  const { user, employeeData, companyId, isAdmin, isHR } = useAuthStore();
  const canBroadcast = isAdmin || isHR;

  const { 
    isOpen, 
    setIsOpen, 
    toggleOpen,
    isMinimized, 
    setIsMinimized, 
    activeEmployee, 
    setActiveEmployee,
    totalUnreadCount,
    setTotalUnreadCount
  } = useChatStore();

  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversationsMeta, setConversationsMeta] = useState({});
  const [isSending, setIsSending] = useState(false);

  // Broadcast Channels & Messages State
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [isBroadcastView, setIsBroadcastView] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('Important'); // 'Announcement', 'Important', 'Urgent'
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 260);
  };

  const handleOpen = () => {
    setIsClosing(false);
    setIsOpen(true);
    setIsMinimized(false);
  };

  const messagesEndRef = useRef(null);
  const broadcastEndRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const prevBroadcastCountRef = useRef(null);

  // Gentle, pleasant message chime synthesizer using Web Audio API (zero external files or downloads required)
  const playMessageChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      
      // Note 1 (E5 - 659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 (B5 - 987.77Hz) slightly delayed for a bright, cheerful double chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.1);
      gain2.gain.setValueAtTime(0.001, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.55);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 700);
    } catch (e) {
      // Audio playback silently ignored if blocked by autoplay restrictions
    }
  };

  const currentUserId = user?.uid;
  const currentUserName = employeeData?.name || (isAdmin ? 'Admin' : (user?.displayName || 'User'));
  const currentUserPhoto = employeeData?.photoURL || user?.photoURL || null;

  // Determine unique 1:1 conversation ID
  const getConversationId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // 1. Fetch Company Employees & Administrators
  useEffect(() => {
    if (!companyId || !currentUserId) return;

    let isMounted = true;
    const fetchEmployees = async () => {
      try {
        const [empSnap, rootEmpSnap, rolesSnap, adminsSnap] = await Promise.all([
          getDocs(collection(db, `userData/${companyId}/employees`)),
          getDocs(collection(db, 'employees')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'users')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'admins')).catch(() => ({ docs: [] }))
        ]);

        const adminMap = {};
        adminsSnap.docs.forEach(ad => {
          adminMap[ad.id] = ad.data();
        });

        const rootPhotoMap = {};
        rootEmpSnap.docs.forEach(rd => {
          if (rd.data().photoURL) rootPhotoMap[rd.id] = rd.data().photoURL;
        });

        const list = [];
        const seenIds = new Set();

        empSnap.docs.forEach(d => {
          const data = d.data();
          if (d.id !== currentUserId && data.isActive !== false) {
            seenIds.add(d.id);
            list.push({
              id: d.id,
              uid: d.id,
              name: data.name || data.employeeName || 'Colleague',
              position: data.position || data.designation || 'Team Member',
              photoURL: data.photoURL || rootPhotoMap[d.id] || null,
              email: data.email || ''
            });
          }
        });

        // Ensure Admins are included in the messaging roster so employees can chat with Admin
        const adminRoleDoc = rolesSnap.docs.find(rd => rd.id.toLowerCase() === 'admin');
        const adminUserIds = adminRoleDoc?.data()?.userIds || [];

        // Also check any direct admins collection entries or companyId itself
        const candidateAdminIds = new Set([...adminUserIds, companyId]);
        candidateAdminIds.forEach(adminUid => {
          if (adminUid && adminUid !== currentUserId && !seenIds.has(adminUid)) {
            seenIds.add(adminUid);
            const aData = adminMap[adminUid] || {};
            list.unshift({
              id: adminUid,
              uid: adminUid,
              name: aData.name || 'Admin',
              position: 'Administrator',
              photoURL: aData.photoURL || null,
              email: aData.email || '',
              isAdmin: true
            });
          }
        });

        if (isMounted) setEmployees(list);
      } catch (err) {
        console.error('Failed to load employees for chat:', err);
      }
    };

    fetchEmployees();
    return () => { isMounted = false; };
  }, [companyId, currentUserId]);

  // 2. Listen to Company Broadcast Messages
  useEffect(() => {
    if (!companyId) return;

    const bRef = collection(db, `userData/${companyId}/broadcasts`);
    const q = query(bRef, orderBy('createdAt', 'asc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bList = [];
      snapshot.forEach(docSnap => {
        bList.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Play chime if a new broadcast arrived while app is open
      if (prevBroadcastCountRef.current !== null && bList.length > prevBroadcastCountRef.current) {
        const latest = bList[bList.length - 1];
        if (latest && latest.senderId !== currentUserId) {
          playMessageChime();
        }
      }
      prevBroadcastCountRef.current = bList.length;

      setBroadcastMessages(bList);
      setTimeout(() => {
        broadcastEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }, (err) => {
      console.error('Error fetching broadcast messages:', err);
    });

    return () => unsubscribe();
  }, [companyId]);

  // 3. Listen to conversation metadata (last message, unread status)
  useEffect(() => {
    if (!companyId || !currentUserId) return;

    const convRef = collection(db, `userData/${companyId}/chats`);
    const q = query(convRef, where('participants', 'array-contains', currentUserId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meta = {};
      let totalUnread = 0;
      let hasNewMessage = false;

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        meta[docSnap.id] = data;
        const userUnread = (data.unreadCounts && data.unreadCounts[currentUserId]) || 0;
        totalUnread += userUnread;

        // Check if there is a fresh unread message from someone else
        if (data.lastMessageSenderId && data.lastMessageSenderId !== currentUserId && userUnread > 0) {
          const prevMeta = conversationsMeta[docSnap.id];
          const prevUserUnread = (prevMeta?.unreadCounts && prevMeta.unreadCounts[currentUserId]) || 0;
          if (userUnread > prevUserUnread) {
            hasNewMessage = true;
          }
        }
      });

      // Play chime if unread message count increased while app is opened
      if (hasNewMessage || (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current)) {
        playMessageChime();
      }
      prevUnreadRef.current = totalUnread;

      setConversationsMeta(meta);
      setTotalUnreadCount(totalUnread);
    }, (error) => {
      console.error('Error listening to chat conversations:', error);
    });

    return () => unsubscribe();
  }, [companyId, currentUserId, setTotalUnreadCount]);

  // 4. Listen to messages for the active conversation
  useEffect(() => {
    if (!companyId || !currentUserId || !activeEmployee || isBroadcastView) {
      setMessages([]);
      return;
    }

    const convId = getConversationId(currentUserId, activeEmployee.id);
    const msgsRef = collection(db, `userData/${companyId}/chats/${convId}/messages`);
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }, (err) => {
      console.error('Error fetching chat messages:', err);
    });

    // Mark conversation unread count as read for current user
    const markAsRead = async () => {
      try {
        const convDocRef = doc(db, `userData/${companyId}/chats/${convId}`);
        await setDoc(convDocRef, {
          unreadCounts: {
            [currentUserId]: 0
          }
        }, { merge: true });
      } catch (e) {
        console.error('Error marking chat as read:', e);
      }
    };
    markAsRead();

    return () => unsubscribe();
  }, [companyId, currentUserId, activeEmployee, isBroadcastView]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isBroadcastView) {
      broadcastEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, broadcastMessages, isBroadcastView]);

  // Send Direct Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !companyId || !currentUserId || !activeEmployee || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    const convId = getConversationId(currentUserId, activeEmployee.id);
    const msgsRef = collection(db, `userData/${companyId}/chats/${convId}/messages`);
    const convDocRef = doc(db, `userData/${companyId}/chats/${convId}`);

    try {
      await addDoc(msgsRef, {
        senderId: currentUserId,
        senderName: currentUserName,
        text,
        createdAt: serverTimestamp(),
        read: false
      });

      const existingMeta = conversationsMeta[convId] || {};
      const currentOtherUnread = (existingMeta.unreadCounts && existingMeta.unreadCounts[activeEmployee.id]) || 0;

      await setDoc(convDocRef, {
        id: convId,
        participants: [currentUserId, activeEmployee.id],
        participantDetails: {
          [currentUserId]: {
            name: currentUserName,
            photoURL: currentUserPhoto
          },
          [activeEmployee.id]: {
            name: activeEmployee.name,
            photoURL: activeEmployee.photoURL
          }
        },
        lastMessage: text,
        lastMessageSenderId: currentUserId,
        lastMessageAt: serverTimestamp(),
        unreadCounts: {
          [currentUserId]: 0,
          [activeEmployee.id]: currentOtherUnread + 1
        }
      }, { merge: true });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Broadcast Message to all employees (Admin & HR only)
  const handleSendBroadcast = async (e) => {
    e?.preventDefault();
    if (!broadcastInput.trim() || !companyId || !canBroadcast || isSendingBroadcast) return;

    const text = broadcastInput.trim();
    const priority = broadcastPriority;
    setBroadcastInput('');
    setIsSendingBroadcast(true);

    try {
      const bRef = collection(db, `userData/${companyId}/broadcasts`);
      await addDoc(bRef, {
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: isAdmin ? 'Admin' : 'HR Management',
        senderPhotoURL: currentUserPhoto,
        text,
        priority, // 'Announcement', 'Important', 'Urgent'
        createdAt: serverTimestamp(),
        isBroadcast: true
      });
    } catch (err) {
      console.error('Failed to publish broadcast:', err);
      Swal.fire({ icon: 'error', title: 'Broadcast Failed', text: err.message });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Delete broadcast message (Admin/HR only)
  const handleDeleteBroadcast = async (bId) => {
    if (!canBroadcast || !companyId) return;
    try {
      await deleteDoc(doc(db, `userData/${companyId}/broadcasts`, bId));
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return emp.name.toLowerCase().includes(q) || emp.position.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const convA = conversationsMeta[getConversationId(currentUserId, a.id)];
        const convB = conversationsMeta[getConversationId(currentUserId, b.id)];
        const timeA = convA?.lastMessageAt?.seconds || 0;
        const timeB = convB?.lastMessageAt?.seconds || 0;
        return timeB - timeA;
      });
  }, [employees, searchQuery, conversationsMeta, currentUserId]);

  if (!user) return null;

  return (
    <>
      {/* Floating Bottom-Right Action Button: Black Circle with White Icon */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black text-white shadow-[0_10px_35px_rgba(0,0,0,0.35)] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border border-zinc-800 focus:outline-none focus:ring-4 focus:ring-black/10 group cursor-pointer animate-in fade-in zoom-in-75 duration-300"
          title="Team Messages"
          aria-label="Open Team Messaging"
        >
          <MessageSquare className="w-6 h-6 text-white stroke-[2.2] group-hover:scale-110 transition-transform duration-200" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] sm:text-[11px] h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Window Overlay (Bottom Right) with macOS Genie Spring Effect */}
      {isOpen && (
        <div 
          className={`fixed z-50 origin-bottom-right transition-all duration-300 ${
            isClosing 
              ? 'animate-mac-close pointer-events-none' 
              : 'animate-mac-open'
          } ${
            isMinimized 
              ? 'bottom-4 right-4 w-72 h-14 shadow-lg' 
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[640px] md:w-[760px] lg:w-[840px] h-[84vh] max-h-[660px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]'
          } bg-white rounded-2xl border border-zinc-200/90 overflow-hidden flex flex-col`}
          style={{ willChange: 'transform, opacity, filter' }}
        >
          {/* Top Window Bar */}
          <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
              <h3 className="font-semibold text-[13px] sm:text-[14px] text-white tracking-tight truncate flex items-center gap-2">
                Team Messaging Portal
                {totalUnreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalUnreadCount} new
                  </span>
                )}
              </h3>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleClose} 
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Window Body (When Not Minimized) */}
          {!isMinimized && (
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Left Pane: Employee & Channels List with Search */}
              <div 
                className={`${
                  (activeEmployee || isBroadcastView) ? 'hidden md:flex' : 'flex'
                } w-full md:w-[280px] lg:w-[310px] border-r border-zinc-200/80 flex-col bg-zinc-50/70 shrink-0 min-h-0`}
              >
                {/* Search Bar */}
                <div className="p-3 border-b border-zinc-200/60 shrink-0 bg-white">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Search colleagues..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-zinc-100/80 rounded-lg border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none transition-all placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                {/* Company Broadcast Special Channel Card */}
                <div className="p-2.5 border-b border-zinc-200/60 shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setIsBroadcastView(true);
                      setActiveEmployee(null);
                    }}
                    className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-left ${
                      isBroadcastView 
                        ? 'bg-amber-500/10 border-amber-300 ring-2 ring-amber-500/20' 
                        : 'bg-gradient-to-r from-amber-50/70 to-orange-50/70 border-amber-200/80 hover:border-amber-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[13px] font-bold text-amber-950 truncate">Company Broadcast</h4>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-800 px-1 py-0.2 rounded">
                            Official
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800/80 truncate">
                          {broadcastMessages.length > 0 
                            ? broadcastMessages[broadcastMessages.length - 1].text 
                            : 'Announcements for all employees'}
                        </p>
                      </div>
                    </div>

                    {broadcastMessages.length > 0 && (
                      <span className="shrink-0 bg-amber-600 text-white font-bold text-[10px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
                        {broadcastMessages.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Section Title */}
                <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Direct Messages</span>
                  <span className="text-[10px] bg-zinc-200/70 text-zinc-600 px-1.5 py-0.2 rounded-full font-semibold">
                    {filteredEmployees.length}
                  </span>
                </div>

                {/* Employees Scroll List */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 custom-scrollbar">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-6 text-center text-zinc-400 text-[12px]">
                      No colleagues found
                    </div>
                  ) : (
                    filteredEmployees.map(emp => {
                      const convId = getConversationId(currentUserId, emp.id);
                      const meta = conversationsMeta[convId];
                      const unread = meta?.unreadCounts?.[currentUserId] || 0;
                      const isSelected = !isBroadcastView && activeEmployee?.id === emp.id;

                      return (
                        <button
                          key={emp.id}
                          onClick={() => {
                            setIsBroadcastView(false);
                            setActiveEmployee(emp);
                          }}
                          className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-3 ${
                            isSelected ? 'bg-zinc-200/60' : 'hover:bg-zinc-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              {emp.photoURL ? (
                                <img 
                                  src={emp.photoURL} 
                                  alt={emp.name} 
                                  className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5" 
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-[12px]">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-[13px] font-semibold text-zinc-900 truncate">
                                  {emp.name}
                                </h4>
                                {emp.isAdmin && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-black text-white shrink-0">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {meta?.lastMessage || emp.position}
                              </p>
                            </div>
                          </div>

                          {unread > 0 && (
                            <span className="shrink-0 bg-blue-600 text-white font-bold text-[10px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Pane: Active Workspace (Broadcast OR 1:1 Chat) */}
              <div 
                className={`${
                  (activeEmployee || isBroadcastView) ? 'flex' : 'hidden md:flex'
                } flex-1 flex-col bg-white min-h-0`}
              >
                {/* CASE 1: Company Broadcast Workspace */}
                {isBroadcastView ? (
                  <>
                    {/* Broadcast Header */}
                    <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Back Button */}
                        <button 
                          onClick={() => setIsBroadcastView(false)}
                          className="md:hidden p-1.5 -ml-1 text-zinc-500 hover:text-black rounded-lg transition-colors"
                          title="Back"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>

                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Megaphone className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[14px] font-bold text-amber-950 truncate leading-tight">
                              Official Company Broadcast
                            </h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-800">
                              All Employees
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-700/80">
                            Announcements visible to every employee across all departments
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Broadcast Messages Feed */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF9F6] custom-scrollbar">
                      {broadcastMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 text-[12px] p-6">
                          <Megaphone className="w-10 h-10 text-amber-300 mb-2 stroke-1" />
                          <p className="font-semibold text-zinc-700 text-[14px]">No broadcasts published yet</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm">
                            {canBroadcast 
                              ? 'As Admin or HR, you can post special company notices, holiday alerts, and announcements below.' 
                              : 'Important announcements from Admin and HR will be highlighted here.'}
                          </p>
                        </div>
                      ) : (
                        broadcastMessages.map((msg, idx) => {
                          const isUrgent = msg.priority === 'Urgent';
                          const isImportant = msg.priority === 'Important';
                          const timeStr = msg.createdAt?.toDate 
                            ? msg.createdAt.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : msg.createdAt?.seconds 
                              ? new Date(msg.createdAt.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '';

                          return (
                            <div 
                              key={msg.id || idx}
                              className={`p-4 rounded-2xl border shadow-xs transition-all relative group ${
                                isUrgent 
                                  ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
                                  : isImportant 
                                    ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
                                    : 'bg-white border-zinc-200/90 text-zinc-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {msg.senderPhotoURL ? (
                                    <img 
                                      src={msg.senderPhotoURL} 
                                      alt={msg.senderName} 
                                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-black/5" 
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                      {msg.senderName?.charAt(0) || 'A'}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[13px] font-bold truncate">{msg.senderName}</span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/5 text-zinc-600">
                                        {msg.senderRole || 'HR / Admin'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isUrgent 
                                      ? 'bg-rose-600 text-white' 
                                      : isImportant 
                                        ? 'bg-amber-600 text-white' 
                                        : 'bg-zinc-200 text-zinc-700'
                                  }`}>
                                    {msg.priority || 'Announcement'}
                                  </span>

                                  {canBroadcast && (
                                    <button
                                      onClick={() => handleDeleteBroadcast(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-600 p-1 rounded transition-opacity"
                                      title="Delete broadcast"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-[13px] leading-relaxed whitespace-pre-wrap pl-9 font-medium">
                                {msg.text}
                              </p>

                              <div className="text-[10px] text-zinc-400 mt-2.5 pl-9 flex items-center gap-2">
                                <span>{timeStr}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-semibold text-zinc-500">
                                  <Radio className="w-3 h-3 text-amber-500 animate-pulse" /> Broadcasted to all
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={broadcastEndRef} />
                    </div>

                    {/* Broadcast Composer (Admin / HR only) */}
                    {canBroadcast ? (
                      <form 
                        onSubmit={handleSendBroadcast}
                        className="p-3 border-t border-zinc-200 bg-white flex flex-col gap-2 shrink-0"
                      >
                        <div className="flex items-center justify-between gap-2 px-1">
                          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Broadcast as Admin/HR
                          </span>
                          <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                            {['Announcement', 'Important', 'Urgent'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setBroadcastPriority(p)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  broadcastPriority === p 
                                    ? p === 'Urgent' 
                                      ? 'bg-rose-600 text-white shadow-xs' 
                                      : p === 'Important' 
                                        ? 'bg-amber-500 text-white shadow-xs' 
                                        : 'bg-zinc-800 text-white shadow-xs' 
                                    : 'text-zinc-600 hover:text-black'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="Write an announcement for all employees..."
                            value={broadcastInput}
                            onChange={e => setBroadcastInput(e.target.value)}
                            className="flex-1 px-3.5 py-2 text-[13px] bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:bg-white focus:border-amber-500 transition-all placeholder:text-zinc-400"
                          />
                          <button 
                            type="submit"
                            disabled={!broadcastInput.trim() || isSendingBroadcast}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>Broadcast</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-3 border-t border-zinc-100 bg-zinc-50/70 text-center text-[12px] text-zinc-500 font-medium">
                        Only Admins and HR can publish company broadcasts.
                      </div>
                    )}
                  </>
                ) : activeEmployee ? (
                  <>
                    {/* CASE 2: 1:1 Direct Message Header */}
                    <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Back Button */}
                        <button 
                          onClick={() => setActiveEmployee(null)}
                          className="md:hidden p-1.5 -ml-1 text-zinc-500 hover:text-black rounded-lg transition-colors"
                          title="Back to colleagues"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>

                        <div className="relative shrink-0">
                          {activeEmployee.photoURL ? (
                            <img 
                              src={activeEmployee.photoURL} 
                              alt={activeEmployee.name} 
                              className="w-9 h-9 rounded-full object-cover" 
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-[12px]">
                              {activeEmployee.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-[14px] font-bold text-zinc-900 truncate leading-tight">
                            {activeEmployee.name}
                          </h4>
                          <span className="text-[11px] text-zinc-400 capitalize">
                            {activeEmployee.position}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAFAFA] custom-scrollbar">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 text-[12px] p-6">
                          <MessageSquare className="w-8 h-8 text-zinc-300 mb-2 stroke-1" />
                          <p className="font-medium text-zinc-600">Start a conversation with {activeEmployee.name}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Direct messages are synchronized across devices in real time.</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMine = msg.senderId === currentUserId;
                          const timeStr = msg.createdAt?.toDate 
                            ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : msg.createdAt?.seconds 
                              ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '';

                          return (
                            <div 
                              key={msg.id || idx}
                              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                            >
                              <div 
                                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words shadow-2xs ${
                                  isMine 
                                    ? 'bg-zinc-900 text-white rounded-br-xs' 
                                    : 'bg-white text-zinc-900 border border-zinc-200/80 rounded-bl-xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[10px] text-zinc-400 mt-1 px-1">
                                {timeStr}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <form 
                      onSubmit={handleSendMessage}
                      className="p-3 border-t border-zinc-100 bg-white flex items-center gap-2 shrink-0"
                    >
                      <input 
                        type="text" 
                        placeholder={`Message ${activeEmployee.name.split(' ')[0]}...`}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        className="flex-1 px-3.5 py-2 text-[13px] bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:bg-white focus:border-zinc-900 transition-all placeholder:text-zinc-400"
                      />
                      <button 
                        type="submit"
                        disabled={!inputText.trim() || isSending}
                        className="px-4 py-2 bg-zinc-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                      <MessageSquare className="w-6 h-6 stroke-1" />
                    </div>
                    <h4 className="text-[14px] font-semibold text-zinc-700">No conversation selected</h4>
                    <p className="text-[12px] text-zinc-400 mt-1 max-w-xs">
                      Choose a team member from the list on the left to start sending direct messages, or select <strong>Company Broadcast</strong> above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
