import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerStudent } from '../services/student-api'
import '../styles/auth-modal.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const derivedUsername = useMemo(() => formData.email.trim().toLowerCase(), [formData.email])

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

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSubmitError('')
  }

  function splitFullName(fullName: string) {
    const normalizedName = fullName.trim().replace(/\s+/g, ' ')
    if (!normalizedName) return { first_name: '', last_name: '' }
    const parts = normalizedName.split(' ')
    if (parts.length === 1) return { first_name: parts[0], last_name: '' }
    return { first_name: parts.slice(0, -1).join(' '), last_name: parts.at(-1) ?? '' }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (!formData.fullName.trim()) nextErrors.fullName = 'Họ tên là bắt buộc.'
    if (!formData.email.trim()) nextErrors.email = 'Email là bắt buộc.'
    if (!formData.password) nextErrors.password = 'Mật khẩu là bắt buộc.'
    if (!formData.passwordConfirm) nextErrors.passwordConfirm = 'Xác nhận mật khẩu là bắt buộc.'
    if (formData.password && formData.passwordConfirm && formData.password !== formData.passwordConfirm) {
      nextErrors.passwordConfirm = 'Mật khẩu xác nhận không khớp.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const nameParts = splitFullName(formData.fullName)
      await registerStudent({
        username: derivedUsername,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password_confirm: formData.passwordConfirm,
        first_name: nameParts.first_name,
        last_name: nameParts.last_name,
      })

      navigate('/onboarding')
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

        const passwordError = Array.isArray(responseData.password) ? responseData.password[0] : responseData.password
        const passwordConfirmError = Array.isArray(responseData.password_confirm) ? responseData.password_confirm[0] : responseData.password_confirm
        const emailError = Array.isArray(responseData.email) ? responseData.email[0] : responseData.email
        const usernameError = Array.isArray(responseData.username) ? responseData.username[0] : responseData.username
        const nonFieldError = Array.isArray(responseData.non_field_errors) ? responseData.non_field_errors[0] : responseData.non_field_errors

        if (typeof emailError === 'string') apiErrors.email = emailError
        if (typeof passwordError === 'string') apiErrors.password = passwordError
        if (typeof passwordConfirmError === 'string') apiErrors.passwordConfirm = passwordConfirmError
        if (typeof usernameError === 'string') apiErrors.email = usernameError

        setErrors(apiErrors)
        if (typeof nonFieldError === 'string') {
          setSubmitError(nonFieldError)
        } else if (Object.keys(apiErrors).length === 0) {
          setSubmitError('Đăng ký không thành công. Vui lòng thử lại.')
        }
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

        <h1 className="auth-title">Đăng ký tài khoản EduPath</h1>

        <div className="auth-actions">
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="auth-input-group">
              <input
                className="auth-input"
                type="text"
                placeholder="Họ và tên"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                autoFocus
              />
              {errors.fullName && <p className="auth-input-error">{errors.fullName}</p>}
            </div>

            <div className="auth-input-group">
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              {errors.email && <p className="auth-input-error">{errors.email}</p>}
            </div>

            <div className="auth-input-group">
              <input
                className="auth-input"
                type="password"
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
              {errors.password && <p className="auth-input-error">{errors.password}</p>}
            </div>

            <div className="auth-input-group">
              <input
                className="auth-input"
                type="password"
                placeholder="Xác nhận mật khẩu"
                value={formData.passwordConfirm}
                onChange={(e) => updateField('passwordConfirm', e.target.value)}
              />
              {errors.passwordConfirm && <p className="auth-input-error">{errors.passwordConfirm}</p>}
            </div>

            {submitError && <p className="auth-error-global">{submitError}</p>}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <p>
            Bạn đã có tài khoản?{' '}
            <Link to="/login" className="auth-footer-link">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
