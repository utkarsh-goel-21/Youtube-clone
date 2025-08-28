'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Settings, User, Bell, Shield, Moon, Globe, 
  ArrowLeft, Save, Eye, EyeOff 
} from 'lucide-react';
import { RootState } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/services/api';

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [accountForm, setAccountForm] = useState({
    username: '',
    email: '',
    channelName: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    language: 'en',
    autoplay: true,
    privateAccount: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    if (user) {
      setAccountForm({
        username: user.username || '',
        email: user.email || '',
        channelName: user.channelName || user.username || ''
      });
    }
    
    // Load saved preferences
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedLanguage = localStorage.getItem('language') || 'en';
    const savedAutoplay = localStorage.getItem('autoplay') !== 'false';
    
    setPreferences(prev => ({
      ...prev,
      darkMode: savedDarkMode,
      language: savedLanguage,
      autoplay: savedAutoplay
    }));
    
    // Apply dark mode
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, [isAuthenticated, user]);

  const handleUpdateAccount = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await api.put(`/users/${user.id}`, accountForm);
      alert('Account updated successfully!');
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }
    
    try {
      setLoading(true);
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      alert('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password. Check your current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };
  
  const handleDarkModeChange = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, darkMode: enabled }));
    localStorage.setItem('darkMode', enabled.toString());
    
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  const handleLanguageChange = (language: string) => {
    setPreferences(prev => ({ ...prev, language }));
    localStorage.setItem('language', language);
    // In a real app, you would trigger language change here
    alert(`Language changed to ${language}`);
  };
  
  const handleAutoplayChange = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, autoplay: enabled }));
    localStorage.setItem('autoplay', enabled.toString());
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        } lg:ml-64 pt-16`}>
          <div className="container mx-auto px-4 py-6">
            {/* Back Navigation */}
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </button>
            </div>

            {/* Page Header */}
            <div className="mb-6 flex items-center gap-3">
              <Settings className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>

            <div className="flex gap-6">
              {/* Sidebar Tabs */}
              <div className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                {[
                  { id: 'account', label: 'Account', icon: User },
                  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'preferences', label: 'Preferences', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
                
                <hr className="my-4" />
                
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1">
                {activeTab === 'account' && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-6 dark:text-white">Account Settings</h2>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={accountForm.username}
                          onChange={(e) => setAccountForm({...accountForm, username: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={accountForm.email}
                          onChange={(e) => setAccountForm({...accountForm, email: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Channel Name
                        </label>
                        <input
                          type="text"
                          value={accountForm.channelName}
                          onChange={(e) => setAccountForm({...accountForm, channelName: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleUpdateAccount}
                      disabled={loading}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-6 dark:text-white">Privacy & Security</h2>
                    
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-4 dark:text-white">Change Password</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={handleUpdatePassword}
                        disabled={loading}
                        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Update Password
                      </button>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4 dark:text-white">Privacy Settings</h3>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.privateAccount}
                          onChange={(e) => setPreferences({...preferences, privateAccount: e.target.checked})}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <span className="dark:text-gray-300">Make my account private</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-6 dark:text-white">Notification Settings</h2>
                    
                    <div className="space-y-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="dark:text-gray-300">Email Notifications</span>
                        <input
                          type="checkbox"
                          checked={preferences.emailNotifications}
                          onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="dark:text-gray-300">Push Notifications</span>
                        <input
                          type="checkbox"
                          checked={preferences.pushNotifications}
                          onChange={(e) => setPreferences({...preferences, pushNotifications: e.target.checked})}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-6 dark:text-white">Preferences</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Language
                        </label>
                        <select
                          value={preferences.language}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                          <option value="de">Deutsch</option>
                          <option value="pt">Português</option>
                          <option value="ja">日本語</option>
                          <option value="zh">中文</option>
                        </select>
                      </div>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="dark:text-gray-300">Autoplay videos</span>
                        <input
                          type="checkbox"
                          checked={preferences.autoplay}
                          onChange={(e) => handleAutoplayChange(e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="dark:text-gray-300">Dark Mode</span>
                        <button
                          onClick={() => handleDarkModeChange(!preferences.darkMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.darkMode ? 'bg-red-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              preferences.darkMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}