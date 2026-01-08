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

export function PricingSection() {
  const { t } = useTranslation();
  const freeFeatures = t('pricing.free.features', { returnObjects: true }) as string[];
  const cloudFeatures = t('pricing.cloud.features', { returnObjects: true }) as string[];

  return (
    <section className={styles.pricing} id="pricing">
      <Container>
        <h2 className={styles.title}>{t('pricing.title')}</h2>

        <div className={styles.grid}>
          {/* Free Plan */}
          <Card variant="highlighted" className={styles.card}>
            <div className={styles.header}>
              <h3>{t('pricing.free.title')}</h3>
              <span className={styles.subtitle}>{t('pricing.free.subtitle')}</span>
            </div>

            <div className={styles.price}>
              <span className={styles.amount}>{t('pricing.free.price')}</span>
              <span className={styles.period}>{t('pricing.free.priceLabel')}</span>
            </div>

            <ul className={styles.features}>
              {freeFeatures.map((feature, index) => (
                <li key={index}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              href="https://github.com/calabr93/one-prompt/releases/latest"
              size="large"
              className={styles.cta}
            >
              {t('pricing.free.cta')}
            </Button>
          </Card>

          {/* Cloud Plan */}
          <Card className={styles.card}>
            <div className={styles.header}>
              <h3>{t('pricing.cloud.title')}</h3>
            </div>

            <div className={styles.price}>
              <span className={styles.startingFrom}>{t('pricing.cloud.startingFrom')}</span>
              <span className={styles.amount}>{t('pricing.cloud.price')}</span>
            </div>

            <ul className={styles.features}>
              {cloudFeatures.map((feature, index) => (
                <li key={index}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              href="#download"
              size="large"
              className={styles.cta}
            >
              {t('pricing.cloud.cta')}
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
