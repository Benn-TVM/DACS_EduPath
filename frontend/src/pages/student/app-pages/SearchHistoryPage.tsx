import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  getHistoryTags,
  normalizeText,
} from '../student-core'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
import '../styles/saved-history.css'

export function SearchHistoryPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const {
    historyItems,
    loading,
    isClearing,
    errorText,
    removeHistoryItem,
    clearHistoryItems,
  } = useSearchHistory()

  const visibleHistory = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim())
    if (!normalizedSearch) {
      return historyItems
    }

    return historyItems.filter((item) => normalizeText(item.query_text).includes(normalizedSearch))
  }, [historyItems, searchTerm])

  return (
    <div className="history-page">
      <AppSidebar active="history" />
      <AppMobileNav active="history" />
      <AppTopbar
        searchPlaceholder="Tìm kiếm trong lịch sử..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <main className="history-main">
        <div className="history-shell">
          <section className="history-header">
            <div>
              <h1>Lịch sử tìm kiếm</h1>
            </div>

            <button
              type="button"
              className="history-clear-button"
              disabled={!historyItems.length || isClearing}
              onClick={async () => {
                const shouldDelete = window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử tìm kiếm không?')
                if (!shouldDelete) {
                  return
                }

                await clearHistoryItems()
              }}
            >
              {isClearing ? 'Đang xóa...' : 'Xóa toàn bộ'}
            </button>
          </section>

          {errorText ? <p className="history-status history-status--error">{errorText}</p> : null}
          {loading ? <p className="history-status">Đang tải lịch sử tìm kiếm...</p> : null}

          {!loading && visibleHistory.length === 0 ? (
            <div className="history-empty">
              <h3>Chưa có lượt tìm kiếm phù hợp</h3>
              <p>
                {historyItems.length
                  ? 'Không có mục lịch sử nào khớp với từ khóa lọc hiện tại.'
                  : 'Bạn chưa có lịch sử tìm kiếm nào. Hãy bắt đầu từ dashboard hoặc trang tìm kiếm để hệ thống ghi nhớ các truy vấn gần đây.'}
              </p>
            </div>
          ) : null}

          <div className="history-list">
            {visibleHistory.map((item, index) => (
              <article key={item.id} className="history-card">
                <div className="history-card__index">{String(index + 1).padStart(2, '0')}</div>

                <div className="history-card__body">
                  <div className="history-card__meta">
                    <span>Truy vấn đã lưu</span>
                    <small>
                      {new Date(item.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(item.created_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>

                  <h2>{item.query_text}</h2>
                  <p>
                    Mở lại truy vấn này để xem nhanh các khóa học tương ứng và cập nhật thêm đề xuất
                    mới từ kho dữ liệu hiện tại.
                  </p>

                  <div className="history-card__tags">
                    {getHistoryTags(item.query_text).map((tag) => (
                      <span key={`${item.id}-${tag}`}>{tag}</span>
                    ))}
                  </div>

                  <div className="history-card__actions">
                    <div>
                      <button type="button" onClick={() => navigate(`/search?q=${encodeURIComponent(item.query_text)}`)}>
                        Tìm lại ngay
                      </button>
                      <button type="button" onClick={() => void removeHistoryItem(item.id)}>
                        <AppFaIcon icon={appIcons.delete} />
                      </button>
                    </div>

                    <div className="history-card__aside">
                      <span>
                        <AppFaIcon icon={appIcons.next} /> Mở lại kết quả tìm kiếm
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
