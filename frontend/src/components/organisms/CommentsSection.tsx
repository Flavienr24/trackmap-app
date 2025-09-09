import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { commentsApi } from '@/services/api'
import type { Comment, CreateCommentRequest } from '@/types'

interface CommentsSectionProps {
  eventId: string
  className?: string
  onCommentsCountChange?: (count: number) => void
}

/**
 * Comments Section Component
 * Displays and manages comments for a specific event
 * Integrated into Event detail pages
 */
const CommentsSection: React.FC<CommentsSectionProps> = ({
  eventId,
  className = '',
  onCommentsCountChange,
}) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState<CreateCommentRequest>({
    content: '',
    author: '',
  })
  const [addingComment, setAddingComment] = useState(false)
  const [showExtendedForm, setShowExtendedForm] = useState(false)

  useEffect(() => {
    loadComments()
  }, [eventId])

  // Notify parent when comments count changes
  useEffect(() => {
    onCommentsCountChange?.(comments.length)
  }, [comments.length, onCommentsCountChange])

  const loadComments = async () => {
    setLoading(true)
    try {
      const response = await commentsApi.getByEvent(eventId)
      setComments(response.data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (error) {
      console.error('Error loading comments:', error)
      // If API fails, show empty state instead of loading forever
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.content.trim()) {
      return
    }

    setAddingComment(true)
    try {
      const response = await commentsApi.create(eventId, newComment)
      
      // Add new comment to the beginning of the list
      setComments(prev => [response.data, ...prev])
      
      // Reset form
      setNewComment({ content: '', author: '' })
      setShowExtendedForm(false)
      
      console.log('Comment created:', response.data)
    } catch (error) {
      console.error('Error creating comment:', error)
    } finally {
      setAddingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      try {
        await commentsApi.delete(commentId)
        
        // Remove from local state
        setComments(prev => prev.filter(c => c.id !== commentId))
        
        console.log('Comment deleted:', commentId)
      } catch (error) {
        console.error('Error deleting comment:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Il y a quelques minutes'
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)} heure${Math.floor(diffInHours) > 1 ? 's' : ''}`
    } else if (diffInHours < 24 * 7) {
      return `Il y a ${Math.floor(diffInHours / 24)} jour${Math.floor(diffInHours / 24) > 1 ? 's' : ''}`
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    }
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
          <div className="h-16 bg-neutral-200 rounded"></div>
          <div className="h-16 bg-neutral-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-neutral-900">
          Commentaires ({comments.length})
        </h3>
      </div>

      {/* Add Comment Form - Always Visible */}
      <form onSubmit={handleAddComment} className="bg-neutral-50 rounded-lg p-4 mb-6">
        <textarea
          value={newComment.content}
          onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
          onFocus={() => setShowExtendedForm(true)}
          placeholder="Ajouter un commentaire"
          disabled={addingComment}
          rows={3}
          className="block w-full rounded-md border border-neutral-300 bg-white text-neutral-900 px-3 py-2 text-sm transition-colors duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none mb-3"
          required
        />
        
        {showExtendedForm && (
          <div className="flex items-end justify-between space-x-3">
            <div className="flex-1">
              <Input
                value={newComment.author || ''}
                onChange={(e) => setNewComment(prev => ({ ...prev, author: e.target.value }))}
                onFocus={() => setShowExtendedForm(true)}
                placeholder="Votre nom (optionnel)"
                disabled={addingComment}
                size="sm"
              />
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={addingComment}
              disabled={!newComment.content.trim()}
            >
              Publier
            </Button>
          </div>
        )}
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <div className="text-4xl mb-2">💬</div>
          <p>Aucun commentaire pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-800">
                      {comment.author ? comment.author.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1">
                      <div className="font-semibold text-sm text-neutral-900">
                        {comment.author || 'Utilisateur anonyme'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-700 whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-red-600 hover:bg-red-50 border-red-200 ml-2 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { CommentsSection }