import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { extractFirstMessage } from '../student-core'
import { loginStudent } from '../services/student-api'
import { isAdminUser } from '../../../services/api'
import '../styles/auth-modal.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
    document.body.classList.add('auth-modal-open')
    return () => {
      document.body.classList.remove('auth-modal-open')
      document.documentElement.style.removeProperty('--scrollbar-width')
    }
  }, [])

  function closeModal() {
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  function updateField(field: keyof typeof credentials, value: string) {
    setCredentials((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSubmitError('')
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (!credentials.email.trim()) nextErrors.email = 'Email là bắt buộc.'
    if (!credentials.password) nextErrors.password = 'Mật khẩu là bắt buộc.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const data = await loginStudent({
        username: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      })

      if (data.user && isAdminUser(data.user)) {
        navigate('/admin')
        return
      }

      const nextPath = searchParams.get('next')
      navigate(nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard')
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null
      ) {
        const responseData = error.response.data as Record<string, unknown>
        const apiErrors: Record<string, string> = {}

        const usernameError = extractFirstMessage(responseData.username)
        const passwordError = extractFirstMessage(responseData.password)
        const detailError = extractFirstMessage(responseData.detail)

        if (usernameError) apiErrors.email = usernameError
        if (passwordError) apiErrors.password = passwordError

        setErrors(apiErrors)
        setSubmitError(detailError || 'Đăng nhập không thành công. Vui lòng thử lại.')
      } else {
        setSubmitError('Không thể kết nối tới máy chủ. Vui lòng thử lại.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="auth-card">
        <button className="auth-close" onClick={closeModal} aria-label="Đóng">✕</button>

        <h1 className="auth-title">Đăng nhập vào EduPath</h1>

        <div className="auth-actions">
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-input-group">
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={credentials.email}
                onChange={(e) => updateField('email', e.target.value)}
                autoFocus
              />
              {errors.email && <p className="auth-input-error">{errors.email}</p>}
            </div>

            <div className="auth-input-group">
              <input
                className="auth-input"
                type="password"
                placeholder="Mật khẩu"
                value={credentials.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
              {errors.password && <p className="auth-input-error">{errors.password}</p>}
            </div>

            {submitError && <p className="auth-error-global">{submitError}</p>}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <p>
            Bạn chưa có tài khoản?{' '}
            <Link to="/register" className="auth-footer-link">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
