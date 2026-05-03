import { useEffect, useState } from 'react'
import { AppFaIcon, appIcons, RatingStars } from '../../../components/icons/font-awesome'
import { useReviews } from '../hooks/useReviews'
import '../styles/student-hub.css'

export function CourseReviewSection({ courseId }: { courseId: number }) {
  const { reviews, isLoading, errorText, fetchReviews, submitReview, toggleVote } =
    useReviews(courseId)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState('')

  useEffect(() => {
    void fetchReviews('recent')
  }, [fetchReviews])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitSuccess('')
    try {
      await submitReview(courseId, rating, comment)
      setSubmitSuccess('Đánh giá của bạn đã được gửi thành công!')
      setComment('')
      setRating(5)
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false)
    }
  }

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
    <section className="course-detail-panel course-reviews-panel" style={{ marginTop: '2rem' }}>
      <div className="section-heading">
        <span />
        <h2>Cộng đồng đánh giá</h2>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{
            background: 'var(--color-surface)',
            padding: '1.25rem',
            borderRadius: '1rem',
            border: '1px solid rgba(226, 238, 244, 0.8)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Điểm số: {rating} / 5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', color: '#fbbf24', fontSize: '1.5rem', marginTop: '0.2rem' }}>
              <RatingStars rating={rating} />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <textarea
              placeholder="Chia sẻ cảm nhận của bạn về khóa học này, kiến thức học được..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(226, 238, 244, 0.9)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '999px',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isSubmitting || !comment.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !comment.trim() ? 0.6 : 1,
            }}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
          {submitSuccess && (
            <span style={{ marginLeft: '1rem', color: '#16a34a', fontSize: '0.85rem' }}>
              {submitSuccess}
            </span>
          )}
        </form>
      </div>

      <div className="hub-feed" style={{ marginTop: '1.5rem' }}>
        {isLoading ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Đang tải đánh giá...</p>
        ) : errorText ? (
          <p style={{ color: 'red', fontSize: '0.9rem' }}>{errorText}</p>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <article key={review.id} className="hub-review-card" style={{ padding: '1rem' }}>
              <div className="hub-review-card__header" style={{ marginBottom: '0.5rem' }}>
                <div className="hub-review-card__user">
                  <div className="hub-review-card__avatar" style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}>
                    {review.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hub-review-card__meta">
                    <h4>{review.full_name}</h4>
                    <span>@{review.username} • {formatRelativeTime(review.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="hub-review-card__rating" style={{ marginBottom: '0.5rem' }}>
                <RatingStars rating={review.rating} />
              </div>
              <p className="hub-review-card__comment">{review.comment}</p>
              <div className="hub-review-card__actions" style={{ paddingTop: '0.75rem' }}>
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
          ))
        ) : (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Khóa học chưa có đánh giá nào. Bạn hãy là người đầu tiên!
          </p>
        )}
      </div>
    </section>
  )
}
