import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import RegisterStudent from './pages/RegisterStudent';
import UploadAttendance from './pages/UploadAttendance';
import Login from './pages/Login';
import StudentHome from './pages/StudentHome';
import AdminClasses from './pages/AdminClasses';
import { AuthProvider } from './auth';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute allow={['student', 'admin']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="register"
              element={
                <ProtectedRoute allow={['admin']}>
                  <RegisterStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute allow={['admin']}>
                  <UploadAttendance />
                </ProtectedRoute>
              }
            />
            <Route path="student" element={<StudentHome />} />
            <Route
              path="admin/classes"
              element={
                <ProtectedRoute allow={['admin']}>
                  <AdminClasses />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<div className="p-8 text-center text-slate-500">Page not found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
