const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "")
const FALLBACK_PREFIX = "face-attendance-demo"

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }
  return data
}

async function uploadToSignedUrl(signedUrl, file) {
  /**
   * Upload file directly to Google Cloud Storage via signed URL
   * Bypasses backend, reduces server load, and improves security
   */
  const response = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "image/jpeg",
    },
  })

  if (!response.ok) {
    throw new Error(`Upload to Cloud Storage failed: ${response.status}`)
  }
  return true
}

function getFallbackKey(classId, suffix) {
  return `${FALLBACK_PREFIX}:${classId}:${suffix}`
}

function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export async function registerStudent({ student_id, name, class_id, image }) {
  try {
    return await apiRequest(`/students/${encodeURIComponent(student_id)}/face`, {
      method: "POST",
      body: JSON.stringify({ name, class_id, image }),
    })
  } catch {
    const listKey = getFallbackKey(class_id, "students")
    const students = readJson(listKey, [])
    const student = {
      student_id,
      name,
      class_id,
      student_image_url: image,
      embedding: [],
      created_at: new Date().toISOString(),
    }
    const next = students.filter((s) => s.student_id !== student_id).concat(student)
    writeJson(listKey, next)
    return {
      message: "Student registered successfully (fallback mode)",
      student_id,
      class_id,
      fallback: true,
    }
  }
}

export async function listStudents(class_id) {
  try {
    const data = await apiRequest(`/classes/${encodeURIComponent(class_id)}/students`)
    return data.students || []
  } catch {
    return readJson(getFallbackKey(class_id, "students"), [])
  }
}

export async function processAttendance(class_id, { image, useSignedUrl = true, threshold = 0.78 }) {
  /**
   * Process attendance with two modes:
   * 1. Signed URL mode (production): 
   *    - Get signed URL from backend
   *    - Upload image directly to Cloud Storage
   *    - Backend processes asynchronously via Cloud Function
   *    - Return attendance_id for polling
   * 
   * 2. Base64 POST mode (fallback):
   *    - Send image as base64 in request body
   *    - Synchronous processing
   */
  
  if (useSignedUrl) {
    try {
      // Step 1: Get signed URL and attendance_id from backend
      const urlResponse = await apiRequest(
        `/classes/${encodeURIComponent(class_id)}/attendance/upload-url`,
        { method: "POST" }
      )
      const { upload_url, attendance_id } = urlResponse

      if (!upload_url || !attendance_id) {
        throw new Error("Invalid signed URL response")
      }

      // Step 2: Upload image to Cloud Storage via signed URL
      const blob = dataURLtoBlob(image)
      await uploadToSignedUrl(upload_url, blob)

      // Step 3: Return attendance_id for polling
      return {
        attendance_id,
        class_id,
        status: "processing",
        message: "Image uploaded. Processing in background...",
        created_at: new Date().toISOString(),
      }
    } catch (err) {
      // Fallback to base64 if signed URL fails
      console.warn("Signed URL upload failed, falling back to base64:", err.message)
      return processAttendanceBase64(class_id, image, threshold)
    }
  } else {
    return processAttendanceBase64(class_id, image, threshold)
  }
}

async function processAttendanceBase64(class_id, image, threshold) {
  /**
   * Legacy method: Send image as base64 in POST body
   * Used for fallback when Cloud Storage is unavailable
   */
  try {
    const data = await apiRequest(`/classes/${encodeURIComponent(class_id)}/attendance`, {
      method: "POST",
      body: JSON.stringify({ image, threshold }),
    })
    const key = getFallbackKey(class_id, "attendance")
    const sessions = readJson(key, [])
    writeJson(key, [data, ...sessions])
    return data
  } catch {
    // Local fallback
    const students = readJson(getFallbackKey(class_id, "students"), [])
    const attendance_id = crypto.randomUUID()
    const recognized = students
      .slice(0, Math.min(students.length, 8))
      .map((student, index) => ({
        student_id: student.student_id,
        name: student.name,
        confidence: Number((0.8 + index * 0.02).toFixed(4)),
        bounding_box: { x: 40 + index * 12, y: 50 + index * 8, w: 84, h: 108 },
        timestamp: new Date().toISOString(),
      }))

    const result = {
      attendance_id,
      class_id,
      status: "finished",
      recognized_students: recognized,
      present_count: recognized.length,
      total_faces: Math.max(recognized.length, 1),
      total_students: students.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fallback: true,
    }

    const key = getFallbackKey(class_id, "attendance")
    const sessions = readJson(key, [])
    writeJson(key, [result, ...sessions])
    return result
  }
}

export async function pollAttendanceStatus(attendance_id, class_id, maxWaitSeconds = 60) {
  /**
   * Poll for attendance processing status
   * Used when image is uploaded via signed URL (asynchronous processing)
   * Polls backend until status = "finished" or timeout
   */
  const startTime = Date.now()
  const maxWaitMs = maxWaitSeconds * 1000
  const pollIntervalMs = 2000 // Poll every 2 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await apiRequest(`/attendance/${encodeURIComponent(attendance_id)}`)
      
      if (result && result.status === "finished") {
        return result // Processing complete
      }

      if (result && result.status === "error") {
        throw new Error(result.error || "Processing failed")
      }

      // Still processing, wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    } catch (err) {
      // If API fails, try localStorage fallback
      const sessions = readJson(getFallbackKey(class_id, "attendance"), [])
      const result = sessions.find((s) => s.attendance_id === attendance_id)
      if (result && result.status === "finished") {
        return result
      }
      
      if (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      } else {
        throw new Error("Attendance processing timeout")
      }
    }
  }

  throw new Error(`Timeout waiting for attendance processing (${maxWaitSeconds}s)`)
}

function dataURLtoBlob(dataurl) {
  /**
   * Convert data URL (from canvas) to Blob for signed URL upload
   */
  const arr = dataurl.split(",")
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export async function getDashboardSummary(class_id) {
  try {
    return await apiRequest(`/dashboard/summary?class_id=${encodeURIComponent(class_id)}`)
  } catch {
    const students = readJson(getFallbackKey(class_id, "students"), [])
    const sessions = readJson(getFallbackKey(class_id, "attendance"), [])
    const expected = sessions.reduce((acc, s) => acc + (s.total_students || 0), 0)
    const present = sessions.reduce((acc, s) => acc + (s.present_count || 0), 0)
    const attendance_rate = expected ? Number(((present / expected) * 100).toFixed(2)) : 0

    return {
      class_id,
      total_students: students.length,
      session_count: sessions.length,
      attendance_rate,
      latest_sessions: sessions.slice(0, 5),
      trend: sessions.slice(0, 7).reverse().map((s) => ({
        attendance_id: s.attendance_id,
        created_at: s.created_at,
        rate: s.total_students ? Number(((s.present_count / s.total_students) * 100).toFixed(2)) : 0,
        present_count: s.present_count,
        total_students: s.total_students,
      })),
      fallback: true,
    }
  }
}

export async function getAttendance(attendance_id, class_id) {
  try {
    return await apiRequest(`/attendance/${encodeURIComponent(attendance_id)}`)
  } catch {
    const sessions = readJson(getFallbackKey(class_id, "attendance"), [])
    return sessions.find((s) => s.attendance_id === attendance_id) || null
  }
}
