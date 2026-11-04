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
  limit
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
  CheckCheck
} from 'lucide-react';

export function ChatPortal() {
  const { user, employeeData, companyId, isAdmin } = useAuthStore();
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

  const messagesEndRef = useRef(null);

  const currentUserId = user?.uid;
  const currentUserName = employeeData?.name || (isAdmin ? 'Admin' : (user?.displayName || 'User'));
  const currentUserPhoto = employeeData?.photoURL || user?.photoURL || null;

  // Determine unique 1:1 conversation ID
  const getConversationId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // 1. Fetch Company Employees
  useEffect(() => {
    if (!companyId || !currentUserId) return;

    let isMounted = true;
    const fetchEmployees = async () => {
      try {
        const [empSnap, rootEmpSnap] = await Promise.all([
          getDocs(collection(db, `userData/${companyId}/employees`)),
          getDocs(collection(db, 'employees')).catch(() => ({ docs: [] }))
        ]);

        const rootPhotoMap = {};
        rootEmpSnap.docs.forEach(rd => {
          if (rd.data().photoURL) rootPhotoMap[rd.id] = rd.data().photoURL;
        });

        const list = [];
        empSnap.docs.forEach(d => {
          const data = d.data();
          if (d.id !== currentUserId && data.isActive !== false) {
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

        if (isMounted) setEmployees(list);
      } catch (err) {
        console.error('Failed to load employees for chat:', err);
      }
    };

    fetchEmployees();
    return () => { isMounted = false; };
  }, [companyId, currentUserId]);

  // 2. Listen to conversation metadata (last message, unread status)
  useEffect(() => {
    if (!companyId || !currentUserId) return;

    const convRef = collection(db, `userData/${companyId}/chats`);
    const q = query(convRef, where('participants', 'array-contains', currentUserId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meta = {};
      let totalUnread = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        meta[docSnap.id] = data;
        if (data.unreadCounts && data.unreadCounts[currentUserId]) {
          totalUnread += data.unreadCounts[currentUserId];
        }
      });
      setConversationsMeta(meta);
      setTotalUnreadCount(totalUnread);
    }, (error) => {
      console.error('Error listening to chat conversations:', error);
    });

    return () => unsubscribe();
  }, [companyId, currentUserId, setTotalUnreadCount]);

  // 3. Listen to messages for the active conversation
  useEffect(() => {
    if (!companyId || !currentUserId || !activeEmployee) {
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
  }, [companyId, currentUserId, activeEmployee]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
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
      // 1. Add message document
      await addDoc(msgsRef, {
        senderId: currentUserId,
        senderName: currentUserName,
        text,
        createdAt: serverTimestamp(),
        read: false
      });

      // 2. Update conversation meta with unread increments
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
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-zinc-800 focus:outline-none focus:ring-4 focus:ring-black/10 group cursor-pointer"
          title="Team Messages"
          aria-label="Open Team Messaging"
        >
          <MessageSquare className="w-6 h-6 text-white stroke-[2.2] group-hover:scale-105 transition-transform" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] sm:text-[11px] h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Window Overlay (Bottom Right) */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-200 ${
            isMinimized 
              ? 'bottom-4 right-4 w-72 h-14' 
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[640px] md:w-[740px] lg:w-[820px] h-[82vh] max-h-[640px]'
          } bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-zinc-200/90 overflow-hidden flex flex-col`}
        >
          {/* Top Window Bar */}
          <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              <h3 className="font-semibold text-[14px] text-white tracking-tight truncate flex items-center gap-2">
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
                onClick={() => setIsOpen(false)} 
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
          {/* Left Pane: Employee List with Search */}
          <div 
            className={`${
              activeEmployee ? 'hidden md:flex' : 'flex'
            } w-full md:w-[270px] lg:w-[300px] border-r border-zinc-200/80 flex-col bg-zinc-50/70 shrink-0 min-h-0`}
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
                  const isSelected = activeEmployee?.id === emp.id;

                  return (
                    <button
                      key={emp.id}
                      onClick={() => setActiveEmployee(emp)}
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
                          <h4 className="text-[13px] font-semibold text-zinc-900 truncate">
                            {emp.name}
                          </h4>
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

          {/* Right Pane: Active Chat Window */}
          <div 
            className={`${
              activeEmployee ? 'flex' : 'hidden md:flex'
            } flex-1 flex-col bg-white min-h-0`}
          >
            {activeEmployee ? (
              <>
                {/* Active Chat Header */}
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
                  Choose a team member from the list on the left to start sending direct messages.
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
