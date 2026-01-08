import { useTranslation } from 'react-i18next';
import { Container } from './Container';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.content}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <img src="./assets/logo/logo.png" alt="OnePrompt" />
              <span>OnePrompt</span>
            </div>
            <p className={styles.tagline}>{t('footer.tagline')}</p>
          </div>

          <div className={styles.links}>
            <a
              href="https://github.com/calabr93/one-prompt"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://github.com/calabr93/one-prompt/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.reportBug')}
            </a>
            <a
              href="https://buy.stripe.com/28E6oIcRUcc0cE48oO2wU04"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.support')}
            </a>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>
            &copy; {currentYear} Fabio Calabretta - {t('footer.copyright')}
          </p>
        </div>
      </Container>
    </footer>
  );
}
