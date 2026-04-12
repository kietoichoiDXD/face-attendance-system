import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, GraduationCap, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { getDashboardSummary, listStudents } from '../api'

const DEFAULT_CLASS = 'CNTT-K44-A'

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-hint">{hint}</p>
    </article>
  )
}

export default function Dashboard() {
  const [classId, setClassId] = useState(DEFAULT_CLASS)
  const [summary, setSummary] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [summaryData, studentData] = await Promise.all([
          getDashboardSummary(classId),
          listStudents(classId),
        ])
        if (!controller.signal.aborted) {
          setSummary(summaryData)
          setStudents(studentData)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load dashboard data')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [classId])

  const chartData = useMemo(() => {
    const trend = summary?.trend || []
    return trend.map((item, index) => ({
      name: `S${index + 1}`,
      rate: Number(item.rate || 0),
    }))
  }, [summary])

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Biometric Sentinel</p>
          <h1>Dashboard điểm danh</h1>
        </div>
        <label className="input-group compact">
          <span>Mã lớp</span>
          <input
            value={classId}
            onChange={(event) => setClassId(event.target.value.toUpperCase())}
            placeholder="CNTT-K44-A"
          />
        </label>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="metrics-grid">
        <MetricCard
          icon={GraduationCap}
          label="Tổng sinh viên"
          value={summary?.total_students ?? students.length ?? '--'}
          hint="Số lượng đã đăng ký khuôn mặt"
        />
        <MetricCard
          icon={CalendarDays}
          label="Số phiên điểm danh"
          value={summary?.session_count ?? 0}
          hint="Dựa trên dữ liệu gần nhất"
        />
        <MetricCard
          icon={TrendingUp}
          label="Tỷ lệ hiện diện"
          value={summary?.attendance_rate != null ? `${summary.attendance_rate}%` : '--'}
          hint="Trung bình toàn bộ phiên"
        />
        <MetricCard
          icon={BarChart3}
          label="Sinh viên trong danh sách"
          value={students.length}
          hint="Theo class_id hiện tại"
        />
      </div>

      <div className="content-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <h2>Xu hướng 7 phiên gần nhất</h2>
            <span>{loading ? 'Đang tải...' : 'Đã cập nhật'}</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#11a7a2" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#11a7a2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#d8e4ee" />
                <XAxis dataKey="name" stroke="#4d667a" />
                <YAxis domain={[0, 100]} stroke="#4d667a" />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="#0f766e" fill="url(#rateFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel table-panel">
          <div className="panel-head">
            <h2>Sinh viên đã đăng ký</h2>
            <span>{students.length} bản ghi</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mã SV</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">Chưa có dữ liệu sinh viên</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.student_id}>
                      <td>{student.student_id}</td>
                      <td>{student.name}</td>
                      <td>{student.class_id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}
