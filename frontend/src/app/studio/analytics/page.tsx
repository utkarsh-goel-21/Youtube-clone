'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { 
  TrendingUp, Eye, Clock, Users, DollarSign, 
  ThumbsUp, MessageSquare, Share2, UserPlus,
  Monitor, Smartphone, Tablet, BarChart3
} from 'lucide-react';
import { RootState } from '@/store/store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDuration, formatDate } from '@/utils/formatters';
import api from '@/services/api';

interface AnalyticsData {
  period: string;
  overview: {
    totalViews: number;
    totalWatchTime: number;
    uniqueViewers: number;
    subscribers: number;
    subscribersGained: number;
    estimatedRevenue: number;
  };
  topVideos: Array<{
    _id: string;
    title: string;
    thumbnailUrl: string;
    views: number;
    watchTime: number;
  }>;
  videosCount: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    fetchAnalytics();
  }, [isAuthenticated, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/channel', {
        params: { period }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
        <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No analytics data available</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload videos to start seeing analytics
        </p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Views',
      value: formatNumber(analytics.overview.totalViews),
      icon: Eye,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Watch time',
      value: `${Math.floor(analytics.overview.totalWatchTime / 3600)}h`,
      icon: Clock,
      color: 'purple',
      change: '+8%'
    },
    {
      title: 'Unique viewers',
      value: formatNumber(analytics.overview.uniqueViewers),
      icon: Users,
      color: 'green',
      change: '+15%'
    },
    {
      title: 'Subscribers',
      value: formatNumber(analytics.overview.subscribers),
      icon: UserPlus,
      color: 'red',
      subtitle: `+${analytics.overview.subscribersGained} new`
    },
    {
      title: 'Est. Revenue',
      value: `$${analytics.overview.estimatedRevenue}`,
      icon: DollarSign,
      color: 'yellow',
      change: '+5%'
    }
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Channel Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your channel's performance and audience engagement
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {[
            { value: '1d', label: 'Last 24 hours' },
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
            { value: '1y', label: 'Last year' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900`}>
                  <Icon className={`w-6 h-6 text-${card.color}-600 dark:text-${card.color}-400`} />
                </div>
                {card.change && (
                  <span className={`text-xs font-medium ${
                    card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{card.title}</div>
              {card.subtitle && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {card.subtitle}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top Performing Videos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Top Videos</h2>
        {analytics.topVideos.length > 0 ? (
          <div className="space-y-4">
            {analytics.topVideos.map((video, index) => (
              <div key={video._id} className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-400 w-8">
                  {index + 1}
                </span>
                <div className="relative w-32 h-20 flex-shrink-0">
                  {video.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium line-clamp-1">{video.title}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatNumber(video.views)} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(video.watchTime / 60)}m watch time
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/studio/video/${video._id}/analytics`)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No video data available for this period
          </p>
        )}
      </div>

      {/* Channel Growth Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Channel Growth</h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              Growth chart visualization would go here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Requires chart library integration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}