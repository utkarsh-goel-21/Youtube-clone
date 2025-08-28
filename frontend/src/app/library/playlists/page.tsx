'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, PlaySquare, Globe, Lock, Trash2, Edit } from 'lucide-react';
import { RootState } from '@/store/store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate } from '@/utils/formatters';
import api from '@/services/api';

interface Playlist {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  isPublic: boolean;
  videos: any[];
  views: number;
  createdAt: string;
  lastUpdated: string;
}

export default function PlaylistsLibraryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: '',
    isPublic: true
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/library/playlists');
      return;
    }
    
    fetchPlaylists();
  }, [isAuthenticated]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/playlists/my');
      setPlaylists(response.data.playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.title.trim()) return;

    try {
      const response = await api.post('/playlists', newPlaylist);
      setPlaylists([response.data.playlist, ...playlists]);
      setShowCreateModal(false);
      setNewPlaylist({ title: '', description: '', isPublic: true });
      router.push(`/playlist/${response.data.playlist._id}`);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      await api.delete(`/playlists/${playlistId}`);
      setPlaylists(playlists.filter(p => p._id !== playlistId));
    } catch (error) {
      console.error('Error deleting playlist:', error);
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

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Playlists</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <PlaySquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No playlists yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create playlists to organize your favorite videos
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
          >
            Create your first playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playlists.map((playlist) => (
            <Link
              key={playlist._id}
              href={`/playlist/${playlist._id}`}
              className="group relative"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                  {playlist.thumbnail || playlist.videos[0]?.thumbnailUrl ? (
                    <Image
                      src={playlist.thumbnail || playlist.videos[0].thumbnailUrl}
                      alt={playlist.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlaySquare className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <PlaySquare className="w-4 h-4" />
                        {playlist.videos.length} videos
                      </div>
                    </div>
                  </div>
                  {/* Privacy Badge */}
                  <div className="absolute top-2 right-2">
                    <div className={`px-2 py-1 rounded text-xs text-white flex items-center gap-1 ${
                      playlist.isPublic ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {playlist.isPublic ? (
                        <>
                          <Globe className="w-3 h-3" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Private
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium line-clamp-2 mb-1">{playlist.title}</h3>
                  {playlist.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {playlist.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{formatNumber(playlist.views)} views</span>
                    <span>Updated {formatDate(playlist.lastUpdated)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/playlist/${playlist._id}?edit=true`);
                    }}
                    className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeletePlaylist(playlist._id, e)}
                    className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Playlist</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  value={newPlaylist.title}
                  onChange={(e) => setNewPlaylist({...newPlaylist, title: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter playlist name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({...newPlaylist, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Describe your playlist"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newPlaylist.isPublic}
                  onChange={(e) => setNewPlaylist({...newPlaylist, isPublic: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Make this playlist public
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylist.title.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Playlist
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPlaylist({ title: '', description: '', isPublic: true });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}