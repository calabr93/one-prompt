import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CookieBanner.module.css';

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

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
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
