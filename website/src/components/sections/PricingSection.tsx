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

interface FeatureItem {
  text: string;
  included: boolean;
}

export function PricingSection() {
  const { t } = useTranslation();
  const freeFeatures = t('pricing.free.features', { returnObjects: true }) as FeatureItem[];
  const proFeatures = t('pricing.pro.features', { returnObjects: true }) as FeatureItem[];

  return (
    <section className={styles.pricing} id="pricing">
      <Container>
        <h2 className={styles.title}>{t('pricing.title')}</h2>

        <div className={styles.grid}>
          {/* Free Plan - LEFT */}
          <Card className={styles.card}>
            <div className={styles.header}>
              <h3>{t('pricing.free.title')}</h3>
              <span className={styles.openSourceBadge}>Open Source</span>
            </div>

            <div className={styles.priceSection}>
              <div className={styles.price}>
                <span className={styles.amount}>{t('pricing.free.price')}</span>
                <span className={styles.period}>{t('pricing.free.priceLabel')}</span>
              </div>
            </div>

            <ul className={styles.features}>
              {freeFeatures.map((feature, index) => (
                <li key={index} className={feature.included ? styles.included : styles.excluded}>
                  {feature.included ? <CheckIcon /> : <CrossIcon />}
                  {feature.text}
                </li>
              ))}
            </ul>

            <Button
              href="https://github.com/calabr93/one-prompt"
              variant="secondary"
              size="large"
              className={styles.cta}
            >
              {t('pricing.free.cta')}
            </Button>
          </Card>

          {/* PRO Plan - RIGHT (Highlighted) */}
          <Card variant="highlighted" className={`${styles.card} ${styles.proCard}`}>
            <div className={styles.header}>
              <h3>{t('pricing.pro.title')}</h3>
              <span className={styles.noBadge}>{t('pricing.pro.badge')}</span>
            </div>

            <div className={styles.priceSection}>
              <div className={styles.price}>
                <span className={styles.startingFrom}>{t('pricing.pro.startingFrom')}</span>
                <span className={styles.amount}>{t('pricing.pro.price')}</span>
              </div>
            </div>

            <ul className={styles.features}>
              {proFeatures.map((feature, index) => (
                <li key={index} className={styles.included}>
                  <CheckIcon />
                  {feature.text}
                </li>
              ))}
            </ul>

            <Button
              href="#download"
              size="large"
              className={styles.cta}
            >
              {t('pricing.pro.cta')}
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
