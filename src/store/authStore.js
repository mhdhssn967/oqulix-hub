import { create } from 'zustand';
import { auth, db, messaging, getToken } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

export const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  isEmployee: false,
  isManager: false,
  role: null,
  companyId: null,
  permissions: [],
  isHR: false,
  loading: true,

  initAuth: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user's profile metadata from `employees` if it exists (for companyId, name, etc.)
          const empDoc = await getDoc(doc(db, 'employees', user.uid));
          const empData = empDoc.exists() ? empDoc.data() : null;

          // Fetch all role documents from `users` collection
          const rolesSnapshot = await getDocs(collection(db, 'users'));
          let userRole = null;
          let userRoles = [];
          let permissions = [];
          
          rolesSnapshot.forEach(roleDoc => {
            const data = roleDoc.data();
            if (data.userIds && data.userIds.includes(user.uid)) {
              userRole = roleDoc.id;
              userRoles.push(roleDoc.id.toLowerCase());
              permissions = (empData && empData.permissions) ? empData.permissions : (data.permissions || []);
            }
          });

          // Set standard flags based on role for backward compatibility
          const lowerRole = userRole ? userRole.toLowerCase() : '';
          const isAdmin = userRoles.includes('admin');
          const isManager = userRoles.includes('hr') || userRoles.includes('manager') || userRoles.some(r => r.includes('manager'));
          const isHR = userRoles.some(r => r.includes('hr')) || (empData && empData.department && empData.department.toLowerCase() === 'hr') || (empData && empData.position && empData.position.toLowerCase().includes('hr'));
          const isAdLeadManager = user.uid === '2K5X44krNabacvlJFgpvsVpDQHi1';
          const isEmployee = userRoles.length > 0 && !isAdmin;

          if (userRole) {
            set({ 
              user, 
              isAdmin, 
              isEmployee, 
              isManager, 
              isAdLeadManager,
              isHR,
              role: userRole,
              employeeData: empData, 
              companyId: empData ? empData.companyid : user.uid, 
              permissions, 
              loading: false 
            });
          } else {
            // User not found in any role document
            set({ user: null, isAdmin: false, isEmployee: false, isManager: false, isAdLeadManager: false, isHR: false, role: null, companyId: null, permissions: [], loading: false });
          }
        } catch (error) {
          console.error("Error checking auth status:", error);
          set({ user, isAdmin: false, isEmployee: false, isManager: false, isAdLeadManager: false, isHR: false, companyId: null, permissions: [], loading: false });
        }
      } else {
        set({ user: null, isAdmin: false, isEmployee: false, isManager: false, isAdLeadManager: false, isHR: false, companyId: null, permissions: [], loading: false });
      }
    });
  },

  login: async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  },

  requestNotificationPermission: async () => {
    const { user, isEmployee, isAdmin } = useAuthStore.getState();
    if (!user || !messaging) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { 
          vapidKey: 'BIZEitkLgyAwD6CjmbUBUQE1WLa1ynhoiQHO6MUDSlnMNRqqpmLcVmAIdVfQMNn5pjyDbGzV4GdpVdqeknWGyoo' 
        });
        
        if (currentToken) {
          const collectionName = isAdmin ? 'admins' : (isEmployee ? 'employees' : null);
          if (collectionName) {
            await updateDoc(doc(db, collectionName, user.uid), {
              fcmToken: currentToken
            });
            console.log("FCM Token saved successfully.");
          }
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  updateProfile: async (name, photoURL) => {
    const { user, isAdmin, isEmployee, employeeData } = useAuthStore.getState();
    if (!user) return false;
    
    const collectionName = isAdmin ? 'admins' : (isEmployee ? 'employees' : null);
    if (!collectionName) return false;

    try {
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (photoURL !== undefined) updates.photoURL = photoURL;
      
      await updateDoc(doc(db, collectionName, user.uid), updates);
      
      set({ 
        employeeData: { 
          ...employeeData, 
          ...updates 
        } 
      });
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }
}));
