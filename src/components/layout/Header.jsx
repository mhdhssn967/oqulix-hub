import React, { useState, useRef } from 'react';
import { Search, Bell, Menu, LogOut, X, Camera } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Swal from 'sweetalert2';

export function Header() {
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const { user, logout, isAdmin, employeeData, updateProfile } = useAuthStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return 'OQ';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = isAdmin ? 'Oqulix Admin' : (employeeData?.name || 'Employee');
  const displayRole = isAdmin ? 'Super Admin' : (employeeData?.position || 'Team Member');
  const displayInitials = isAdmin ? 'OQ' : getInitials(employeeData?.name);

  const handleProfileClick = () => {
    setEditName(displayName);
    setIsProfileOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(undefined, url);
      Swal.fire({ icon: 'success', title: 'Profile picture updated!', timer: 2000, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Upload failed', text: error.message, confirmButtonColor: '#000' });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === displayName) {
      setIsProfileOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(editName.trim(), undefined);
      Swal.fire({ icon: 'success', title: 'Name updated!', timer: 2000, showConfirmButton: false });
      setIsProfileOpen(false);
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Update failed', text: error.message, confirmButtonColor: '#000' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="h-[72px] sticky top-0 z-20 backdrop-blur-xl bg-[#FBFBFB]/80 border-b border-zinc-200/60 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden p-2 -ml-2 text-zinc-600 hover:text-black transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-5 ml-4">
          <button className="relative p-2 text-zinc-400 hover:text-black transition-colors hidden sm:block">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full border-2 border-[#FBFBFB]"></span>
          </button>
          <div className="h-6 w-[1px] bg-zinc-200 hidden sm:block"></div>
          <div className="flex items-center gap-1 sm:gap-2">
             <button 
               onClick={handleProfileClick}
               className="flex items-center gap-3 hover:bg-zinc-100 p-1.5 pr-3 rounded-full transition-colors text-left"
             >
               {employeeData?.photoURL ? (
                 <img src={employeeData.photoURL} alt="Profile" className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover shadow-sm ring-2 ring-black/5" />
               ) : (
                 <div className="w-8 h-8 md:w-9 md:h-9 bg-black text-white rounded-full flex items-center justify-center font-semibold text-xs shadow-sm ring-2 ring-black/5">
                   {displayInitials}
                 </div>
               )}
               <div className="hidden sm:block">
                 <p className="text-[13px] font-semibold text-black leading-none">{displayName}</p>
                 <p className="text-[11px] text-zinc-500 mt-1">{displayRole}</p>
               </div>
             </button>
             <button 
               onClick={() => logout()}
               className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
               title="Log out"
             >
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">Your Profile</h2>
              <button onClick={() => setIsProfileOpen(false)} className="text-zinc-400 hover:text-black transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div className="relative group mb-6">
                {employeeData?.photoURL ? (
                  <img src={employeeData.photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-zinc-50" />
                ) : (
                  <div className="w-24 h-24 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center text-2xl font-semibold shadow-sm ring-4 ring-zinc-50">
                    {displayInitials}
                  </div>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:scale-105 transition-transform disabled:opacity-50 shadow-md"
                  title="Change Picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="w-full space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Role</label>
                  <input 
                    type="text" 
                    value={displayRole}
                    disabled
                    className="w-full px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-xl text-sm text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="flex-1 py-2.5 px-4 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveName}
                disabled={isSaving || !editName.trim()}
                className="flex-1 py-2.5 px-4 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
