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
          let permissions = [];
          
          rolesSnapshot.forEach(roleDoc => {
            const data = roleDoc.data();
            if (data.userIds && data.userIds.includes(user.uid)) {
              userRole = roleDoc.id;
              permissions = (empData && empData.permissions) ? empData.permissions : (data.permissions || []);
            }
          });

          // Set standard flags based on role for backward compatibility
          const lowerRole = userRole ? userRole.toLowerCase() : '';
          const isAdmin = lowerRole === 'admin';
          const isManager = lowerRole === 'hr' || lowerRole === 'manager';
          const isAdLeadManager = user.uid === '2K5X44krNabacvlJFgpvsVpDQHi1';
          const isEmployee = !!userRole && !isAdmin;

          if (userRole) {
            set({ 
              user, 
              isAdmin, 
              isEmployee, 
              isManager, 
              isAdLeadManager,
              role: userRole,
              employeeData: empData, 
              companyId: empData ? empData.companyid : user.uid, 
              permissions, 
              loading: false 
            });
          } else {
            // User not found in any role document
            set({ user: null, isAdmin: false, isEmployee: false, isManager: false, isAdLeadManager: false, role: null, companyId: null, permissions: [], loading: false });
          }
        } catch (error) {
          console.error("Error checking auth status:", error);
          set({ user, isAdmin: false, isEmployee: false, isManager: false, isAdLeadManager: false, companyId: null, permissions: [], loading: false });
        }
      } else {
        set({ user: null, isAdmin: false, isEmployee: false, isManager: false, isAdLeadManager: false, companyId: null, permissions: [], loading: false });
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
  }
}));
