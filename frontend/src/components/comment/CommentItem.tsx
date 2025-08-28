'use client';

import { useState } from 'react';
import { Comment } from '../../types/comment';
import { formatDate, formatNumber } from '../../utils/formatters';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  MoreVertical,
  Trash2,
  Flag
} from 'lucide-react';

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: string) => void;
  onDislike?: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (replyTo: { id: string; username: string }) => void;
  currentUserId?: string;
}

export default function CommentItem({ 
  comment, 
  onLike, 
  onDislike,
  onDelete, 
  onReply, 
  currentUserId 
}: CommentItemProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const isOwner = currentUserId === comment.author._id;

  return (
    <div className="flex space-x-3">
      {/* Author avatar */}
      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
        {comment.author.avatar ? (
          <img 
            src={comment.author.avatar} 
            alt={comment.author.username}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-gray-600 dark:text-gray-300 font-bold">
            {comment.author.username[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Comment content */}
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-white">
            {comment.author.username}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(comment.createdAt)}
          </span>
          {comment.isEdited && (
            <span className="text-xs text-gray-500 dark:text-gray-400">(edited)</span>
          )}
        </div>

        <p className="text-gray-900 dark:text-white whitespace-pre-wrap mb-2">
          {comment.content}
        </p>

        {/* Action buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onLike(comment._id)}
            className={`flex items-center space-x-1 text-sm ${
              comment.userInteraction?.isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ThumbsUp size={16} className={comment.userInteraction?.isLiked ? 'fill-current' : ''} />
            <span>{(comment.likesCount || 0) > 0 && formatNumber(comment.likesCount || 0)}</span>
          </button>

          <button
            onClick={() => onDislike && onDislike(comment._id)}
            className={`flex items-center space-x-1 text-sm ${
              comment.userInteraction?.isDisliked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ThumbsDown size={16} className={comment.userInteraction?.isDisliked ? 'fill-current' : ''} />
          </button>

          <button
            onClick={() => onReply({ 
              id: comment._id, 
              username: comment.author.username 
            })}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            Reply
          </button>

          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
            >
              <MoreVertical size={16} />
            </button>

            {showOptions && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-600 z-10">
                {isOwner && (
                  <button
                    onClick={() => {
                      onDelete(comment._id);
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <Flag size={14} />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              <MessageSquare size={16} />
              <span>
                {showReplies ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            </button>

            {showReplies && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    onLike={onLike}
                    onDislike={onDislike}
                    onDelete={onDelete}
                    onReply={onReply}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}