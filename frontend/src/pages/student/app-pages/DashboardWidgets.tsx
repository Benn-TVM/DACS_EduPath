import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import api, { hasAuthSession } from '../../../services/api'

interface RoadmapProgress {
  roadmap_id: number
  title: string
  target_role: string
  total_steps: number
  completed_steps: number
  progress_percent: number
}

interface DashboardStats {
  roadmap_progress: RoadmapProgress | null
  achieved_skills: string[]
  all_target_skills: string[]
  stats_summary: {
    total_roadmaps: number
    total_saved: number
  }
}

export function DashboardWidgets() {
  const isAuthenticated = hasAuthSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<DashboardStats>('dashboard/stats/')
      setStats(response.data)
    } catch {
      /* silently ignore — widgets are optional enhancements */
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    void fetchStats()
  }, [fetchStats, isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <section className="dw-section">
        <div className="dw-loading">
          <div className="dw-loading__dot" />
          <div className="dw-loading__dot" />
          <div className="dw-loading__dot" />
        </div>
      </section>
    )
  }

  if (!stats) return null

  return (
    <section className="dw-section">
      <div className="dw-grid dw-grid--roadmap-only">
        <RoadmapProgressWidget progress={stats.roadmap_progress} />
      </div>
    </section>
  )
}

function RoadmapProgressWidget({ progress }: { progress: RoadmapProgress | null }) {
  if (!progress) {
    return (
      <article className="dw-card dw-card--progress">
        <div className="dw-card__icon dw-card__icon--blue"><AppFaIcon icon={appIcons.roadmap} /></div>
        <h3>Tiến độ lộ trình</h3>
        <p className="dw-card__empty">Bạn chưa tạo lộ trình nào.</p>
        <Link to="/roadmap" className="dw-card__action">
          <AppFaIcon icon={appIcons.plus} /> Tạo lộ trình AI đầu tiên
        </Link>
      </article>
    )
  }

  const circumference = 2 * Math.PI * 42
  const offset = circumference - (progress.progress_percent / 100) * circumference

  return (
    <article className="dw-card dw-card--progress">
      <div className="dw-card__icon dw-card__icon--blue"><AppFaIcon icon={appIcons.roadmap} /></div>
      <h3>Tiến độ lộ trình</h3>
      <p className="dw-card__subtitle">{progress.title}</p>

      <div className="dw-progress-ring">
        <svg viewBox="0 0 100 100" className="dw-progress-ring__svg">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(99, 102, 241, 0.12)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            className="dw-progress-ring__value"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        <div className="dw-progress-ring__label">
          <strong>{progress.progress_percent}%</strong>
          <span>hoàn thành</span>
        </div>
      </div>

      <div className="dw-progress-meta">
        <span>
          {progress.completed_steps}/{progress.total_steps} bước
        </span>
        <span><AppFaIcon icon={appIcons.target} /> {progress.target_role || 'Đang phân tích'}</span>
      </div>

      <Link to="/roadmap" className="dw-card__action">
        Xem chi tiết lộ trình <AppFaIcon icon={appIcons.next} />
      </Link>
    </article>
  )
}

export function SkillsWidget({
  achievedSkills,
  targetSkills,
}: {
  achievedSkills: string[]
  targetSkills: string[]
}) {
  const pendingSkills = targetSkills.filter(
    (skill) => !achievedSkills.includes(skill),
  )

  return (
    <article className="dw-card dw-card--skills">
      <div className="dw-card__icon dw-card__icon--green"><AppFaIcon icon={appIcons.skills} /></div>
      <h3>Kỹ năng</h3>

      {achievedSkills.length > 0 ? (
        <div className="dw-skills-group">
          <span className="dw-skills-group__label dw-skills-group__label--done">
            <AppFaIcon icon={appIcons.check} /> Đã đạt ({achievedSkills.length})
          </span>
          <div className="dw-skills-tags">
            {achievedSkills.map((skill) => (
              <span key={skill} className="dw-skill-tag dw-skill-tag--done">
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {pendingSkills.length > 0 ? (
        <div className="dw-skills-group">
          <span className="dw-skills-group__label dw-skills-group__label--pending">
            <AppFaIcon icon={appIcons.clock} /> Đang học ({pendingSkills.length})
          </span>
          <div className="dw-skills-tags">
            {pendingSkills.slice(0, 8).map((skill) => (
              <span key={skill} className="dw-skill-tag dw-skill-tag--pending">
                {skill}
              </span>
            ))}
            {pendingSkills.length > 8 ? (
              <span className="dw-skill-tag dw-skill-tag--more">
                +{pendingSkills.length - 8}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {achievedSkills.length === 0 && targetSkills.length === 0 ? (
        <p className="dw-card__empty">
          Tạo lộ trình AI để bắt đầu theo dõi kỹ năng.
        </p>
      ) : null}
    </article>
  )
}

export function QuickStatsWidget({
  summary,
}: {
  summary: { total_roadmaps: number; total_saved: number }
}) {
  return (
    <article className="dw-card dw-card--quick">
      <div className="dw-card__icon dw-card__icon--purple"><AppFaIcon icon={appIcons.trend} /></div>
      <h3>Thống kê nhanh</h3>

      <div className="dw-quick-stats">
        <div className="dw-quick-stat">
          <strong>{summary.total_roadmaps}</strong>
          <span>Lộ trình đã tạo</span>
        </div>
        <div className="dw-quick-stat">
          <strong>{summary.total_saved}</strong>
          <span>Khóa học đã lưu</span>
        </div>
      </div>

      <div className="dw-weekly-tip">
        <div className="dw-weekly-tip__icon"><AppFaIcon icon={appIcons.flask} /></div>
        <div>
          <strong>Mẹo tuần này</strong>
          <p>
            Hoàn thành ít nhất 1 bước trong lộ trình mỗi tuần để duy trì đà học tập!
          </p>
        </div>
      </div>
    </article>
  )
}
