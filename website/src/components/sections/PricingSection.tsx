import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import styles from './PricingSection.module.css';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DiamondIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.84L18.26 9 12 18.54 5.74 9 12 5.84z"/>
  </svg>
);

type FeatureType = 'included' | 'excluded' | 'premium';

interface FeatureItem {
  text: string;
  type: FeatureType;
}

export function PricingSection() {
  const { t } = useTranslation();
  const githubFeatures = t('pricing.github.features', { returnObjects: true }) as FeatureItem[];
  const desktopFeatures = t('pricing.desktop.features', { returnObjects: true }) as FeatureItem[];

  const getIcon = (type: FeatureType) => {
    switch (type) {
      case 'included':
        return <CheckIcon />;
      case 'excluded':
        return <CrossIcon />;
      case 'premium':
        return <DiamondIcon />;
    }
  };

  return (
    <section className={styles.pricing} id="pricing">
      <Container>
        <h2 className={styles.title}>{t('pricing.title')}</h2>

        <div className={styles.grid}>
          {/* GitHub Edition - LEFT */}
          <Card className={styles.card}>
            <div className={styles.header}>
              <h3>{t('pricing.github.title')}</h3>
            </div>

            <div className={styles.priceSection}>
              <div className={styles.price}>
                <span className={styles.amount}>{t('pricing.github.price')}</span>
              </div>
              <p className={styles.subtitle}>{t('pricing.github.subtitle')}</p>
            </div>

            <ul className={styles.features}>
              {githubFeatures.map((feature, index) => (
                <li key={index} className={styles[feature.type]}>
                  {getIcon(feature.type)}
                  {feature.text}
                </li>
              ))}
            </ul>

            <Button
              href="https://github.com/calabr93/one-prompt"
              variant="ghost"
              size="large"
              className={styles.cta}
            >
              {t('pricing.github.cta')}
            </Button>
          </Card>

          {/* OnePrompt Desktop - RIGHT (Highlighted) */}
          <Card variant="highlighted" className={`${styles.card} ${styles.desktopCard}`}>
            <div className={styles.recommendedBadge}>{t('pricing.desktop.recommendedBadge')}</div>
            <div className={styles.header}>
              <h3>{t('pricing.desktop.title')}</h3>
            </div>

            <div className={styles.priceSection}>
              <div className={styles.price}>
                <span className={styles.amountFree}>{t('pricing.desktop.price')}</span>
              </div>
              <p className={styles.subtitle}>{t('pricing.desktop.subtitle')}</p>
            </div>

            <ul className={styles.features}>
              {desktopFeatures.map((feature, index) => (
                <li key={index} className={styles[feature.type]}>
                  {getIcon(feature.type)}
                  {feature.text}
                </li>
              ))}
            </ul>

            <Button
              href="#download"
              size="large"
              className={styles.ctaPrimary}
            >
              {t('pricing.desktop.cta')}
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
