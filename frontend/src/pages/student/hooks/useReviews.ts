import { useState, useCallback } from 'react'
import api from '../../../services/api'

export interface CourseReview {
  id: number
  user: number
  username: string
  full_name: string
  course: number
  course_title: string
  rating: number
  comment: string
  upvotes: number
  downvotes: number
  user_vote: 'up' | 'down' | null
  created_at: string
  updated_at: string
}

export function useReviews(courseId?: number) {
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const fetchReviews = useCallback(async (sort: 'recent' | 'top' = 'recent') => {
    setIsLoading(true)
    setErrorText('')
    try {
      const params = new URLSearchParams()
      params.append('sort', sort)
      if (courseId) {
        params.append('course_id', courseId.toString())
      }
      const response = await api.get<CourseReview[]>(`reviews/?${params.toString()}`)
      setReviews(response.data)
    } catch (error: unknown) {
      setErrorText('Không thể tải đánh giá. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  const submitReview = async (id: number, rating: number, comment: string) => {
    try {
      const response = await api.post<CourseReview>('reviews/', { course_id: id, rating, comment })
      setReviews((prev) => {
        const index = prev.findIndex((r) => r.id === response.data.id)
        if (index !== -1) {
          const newArray = [...prev]
          newArray[index] = response.data
          return newArray
        }
        return [response.data, ...prev]
      })
      return true
    } catch (error: unknown) {
      // Return error to UI if any
      throw error
    }
  }

  const toggleVote = async (reviewId: number, voteType: 'up' | 'down') => {
    try {
      const response = await api.post<{ action: string; vote_type: 'up' | 'down' | null }>(
        `reviews/${reviewId}/vote/`,
        { vote_type: voteType }
      )
      
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id !== reviewId) return r
          
          let up = r.upvotes
          let down = r.downvotes
          
          // Revert old vote
          if (r.user_vote === 'up') up -= 1
          if (r.user_vote === 'down') down -= 1
          
          // Apply new vote
          if (response.data.action === 'added' || response.data.action === 'switched') {
            if (response.data.vote_type === 'up') up += 1
            if (response.data.vote_type === 'down') down += 1
          }
          
          return {
            ...r,
            upvotes: up,
            downvotes: down,
            user_vote: response.data.vote_type,
          }
        })
      )
    } catch (error) {
      /* ignore inline error */
    }
  }

  return {
    reviews,
    isLoading,
    errorText,
    fetchReviews,
    submitReview,
    toggleVote,
  }
}

