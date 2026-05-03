import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { appTopbarAvatar } from '../student-core'
import { BrandMark } from '../student-layout'
import '../styles/profile-settings.css'

export function SettingsPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'personal' | 'notifications' | 'security'>('personal')
  const { user } = useCurrentUser({ silent: true })

  const displayName = useMemo(() => {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    return fullName || user?.username || 'Người học EduPath'
  }, [user])

  const personalRows = [
    { label: 'Họ và tên', value: displayName },
    { label: 'Tên người dùng', value: user?.username || 'Chưa cập nhật' },
    { label: 'Giới thiệu', value: 'Chưa cập nhật' },
    { label: 'Ảnh đại diện', value: 'Ảnh hồ sơ hiện tại', isAvatar: true },
  ]

  const socialRows = [
    'Trang web cá nhân',
    'GitHub',
    'LinkedIn',
    'Facebook',
    'YouTube',
    'Instagram',
    'Threads',
    'Twitter/X',
    'TikTok',
  ]

  const notificationRows = [
    { label: 'Thông báo khóa học mới', value: 'Đang bật' },
    { label: 'Nhắc lịch học qua email', value: 'Đang bật' },
    { label: 'Bản tin lộ trình hàng tuần', value: 'Đang tắt' },
  ]

  const securityRows = [
    { label: 'Mật khẩu', value: 'Cập nhật lần cuối 30 ngày trước' },
    { label: 'Thiết bị đăng nhập', value: '2 phiên đang hoạt động' },
    { label: 'Xác thực hai bước', value: 'Chưa bật' },
  ]

  return (
    <div className="settings-page">
      <button className="settings-close" type="button" onClick={() => navigate('/dashboard')}>
        <AppFaIcon icon={appIcons.close} />
      </button>

      <aside className="settings-sidebar">
        <div className="settings-sidebar__brand">
          <BrandMark to="/dashboard" variant="app" />
        </div>
        <h1>Cài đặt tài khoản</h1>
        <p>Thông tin cá nhân, thông báo qua email và bảo mật tài khoản.</p>

        <nav className="settings-nav" aria-label="Điều hướng cài đặt">
          <button
            type="button"
            className={activeSection === 'personal' ? 'is-active' : ''}
            onClick={() => setActiveSection('personal')}
          >
            <span><AppFaIcon icon={appIcons.profile} /></span>
            <span>Thông tin cá nhân</span>
          </button>
          <button
            type="button"
            className={activeSection === 'notifications' ? 'is-active' : ''}
            onClick={() => setActiveSection('notifications')}
          >
            <span><AppFaIcon icon={appIcons.notifications} /></span>
            <span>Thông báo qua email</span>
          </button>
          <button
            type="button"
            className={activeSection === 'security' ? 'is-active' : ''}
            onClick={() => setActiveSection('security')}
          >
            <span><AppFaIcon icon={appIcons.security} /></span>
            <span>Mật khẩu và bảo mật</span>
          </button>
        </nav>
      </aside>

      <main className="settings-main">
        {activeSection === 'personal' ? (
          <div className="settings-section">
            <header className="settings-section__head">
              <h2>Thông tin cá nhân</h2>
              <p>Quản lý thông tin cá nhân của bạn.</p>
            </header>

            <section className="settings-group">
              <div className="settings-group__intro">
                <h3>Thông tin cơ bản</h3>
                <p>Quản lý tên hiển thị, tên người dùng, tiểu sử và ảnh đại diện.</p>
              </div>

              <div className="settings-list">
                {personalRows.map((row) => (
                  <button key={row.label} type="button" className="settings-row">
                    <div className="settings-row__copy">
                      <strong>{row.label}</strong>
                      {row.isAvatar ? (
                        <div className="settings-row__avatar">
                          <img src={appTopbarAvatar} alt="Ảnh đại diện hiện tại" />
                        </div>
                      ) : (
                        <span>{row.value}</span>
                      )}
                    </div>
                    <AppFaIcon icon={appIcons.chevron} />
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-group">
              <div className="settings-group__intro">
                <h3>Thông tin mạng xã hội</h3>
                <p>Quản lý liên kết tới các trang mạng xã hội của bạn.</p>
              </div>

              <div className="settings-list">
                {socialRows.map((label) => (
                  <button key={label} type="button" className="settings-row">
                    <div className="settings-row__copy">
                      <strong>{label}</strong>
                      <span>Chưa cập nhật</span>
                    </div>
                    <AppFaIcon icon={appIcons.chevron} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeSection === 'notifications' ? (
          <div className="settings-section">
            <header className="settings-section__head">
              <h2>Thông báo qua email</h2>
              <p>Chọn những loại cập nhật bạn muốn nhận từ EduPath.</p>
            </header>

            <section className="settings-group">
              <div className="settings-list">
                {notificationRows.map((row) => (
                  <button key={row.label} type="button" className="settings-row">
                    <div className="settings-row__copy">
                      <strong>{row.label}</strong>
                      <span>{row.value}</span>
                    </div>
                    <AppFaIcon icon={appIcons.chevron} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeSection === 'security' ? (
          <div className="settings-section">
            <header className="settings-section__head">
              <h2>Mật khẩu và bảo mật</h2>
              <p>Quản lý truy cập tài khoản, phiên đăng nhập và bảo vệ hồ sơ của bạn.</p>
            </header>

            <section className="settings-group">
              <div className="settings-list">
                {securityRows.map((row) => (
                  <button key={row.label} type="button" className="settings-row">
                    <div className="settings-row__copy">
                      <strong>{row.label}</strong>
                      <span>{row.value}</span>
                    </div>
                    <AppFaIcon icon={appIcons.chevron} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
