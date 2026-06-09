import { Fragment, useEffect, useMemo, useState } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { fetchRecommendationLogs, type RecommendationLogRow } from '../services/admin-api'

type LogContextFilter = 'all' | 'dashboard' | 'search'
type ScoreFilter = 'all' | 'high' | 'low' | 'missing'

export function RecommendationLogsPage() {
  const [logs, setLogs] = useState<RecommendationLogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState('')
  const [contextFilter, setContextFilter] = useState<LogContextFilter>('all')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

  useEffect(() => {
    fetchRecommendationLogs()
      .then((data) => {
        setLogs(data)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  const filteredLogs = useMemo(() => {
    const q = filterUser.trim().toLowerCase()

    return logs.filter((log) => {
      const matchesUser = !q || log.user.toLowerCase().includes(q)
      const matchesContext = contextFilter === 'all' || log.context === contextFilter
      const matchesScore =
        scoreFilter === 'all' ||
        (scoreFilter === 'high' && log.score_avg !== null && log.score_avg >= 0.15) ||
        (scoreFilter === 'low' && log.score_avg !== null && log.score_avg < 0.15) ||
        (scoreFilter === 'missing' && log.score_avg === null)

      return matchesUser && matchesContext && matchesScore
    })
  }, [contextFilter, filterUser, logs, scoreFilter])

  const stats = useMemo(() => {
    const scoredLogs = logs.filter((log) => log.score_avg !== null)
    const avgScore = scoredLogs.length > 0
      ? scoredLogs.reduce((sum, log) => sum + Number(log.score_avg), 0) / scoredLogs.length
      : null
    const dashboardLogs = logs.filter((log) => log.context === 'dashboard').length
    const searchLogs = logs.filter((log) => log.context === 'search').length

    return { avgScore, dashboardLogs, searchLogs, scoredLogs: scoredLogs.length }
  }, [logs])

  function formatDate(dateStr: string) {
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(new Date(dateStr))
    } catch {
      return dateStr
    }
  }

  function getContextLabel(context: string) {
    if (context === 'dashboard') return 'Dashboard'
    if (context === 'search') return 'Tìm kiếm'
    return context
  }

  return (
    <div className="admin-reveal">
      <section className="admin-mini-metrics admin-reveal" aria-label="Tổng quan log gợi ý">
        <article>
          <span>Tổng phiên</span>
          <strong>{logs.length.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Dashboard</span>
          <strong>{stats.dashboardLogs.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Tìm kiếm</span>
          <strong>{stats.searchLogs.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Điểm TB</span>
          <strong>{stats.avgScore !== null ? `${(stats.avgScore * 100).toFixed(1)}%` : '—'}</strong>
        </article>
      </section>

      <section className="admin-alert-card admin-reveal" style={{ marginBottom: '0' }}>
        <h2>Trạng thái Model AI</h2>
        <div className="admin-alert-card__list">
          <article>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <strong>Thuật toán: Content-Based Filtering</strong>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem' }}>Sử dụng TF-IDF và Cosine Similarity trên metadata khóa học.</p>
              </div>
              <span className="admin-status-chip" style={{ color: '#fff', background: 'rgba(255,255,255,0.2)' }}>Đang hoạt động</span>
            </div>
          </article>
          <article>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Log có điểm tin cậy</span>
              <strong>{stats.scoredLogs}/{logs.length}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-reveal">
        <div className="admin-panel__head admin-panel__head--stack">
          <div>
            <h2 className="admin-panel__title">Nhật ký Gợi ý ({filteredLogs.length})</h2>
            <p>Danh sách hiện lấy tối đa 100 log gần nhất từ backend.</p>
          </div>
          <div className="admin-filter-bar admin-filter-bar--logs">
            <div className="admin-toolbar__search">
              <AppFaIcon icon={appIcons.search} />
              <input
                type="text"
                placeholder="Lọc theo username..."
                value={filterUser}
                onChange={(event) => setFilterUser(event.target.value)}
              />
            </div>
            <select value={contextFilter} onChange={(event) => setContextFilter(event.target.value as LogContextFilter)} aria-label="Lọc ngữ cảnh">
              <option value="all">Mọi ngữ cảnh</option>
              <option value="dashboard">Dashboard</option>
              <option value="search">Tìm kiếm</option>
            </select>
            <select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value as ScoreFilter)} aria-label="Lọc điểm">
              <option value="all">Mọi điểm</option>
              <option value="high">Điểm tốt</option>
              <option value="low">Điểm thấp</option>
              <option value="missing">Chưa có điểm</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-empty-state">Đang tải nhật ký gợi ý...</div>
        ) : error ? (
          <div className="admin-empty-state is-error">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="admin-empty-state">
            {filterUser || contextFilter !== 'all' || scoreFilter !== 'all'
              ? 'Không tìm thấy log phù hợp với bộ lọc.'
              : 'Chưa có dữ liệu log nào. Khi người dùng truy cập Dashboard hoặc tìm kiếm, hệ thống sẽ ghi nhận log tại đây.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>User</th>
                  <th>Ngữ cảnh</th>
                  <th>Khóa học được gợi ý</th>
                  <th>Điểm tin cậy</th>
                  <th aria-label="Mở rộng" />
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <Fragment key={log.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedLogId((prev) => (prev === log.id ? null : log.id))}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                      <td><strong>{log.user}</strong></td>
                      <td>
                        <span className={`admin-pill ${log.context === 'dashboard' ? 'admin-pill--category' : 'admin-pill--tag'}`}>
                          {getContextLabel(log.context)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-tag-list">
                          {log.recommended_courses.slice(0, 3).map((title, index) => (
                            <span key={`${log.id}-${title}-${index}`} className="admin-pill admin-pill--tag">{title}</span>
                          ))}
                          {log.recommended_courses.length > 3 && <span className="admin-table-muted">+{log.recommended_courses.length - 3}</span>}
                          {log.recommended_courses.length === 0 && <span className="admin-table-muted">Không có kết quả</span>}
                        </div>
                      </td>
                      <td>
                        {log.score_avg !== null ? (
                          <span className={`admin-status-chip ${log.score_avg >= 0.15 ? 'is-mint' : 'is-amber'}`}>
                            {(log.score_avg * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="admin-table-muted">Chưa có</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          aria-label="Mở chi tiết log"
                          style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', transform: expandedLogId === log.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                        >
                          <AppFaIcon icon={appIcons.chevronDown} />
                        </button>
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className="admin-inline-detail">
                            <div>
                              <div className="admin-inline-detail__label">Truy vấn</div>
                              <div className="admin-inline-detail__body is-muted">{log.query_text || 'Không có query text.'}</div>
                            </div>
                            <div>
                              <div className="admin-inline-detail__label">Course IDs</div>
                              <div className="admin-inline-detail__body">{log.recommended_course_ids.length > 0 ? log.recommended_course_ids.join(', ') : 'Không có'}</div>
                            </div>
                            <div>
                              <div className="admin-inline-detail__label">Số kết quả</div>
                              <div className="admin-inline-detail__body">{log.result_count}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
