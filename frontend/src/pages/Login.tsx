import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth';
import { Button } from '../components/ui/button';

export default function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mock authentication logic based on email rules
    const emailLower = email.toLowerCase();
    
    if (emailLower.includes('student') || emailLower.includes('sv@')) {
      loginAs('student');
      navigate('/student');
    } else if (emailLower.includes('admin') || emailLower.includes('gv@')) {
      // instructors or admins go to the admin dashboard (Layout component at root "/")
      loginAs('admin');
      navigate('/');
    } else {
      setError('Tài khoản không hợp lệ. Vui lòng sử dụng tk sinh viên (ví dụ: student@gmail.com) hoặc tk giảng viên (ví dụ: gv@gmail.com).');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations for a beautiful aesthetic */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
        </motion.div>
        <motion.h2 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight"
        >
          Hệ thống Điểm danh
        </motion.h2>
        <motion.p 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-center text-sm text-slate-600"
        >
          Đăng nhập bằng tài khoản của bạn để tiếp tục
        </motion.p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl py-6 px-4 shadow-2xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-white/60">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email / Tên đăng nhập
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-primary focus:border-primary sm:text-sm bg-white/50 transition-all focus:bg-white outline-none"
                  placeholder="Vd: student@gmail.com hoặc gv@gmail.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-primary focus:border-primary sm:text-sm bg-white/50 transition-all focus:bg-white outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"
              >
                {error}
              </motion.div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full h-12 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 group"
              >
                Đăng nhập
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="mt-6 text-xs text-center text-slate-500 space-y-3">
              <p className="font-semibold text-slate-700">Tài khoản thử nghiệm:</p>
              <div className="grid gap-2 sm:grid-cols-2 text-left sm:text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Sinh viên</p>
                  <p className="font-mono text-primary font-medium break-all">student@gmail.com</p>
                  <p className="mt-1 text-[11px] text-slate-500">Mật khẩu: bất kỳ giá trị nào</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Giảng viên</p>
                  <p className="font-mono text-primary font-medium break-all">gv@gmail.com</p>
                  <p className="mt-1 text-[11px] text-slate-500">Mật khẩu: bất kỳ giá trị nào</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
