import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  ScanFace, 
  LogOut, 
  User, 
  History as HistoryIcon, 
  BarChart3, 
  Fingerprint,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth';

const adminLinks = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Classes', path: '/admin/classes', icon: GraduationCap },
  { name: 'Register Student', path: '/register', icon: UserPlus },
  { name: 'Scan Attendance', path: '/attendance', icon: ScanFace },
  { name: 'History', path: '/history', icon: HistoryIcon },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
];

const studentLinks = [
  { name: 'Dashboard', path: '/student', icon: User },
  { name: 'Overview', path: '/', icon: LayoutDashboard },
];

export const Layout: React.FC = () => {
  const { role, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarLinks = role === 'admin' ? adminLinks : studentLinks;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-surface font-body">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        className={`w-72 fixed inset-y-0 left-0 z-40 flex flex-col bg-surface-container-lowest border-r border-outline-variant shadow-[4px_0_24px_rgba(0,0,0,0.08)] transform transition-transform duration-300 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-8 flex flex-col h-full">
          <button
            type="button"
            className="self-end mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-secondary hover:bg-surface-container lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Fingerprint size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary font-headline tracking-tight">Biometric Sentinel</span>
              <span className="text-[10px] font-label text-secondary font-bold">The Digital Curator</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            <div className="px-4 mb-3 text-[10px] font-bold text-outline uppercase tracking-[0.2em]">Main Navigation</div>
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative ${
                      isActive
                        ? 'bg-primary-container/20 text-primary'
                        : 'text-secondary hover:bg-surface-container hover:text-on-surface'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-semibold">{link.name}</span>
                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div 
                          layoutId="active-pill"
                          className="absolute right-0 w-1.5 h-6 bg-primary rounded-l-full" 
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="pt-6 mt-auto border-t border-outline-variant">
            <div className="flex items-center gap-3 mb-6 p-2 rounded-2xl bg-surface-container-low border border-outline-variant/50">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                <User size={20} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-on-surface truncate">
                  {role === 'admin' ? 'System Admin' : 'Student Access'}
                </span>
                <span className="text-[10px] font-label text-secondary truncate">
                  {role?.toUpperCase()} MODE
                </span>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-error font-semibold text-sm hover:bg-error-container/20 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Terminate Session
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 lg:ml-72 p-4 sm:p-6 lg:p-8 h-screen overflow-y-auto bg-surface-bright relative">
        {/* Top Gradient Blur */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="sticky top-0 z-20 mb-4 flex items-center justify-between rounded-2xl border border-outline-variant/60 bg-surface/90 px-3 py-2 backdrop-blur lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            {role === 'admin' ? 'Admin Mode' : 'Student Mode'}
          </span>
          <span className="w-10" />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10 pt-2 lg:pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

