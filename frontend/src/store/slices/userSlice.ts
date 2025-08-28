import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';
import type { User, UserProfile, UserSettings } from '../../types/user';

interface UserState {
  profile: UserProfile | null;
  subscriptions: User[];
  watchHistory: any[];
  playlists: any[];
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  subscriptions: [],
  watchHistory: [],
  playlists: [],
  settings: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'users/fetchUserProfile',
  async (userId: string) => {
    const response = await userService.getUserProfile(userId);
    return response;
  }
);

export const updateProfile = createAsyncThunk(
  'users/updateProfile',
  async (data: Partial<UserProfile>, { rejectWithValue }) => {
    try {
      const response = await userService.updateProfile(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'users/uploadAvatar',
  async (file: File, { rejectWithValue }) => {
    try {
      const response = await userService.uploadAvatar(file);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const subscribeToUser = createAsyncThunk(
  'users/subscribeToUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userService.subscribeToUser(userId);
      return { userId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const unsubscribeFromUser = createAsyncThunk(
  'users/unsubscribeFromUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userService.unsubscribeFromUser(userId);
      return { userId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSubscriptions = createAsyncThunk(
  'users/fetchSubscriptions',
  async () => {
    const response = await userService.getSubscriptions();
    return response;
  }
);

export const fetchSubscriptionFeed = createAsyncThunk(
  'users/fetchSubscriptionFeed',
  async (params: { page?: number; limit?: number } = {}) => {
    const response = await userService.getSubscriptionFeed(params);
    return response;
  }
);

export const fetchWatchHistory = createAsyncThunk(
  'users/fetchWatchHistory',
  async (params: { page?: number; limit?: number } = {}) => {
    const response = await userService.getWatchHistory(params);
    return response;
  }
);

export const clearWatchHistory = createAsyncThunk(
  'users/clearWatchHistory',
  async () => {
    await userService.clearWatchHistory();
  }
);

export const createPlaylist = createAsyncThunk(
  'users/createPlaylist',
  async (data: { name: string; description?: string; isPublic?: boolean }, { rejectWithValue }) => {
    try {
      const response = await userService.createPlaylist(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPlaylists = createAsyncThunk(
  'users/fetchPlaylists',
  async () => {
    const response = await userService.getPlaylists();
    return response;
  }
);

export const addVideoToPlaylist = createAsyncThunk(
  'users/addVideoToPlaylist',
  async ({ playlistId, videoId }: { playlistId: string; videoId: string }, { rejectWithValue }) => {
    try {
      const response = await userService.addVideoToPlaylist(playlistId, videoId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserSettings = createAsyncThunk(
  'users/fetchUserSettings',
  async () => {
    const response = await userService.getUserSettings();
    return response;
  }
);

export const updateUserSettings = createAsyncThunk(
  'users/updateUserSettings',
  async (settings: Partial<UserSettings>, { rejectWithValue }) => {
    try {
      const response = await userService.updateUserSettings(settings);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    updateProfileField: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    addSubscription: (state, action: PayloadAction<User>) => {
      state.subscriptions.push(action.payload);
    },
    removeSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter(sub => sub.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile = { ...state.profile, ...action.payload.user };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Upload avatar
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.avatar = action.payload.avatarUrl;
        }
      })
      // Subscribe to user
      .addCase(subscribeToUser.fulfilled, (state, action) => {
        // Update subscription status in profile if viewing someone else's profile
        if (state.profile && state.profile.id === action.payload.userId) {
          state.profile.isSubscribed = true;
          state.profile.subscribersCount = action.payload.subscribersCount;
        }
      })
      // Unsubscribe from user
      .addCase(unsubscribeFromUser.fulfilled, (state, action) => {
        // Update subscription status in profile if viewing someone else's profile
        if (state.profile && state.profile.id === action.payload.userId) {
          state.profile.isSubscribed = false;
          state.profile.subscribersCount = action.payload.subscribersCount;
        }
        // Remove from subscriptions list
        state.subscriptions = state.subscriptions.filter(sub => sub.id !== action.payload.userId);
      })
      // Fetch subscriptions
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.subscriptions = action.payload.subscriptions;
      })
      // Fetch watch history
      .addCase(fetchWatchHistory.fulfilled, (state, action) => {
        state.watchHistory = action.payload.history;
      })
      // Clear watch history
      .addCase(clearWatchHistory.fulfilled, (state) => {
        state.watchHistory = [];
      })
      // Create playlist
      .addCase(createPlaylist.fulfilled, (state, action) => {
        state.playlists.push(action.payload.playlist);
      })
      // Fetch playlists
      .addCase(fetchPlaylists.fulfilled, (state, action) => {
        state.playlists = action.payload.playlists;
      })
      // Fetch user settings
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
      })
      // Update user settings
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
      });
  },
});

export const {
  setProfile,
  updateProfileField,
  addSubscription,
  removeSubscription,
  setLoading,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;