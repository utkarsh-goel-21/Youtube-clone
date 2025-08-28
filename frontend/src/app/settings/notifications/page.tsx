'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Bell, Mail, Smartphone, Save, ArrowLeft } from 'lucide-react';
import { RootState, AppDispatch } from '@/store/store';
import { fetchPreferences, updatePreferences } from '@/store/slices/notificationSlice';
import { NotificationPreferences } from '@/services/notificationService';
import Link from 'next/link';

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { preferences, preferencesLoading } = useSelector((state: RootState) => state.notifications);
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    dispatch(fetchPreferences());
  }, [user, router, dispatch]);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleToggle = (channel: 'email' | 'push' | 'inApp', type: string) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      [channel]: {
        ...localPreferences[channel],
        [type]: !localPreferences[channel][type as keyof typeof localPreferences[typeof channel]]
      }
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!localPreferences) return;

    setSaving(true);
    try {
      await dispatch(updatePreferences(localPreferences)).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = (channel: 'email' | 'push' | 'inApp', value: boolean) => {
    if (!localPreferences) return;

    const updatedChannel = Object.keys(localPreferences[channel]).reduce((acc, key) => {
      acc[key] = value;
      return acc;
    }, {} as any);

    setLocalPreferences({
      ...localPreferences,
      [channel]: updatedChannel
    });
    setSaved(false);
  };

  if (!user) return null;

  if (preferencesLoading || !localPreferences) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const notificationTypes = [
    { key: 'newVideo', label: 'New videos from subscriptions', icon: '📹' },
    { key: 'commentReply', label: 'Replies to your comments', icon: '💬' },
    { key: 'videoComment', label: 'Comments on your videos', icon: '🎥' },
    { key: 'videoLike', label: 'Likes on your videos', icon: '👍' },
    { key: 'commentLike', label: 'Likes on your comments', icon: '❤️' },
    { key: 'newSubscriber', label: 'New subscribers', icon: '👤' },
    { key: 'playlistAdd', label: 'Video added to playlist', icon: '📝' },
    { key: 'mention', label: 'Mentions', icon: '@' },
    { key: 'milestone', label: 'Channel milestones', icon: '🎉' },
    { key: 'liveStream', label: 'Live streams', icon: '🔴' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Notification Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Choose how you want to be notified about activity on your channel
          </p>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {/* Email Notifications */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Email Notifications
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAll('email', true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Enable All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => handleToggleAll('email', false)}
                  className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  Disable All
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {notificationTypes
                .filter(type => type.key in localPreferences.email)
                .map((type) => (
                  <label
                    key={type.key}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-gray-700 dark:text-gray-300">{type.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={localPreferences.email[type.key as keyof typeof localPreferences.email]}
                      onChange={() => handleToggle('email', type.key)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                ))}
            </div>
          </div>

          {/* Push Notifications */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Push Notifications
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAll('push', true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Enable All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => handleToggleAll('push', false)}
                  className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  Disable All
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {notificationTypes
                .filter(type => type.key in localPreferences.push)
                .map((type) => (
                  <label
                    key={type.key}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-gray-700 dark:text-gray-300">{type.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={localPreferences.push[type.key as keyof typeof localPreferences.push]}
                      onChange={() => handleToggle('push', type.key)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                ))}
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  In-App Notifications
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAll('inApp', true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Enable All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => handleToggleAll('inApp', false)}
                  className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  Disable All
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {notificationTypes
                .filter(type => type.key in localPreferences.inApp)
                .map((type) => (
                  <label
                    key={type.key}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-gray-700 dark:text-gray-300">{type.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={localPreferences.inApp[type.key as keyof typeof localPreferences.inApp]}
                      onChange={() => handleToggle('inApp', type.key)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-end gap-4">
          {saved && (
            <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Preferences saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}