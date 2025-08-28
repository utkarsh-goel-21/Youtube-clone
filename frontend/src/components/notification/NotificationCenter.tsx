'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, Settings, Trash2, Check, CheckCheck, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { RootState, AppDispatch } from '@/store/store';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  markAsClicked,
  deleteNotification,
  clearAllNotifications,
  addNotification
} from '@/store/slices/notificationSlice';
import { io, Socket } from 'socket.io-client';

const NotificationCenter: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { notifications, unreadCount, loading } = useSelector(
    (state: RootState) => state.notifications
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      // Connect to socket
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        withCredentials: true
      });

      // Authenticate socket connection
      socketRef.current.emit('authenticate', user._id);

      // Listen for new notifications
      socketRef.current.on('new-notification', (data) => {
        dispatch(addNotification(data));
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(data.notification.title, {
            body: data.notification.message,
            icon: data.notification.thumbnail || '/favicon.ico',
            tag: data.notification._id
          });
        }
      });

      // Fetch initial unread count
      dispatch(fetchUnreadCount());

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user, dispatch]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && user) {
      dispatch(fetchNotifications({ page: 1, unreadOnly: false }));
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await dispatch(markAsClicked(notification._id));
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(deleteNotification(notificationId));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      dispatch(clearAllNotifications());
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClasses = 'w-10 h-10 rounded-full object-cover';
    
    switch (type) {
      case 'new_video':
        return <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">📹</div>;
      case 'comment_reply':
      case 'video_comment':
        return <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">💬</div>;
      case 'video_like':
      case 'comment_like':
        return <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">👍</div>;
      case 'new_subscriber':
        return <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">👤</div>;
      case 'milestone':
        return <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white">🎉</div>;
      case 'playlist_add':
        return <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white">📝</div>;
      default:
        return <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white">🔔</div>;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <Link
                  href="/settings/notifications"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Notification settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <Link
                    key={notification._id}
                    href={notification.actionUrl || '#'}
                    onClick={() => handleNotificationClick(notification)}
                    className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon/Avatar */}
                      <div className="flex-shrink-0">
                        {notification.sender?.avatar ? (
                          <Image
                            src={notification.sender.avatar}
                            alt={notification.sender.channelName}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          getNotificationIcon(notification.type)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-gray-900 dark:text-white`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {notification.timeAgo}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-start">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 mt-2"></div>
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification._id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/notifications"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;