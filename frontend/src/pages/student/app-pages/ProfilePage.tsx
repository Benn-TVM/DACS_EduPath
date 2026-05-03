  import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { useProfileData } from '../hooks/useProfileData'
import { DashboardWidgets } from './DashboardWidgets'
import {
  formatCourseScore,
  getCourseVisual,
  getProfileCompletion,
  getSkillLevelLabel,
  parseProfileItems,
} from '../student-core'
import { AppSidebar, AppTopbar } from '../student-layout'
import '../styles/profile-settings.css'
import '../styles/dashboard-widgets.css'

export function ProfilePage() {
  const [topbarSearch, setTopbarSearch] = useState('')
  const { user, profile, savedCourses, recommendations, loading, errorText } = useProfileData()

  const displayName = useMemo(() => {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    return fullName || user?.username || 'Người học EduPath'
  }, [user])

  const interests = parseProfileItems(profile?.interests ?? '')
  const learningNeeds = parseProfileItems(profile?.learning_needs ?? '')
  const completion = getProfileCompletion(profile)
  const previewCourses = recommendations.slice(0, 2)

  return (
    <div className="profile-page">
      <AppTopbar
        searchPlaceholder="Tìm kiếm khóa học..."
        searchValue={topbarSearch}
        onSearchChange={setTopbarSearch}
      />
      <AppSidebar active="profile" />

      <main className="profile-main">
        <div className="profile-shell">
          <div className="profile-header">
            <div>
              <nav className="profile-breadcrumb">
                <span>Trang chủ</span>
                <i><AppFaIcon icon={appIcons.breadcrumb} /></i>
                <span className="is-active">Hồ sơ cá nhân</span>
              </nav>
              <h1>Hồ sơ cá nhân</h1>
            </div>

            <Link className="profile-edit-button" to="/onboarding">
              <AppFaIcon icon={appIcons.edit} /> Chỉnh sửa cơ bản
            </Link>
          </div>

          {errorText ? <p className="profile-status profile-status--error">{errorText}</p> : null}
          {loading ? <p className="profile-status">Đang tải dữ liệu hồ sơ...</p> : null}

          <DashboardWidgets />

          <div className="profile-grid">
            <div className="profile-left">
              <section className="profile-card profile-card--identity">
                <div className="profile-card__identity-backdrop" />
                <div className="profile-card__identity-body">
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar">
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaoL2jtbHPlBHIHw6p-ZaADzXseSHbGEpPCIF9FsELgiImoaJOak5JK2zwmjrUzNWto-pj1fhqncdpWqdtNxJggFEu4nY2tEbWBPb-aij51jaG7fO8UtVfILT2G2q9gzA9WcvQqRUZAUQitk84nwrsXYNIQoGJLfXGGh3aR-TMcxeV3jv8KlTLaQU5QNMnSlnZ4aFFz63wUp-oTTTAvXx61pdv7SukSpmG2_q0bou4ZkJRyL27yUOzMndQpsNcSSCrnub_x0vxK7qx"
                        alt={displayName}
                      />
                    </div>
                    <button type="button"><AppFaIcon icon={appIcons.saved} /></button>
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

                  <article className="learning-card">
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

              <section className="profile-section">
                <div className="profile-section__head">
                  <h2>Khóa học gợi ý cho bạn</h2>
                  <Link to="/dashboard">Xem tất cả</Link>
                </div>

                <div className="profile-recommendations">
                  {(previewCourses.length ? previewCourses : savedCourses.slice(0, 2).map((item) => item.course)).map(
                    (course, index) => (
                      <Link key={course.id} className="profile-course-preview" to={`/courses/${course.id}`}>
                        <div className="profile-course-preview__thumb">
                          <img src={getCourseVisual(index, course)} alt={course.title} />
                        </div>
                        <div>
                          <h4>{course.title}</h4>
                          <p>
                            {course.provider}
                            {course.course_code ? ` • ${course.course_code}` : ''}
                          </p>
                          <div className="profile-course-preview__score">
                            <span><AppFaIcon icon={appIcons.star} /></span>
                            <strong>{formatCourseScore(course)}</strong>
                          </div>
                        </div>
                      </Link>
                    ),
                  )}

                  {!previewCourses.length && !savedCourses.length ? (
                    <div className="profile-empty-card">
                      Chưa có dữ liệu gợi ý. Hãy hoàn thành onboarding để nhận đề xuất cá nhân hóa.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <nav className="profile-mobile-nav">
        <Link to="/dashboard">
          <span><AppFaIcon icon={appIcons.dashboard} /></span>
          <small>Trang chủ</small>
        </Link>
        <Link to="/saved-courses">
          <span><AppFaIcon icon={appIcons.saved} /></span>
          <small>Đã lưu</small>
        </Link>
        <Link className="is-active" to="/profile">
          <span><AppFaIcon icon={appIcons.profile} /></span>
          <small>Hồ sơ</small>
        </Link>
      </nav>
    </div>
  )
}
