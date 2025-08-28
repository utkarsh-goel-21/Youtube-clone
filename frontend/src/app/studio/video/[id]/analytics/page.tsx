'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { 
  ArrowLeft, Eye, Clock, ThumbsUp, ThumbsDown, 
  MessageSquare, Share2, UserPlus, TrendingUp,
  Monitor, Smartphone, Tablet, Tv, Users,
  Globe, Search, PlaySquare, Bell, ExternalLink
} from 'lucide-react';
import { RootState } from '@/store/store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDuration, formatDate } from '@/utils/formatters';
import api from '@/services/api';

interface VideoAnalytics {
  video: {
    id: string;
    title: string;
    uploadedAt: string;
    duration: number;
  };
  period: string;
  overview: {
    totalViews: number;
    uniqueViewers: number;
    totalWatchTime: number;
    avgWatchTime: number;
    avgPercentageWatched: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
    subscribersGained: number;
  };
  audienceRetention: Array<{
    percentage: number;
    retention: number;
  }>;
  trafficSources: Array<{
    source: string;
    count: number;
    avgWatchTime: number;
  }>;
  deviceStats: Array<{
    device: string;
    count: number;
    avgWatchTime: number;
  }>;
  hourlyViews: Array<{
    hour: string;
    views: number;
  }>;
  performance: {
    engagementRate: string;
    likeDislikeRatio: string;
    averageViewDuration: number;
    averagePercentageViewed: number;
    clickThroughRate: string;
  };
}

export default function VideoAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    fetchAnalytics();
  }, [isAuthenticated, period, params.id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/video/${params.id}`, {
        params: { period }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching video analytics:', error);
      router.push('/studio');
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'search': return Search;
      case 'suggested': return PlaySquare;
      case 'channel': return Users;
      case 'playlist': return PlaySquare;
      case 'external': return ExternalLink;
      case 'notification': return Bell;
      default: return Globe;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      case 'tv': return Tv;
      default: return Monitor;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Analytics not available</h2>
        <Link href="/studio" className="text-blue-600 hover:underline">
          Back to Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/studio"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Studio
        </Link>
        <h1 className="text-2xl font-bold mb-2">{analytics.video.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Uploaded {formatDate(analytics.video.uploadedAt)} · {formatDuration(analytics.video.duration)}
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '1d', label: '24 hours' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: '90d', label: '90 days' }
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setPeriod(option.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Total Views</span>
          </div>
          <div className="text-2xl font-bold">{formatNumber(analytics.overview.totalViews)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatNumber(analytics.overview.uniqueViewers)} unique
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Watch Time</span>
          </div>
          <div className="text-2xl font-bold">
            {Math.floor(analytics.overview.totalWatchTime / 3600)}h
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDuration(analytics.overview.avgWatchTime)} avg
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">Engagement</span>
          </div>
          <div className="text-2xl font-bold">{analytics.performance.engagementRate}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatNumber(analytics.overview.likes + analytics.overview.comments + analytics.overview.shares)} total
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
            <UserPlus className="w-4 h-4" />
            <span className="text-sm">Subscribers</span>
          </div>
          <div className="text-2xl font-bold">+{analytics.overview.subscribersGained}</div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.performance.clickThroughRate}% CTR
          </div>
        </div>
      </div>

      {/* Audience Retention Graph */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Audience Retention</h2>
        <div className="h-64 relative">
          <div className="absolute inset-0 flex items-end justify-between gap-1">
            {analytics.audienceRetention.map((point, index) => (
              <div
                key={index}
                className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors relative group"
                style={{ height: `${point.retention}%` }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {point.retention.toFixed(1)}% at {point.percentage}%
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          Average view duration: {formatDuration(analytics.overview.avgWatchTime)} ({analytics.overview.avgPercentageWatched.toFixed(1)}%)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic Sources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Traffic Sources</h2>
          <div className="space-y-3">
            {analytics.trafficSources.map((source) => {
              const Icon = getSourceIcon(source.source);
              const total = analytics.trafficSources.reduce((sum, s) => sum + s.count, 0);
              const percentage = (source.count / total * 100).toFixed(1);
              
              return (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500" />
                    <span className="capitalize">{source.source}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Device Type</h2>
          <div className="space-y-3">
            {analytics.deviceStats.map((device) => {
              const Icon = getDeviceIcon(device.device);
              const total = analytics.deviceStats.reduce((sum, d) => sum + d.count, 0);
              const percentage = (device.count / total * 100).toFixed(1);
              
              return (
                <div key={device.device} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500" />
                    <span className="capitalize">{device.device}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <div className="text-xl font-bold">{formatNumber(analytics.overview.likes)}</div>
          <div className="text-xs text-gray-500">Likes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <ThumbsDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
          <div className="text-xl font-bold">{formatNumber(analytics.overview.dislikes)}</div>
          <div className="text-xs text-gray-500">Dislikes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <div className="text-xl font-bold">{formatNumber(analytics.overview.comments)}</div>
          <div className="text-xs text-gray-500">Comments</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <Share2 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
          <div className="text-xl font-bold">{formatNumber(analytics.overview.shares)}</div>
          <div className="text-xs text-gray-500">Shares</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-600" />
          <div className="text-xl font-bold">{analytics.performance.likeDislikeRatio}</div>
          <div className="text-xs text-gray-500">Like Ratio</div>
        </div>
      </div>
    </div>
  );
}