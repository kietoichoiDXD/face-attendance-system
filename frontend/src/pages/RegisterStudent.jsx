import { useState } from 'react'

import { registerStudent } from '../api'

const DEFAULT_CLASS = 'CNTT-K44-A'

export default function RegisterStudent() {
  const [form, setForm] = useState({
    student_id: '',
    name: '',
    class_id: DEFAULT_CLASS,
  })
  const [preview, setPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function onChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

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
    setMessage('')

    if (!preview) {
      setError('Vui lòng chọn ảnh khuôn mặt trước khi đăng ký.')
      return
    }

    setSubmitting(true)
    try {
      const data = await registerStudent({ ...form, image: preview })
      setMessage(`${data.message} (${data.student_id})`)
      setForm((prev) => ({ ...prev, student_id: '', name: '' }))
      setPreview('')
    } catch (err) {
      setError(err.message || 'Không thể đăng ký sinh viên')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page narrow">
      <header className="page-header">
        <div>
          <p className="eyebrow">Enrollment</p>
          <h1>Đăng ký sinh viên</h1>
        </div>
      </header>

      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="input-group">
            <span>Mã sinh viên</span>
            <input
              name="student_id"
              value={form.student_id}
              onChange={onChange}
              placeholder="SV2026001"
              required
            />
          </label>

          <label className="input-group">
            <span>Họ và tên</span>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Nguyen Van A"
              required
            />
          </label>

          <label className="input-group">
            <span>Mã lớp</span>
            <input
              name="class_id"
              value={form.class_id}
              onChange={onChange}
              placeholder="CNTT-K44-A"
              required
            />
          </label>

          <label className="input-group">
            <span>Ảnh khuôn mặt</span>
            <input type="file" accept="image/*" onChange={onFileChange} required />
          </label>
        </div>

        {preview ? (
          <div className="preview-box">
            <img src={preview} alt="Ảnh xem trước" />
          </div>
        ) : null}

        {error ? <p className="error-banner">{error}</p> : null}
        {message ? <p className="success-banner">{message}</p> : null}

        <button className="primary-btn" disabled={submitting}>
          {submitting ? 'Đang xử lý...' : 'Đăng ký khuôn mặt'}
        </button>
      </form>
    </section>
  )
}
