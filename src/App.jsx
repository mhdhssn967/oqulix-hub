import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/authStore';
import { messaging } from './firebase';
import { onMessage } from 'firebase/messaging';
import Swal from 'sweetalert2';

// Import pages
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Attendance from './pages/Attendance';
import Performance from './pages/Performance';
import Clients from './pages/Clients';
import Analysis from './pages/Analysis';
import Documents from './pages/Documents';
import OtherData from './pages/OtherData';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Employees from './pages/Employees';
import Reimbursements from './pages/Reimbursements';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, isAdmin, isEmployee } = useAuthStore();
  
  if (!user || (!isAdmin && !isEmployee)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin Only Route Wrapper
const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuthStore();
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const { loading, initAuth, user, isAdmin, isEmployee } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
        });

        Toast.fire({
          icon: 'info',
          title: payload.notification?.title || 'New Notification',
          text: payload.notification?.body || 'You have a new message.'
        });
      });
      return () => unsubscribe();
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <div className="text-[13px] font-medium text-zinc-500">Checking credentials...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user && (isAdmin || isEmployee) ? <Navigate to="/" replace /> : <Login />} />
        
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="finance" element={<AdminRoute><Finance /></AdminRoute>} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="employees" element={<AdminRoute><Employees /></AdminRoute>} />
          <Route path="performance" element={<Performance />} />
          <Route path="clients" element={<Clients />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="reimbursements" element={<Reimbursements />} />
          <Route path="documents" element={<Documents />} />
          <Route path="other-data" element={<OtherData />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
