import { useState } from 'react'
import { AdminPageHeader } from '../admin-layout'

export function SettingsPage() {
  const [settings, setSettings] = useState({
    onboardingReminder: true,
    moderationQueue: true,
    weeklyDigest: false,
    profileSync: true,
  })

  function toggleSetting(key: keyof typeof settings) {
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <>
      <AdminPageHeader
        title="Cài đặt vận hành"
      />
      <section className="admin-layout-grid admin-layout-grid--settings">
        <article className="admin-panel admin-reveal">
          <div className="admin-panel__head">
            <div>
              <h2>Tự động hóa</h2>
              <p>Bật hoặc tắt các luồng nhắc nhở và điều phối nền.</p>
            </div>
          </div>
          <div className="admin-setting-list">
            <button type="button" onClick={() => toggleSetting('onboardingReminder')}>
              <div>
                <strong>Nhắc hoàn thành onboarding</strong>
                <span>Gửi nhắc nhở tới người dùng chưa hoàn thiện hồ sơ.</span>
              </div>
              <span className={`admin-toggle ${settings.onboardingReminder ? 'is-on' : ''}`} />
            </button>
            <button type="button" onClick={() => toggleSetting('moderationQueue')}>
              <div>
                <strong>Ưu tiên hàng chờ kiểm duyệt</strong>
                <span>Đẩy các khóa mới từ giảng viên SOICT lên đầu danh sách.</span>
              </div>
              <span className={`admin-toggle ${settings.moderationQueue ? 'is-on' : ''}`} />
            </button>
            <button type="button" onClick={() => toggleSetting('weeklyDigest')}>
              <div>
                <strong>Báo cáo vận hành hàng tuần</strong>
                <span>Gửi email tóm tắt chỉ số cho nhóm phụ trách nội dung.</span>
              </div>
              <span className={`admin-toggle ${settings.weeklyDigest ? 'is-on' : ''}`} />
            </button>
            <button type="button" onClick={() => toggleSetting('profileSync')}>
              <div>
                <strong>Đồng bộ hồ sơ cá nhân</strong>
                <span>Làm mới dữ liệu người dùng trước khi chạy đề xuất định kỳ.</span>
              </div>
              <span className={`admin-toggle ${settings.profileSync ? 'is-on' : ''}`} />
            </button>
          </div>
        </article>
        <article className="admin-panel admin-panel--accent admin-reveal">
          <span>Trạng thái tích hợp</span>
          <h2>Settings API chưa được backend cung cấp.</h2>
          <p>Frontend đã được tách theo từng key cài đặt để khi có endpoint chỉ cần thay state local bằng fetch và save từ API.</p>
        </article>
      </section>
    </>
  )
}
