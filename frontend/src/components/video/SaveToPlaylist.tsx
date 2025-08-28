'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Plus, Check, Lock, Globe, X } from 'lucide-react';
import { RootState } from '@/store/store';
import api from '@/services/api';

interface SaveToPlaylistProps {
  videoId: string;
  onClose?: () => void;
}

interface Playlist {
  _id: string;
  title: string;
  isPublic: boolean;
  videos: Array<{ video: string }>;
}

export default function SaveToPlaylist({ videoId, onClose }: SaveToPlaylistProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: '',
    isPublic: true
  });
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
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

  const handleTogglePlaylist = async (playlist: Playlist) => {
    setSaving(playlist._id);
    
    try {
      const isInPlaylist = playlist.videos.some(v => 
        (typeof v.video === 'string' ? v.video : v.video._id) === videoId
      );

      if (isInPlaylist) {
        // Remove from playlist
        await api.delete(`/playlists/${playlist._id}/videos/${videoId}`);
        setPlaylists(playlists.map(p => 
          p._id === playlist._id 
            ? { ...p, videos: p.videos.filter(v => 
                (typeof v.video === 'string' ? v.video : v.video._id) !== videoId
              )}
            : p
        ));
      } else {
        // Add to playlist
        await api.post(`/playlists/${playlist._id}/videos`, { videoId });
        setPlaylists(playlists.map(p => 
          p._id === playlist._id 
            ? { ...p, videos: [...p.videos, { video: videoId }] }
            : p
        ));
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.title.trim()) return;

    try {
      const response = await api.post('/playlists', {
        ...newPlaylist,
        videoId // Add current video to new playlist
      });
      
      setPlaylists([response.data.playlist, ...playlists]);
      setShowCreateForm(false);
      setNewPlaylist({ title: '', description: '', isPublic: true });
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold">Save to playlist</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[60vh]">
        {loading ? (
          <div className="p-4 text-center">Loading playlists...</div>
        ) : (
          <>
            {/* Existing Playlists */}
            <div className="p-4 space-y-2">
              {playlists.map((playlist) => {
                const isInPlaylist = playlist.videos.some(v => 
                  (typeof v.video === 'string' ? v.video : v.video._id) === videoId
                );
                
                return (
                  <button
                    key={playlist._id}
                    onClick={() => handleTogglePlaylist(playlist)}
                    disabled={saving === playlist._id}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                        isInPlaylist 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-400'
                      }`}>
                        {isInPlaylist && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium">{playlist.title}</span>
                      {playlist.isPublic ? (
                        <Globe className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    {saving === playlist._id && (
                      <span className="text-sm text-gray-500">Saving...</span>
                    )}
                  </button>
                );
              })}

              {/* Create New Playlist Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-5 h-5 border-2 border-gray-400 rounded flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </div>
                  <span className="font-medium">Create new playlist</span>
                </button>
              )}
            </div>

            {/* Create New Playlist Form */}
            {showCreateForm && (
              <div className="p-4 border-t dark:border-gray-700">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newPlaylist.title}
                    onChange={(e) => setNewPlaylist({...newPlaylist, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Playlist name"
                    autoFocus
                  />
                  <textarea
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist({...newPlaylist, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Description (optional)"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="newIsPublic"
                      checked={newPlaylist.isPublic}
                      onChange={(e) => setNewPlaylist({...newPlaylist, isPublic: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="newIsPublic" className="text-sm">
                      Public playlist
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylist.title.trim()}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylist({ title: '', description: '', isPublic: true });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}