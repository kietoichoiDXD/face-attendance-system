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

export const exportCsvUrl = () => {
  if (IS_MOCK) return '#';
  return `${API_BASE_URL}/attendance/export`;
};
