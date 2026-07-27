import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { login } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      await login(email, password);
      // App.jsx will automatically handle the redirect based on auth state
    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans selection:bg-black selection:text-white">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0A0A0A] text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo_transp.png" alt="Oqulix Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Manage your business with clarity.
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            The all-in-one CRM and ERP solution for modern teams to track leads, manage finance, and scale operations.
          </p>
        </div>

        <div className="relative z-10 text-zinc-500 text-sm">
          &copy; {new Date().getFullYear()} Oqulix. All rights reserved.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-24 bg-white relative">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile Logo */}
          <div className="flex justify-center md:hidden mb-8">
            <img src="/logo_transp.png" alt="Oqulix Logo" className="h-10 w-auto object-contain invert opacity-90" />
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-zinc-500 font-medium">
              Please enter your details to sign in.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2 text-[13px] font-medium border border-red-100/50 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black sm:text-[14px] bg-zinc-50 focus:bg-white transition-all outline-none text-zinc-900 shadow-sm"
                  placeholder="admin@oqulix.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="block text-[13px] font-semibold text-zinc-700">
                  Password
                </label>
                <a href="#" className="text-[12px] font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black sm:text-[14px] bg-zinc-50 focus:bg-white transition-all outline-none text-zinc-900 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-[14px] font-bold text-white bg-black hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
