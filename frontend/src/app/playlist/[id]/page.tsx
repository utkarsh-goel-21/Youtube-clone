'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Play, Clock, Calendar, Globe, Lock, Heart, 
  MoreVertical, Edit, Trash2, Share2, PlaySquare 
} from 'lucide-react';
import { RootState } from '@/store/store';
import VideoCard from '@/components/video/VideoCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate, formatDuration } from '@/utils/formatters';
import api from '@/services/api';

interface PlaylistVideo {
  video: any;
  addedAt: string;
  position: number;
}

interface PlaylistData {
  _id: string;
  title: string;
  description?: string;
  author: {
    _id: string;
    username: string;
    channelName: string;
    avatar?: string;
    subscriberCount: number;
  };
  videos: PlaylistVideo[];
  thumbnail?: string;
  isPublic: boolean;
  views: number;
  likes: string[];
  createdAt: string;
  lastUpdated: string;
}

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({
    title: '',
    description: '',
    isPublic: true
  });

  useEffect(() => {
    fetchPlaylist();
  }, [params.id]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/playlists/${params.id}`);
      setPlaylist(response.data.playlist);
      setIsLiked(user ? response.data.playlist.likes.includes(user.id) : false);
      setPlaylistForm({
        title: response.data.playlist.title,
        description: response.data.playlist.description || '',
        isPublic: response.data.playlist.isPublic
      });
    } catch (error) {
      console.error('Error fetching playlist:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const response = await api.post(`/playlists/${params.id}/like`);
      setIsLiked(!isLiked);
      if (playlist) {
        setPlaylist({
          ...playlist,
          likes: isLiked 
            ? playlist.likes.filter(id => id !== user.id)
            : [...playlist.likes, user.id]
        });
      }
    } catch (error) {
      console.error('Error liking playlist:', error);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!confirm('Remove this video from the playlist?')) return;

    try {
      await api.delete(`/playlists/${params.id}/videos/${videoId}`);
      fetchPlaylist();
    } catch (error) {
      console.error('Error removing video:', error);
    }
  };

  const handleUpdatePlaylist = async () => {
    try {
      await api.put(`/playlists/${params.id}`, playlistForm);
      setEditMode(false);
      fetchPlaylist();
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      await api.delete(`/playlists/${params.id}`);
      router.push('/library/playlists');
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const handlePlayAll = () => {
    if (playlist && playlist.videos.length > 0) {
      const firstVideo = playlist.videos[0].video;
      router.push(`/watch/${firstVideo._id}?list=${playlist._id}`);
    }
  };

  const calculateTotalDuration = () => {
    if (!playlist) return 0;
    return playlist.videos.reduce((total, item) => {
      return total + (item.video?.duration || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
        <Link href="/" className="text-blue-600 hover:underline">
          Go to homepage
        </Link>
      </div>
    );
  }

  const isOwner = user && playlist.author._id === user.id;
  const totalDuration = calculateTotalDuration();

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Playlist Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-purple-600 to-blue-600 rounded-lg p-6 text-white sticky top-20">
            {/* Playlist Thumbnail */}
            <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
              {playlist.thumbnail || playlist.videos[0]?.video?.thumbnailUrl ? (
                <Image
                  src={playlist.thumbnail || playlist.videos[0].video.thumbnailUrl}
                  alt={playlist.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <PlaySquare className="w-16 h-16 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <button
                  onClick={handlePlayAll}
                  className="bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-gray-200 flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Play All
                </button>
              </div>
            </div>

            {/* Playlist Title & Description */}
            {editMode ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={playlistForm.title}
                  onChange={(e) => setPlaylistForm({...playlistForm, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white bg-opacity-20 rounded-lg text-white placeholder-gray-300"
                  placeholder="Playlist title"
                />
                <textarea
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm({...playlistForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-white bg-opacity-20 rounded-lg text-white placeholder-gray-300"
                  placeholder="Playlist description"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={playlistForm.isPublic}
                    onChange={(e) => setPlaylistForm({...playlistForm, isPublic: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="isPublic">Public playlist</label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdatePlaylist}
                    className="flex-1 px-3 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 px-3 py-2 bg-white bg-opacity-20 rounded-lg font-medium hover:bg-opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">{playlist.title}</h1>
                {playlist.description && (
                  <p className="text-white text-opacity-90 text-sm mb-4">
                    {playlist.description}
                  </p>
                )}
              </>
            )}

            {/* Playlist Stats */}
            <div className="space-y-2 text-sm text-white text-opacity-90">
              <div className="flex items-center gap-2">
                {playlist.isPublic ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{playlist.isPublic ? 'Public' : 'Private'} playlist</span>
              </div>
              <div className="flex items-center gap-2">
                <PlaySquare className="w-4 h-4" />
                <span>{playlist.videos.length} videos</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Updated {formatDate(playlist.lastUpdated)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleLike}
                className={`flex-1 px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  isLiked 
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </button>
              <button
                className="flex-1 px-3 py-2 bg-white bg-opacity-20 rounded-lg font-medium hover:bg-opacity-30 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            {isOwner && !editMode && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="flex-1 px-3 py-2 bg-white bg-opacity-20 rounded-lg font-medium hover:bg-opacity-30 flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDeletePlaylist}
                  className="flex-1 px-3 py-2 bg-red-600 bg-opacity-80 rounded-lg font-medium hover:bg-opacity-100 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}

            {/* Channel Info */}
            <Link 
              href={`/channel/${playlist.author._id}`}
              className="flex items-center gap-3 mt-6 p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
            >
              <div className="relative w-10 h-10">
                <Image
                  src={playlist.author.avatar || '/default-avatar.png'}
                  alt={playlist.author.channelName}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium">{playlist.author.channelName}</p>
                <p className="text-xs text-white text-opacity-75">
                  {formatNumber(playlist.author.subscriberCount)} subscribers
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Videos List */}
        <div className="lg:col-span-2">
          {playlist.videos.length === 0 ? (
            <div className="text-center py-12">
              <PlaySquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No videos in this playlist</h2>
              <p className="text-gray-600 dark:text-gray-400">
                {isOwner ? 'Add videos to get started' : 'This playlist is empty'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {playlist.videos.map((item, index) => (
                <div key={item.video._id} className="flex gap-4 group">
                  <span className="text-gray-500 w-8 text-center">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex gap-4">
                      <Link 
                        href={`/watch/${item.video._id}?list=${playlist._id}&index=${index}`}
                        className="relative w-40 h-24 flex-shrink-0"
                      >
                        <Image
                          src={item.video.thumbnailUrl || '/video-placeholder.jpg'}
                          alt={item.video.title}
                          fill
                          className="rounded-lg object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                          {formatDuration(item.video.duration)}
                        </div>
                      </Link>
                      <div className="flex-1">
                        <Link href={`/watch/${item.video._id}?list=${playlist._id}&index=${index}`}>
                          <h3 className="font-medium line-clamp-2 hover:text-blue-600">
                            {item.video.title}
                          </h3>
                        </Link>
                        <Link 
                          href={`/channel/${item.video.author._id}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
                        >
                          {item.video.author.channelName}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatNumber(item.video.views)} views · {formatDate(item.video.uploadedAt)}
                        </p>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveVideo(item.video._id)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}