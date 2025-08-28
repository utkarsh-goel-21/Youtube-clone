'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Users } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface ChannelCardProps {
  channel: {
    _id: string;
    username: string;
    channelName: string;
    channelDescription?: string;
    avatar?: string;
    banner?: string;
    subscriberCount: number;
    videoCount?: number;
    isVerified?: boolean;
  };
}

export default function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <Link href={`/channel/${channel._id}`}>
      <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {/* Channel Avatar */}
          <div className="flex-shrink-0">
            {channel.avatar ? (
              <Image
                src={channel.avatar}
                alt={channel.channelName}
                width={88}
                height={88}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-22 h-22 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {channel.channelName[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Channel Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {channel.channelName}
              </h3>
              {channel.isVerified && (
                <CheckCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
              <span>@{channel.username}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{formatNumber(channel.subscriberCount)} subscribers</span>
              </div>
              {channel.videoCount && (
                <>
                  <span>•</span>
                  <span>{channel.videoCount} videos</span>
                </>
              )}
            </div>

            {channel.channelDescription && (
              <p className="text-sm text-gray-700 line-clamp-2">
                {channel.channelDescription}
              </p>
            )}
          </div>

          {/* Subscribe Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle subscribe
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Subscribe
          </button>
        </div>
      </div>
    </Link>
  );
}