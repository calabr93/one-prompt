import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import styles from './HeroSection.module.css';

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z"/>
  </svg>
);

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className={styles.hero}>
      <Container>
        <div className={styles.content}>
          <Badge variant="accent">{t('hero.badge')}</Badge>
          <h1 className={styles.headline}>{t('hero.headline')}</h1>
          <p className={styles.subheadline}>{t('hero.subheadline')}</p>

          <div className={styles.ctas}>
            <Button
              href="#download"
              size="large"
              icon={<DownloadIcon />}
            >
              {t('hero.cta.download')}
            </Button>
          </div>

          <a
            href="https://github.com/calabr93/one-prompt"
            className={styles.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('hero.github')} →
          </a>
        </div>

        <div className={styles.demo}>
          <img
            src="./assets/demo/OnePrompt-demo.gif"
            alt="OnePrompt Demo"
            className={styles.demoImage}
          />
        </div>
      </Container>
    </section>
  );
}
