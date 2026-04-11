import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { getClasses, registerStudent } from '../api/client';

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:image\/[a-z]+;base64,/, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentHome() {
  const [classes, setClasses] = useState<Array<{ class_id: string; student_count: number }>>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getClasses()
      .then((res) => {
        setClasses(res.classes || []);
        if (res.classes?.length) {
          setClassId(res.classes[0].class_id);
        }
      })
      .catch(() => {
        // Keep manual class input available even if class list fails.
      });
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !studentId || !name || !imageFile) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã lớp, mã sinh viên, họ tên và chọn ảnh.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const imageBase64 = await toBase64(imageFile);
      await registerStudent(studentId, {
        name,
        class_id: classId,
        image: imageBase64,
      });
      setMessage({ type: 'success', text: `Đăng ký ảnh cá nhân thành công cho lớp ${classId}.` });
      setImageFile(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-4 sm:mt-8 space-y-6 px-0 sm:px-0">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Cổng Sinh viên/Học sinh</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sinh viên chọn mã lớp và upload ảnh cá nhân để đăng ký khuôn mặt vào lớp.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-4">
          {message && (
            <div
              className={`rounded-md border px-3 py-2 ${
                message.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-red-300 bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="classId">Mã lớp</Label>
              <Input
                id="classId"
                list="class-options"
                placeholder="Ví dụ: KAGGLE-DEMO-01"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              />
              <datalist id="class-options">
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="studentId">Mã sinh viên</Label>
                <Input
                  id="studentId"
                  placeholder="Ví dụ: SV2026001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="studentName">Họ và tên</Label>
                <Input
                  id="studentName"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="studentImage">Ảnh cá nhân</Label>
              <Input
                id="studentImage"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Đang tải ảnh...' : 'Vào lớp và tải ảnh cá nhân'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
