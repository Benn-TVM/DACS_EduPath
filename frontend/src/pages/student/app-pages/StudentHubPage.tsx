import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons, RatingStars } from '../../../components/icons/font-awesome'
import { AppSidebar, AppTopbar } from '../student-layout'
import { useReviews } from '../hooks/useReviews'
import '../styles/student-hub.css'

export function StudentHubPage() {
  const [sortParam, setSortParam] = useState<'recent' | 'top'>('recent')
  const { reviews, isLoading, fetchReviews, toggleVote } = useReviews()

  useEffect(() => {
    void fetchReviews(sortParam)
  }, [sortParam, fetchReviews])

  function formatRelativeTime(dateString: string) {
    const d = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) return `Vừa xong`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`
  }

  return (
    <div className="hub-page">
      <AppSidebar active="hub" />

      <main className="hub-main">
        <AppTopbar />

        <div className="hub-content">
          <header className="hub-header">
            <h1><AppFaIcon icon={appIcons.community} /> Student Hub</h1>
            <p>Không gian trao đổi, đánh giá khóa học từ cộng đồng sinh viên.</p>
          </header>

          <div className="hub-filters">
            <div className="hub-sort-group">
              <button
                className={`hub-sort-btn ${sortParam === 'recent' ? 'active' : ''}`}
                onClick={() => setSortParam('recent')}
              >
                <AppFaIcon icon={appIcons.clock} /> Mới nhất
              </button>
              <button
                className={`hub-sort-btn ${sortParam === 'top' ? 'active' : ''}`}
                onClick={() => setSortParam('top')}
              >
                <AppFaIcon icon={appIcons.trend} /> Phổ biến
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="hub-loading">
              <div className="hub-loading__spinner" />
              <p>Đang tải dòng thời gian...</p>
            </div>
          ) : reviews.length > 0 ? (
            <div className="hub-feed">
              {reviews.map((review) => (
                <article key={review.id} className="hub-review-card">
                  <div className="hub-review-card__header">
                    <div className="hub-review-card__user">
                      <div className="hub-review-card__avatar">
                        {review.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="hub-review-card__meta">
                        <h4>{review.full_name}</h4>
                        <span>@{review.username} • {formatRelativeTime(review.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <Link to={`/courses/${review.course}`} className="hub-review-card__course">
                    <AppFaIcon icon={appIcons.course} /> {review.course_title}
                  </Link>

                  <div className="hub-review-card__rating">
                    <RatingStars rating={review.rating} />
                  </div>

                  <p className="hub-review-card__comment">{review.comment}</p>

                  <div className="hub-review-card__actions">
                    <button
                      className={`hub-vote-btn ${review.user_vote === 'up' ? 'is-active upvote' : ''}`}
                      onClick={() => void toggleVote(review.id, 'up')}
                    >
                      <AppFaIcon icon={appIcons.chevron} /> {review.upvotes} Hữu ích
                    </button>
                    <button
                      className={`hub-vote-btn ${review.user_vote === 'down' ? 'is-active downvote' : ''}`}
                      onClick={() => void toggleVote(review.id, 'down')}
                    >
                      <AppFaIcon icon={appIcons.prev} /> {review.downvotes}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="hub-empty">
              <h2>Chưa có đánh giá nào</h2>
              <p>Hãy là người đầu tiên chia sẻ cảm nhận về các khóa học bạn đã trải nghiệm!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
