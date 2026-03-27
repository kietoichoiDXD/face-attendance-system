import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import RegisterStudent from './pages/RegisterStudent';
import UploadAttendance from './pages/UploadAttendance';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="register" element={<RegisterStudent />} />
          <Route path="attendance" element={<UploadAttendance />} />
          <Route path="*" element={<div className="p-8 text-center text-slate-500">Page not found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
