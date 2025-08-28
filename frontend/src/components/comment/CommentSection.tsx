'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  fetchComments, 
  createComment, 
  likeComment,
  dislikeComment,
  deleteComment 
} from '../../store/slices/commentSlice';
import LoadingSpinner from '../ui/LoadingSpinner';
import CommentItem from './CommentItem';
import { MessageSquare, Filter } from 'lucide-react';

interface CommentSectionProps {
  videoId: string;
}

export default function CommentSection({ videoId }: CommentSectionProps) {
  const dispatch = useDispatch();
  const { comments, loading, totalComments } = useSelector((state: RootState) => state.comments);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('top');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    if (videoId) {
      dispatch(fetchComments({ videoId, sortBy }) as any);
    }
  }, [dispatch, videoId, sortBy]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || !isAuthenticated) {
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting comment:', { videoId, content: commentText.trim() });
      const result = await dispatch(createComment({ 
        videoId, 
        content: commentText.trim() 
      }) as any).unwrap();
      console.log('Comment created successfully:', result);
      setCommentText('');
      // Don't refetch - the comment should be in state already
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated) {
      alert('Please login to like comments');
      return;
    }
    dispatch(likeComment(commentId) as any);
  };

  const handleDislikeComment = (commentId: string) => {
    if (!isAuthenticated) {
      alert('Please login to dislike comments');
      return;
    }
    dispatch(dislikeComment(commentId) as any);
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      dispatch(deleteComment(commentId) as any);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {totalComments} Comments
          </h2>
        </div>

        {/* Sort button */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Filter size={16} />
            <span className="text-sm font-medium">
              Sort by {sortBy === 'newest' ? 'Newest' : 'Top'}
            </span>
          </button>

          {showSortMenu && (
            <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-600 z-10">
              <button
                onClick={() => {
                  setSortBy('top');
                  setShowSortMenu(false);
                }}
                className={`w-full text-left px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  sortBy === 'top' ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                }`}
              >
                Top comments
              </button>
              <button
                onClick={() => {
                  setSortBy('newest');
                  setShowSortMenu(false);
                }}
                className={`w-full text-left px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  sortBy === 'newest' ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                }`}
              >
                Newest first
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add comment form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex space-x-3">
            {/* User avatar */}
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 dark:text-gray-300 font-bold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>

            {/* Comment input */}
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600 focus:border-gray-500 dark:focus:border-gray-400 outline-none resize-none"
                rows={1}
                onFocus={(e) => e.target.rows = 3}
                onBlur={(e) => !commentText && (e.target.rows = 1)}
              />
              
              {commentText && (
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setCommentText('')}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Posting...
                      </>
                    ) : (
                      'Comment'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Please{' '}
            <a href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              sign in
            </a>{' '}
            to comment
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onLike={handleLikeComment}
              onDislike={handleDislikeComment}
              onDelete={handleDeleteComment}
              onReply={(replyTo) => {
                // Handle reply functionality
                console.log('Reply to:', replyTo);
              }}
              currentUserId={user?.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No comments yet</p>
          <p className="text-sm">Be the first to comment!</p>
        </div>
      )}
    </div>
  );
}