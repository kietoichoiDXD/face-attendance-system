import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, UserPlus, FileImage, ShieldCheck, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';

const adminLinks = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Admin Classes', path: '/admin/classes', icon: ShieldCheck },
  { name: 'Register Student', path: '/register', icon: UserPlus },
  { name: 'Upload Attendance', path: '/attendance', icon: FileImage },
];

const studentLinks = [
  { name: 'Student Home', path: '/student', icon: User },
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
];

export const Layout: React.FC = () => {
  const { role, logout } = useAuth();
  const sidebarLinks = role === 'admin' ? adminLinks : studentLinks;

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 overflow-hidden font-sans">
      <motion.aside 
        initial={{ x: -250 }} 
        animate={{ x: 0 }} 
        className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10 shadow-sm"
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 font-bold text-xl text-blue-600">
          Smart Attend
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">Role: {role === 'admin' ? 'Admin' : 'Student'}</div>
          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </motion.aside>
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
