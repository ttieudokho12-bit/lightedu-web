import React, { useState, useEffect } from 'react';
import { LogOut, GraduationCap, User as UserIcon, ShieldCheck, GraduationCap as StudentIcon, Settings, Home } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface NavbarProps {
  user: User;
  onHome?: () => void;
}

export default function Navbar({ user, onHome }: NavbarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    };
    fetchProfile();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('localUserSession');
    signOut(auth).then(() => {
      window.location.reload();
    });
  };

  return (
    <nav className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        {onHome ? (
          <button 
            onClick={onHome} 
            className="flex items-center gap-3 hover:opacity-80 transition-all text-left group"
            title="Về Trang chủ"
          >
            <div className="p-2 bg-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 leading-tight">Lightedu - Cấp Tiểu Học</h1>
              <p className="text-[10px] text-stone-500 font-bold">Zalo: 0359888795</p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 leading-tight">Lightedu - Cấp Tiểu Học</h1>
              <p className="text-[10px] text-stone-500 font-bold">Zalo: 0359888795</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {onHome && (
          <button
            onClick={onHome}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Quay lại Trang chủ"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại Trang chủ</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-stone-100">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              {profile?.role === 'teacher' ? (
                <ShieldCheck className="w-3 h-3 text-blue-500" />
              ) : profile?.role === 'admin' ? (
                <Settings className="w-3 h-3 text-red-500" />
              ) : (
                <StudentIcon className="w-3 h-3 text-emerald-500" />
              )}
              <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">
                {profile?.role === 'teacher' ? 'Giáo viên' : profile?.role === 'admin' ? 'Quản trị viên' : 'Học sinh'}
              </p>
            </div>
            <p className="text-sm font-bold text-stone-900">{profile?.displayName || user.displayName}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
            <UserIcon className="w-5 h-5 text-stone-400" />
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
