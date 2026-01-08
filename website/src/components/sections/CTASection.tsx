import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import styles from './CTASection.module.css';

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const WindowsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
  </svg>
);

export function CTASection() {
  const { t } = useTranslation();

  return (
    <section className={styles.cta} id="download">
      <Container>
        <div className={styles.content}>
          <h2>{t('cta.title')}</h2>
          <p>{t('cta.subtitle')}</p>

          <div className={styles.buttons}>
            <Button
              href="https://github.com/calabr93/one-prompt/releases/latest"
              size="large"
              icon={<AppleIcon />}
            >
              macOS (DMG)
            </Button>
            <Button
              href="https://github.com/calabr93/one-prompt/releases/latest"
              size="large"
              variant="secondary"
              icon={<WindowsIcon />}
            >
              Windows (EXE)
            </Button>
          </div>

          <a
            href="https://github.com/calabr93/one-prompt"
            className={styles.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('cta.github')}
          </a>
        </div>
      </Container>
    </section>
  );
}
