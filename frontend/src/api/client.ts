import axios from 'axios';

const IS_MOCK = !import.meta.env.VITE_API_URL;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RecognizedFace = {
  student_id: string;
  name?: string;
  confidence?: number;
  bounding_box: { Left: number; Top: number; Width: number; Height: number };
};

export type AttendanceResult = {
  attendance_id: string;
  status?: 'UPLOADING' | 'COMPLETED';
  present_count: number;
  recognized: RecognizedFace[];
  unrecognized_faces: Array<{ bounding_box: { Left: number; Top: number; Width: number; Height: number } }>;
};

export const getAnalytics = async () => {
  if (IS_MOCK) {
    await delay(500);
    return {
      total_students: 120,
      total_classes: 5,
      attendance_rate: 85,
      recent_attendance: [
        { date: '2023-10-01', present: 110, absent: 10 },
        { date: '2023-10-02', present: 115, absent: 5 },
        { date: '2023-10-03', present: 100, absent: 20 },
        { date: '2023-10-04', present: 118, absent: 2 },
        { date: '2023-10-05', present: 112, absent: 8 },
      ]
    };
  }
  const { data } = await apiClient.get('/analytics');
  return data;
};

export const registerStudent = async (studentId: string, payload: { name: string; class_id: string; image: string }) => {
  if (IS_MOCK) {
    await delay(1000);
    return { message: 'Student registered successfully', student_id: studentId };
  }
  const { data } = await apiClient.post(`/students/${studentId}/face`, payload);
  return data;
};

export const processAttendance = async (classId: string, payload: { image: string }) => {
  if (IS_MOCK) {
    await delay(1500);
    return {
      message: 'Attendance processed',
      attendance_id: 'mock-attendance-id',
      present_count: 2,
      recognized: [
        { student_id: 'S001', name: 'Alice Smith', confidence: 99.5, bounding_box: { Width: 0.15, Height: 0.25, Left: 0.2, Top: 0.3 } },
        { student_id: 'S002', name: 'Bob Jones', confidence: 98.2, bounding_box: { Width: 0.12, Height: 0.22, Left: 0.6, Top: 0.4 } }
      ],
      unrecognized_faces: [
        { bounding_box: { Width: 0.14, Height: 0.24, Left: 0.8, Top: 0.1 } }
      ]
    };
  }
  const { data } = await apiClient.post(`/classes/${classId}/attendance`, payload);
  return data;
};

export const requestAttendanceUploadUrl = async (classId: string) => {
  if (IS_MOCK) {
    await delay(300);
    return {
      attendance_id: 'mock-attendance-id',
      upload_url: 'https://example.com/mock-upload-url',
      image_key: `classes/${classId}/attendance/mock-attendance-id.jpg`,
    };
  }

  const { data } = await apiClient.post(`/classes/${classId}/attendance/upload-url`);
  return data as { attendance_id: string; upload_url: string; image_key: string };
};

export const uploadAttendanceImage = async (uploadUrl: string, file: File) => {
  if (IS_MOCK) {
    await delay(800);
    return;
  }

  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type || 'image/jpeg' },
  });
};

export const getAttendanceById = async (attendanceId: string): Promise<AttendanceResult> => {
  if (IS_MOCK) {
    await delay(800);
    return {
      attendance_id: attendanceId,
      status: 'COMPLETED',
      present_count: 2,
      recognized: [
        { student_id: 'S001', name: 'Alice Smith', confidence: 99.5, bounding_box: { Width: 0.15, Height: 0.25, Left: 0.2, Top: 0.3 } },
        { student_id: 'S002', name: 'Bob Jones', confidence: 98.2, bounding_box: { Width: 0.12, Height: 0.22, Left: 0.6, Top: 0.4 } }
      ],
      unrecognized_faces: [
        { bounding_box: { Width: 0.14, Height: 0.24, Left: 0.8, Top: 0.1 } }
      ]
    };
  }

  const { data } = await apiClient.get(`/attendance/${attendanceId}`);
  return data as AttendanceResult;
};

export const waitForAttendanceResult = async (
  attendanceId: string,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<AttendanceResult> => {
  const timeoutMs = options?.timeoutMs ?? 45000;
  const intervalMs = options?.intervalMs ?? 2500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const current = await getAttendanceById(attendanceId);
    if ((current.status || 'COMPLETED') === 'COMPLETED') {
      return current;
    }
    await delay(intervalMs);
  }

  throw new Error('Timed out while waiting for attendance processing result');
};

export const exportCsvUrl = () => {
  if (IS_MOCK) return '#';
  return `${API_BASE_URL}/attendance/export`;
};
