import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, UserPlus, FileImage, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const sidebarLinks = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Register Student', path: '/register', icon: UserPlus },
  { name: 'Upload Attendance', path: '/attendance', icon: FileImage },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Layout: React.FC = () => {
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
      </motion.aside>
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
