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

  // PostHog is initialized in index.html (official domain only); here we just pass the choice on
  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
    window.posthog?.opt_in_capturing();
    window.posthog?.startSessionRecording();
  };

  const handleDeny = () => {
    localStorage.setItem('cookieConsent', 'false');
    setIsVisible(false);
    // Switches PostHog to cookieless mode: anonymous pageviews/referrers, no stored identity
    window.posthog?.opt_out_capturing();
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
