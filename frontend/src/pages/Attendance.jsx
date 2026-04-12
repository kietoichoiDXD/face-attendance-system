import { useState, useEffect } from 'react'

import { processAttendance, pollAttendanceStatus } from '../api'

const DEFAULT_CLASS = 'CNTT-K44-A'

export default function Attendance() {
  const [classId, setClassId] = useState(DEFAULT_CLASS)
  const [threshold, setThreshold] = useState(0.78)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')
  const [pollStatus, setPollStatus] = useState('')

  function onFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      setPreview('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPreview(String(reader.result || ''))
    }
    reader.readAsDataURL(file)
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setPollStatus('')

    if (!preview) {
      setError('Vui lòng chọn ảnh lớp để điểm danh.')
      return
    }

    setProcessing(true)
    try {
      // Try signed URL upload first (production mode)
      const data = await processAttendance(classId, { 
        image: preview, 
        threshold,
        useSignedUrl: true 
      })

      // Check if processing is asynchronous (signed URL mode returns attendance_id)
      if (data.status === 'processing' && data.attendance_id) {
        setPollStatus('Ảnh đã upload, đang xử lý...')
        setPolling(true)
        
        // Poll for result
        try {
          const finalResult = await pollAttendanceStatus(data.attendance_id, classId, 60)
          setResult(finalResult)
          setPollStatus('')
        } catch (pollErr) {
          setError(`Timeout chờ kết quả: ${pollErr.message}`)
          setResult(data) // Show upload confirmation at least
        } finally {
          setPolling(false)
        }
      } else {
        // Synchronous result (fallback mode)
        setResult(data)
      }
    } catch (err) {
      setError(err.message || 'Không thể xử lý điểm danh')
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Attendance Scan</p>
          <h1>Điểm danh từ ảnh tập thể</h1>
        </div>
      </header>

      <div className="content-grid two-column">
        <form className="panel form-panel" onSubmit={onSubmit}>
          <label className="input-group">
            <span>Mã lớp</span>
            <input value={classId} onChange={(event) => setClassId(event.target.value.toUpperCase())} required />
          </label>

          <label className="input-group">
            <span>Ngưỡng nhận diện ({threshold.toFixed(2)})</span>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
          </label>

          <label className="input-group">
            <span>Ảnh lớp học</span>
            <input type="file" accept="image/*" onChange={onFileChange} required />
          </label>

          {preview ? (
            <div className="preview-box">
              <img src={preview} alt="Ảnh lớp xem trước" />
            </div>
          ) : null}

          {error ? <p className="error-banner">{error}</p> : null}

          {pollStatus ? <p className="info-banner">{pollStatus}</p> : null}

          <button className="primary-btn" disabled={processing || polling}>
            {processing ? 'Đang upload...' : polling ? 'Đang chờ kết quả...' : 'Bắt đầu điểm danh'}
          </button>
        </form>

        <article className="panel table-panel">
          <div className="panel-head">
            <h2>Kết quả phiên gần nhất</h2>
            <span>{result?.attendance_id || 'Chưa có phiên'}</span>
          </div>

          {result ? (
            <>
              <div className="result-summary">
                <p>Trạng thái: <strong>{result.status === 'processing' ? '⏳ Đang xử lý...' : result.status}</strong></p>
                {result.status !== 'processing' && (
                  <>
                    <p>Có mặt: <strong>{result.present_count}</strong> / {result.total_students}</p>
                    <p>Tổng khuôn mặt phát hiện: <strong>{result.total_faces}</strong></p>
                  </>
                )}
                {result.message && <p className="info-message">{result.message}</p>}
              </div>

              {result.recognized_students && result.status !== 'processing' && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã SV</th>
                        <th>Họ tên</th>
                        <th>Độ tin cậy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.recognized_students?.length ? (
                        result.recognized_students.map((item) => (
                          <tr key={`${item.student_id}-${item.timestamp}`}>
                            <td>{item.student_id}</td>
                            <td>{item.name}</td>
                            <td>{Math.round((item.confidence || 0) * 100)}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="empty-cell">Không nhận diện được sinh viên nào.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="empty-state">Tải ảnh lớp và chạy điểm danh để xem kết quả.</p>
          )}
        </article>
      </div>
    </section>
  )
}
