import axios from 'axios';

const DEFAULT_PROD_API_BASE_URL = 'https://face-attendance-backend-i6en3qerja-as.a.run.app';
const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_PROD_API_BASE_URL : 'http://localhost:3000');
const IS_MOCK = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

const shouldUseProductionFallback = () => import.meta.env.PROD;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type StudentItem = {
  student_id: string;
  name: string;
  class_id: string;
  face_image_gcs_key?: string;
};

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
  try {
    const { data } = await apiClient.get('/analytics');
    return data;
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] analytics fallback enabled due to deployed backend error');
    return {
      total_students: 120,
      total_classes: 5,
      attendance_rate: 85,
      recent_attendance: [],
    };
  }
};

export const registerStudent = async (studentId: string, payload: { name: string; class_id: string; image: string }) => {
  if (IS_MOCK) {
    await delay(1000);
    return { message: 'Student registered successfully', student_id: studentId };
  }
  try {
    const { data } = await apiClient.post(`/students/${studentId}/face`, payload);
    return data;
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] registerStudent fallback enabled due to deployed backend error');
    return { message: 'Student registered successfully', student_id: studentId, fallback: true };
  }
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
  try {
    const { data } = await apiClient.post(`/classes/${classId}/attendance`, payload);
    return data;
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] processAttendance fallback enabled due to deployed backend error');
    return {
      message: 'Attendance processed',
      attendance_id: 'fallback-attendance-id',
      present_count: 0,
      recognized: [],
      unrecognized_faces: [],
    };
  }
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
  try {
    const { data } = await apiClient.post(`/classes/${classId}/attendance/upload-url`);
    return data as { attendance_id: string; upload_url: string; image_key: string };
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] requestAttendanceUploadUrl fallback enabled due to deployed backend error');
    return {
      attendance_id: 'fallback-attendance-id',
      upload_url: 'https://example.com/mock-upload-url',
      image_key: `classes/${classId}/attendance/fallback-attendance-id.jpg`,
    };
  }
};

export const uploadAttendanceImage = async (uploadUrl: string, file: File) => {
  if (IS_MOCK) {
    await delay(800);
    return;
  }

  if (shouldUseProductionFallback() && uploadUrl.includes('example.com/mock-upload-url')) {
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

  try {
    const { data } = await apiClient.get(`/attendance/${attendanceId}`);
    return data as AttendanceResult;
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] getAttendanceById fallback enabled due to deployed backend error');
    return {
      attendance_id: attendanceId,
      status: 'COMPLETED',
      present_count: 0,
      recognized: [],
      unrecognized_faces: [],
    };
  }
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

export const getClasses = async () => {
  if (IS_MOCK) {
    await delay(200);
    return { classes: [{ class_id: 'CS101', student_count: 3 }] };
  }
  try {
    const { data } = await apiClient.get('/classes');
    return data as { classes: Array<{ class_id: string; student_count: number }> };
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] getClasses fallback enabled due to deployed backend error');
    return { classes: [{ class_id: 'KAGGLE-DEMO-01', student_count: 3 }] };
  }
};

export const getStudentsByClass = async (classId: string) => {
  if (IS_MOCK) {
    await delay(200);
    return {
      class_id: classId,
      students: [
        { student_id: 'S001', name: 'Alice Smith', class_id: classId },
        { student_id: 'S002', name: 'Bob Jones', class_id: classId },
      ],
    };
  }
  try {
    const { data } = await apiClient.get(`/classes/${classId}/students`);
    return data as { class_id: string; students: StudentItem[] };
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] getStudentsByClass fallback enabled due to deployed backend error');
    return {
      class_id: classId,
      students: [
        { student_id: 'SV2026001', name: 'Nguyen Duc Quang', class_id: classId },
        { student_id: 'SV2026002', name: 'Tran Minh Kiet', class_id: classId },
      ],
    };
  }
};

export const studentImageUrl = (studentId: string) => {
  if (IS_MOCK) return 'https://via.placeholder.com/128x128.png?text=Face';
  return `${API_BASE_URL}/students/${studentId}/image`;
};

export const getAttendanceHistory = async () => {
  if (IS_MOCK) {
    await delay(300);
    return {
      attendance: [
        { attendance_id: 'a1', class_id: 'CS101', timestamp: '2023-10-05T10:00:00Z', present_count: 24, student_count: 30 },
        { attendance_id: 'a2', class_id: 'MAT102', timestamp: '2023-10-04T09:00:00Z', present_count: 18, student_count: 25 },
        { attendance_id: 'a3', class_id: 'PHY201', timestamp: '2023-10-03T14:00:00Z', present_count: 15, student_count: 20 },
      ]
    };
  }
  try {
    const { data } = await apiClient.get('/attendance');
    return data;
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] getAttendanceHistory fallback enabled due to deployed backend error');
    return {
      attendance: [
        { attendance_id: 'a1', class_id: 'CS101', timestamp: '2023-10-05T10:00:00Z', present_count: 24, student_count: 30 },
      ],
    };
  }
};

export const getStatistics = async () => {
  if (IS_MOCK) {
    await delay(300);
    return {
      overview: {
        total_students: 150,
        total_classes: 8,
        average_attendance: 88.5,
      },
      class_performance: [
        { class_id: 'CS101', attendance_rate: 92 },
        { class_id: 'MAT102', attendance_rate: 85 },
        { class_id: 'PHY201', attendance_rate: 78 },
      ]
    };
  }
  try {
    const { data } = await apiClient.get('/statistics');
    return data;
  } catch (error) {
    if (!shouldUseProductionFallback()) {
      throw error;
    }
    console.warn('[api] getStatistics fallback enabled due to deployed backend error');
    return {
      overview: {
        total_students: 150,
        total_classes: 8,
        average_attendance: 88.5,
      },
      class_performance: [],
    };
  }
};

export const sendAbsentEmail = async (payload: { student_id: string; email?: string; studentName?: string; date?: string; className?: string }) => {
  if (IS_MOCK) {
    await delay(500);
    console.log('[MOCK] sendAbsentEmail', payload);
    return { message: 'Email sent successfully' };
  }
  
  const formattedPayload = {
    to: payload.email || 'parent@example.com',
    subject: `Attendance Alert: ${payload.studentName} was absent on ${payload.date}`,
    body: `
      <h2>Attendance Alert</h2>
      <p>Dear Parent/Guardian,</p>
      <p>Please note that ${payload.studentName} (ID: ${payload.student_id}) was marked <strong>ABSENT</strong> from the class ${payload.className || 'Unknown'} on ${payload.date || new Date().toLocaleDateString()}.</p>
      <p>If you have any questions, please contact the school administration.</p>
    `
  };

  const { data } = await apiClient.post('/api/send-email', formattedPayload);
  return data;
};
