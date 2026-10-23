import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import styles from './SendToComputer.module.css';
import '../../types/posthog.d';

const DOWNLOAD_URL = 'https://one-prompt.app/#download';

const trackSend = (method: 'share' | 'copy') => {
  if (typeof window.posthog?.capture === 'function') {
    window.posthog.capture('send_to_computer', { method, section: 'cta' });
  }
};

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2 15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function SendToComputer() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const addressRef = useRef<HTMLParagraphElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(DOWNLOAD_URL);
      setCopied(true);
      trackSend('copy');
    } catch {
      // Clipboard refused: select the address so it can be copied from the system menu.
      const range = document.createRange();
      if (addressRef.current) range.selectNodeContents(addressRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  };

  const shareLink = async () => {
    if (typeof navigator.share !== 'function') {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: 'OnePrompt', text: t('sendToComputer.shareText'), url: DOWNLOAD_URL });
      trackSend('share');
    } catch {
      // The share sheet was closed without sending.
    }
  };

  return (
    <div className={styles.box}>
      <p className={styles.title}>{t('sendToComputer.title')}</p>
      <p className={styles.text}>{t('sendToComputer.text')}</p>
      <div className={styles.actions}>
        <Button size="large" icon={<SendIcon />} onClick={shareLink}>
          {t('sendToComputer.share')}
        </Button>
        <Button size="large" variant="secondary" onClick={copyLink}>
          {copied ? t('sendToComputer.copied') : t('sendToComputer.copy')}
        </Button>
      </div>
      <p className={styles.address} ref={addressRef}>one-prompt.app</p>
      <p className={styles.or}>{t('sendToComputer.orDownload')}</p>
    </div>
  );
}
