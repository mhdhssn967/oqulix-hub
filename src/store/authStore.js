import { create } from 'zustand';
import { auth, db, messaging, getToken } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  isEmployee: false,
  isManager: false,
  companyId: null,
  loading: true,

  initAuth: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          let isAdmin = adminDoc.exists();

          if (isAdmin) {
            set({ user, isAdmin: true, isEmployee: false, companyId: user.uid, loading: false });
          } else {
            // Check if user is an employee
            const empDoc = await getDoc(doc(db, 'employees', user.uid));
            if (empDoc.exists()) {
              const empData = empDoc.data();
              const managerDoc = await getDoc(doc(db, 'manager', user.uid));
              const isManager = managerDoc.exists();
              set({ user, isAdmin: false, isEmployee: true, isManager, employeeData: empData, companyId: empData.companyid, loading: false });
            } else {
              set({ user: null, isAdmin: false, isEmployee: false, isManager: false, companyId: null, loading: false });
            }
          }
        } catch (error) {
          console.error("Error checking auth status:", error);
          set({ user, isAdmin: false, isEmployee: false, companyId: null, loading: false });
        }
      } else {
        set({ user: null, isAdmin: false, isEmployee: false, companyId: null, loading: false });
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
