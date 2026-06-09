import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
import { usePosts } from '../hooks/usePosts'
import { getAuthUser } from '../../../services/api'
import { appTopbarAvatar } from '../student-core'
import '../styles/student-hub.css'

export function StudentHubPage() {
  const currentUser = getAuthUser()
  const displayName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ').trim() || currentUser.username
    : 'Người dùng EduPath'
  const avatarUrl = currentUser?.profile?.avatar
    ? currentUser.profile.avatar.startsWith('http')
      ? currentUser.profile.avatar
      : `http://localhost:8000${currentUser.profile.avatar}`
    : appTopbarAvatar

  const [sortParam, setSortParam] = useState<'recent' | 'top'>('recent')
  const { posts, isLoading, fetchPosts, toggleVote, submitPost, submitComment, editComment, deleteComment, fetchMoreComments, deletePost } = usePosts()
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({})
  const [submittingReplyId, setSubmittingReplyId] = useState<number | null>(null)
  const [loadingMoreRepliesId, setLoadingMoreRepliesId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editCommentContent, setEditCommentContent] = useState<string>('')

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNewPostTitle('')
    setNewPostContent('')
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return
    try {
      await deletePost(postId)
    } catch {
      alert('Không thể xóa bài viết. Vui lòng thử lại sau.')
    }
  }

  useEffect(() => {
    void fetchPosts(sortParam)
  }, [sortParam, fetchPosts])

  function formatRelativeTime(dateString: string) {
    const d = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) return `Vừa xong`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim()) return

    setIsSubmitting(true)
    try {
      await submitPost(newPostContent, newPostTitle || undefined, null, selectedImage)
      setNewPostTitle('')
      setNewPostContent('')
      setSelectedImage(null)
      setImagePreview(null)
      setIsModalOpen(false)
    } catch {
      alert('Lỗi đăng bài')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReplySubmit = async (e: React.FormEvent, postId: number) => {
    e.preventDefault()
    const content = replyInputs[postId]?.trim()
    if (!content) return

    setSubmittingReplyId(postId)
    try {
      await submitComment(postId, content)
      setReplyInputs((current) => ({ ...current, [postId]: '' }))
    } catch {
      alert('Không thể gửi trả lời. Vui lòng thử lại.')
    } finally {
      setSubmittingReplyId(null)
    }
  }

  const handleLoadMoreReplies = async (postId: number) => {
    setLoadingMoreRepliesId(postId)
    try {
      await fetchMoreComments(postId)
    } catch {
      alert('Không thể tải thêm trả lời. Vui lòng thử lại.')
    } finally {
      setLoadingMoreRepliesId(null)
    }
  }

  const handleEditCommentSubmit = async (e: React.FormEvent, postId: number, commentId: number) => {
    e.preventDefault()
    const content = editCommentContent.trim()
    if (!content) return

    try {
      await editComment(postId, commentId, content)
      setEditingCommentId(null)
      setEditCommentContent('')
    } catch {
      alert('Không thể cập nhật bình luận. Vui lòng thử lại.')
    }
  }

  const handleDeleteComment = async (postId: number, commentId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return

    try {
      await deleteComment(postId, commentId)
    } catch {
      alert('Không thể xóa bình luận. Vui lòng thử lại.')
    }
  }

  return (
    <div className="hub-page">
      <AppSidebar active="hub" />
      <AppMobileNav active="hub" />

      <main className="hub-main">
        <AppTopbar />

        <div className="hub-content">
          <header className="hub-header">
            <h1><AppFaIcon icon={appIcons.community} /> Cộng Đồng</h1>
            <p>Không gian trao đổi, hỏi đáp và chia sẻ kiến thức từ cộng đồng sinh viên.</p>
          </header>

          <div className="hub-filters">
            <button
              className="hub-create-post-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <AppFaIcon icon={appIcons.plus} /> Đăng bài
            </button>

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
          ) : posts.length > 0 ? (
            <div className="hub-feed">
              {posts.map((post) => (
                <article key={post.id} className="hub-review-card">
                  <div className="hub-review-card__header">
                    <div className="hub-review-card__user">
                      <div className="hub-review-card__avatar">
                        {post.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="hub-review-card__meta">
                        <h4>{post.full_name}</h4>
                        <span>@{post.username} • {formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>

                    {currentUser && post.user === currentUser.id && (
                      <button
                        className="hub-post-delete-btn"
                        onClick={() => void handleDeletePost(post.id)}
                        title="Xóa bài viết"
                      >
                        <AppFaIcon icon={appIcons.delete} />
                      </button>
                    )}
                  </div>

                  {post.course && post.course_title && (
                    <Link to={`/courses/${post.course}`} className="hub-review-card__course">
                      <AppFaIcon icon={appIcons.course} /> {post.course_title}
                    </Link>
                  )}

                  {post.title && <h3 className="hub-post-title">{post.title}</h3>}
                  <p className="hub-review-card__comment">{post.content}</p>

                  {post.image && (
                    <div className="hub-post-image-container">
                      <img src={post.image} alt={post.title || "Hình ảnh thảo luận"} className="hub-post-image" />
                    </div>
                  )}

                  <div className="hub-review-card__actions">
                    <button
                      className={`hub-vote-btn ${post.user_vote === 'up' ? 'is-active upvote' : ''}`}
                      onClick={() => void toggleVote(post.id, 'up')}
                    >
                      <AppFaIcon icon={appIcons.chevron} /> {post.upvotes} Hữu ích
                    </button>
                    <button
                      className={`hub-vote-btn ${post.user_vote === 'down' ? 'is-active downvote' : ''}`}
                      onClick={() => void toggleVote(post.id, 'down')}
                    >
                      <AppFaIcon icon={appIcons.prev} /> {post.downvotes}
                    </button>
                  </div>

                  <div className="hub-replies">
                    {post.comments_count > 0 && (
                      <div className="hub-replies__list">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="hub-reply">
                            <div className="hub-reply__avatar">
                              {comment.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="hub-reply__body">
                              <div className="hub-reply__bubble">
                                <div className="hub-reply__meta">
                                  <strong>{comment.full_name}</strong>
                                  <span>@{comment.username} • {formatRelativeTime(comment.created_at)}</span>
                                </div>
                                {editingCommentId === comment.id ? (
                                  <form onSubmit={(e) => void handleEditCommentSubmit(e, post.id, comment.id)} className="hub-comment-edit-form">
                                    <input
                                      type="text"
                                      value={editCommentContent}
                                      onChange={(e) => setEditCommentContent(e.target.value)}
                                      className="hub-comment-edit-input"
                                      autoFocus
                                    />
                                    <div className="hub-comment-edit-actions">
                                      <button type="submit" disabled={!editCommentContent.trim()}>Lưu</button>
                                      <button type="button" onClick={() => setEditingCommentId(null)}>Hủy</button>
                                    </div>
                                  </form>
                                ) : (
                                  <p>{comment.content}</p>
                                )}
                              </div>
                              {currentUser && comment.user === currentUser.id && editingCommentId !== comment.id && (
                                <div className="hub-reply__actions">
                                  <button
                                    type="button"
                                    className="hub-reply-action-btn"
                                    onClick={() => {
                                      setEditingCommentId(comment.id)
                                      setEditCommentContent(comment.content)
                                    }}
                                  >
                                    Sửa
                                  </button>
                                  <span className="hub-reply-action-dot">•</span>
                                  <button
                                    type="button"
                                    className="hub-reply-action-btn delete"
                                    onClick={() => void handleDeleteComment(post.id, comment.id)}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {post.comments_count > post.comments.length && (
                      <button
                        type="button"
                        className="hub-replies__more"
                        onClick={() => void handleLoadMoreReplies(post.id)}
                        disabled={loadingMoreRepliesId === post.id}
                      >
                        {loadingMoreRepliesId === post.id
                          ? 'Đang tải...'
                          : `Xem thêm ${post.comments_count - post.comments.length} trả lời`}
                      </button>
                    )}

                    <form className="hub-reply-form" onSubmit={(e) => void handleReplySubmit(e, post.id)}>
                      <div className="hub-reply-form__avatar">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <input
                        type="text"
                        value={replyInputs[post.id] ?? ''}
                        onChange={(e) =>
                          setReplyInputs((current) => ({ ...current, [post.id]: e.target.value }))
                        }
                        placeholder="Viết trả lời..."
                      />
                      <button type="submit" disabled={submittingReplyId === post.id || !replyInputs[post.id]?.trim()}>
                        {submittingReplyId === post.id ? 'Đang gửi' : 'Trả lời'}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="hub-empty">
              <h2>Chưa có bài viết nào</h2>
              <p>Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="hub-modal-overlay" onClick={handleCloseModal}>
          <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal__header">
              <h2>Tạo bài viết</h2>
              <button className="hub-modal__close" onClick={handleCloseModal}>
                <AppFaIcon icon={appIcons.close} />
              </button>
            </div>

            <div className="hub-modal__body">
              <div className="hub-modal__user">
                <img src={avatarUrl} alt={displayName} className="hub-modal__avatar" />
                <div className="hub-modal__user-info">
                  <span className="hub-modal__user-name">{displayName}</span>
                </div>
              </div>

              <form onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  placeholder="Tiêu đề thảo luận (Không bắt buộc)"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="hub-modal__input"
                />
                <textarea
                  placeholder={`${displayName.split(' ').pop()} ơi, bạn đang nghĩ gì thế?`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="hub-modal__textarea"
                  rows={4}
                  required
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                {imagePreview && (
                  <div className="hub-modal__image-preview">
                    <img src={imagePreview} alt="Xem trước ảnh" className="hub-modal__preview-img" />
                    <button type="button" className="hub-modal__remove-image" onClick={handleRemoveImage} title="Gỡ ảnh">
                      <AppFaIcon icon={appIcons.close} />
                    </button>
                  </div>
                )}

                <div className="hub-modal__addons">
                  <span>Thêm vào bài viết của bạn</span>
                  <div className="hub-modal__toolbar">
                    <button type="button" title="Ảnh/Video" style={{ color: '#45bd62' }} onClick={handleImageClick}>
                      <AppFaIcon icon={appIcons.image} />
                    </button>
                    <button type="button" title="Gắn thẻ người khác" style={{ color: '#1877f2' }}>
                      <AppFaIcon icon={appIcons.tags} />
                    </button>
                    <button type="button" title="Cảm xúc/Hoạt động" style={{ color: '#f7b928' }}>
                      <AppFaIcon icon={appIcons.heart} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="hub-modal__submit-btn"
                  disabled={isSubmitting || !newPostContent.trim()}
                >
                  {isSubmitting ? 'Đang đăng...' : 'Đăng'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
