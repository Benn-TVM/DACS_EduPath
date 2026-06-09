import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { appTopbarAvatar } from '../student-core'
import { useProfileData } from '../hooks/useProfileData'
import { DashboardWidgets } from './DashboardWidgets'
import {
  getProfileCompletion,
  getSkillLevelLabel,
  parseProfileItems,
} from '../student-core'
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
import api from '../../../services/api'
import '../styles/profile-settings.css'
import '../styles/dashboard-widgets.css'

export function ProfilePage() {
  const [topbarSearch, setTopbarSearch] = useState('')
  const { user, profile, savedCourses, loading, errorText, fetchProfile } = useProfileData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const displayName = useMemo(() => {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    return fullName || user?.username || 'Người học EduPath'
  }, [user])

  const avatarUrl = useMemo(() => {
    if (profile?.avatar) {
      // Nếu là URL tuyệt đối (từ backend), dùng luôn
      if (profile.avatar.startsWith('http')) return profile.avatar
      // Nếu là đường dẫn tương đối, ghép với MEDIA_URL (giả định ở localhost:8000)
      return `http://localhost:8000${profile.avatar}`
    }
    // Fallback mặc định
    return appTopbarAvatar
  }, [profile])

  const interests = parseProfileItems(profile?.interests ?? '')
  const learningNeeds = parseProfileItems(profile?.learning_needs ?? '')
  const completion = getProfileCompletion(profile)

  const handleAvatarClick = () => {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Giải phóng URL cũ nếu có
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveAvatar = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('avatar', selectedFile)

    try {
      setIsUploading(true)
      await api.put('auth/onboarding/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      // Refresh dữ liệu sau khi upload thành công
      await fetchProfile()
      handleCancelPreview()
    } catch (err) {
      console.error('Lỗi upload avatar:', err)
      alert('Không thể tải ảnh lên. Vui lòng thử lại.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="profile-page">
      <AppTopbar
        searchPlaceholder="Tìm kiếm khóa học..."
        searchValue={topbarSearch}
        onSearchChange={setTopbarSearch}
      />
      <AppSidebar active="profile" />
      <AppMobileNav active="profile" />

      <main className="profile-main">
        <div className="profile-shell">
          {errorText ? <p className="profile-status profile-status--error">{errorText}</p> : null}
          {loading || isUploading ? <p className="profile-status">Đang xử lý...</p> : null}

          <div className="profile-grid">
            <div className="profile-left">
              <section className="profile-card profile-card--identity">
                <div className="profile-card__identity-backdrop" />
                <div className="profile-card__identity-body">
                  <div className="profile-avatar-wrap">
                    <div className={`profile-avatar ${previewUrl ? 'is-preview' : ''}`}>
                      <img src={previewUrl || avatarUrl} alt={displayName} />
                    </div>

                    {!previewUrl ? (
                      <button type="button" onClick={handleAvatarClick} title="Đổi ảnh đại diện">
                        <AppFaIcon icon={appIcons.camera} />
                      </button>
                    ) : (
                      <div className="profile-avatar-actions">
                        <button
                          type="button"
                          className="btn-save"
                          onClick={handleSaveAvatar}
                          disabled={isUploading}
                          title="Lưu ảnh mới"
                        >
                          <AppFaIcon icon={appIcons.check} />
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={handleCancelPreview}
                          disabled={isUploading}
                          title="Hủy bỏ"
                        >
                          <AppFaIcon icon={appIcons.close} />
                        </button>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>

                  <h2>{displayName}</h2>
                  <p className="profile-subtitle">Tên đăng nhập: {user?.username || 'Đang cập nhật'}</p>

                  <div className="profile-contact-list">
                    <div>
                      <span><AppFaIcon icon={appIcons.email} /></span>
                      <span>{user?.email || 'Đang cập nhật'}</span>
                    </div>
                    <div>
                      <span><AppFaIcon icon={appIcons.home} /></span>
                      <span>SOICT MOOC x EduPath</span>
                    </div>
                    <div>
                      <span><AppFaIcon icon={appIcons.profile} /></span>
                      <span>{profile?.onboarding_completed ? 'Đã hoàn thành onboarding' : 'Chưa hoàn thành onboarding'}</span>
                    </div>
                  </div>
                </div>
              </section>

              <DashboardWidgets />
            </div>

            <div className="profile-right">
              <section className="profile-section">
                <div className="profile-section__head">
                  <h2>Hồ sơ học tập</h2>
                  <Link to="/onboarding">↻ Cập nhật thông tin học tập</Link>
                </div>

                <div className="profile-learning-grid">
                  <article className="learning-card learning-card--goal">
                    <div className="learning-card__head">
                      <div>
                        <p>Mục tiêu học tập</p>
                        <h3>{profile?.learning_goal || 'Bạn chưa thiết lập mục tiêu học tập.'}</h3>
                      </div>
                      <span><AppFaIcon icon={appIcons.target} /></span>
                    </div>
                    <p>
                      {profile?.learning_goal
                        ? `Hệ thống sẽ ưu tiên những khóa học phù hợp với mục tiêu: ${profile.learning_goal}.`
                        : 'Hãy cập nhật onboarding để hệ thống cá nhân hóa lộ trình học tập chính xác hơn.'}
                    </p>
                  </article>

                  <article className="learning-card">
                    <div className="learning-card__head">
                      <div>
                        <p>Trình độ hiện tại</p>
                        <h3>{getSkillLevelLabel(profile?.skill_level ?? '')}</h3>
                      </div>
                      <span><AppFaIcon icon={appIcons.trend} /></span>
                    </div>
                    <div className="learning-progress">
                      <div style={{ width: `${Math.max(completion, 10)}%` }} />
                    </div>
                    <small>{completion}% mức độ hoàn thiện hồ sơ học tập</small>
                  </article>

                  <article className="learning-card">
                    <div className="learning-card__head">
                      <div>
                        <p>Lĩnh vực quan tâm</p>
                      </div>
                      <span><AppFaIcon icon={appIcons.ai} /></span>
                    </div>
                    <div className="learning-tags">
                      {(interests.length ? interests : ['Chưa cập nhật']).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </article>

                  <article className="learning-card learning-card--full">
                    <div className="learning-card__head">
                      <div>
                        <p>Nhu cầu học tập</p>
                      </div>
                      <span><AppFaIcon icon={appIcons.checklist} /></span>
                    </div>
                    <div className="learning-tags">
                      {(learningNeeds.length ? learningNeeds : ['Chưa cập nhật']).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </article>
                </div>
              </section>

              <section className="profile-card profile-card--stats">
                <h3>Thống kê học tập</h3>
                <div className="profile-stats-grid">
                  <div>
                    <strong>{savedCourses.length}</strong>
                    <span>Khóa học đã lưu</span>
                  </div>
                  <div>
                    <strong>{completion}%</strong>
                    <span>Hoàn thành hồ sơ</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
