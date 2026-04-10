import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { getClasses, getStudentsByClass, studentImageUrl, type StudentItem } from '../api/client';

export default function AdminClasses() {
  const [classes, setClasses] = useState<Array<{ class_id: string; student_count: number }>>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getClasses()
      .then((res) => {
        setClasses(res.classes || []);
        if (res.classes?.length) {
          setSelectedClass(res.classes[0].class_id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getStudentsByClass(selectedClass).then((res) => setStudents(res.students || []));
  }, [selectedClass]);

  if (loading) {
    return <div className="text-slate-500">Loading class list...</div>;
  }

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Danh sách lớp</CardTitle>
          <CardDescription>Admin có thể xem lớp và danh sách sinh viên theo lớp</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          {classes.map((cls) => (
            <button
              key={cls.class_id}
              type="button"
              onClick={() => setSelectedClass(cls.class_id)}
              className={`rounded-lg border p-3 text-left ${
                selectedClass === cls.class_id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
            >
              <p className="font-semibold text-slate-800">{cls.class_id}</p>
              <p className="text-sm text-slate-500">{cls.student_count} sinh viên</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách sinh viên lớp {selectedClass || '-'}</CardTitle>
          <CardDescription>Hiển thị thông tin và ảnh khuôn mặt đã đăng ký</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {students.length === 0 && <div className="text-slate-500">Chưa có sinh viên trong lớp này.</div>}
          {students.map((student) => (
            <div key={student.student_id} className="flex gap-4 items-center border rounded-lg p-3 bg-white">
              <img
                src={studentImageUrl(student.student_id)}
                alt={student.name}
                className="h-16 w-16 rounded-md object-cover border"
                loading="lazy"
              />
              <div className="text-sm">
                <p className="font-semibold text-slate-800">{student.name}</p>
                <p className="text-slate-600">Mã SV: {student.student_id}</p>
                <p className="text-slate-500">Lớp: {student.class_id}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
