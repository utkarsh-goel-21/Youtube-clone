import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import notificationService, { Notification, NotificationPreferences } from '../../services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  preferences: null,
  preferencesLoading: false
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ page = 1, unreadOnly = false }: { page?: number; unreadOnly?: boolean }) => {
    const response = await notificationService.getNotifications(page, 20, unreadOnly);
    return response;
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const count = await notificationService.getUnreadCount();
    return count;
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationIds: string[]) => {
    const response = await notificationService.markAsRead(notificationIds);
    return { notificationIds, unreadCount: response.unreadCount };
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    const response = await notificationService.markAllAsRead();
    return response.unreadCount;
  }
);

export const markAsClicked = createAsyncThunk(
  'notifications/markAsClicked',
  async (notificationId: string) => {
    const response = await notificationService.markAsClicked(notificationId);
    return { notificationId, unreadCount: response.unreadCount };
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (notificationId: string) => {
    const response = await notificationService.deleteNotification(notificationId);
    return { notificationId, unreadCount: response.unreadCount };
  }
);

export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAll',
  async () => {
    const response = await notificationService.clearAllNotifications();
    return response.unreadCount;
  }
);

export const fetchPreferences = createAsyncThunk(
  'notifications/fetchPreferences',
  async () => {
    const preferences = await notificationService.getPreferences();
    return preferences;
  }
);

export const updatePreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences: NotificationPreferences) => {
    const updated = await notificationService.updatePreferences(preferences);
    return updated;
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<{ notification: Notification; unreadCount: number }>) => {
      state.notifications.unshift(action.payload.notification);
      state.unreadCount = action.payload.unreadCount;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.currentPage = action.payload.pagination.page;
        state.totalPages = action.payload.pagination.pages;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      })
      // Fetch unread count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map(notif =>
          action.payload.notificationIds.includes(notif._id)
            ? { ...notif, read: true }
            : notif
        );
        state.unreadCount = action.payload.unreadCount;
      })
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map(notif => ({
          ...notif,
          read: true
        }));
        state.unreadCount = action.payload;
      })
      // Mark as clicked
      .addCase(markAsClicked.fulfilled, (state, action) => {
        state.notifications = state.notifications.map(notif =>
          notif._id === action.payload.notificationId
            ? { ...notif, read: true }
            : notif
        );
        state.unreadCount = action.payload.unreadCount;
      })
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(
          notif => notif._id !== action.payload.notificationId
        );
        state.unreadCount = action.payload.unreadCount;
      })
      // Clear all
      .addCase(clearAllNotifications.fulfilled, (state, action) => {
        state.notifications = [];
        state.unreadCount = action.payload;
      })
      // Fetch preferences
      .addCase(fetchPreferences.pending, (state) => {
        state.preferencesLoading = true;
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.preferencesLoading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchPreferences.rejected, (state) => {
        state.preferencesLoading = false;
      })
      // Update preferences
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      });
  }
});

export const { addNotification, clearError } = notificationSlice.actions;
export default notificationSlice.reducer;