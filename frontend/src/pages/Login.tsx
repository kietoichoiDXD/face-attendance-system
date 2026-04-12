import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth';

export default function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: 'student' | 'admin') => {
    loginAs(role);
    navigate(role === 'admin' ? '/' : '/student');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Face Attendance Demo Login</CardTitle>
          <CardDescription>Chọn vai trò để vào hệ thống demo</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Button className="h-14 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleLogin('student')}>
            Đăng nhập vai trò Sinh viên/Học sinh
          </Button>
          <Button className="h-14 bg-blue-600 hover:bg-blue-700" onClick={() => handleLogin('admin')}>
            Đăng nhập vai trò Admin/Giảng viên
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
