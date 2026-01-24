import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CookieBanner.module.css';
import '../../types/posthog.d';

export function CookieBanner() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Small delay to not overwhelm user immediately
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const initPostHog = () => {
    const isOfficialDomain = window.location.hostname === 'one-prompt.app' || window.location.hostname === 'www.one-prompt.app';
    if (isOfficialDomain && window.posthog && !window.posthog.__loaded) {
      window.posthog.init('__POSTHOG_API_KEY__', {
        api_host: '__POSTHOG_HOST__',
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        enable_heatmaps: true,
        persistence: 'localStorage+cookie',
        session_recording: {
          maskAllInputs: false,
          maskInputOptions: {
            password: true
          }
        },
        loaded: (posthog: typeof window.posthog) => {
          posthog?.register({ source: 'website', platform: 'website' });
          posthog?.startSessionRecording();
        }
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
    // Initialize PostHog after consent
    initPostHog();
  };

  const handleDeny = () => {
    localStorage.setItem('cookieConsent', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner}>
      <p className={styles.message}>{t('cookie.message')}</p>
      <div className={styles.actions}>
        <button className={styles.buttonSecondary} onClick={handleDeny}>
          {t('cookie.deny')}
        </button>
        <button className={styles.button} onClick={handleAccept}>
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
}
