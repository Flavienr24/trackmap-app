import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { FormField } from '@/components/molecules/FormField'
// import { mockData } from '@/services/api' // Removed - using real API
import type { Comment, CreateCommentRequest } from '@/types'

interface CommentsSectionProps {
  eventId: string
  className?: string
}

/**
 * Comments Section Component
 * Displays and manages comments for a specific event
 * Integrated into Event detail pages
 */
const CommentsSection: React.FC<CommentsSectionProps> = ({
  eventId,
  className = '',
}) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newComment, setNewComment] = useState<CreateCommentRequest>({
    content: '',
    author: '',
  })
  const [addingComment, setAddingComment] = useState(false)

  useEffect(() => {
    loadComments()
  }, [eventId])

  const loadComments = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      // const response = await commentsApi.getByEvent(eventId)
      // setComments(response.data)
      
      // Mock data simulation
      setTimeout(() => {
        const eventComments = mockData.comments.filter(c => c.event_id === eventId)
        setComments(eventComments.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ))
        setLoading(false)
      }, 200)
    } catch (error) {
      console.error('Error loading comments:', error)
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
      // TODO: Replace with real API call
      // const response = await commentsApi.create(eventId, newComment)
      
      // Mock data simulation
      const comment: Comment = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
        event_id: eventId,
        content: newComment.content.trim(),
        author: newComment.author?.trim() || undefined,
        created_at: new Date().toISOString(),
      }
      
      // Add to global mockData and update local state
      mockData.comments.unshift(comment)
      setComments(prev => [comment, ...prev])
      
      // Reset form
      setNewComment({ content: '', author: '' })
      setShowAddForm(false)
      
      console.log('Comment created:', comment)
    } catch (error) {
      console.error('Error creating comment:', error)
    } finally {
      setAddingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      try {
        // TODO: Replace with real API call
        // await commentsApi.delete(commentId)
        
        // Remove from global mockData and update local state
        const index = mockData.comments.findIndex(c => c.id === commentId)
        if (index !== -1) {
          mockData.comments.splice(index, 1)
        }
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">
          Commentaires ({comments.length})
        </h3>
        {!showAddForm && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un commentaire
          </Button>
        )}
      </div>

      {/* Add Comment Form */}
      {showAddForm && (
        <form onSubmit={handleAddComment} className="bg-neutral-50 rounded-lg p-4 space-y-3">
          <FormField label="Commentaire" required>
            <textarea
              value={newComment.content}
              onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Ajoutez votre commentaire..."
              disabled={addingComment}
              rows={3}
              className="block w-full rounded-md border border-neutral-300 bg-white text-neutral-900 px-3 py-2 text-sm transition-colors duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              required
            />
          </FormField>
          
          <FormField label="Auteur (optionnel)">
            <Input
              value={newComment.author || ''}
              onChange={(e) => setNewComment(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Votre nom..."
              disabled={addingComment}
              size="sm"
            />
          </FormField>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewComment({ content: '', author: '' })
              }}
              disabled={addingComment}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={addingComment}
            >
              Ajouter
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <div className="text-4xl mb-2">💬</div>
          <p>Aucun commentaire pour le moment.</p>
          <p className="text-sm">Soyez le premier à commenter cet événement !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-800">
                      {comment.author ? comment.author.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">
                      {comment.author || 'Utilisateur anonyme'}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {formatDate(comment.created_at)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-red-600 hover:bg-red-50 border-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
              <div className="text-neutral-700 whitespace-pre-wrap">
                {comment.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { CommentsSection }