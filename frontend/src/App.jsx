import { LayoutDashboard, ScanFace, UserRoundPlus } from 'lucide-react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'

import Attendance from './pages/Attendance'
import Dashboard from './pages/Dashboard'
import RegisterStudent from './pages/RegisterStudent'
import './App.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/register', label: 'Đăng ký', icon: UserRoundPlus },
  { to: '/attendance', label: 'Điểm danh', icon: ScanFace },
]

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <p>Face Attendance</p>
            <h1>Biometric Sentinel</h1>
          </div>
        </div>

        <nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="sidebar-note">
          Bản local demo với backend Python + fallback data để trình diễn nhanh.
        </p>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<RegisterStudent />} />
          <Route path="/attendance" element={<Attendance />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
