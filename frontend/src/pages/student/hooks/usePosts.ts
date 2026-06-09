import { useState, useCallback } from 'react'
import api from '../../../services/api'

export interface CommunityPost {
  id: number
  user: number
  username: string
  full_name: string
  course: number | null
  course_title: string | null
  title: string
  content: string
  image: string | null
  upvotes: number
  downvotes: number
  user_vote: 'up' | 'down' | null
  comments: PostComment[]
  comments_count: number
  created_at: string
  updated_at: string
}

export interface PostComment {
  id: number
  user: number
  username: string
  full_name: string
  content: string
  created_at: string
  updated_at: string
}

interface PostCommentResponse {
  count: number
  next_offset: number | null
  results: PostComment[]
}

interface CreatePostPayload {
  content: string
  title?: string
  course_id?: number
}

export function usePosts() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const fetchPosts = useCallback(async (sort: 'recent' | 'top' = 'recent') => {
    setIsLoading(true)
    setErrorText('')
    try {
      const params = new URLSearchParams()
      params.append('sort', sort)
      const response = await api.get<CommunityPost[]>(`posts/?${params.toString()}`)
      setPosts(response.data)
    } catch {
      setErrorText('Không thể tải bài viết. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submitPost = async (content: string, title?: string, courseId?: number | null, imageFile?: File | null) => {
    let response
    if (imageFile) {
      const formData = new FormData()
      formData.append('content', content)
      if (title) formData.append('title', title)
      if (courseId) formData.append('course_id', String(courseId))
      formData.append('image', imageFile)

      response = await api.post<CommunityPost>('posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    } else {
      const payload: CreatePostPayload = { content }
      if (title) payload.title = title
      if (courseId) payload.course_id = courseId
      response = await api.post<CommunityPost>('posts/', payload)
    }
    setPosts((prev) => [response.data, ...prev])
    return true
  }

  const submitComment = async (postId: number, content: string) => {
    const response = await api.post<PostComment>(`posts/${postId}/comments/`, { content })

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post

        return {
          ...post,
          comments: [...(post.comments ?? []), response.data],
          comments_count: (post.comments_count ?? 0) + 1,
        }
      }),
    )

    return response.data
  }

  const fetchMoreComments = async (postId: number) => {
    const currentPost = posts.find((post) => post.id === postId)
    const offset = currentPost?.comments.length ?? 0
    const response = await api.get<PostCommentResponse>(`posts/${postId}/comments/`, {
      params: {
        limit: 20,
        offset,
      },
    })

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post

        const existingIds = new Set(post.comments.map((comment) => comment.id))
        const nextComments = response.data.results.filter((comment) => !existingIds.has(comment.id))

        return {
          ...post,
          comments: [...post.comments, ...nextComments],
          comments_count: response.data.count,
        }
      }),
    )
  }

  const toggleVote = async (postId: number, voteType: 'up' | 'down') => {
    try {
      const response = await api.post<{ action: string; vote_type: 'up' | 'down' | null }>(
        `posts/${postId}/vote/`,
        { vote_type: voteType }
      )
      
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          
          let up = p.upvotes
          let down = p.downvotes
          
          // Revert old vote
          if (p.user_vote === 'up') up -= 1
          if (p.user_vote === 'down') down -= 1
          
          // Apply new vote
          if (response.data.action === 'added' || response.data.action === 'switched') {
            if (response.data.vote_type === 'up') up += 1
            if (response.data.vote_type === 'down') down += 1
          }
          
          return {
            ...p,
            upvotes: up,
            downvotes: down,
            user_vote: response.data.vote_type,
          }
        })
      )
    } catch {
      /* ignore inline error */
    }
  }

  const deletePost = async (postId: number) => {
    await api.delete(`posts/${postId}/`)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    return true
  }

  const editComment = async (postId: number, commentId: number, content: string) => {
    const response = await api.put<PostComment>(`posts/${postId}/comments/${commentId}/`, { content })

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post

        return {
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId ? response.data : comment
          ),
        }
      })
    )

    return response.data
  }

  const deleteComment = async (postId: number, commentId: number) => {
    await api.delete(`posts/${postId}/comments/${commentId}/`)

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post

        return {
          ...post,
          comments: post.comments.filter((comment) => comment.id !== commentId),
          comments_count: Math.max(0, post.comments_count - 1),
        }
      })
    )
  }

  return {
    posts,
    isLoading,
    errorText,
    fetchPosts,
    submitPost,
    submitComment,
    editComment,
    deleteComment,
    fetchMoreComments,
    toggleVote,
    deletePost,
  }
}
