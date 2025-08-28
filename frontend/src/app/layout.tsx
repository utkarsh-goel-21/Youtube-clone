'use client';

import { useEffect } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import * as serviceWorkerRegistration from '../utils/serviceWorkerRegistration';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize dark mode from localStorage
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Register service worker
    serviceWorkerRegistration.register({
      onSuccess: (registration) => {
        console.log('Service Worker registered successfully:', registration);
      },
      onUpdate: (registration) => {
        console.log('Service Worker updated:', registration);
      },
      onError: (error) => {
        console.error('Service Worker registration failed:', error);
      }
    });

    // Check if app is installable
    serviceWorkerRegistration.checkInstallable();
    
    // Request notification permission after user interaction
    setTimeout(() => {
      serviceWorkerRegistration.requestNotificationPermission();
    }, 5000);
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider store={store}>
          <div id="root">
            {children}
          </div>
        </Provider>
      </body>
    </html>
  );
}