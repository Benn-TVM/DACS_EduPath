import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { extractFirstMessage } from '../student-core'
import { submitOnboardingProfile } from '../services/student-api'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const totalSteps = 4

  const [formData, setFormData] = useState({
    occupation: '',
    goal: '',
    level: '',
    interest: '',
  })
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleNextStep() {
    if (step < totalSteps) {
      setStep(step + 1)
      setSubmitError('')
    } else {
      submitForm()
    }
  }

  function handlePrevStep() {
    if (step > 0) {
      setStep(step - 1)
      setSubmitError('')
    }
  }

  function selectOptionAndNext(field: keyof typeof formData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setTimeout(() => {
      if (step < totalSteps) {
        setStep(step + 1)
      } else {
        submitForm({ ...formData, [field]: value })
      }
    }, 300)
  }

  async function submitForm(dataToSubmit = formData) {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      await submitOnboardingProfile({
        skill_level: dataToSubmit.level || 'beginner',
        learning_goal: dataToSubmit.goal || 'Khác',
        interests: dataToSubmit.interest || 'Chưa xác định',
        learning_needs: dataToSubmit.occupation || 'Không xác định',
      })

      navigate('/dashboard')
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
        const detailError =
          extractFirstMessage(responseData.detail) ||
          extractFirstMessage(responseData.skill_level) ||
          extractFirstMessage(responseData.learning_goal) ||
          extractFirstMessage(responseData.interests) ||
          extractFirstMessage(responseData.learning_needs)

        setSubmitError(detailError || 'Không thể lưu hồ sơ. Vui lòng thử lại.')
      } else {
        setSubmitError('Không thể kết nối tới máy chủ. Vui lòng thử lại.')
      }
      setIsSubmitting(false)
    }
  }

  // Generic illustration placeholder since we don't have the exact image
  const renderIllustration = () => (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: '300px', 
        height: '300px', 
        backgroundColor: '#f0f4f8', 
        borderRadius: '50%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        fontSize: '6rem',
        color: 'var(--color-primary)'
      }}>
        <AppFaIcon icon={step === 0 ? appIcons.roadmap : step === 1 ? appIcons.profile : step === 2 ? appIcons.target : step === 3 ? appIcons.keyboard : appIcons.ai} />
      </div>
    </div>
  )

  const optionButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    width: '100%',
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--color-surface-soft)',
    border: '2px solid transparent',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-text-primary)'
  }

  const getOptionStyle = (isSelected: boolean) => ({
    ...optionButtonStyle,
    backgroundColor: isSelected ? 'var(--color-primary-soft)' : 'var(--color-surface-soft)',
    border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)'
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
      
      {/* Topbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 3rem', alignItems: 'center' }}>
        {step > 0 ? (
          <button onClick={handlePrevStep} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
            <AppFaIcon icon={appIcons.back} />
          </button>
        ) : (
          <div /> // Spacer
        )}
        <Link to="/logout" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          Đăng xuất
        </Link>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ display: 'flex', maxWidth: '900px', width: '100%', gap: '4rem', alignItems: 'center' }}>
          
          {/* Left Column: Illustration */}
          {renderIllustration()}

          {/* Right Column: Content */}
          <div style={{ flex: 1, animation: 'fade-in 0.4s ease' }}>
            
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900 }}>
                  Xin chào, <span style={{ color: 'var(--color-primary)' }}>Bạn mới!</span>
                </h1>
                <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Chào mừng bạn đã gia nhập EduPath, chúng mình có sứ mệnh giúp bạn học lập trình hiệu quả, dễ dàng và sát với thực tế!
                </p>
                <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Để hệ thống có thể tư vấn lộ trình học tập phù hợp nhất, hãy dành ít phút chia sẻ về mục tiêu của bạn nhé!
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    onClick={handleNextStep}
                    style={{ 
                      backgroundColor: 'var(--color-primary)', 
                      color: 'var(--color-text-inverse)', 
                      border: 'none', 
                      padding: '0.8rem 2rem', 
                      borderRadius: '999px',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-medium)'
                    }}
                  >
                    Bắt đầu khám phá
                  </button>
                  <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', paddingLeft: '1rem' }}>
                    Bỏ qua và tới lộ trình học
                  </Link>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>Nghề nghiệp hiện tại của bạn?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button style={getOptionStyle(formData.occupation === 'Sinh viên')} onClick={() => selectOptionAndNext('occupation', 'Sinh viên')}>
                    <span style={{ color: 'var(--color-primary)', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.trend} /></span>
                    Sinh viên
                  </button>
                  <button style={getOptionStyle(formData.occupation === 'Người đi làm')} onClick={() => selectOptionAndNext('occupation', 'Người đi làm')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.keyboard} /></span>
                    Người đi làm
                  </button>
                  <button style={getOptionStyle(formData.occupation === 'Khác')} onClick={() => selectOptionAndNext('occupation', 'Khác')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.menu} /></span>
                    Khác
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>Mục tiêu học tập của bạn?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button style={getOptionStyle(formData.goal === 'Học để đi làm')} onClick={() => selectOptionAndNext('goal', 'Học để đi làm')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.roadmap} /></span>
                    Học để đi làm
                  </button>
                  <button style={getOptionStyle(formData.goal === 'Chuyển ngành')} onClick={() => selectOptionAndNext('goal', 'Chuyển ngành')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.target} /></span>
                    Chuyển ngành
                  </button>
                  <button style={getOptionStyle(formData.goal === 'Khám phá')} onClick={() => selectOptionAndNext('goal', 'Khám phá')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.heart} /></span>
                    Khám phá đam mê
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>Bạn đã biết lập trình chưa?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button style={getOptionStyle(formData.level === 'beginner')} onClick={() => selectOptionAndNext('level', 'beginner')}>
                    <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>🥚</span>
                    Chưa biết gì (Học từ con số 0)
                  </button>
                  <button style={getOptionStyle(formData.level === 'intermediate')} onClick={() => selectOptionAndNext('level', 'intermediate')}>
                    <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>💻</span>
                    Đã biết cơ bản
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800 }}>Bạn quan tâm lĩnh vực nào nhất?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button style={getOptionStyle(formData.interest === 'Front-end')} onClick={() => selectOptionAndNext('interest', 'Front-end')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.desktop} /></span>
                    Web Front-end
                  </button>
                  <button style={getOptionStyle(formData.interest === 'Back-end')} onClick={() => selectOptionAndNext('interest', 'Back-end')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.database} /></span>
                    Web Back-end
                  </button>
                  <button style={getOptionStyle(formData.interest === 'Data & AI')} onClick={() => selectOptionAndNext('interest', 'Data & AI')}>
                    <span style={{ color: '#f05123', width: '24px', textAlign: 'center' }}><AppFaIcon icon={appIcons.ai} /></span>
                    Dữ liệu &amp; Trí tuệ nhân tạo
                  </button>
                </div>
                {isSubmitting && <p style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Đang lưu hồ sơ...</p>}
                {submitError && <p style={{ color: 'var(--color-error)' }}>{submitError}</p>}
              </div>
            )}

          </div>
        </div>
      </main>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboarding-page {
          /* Overriding the global layout to ensure clean background */
          background: var(--color-surface) !important;
        }
      `}</style>
    </div>
  )
}
