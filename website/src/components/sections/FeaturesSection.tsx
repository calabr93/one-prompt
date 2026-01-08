import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import styles from './FeaturesSection.module.css';

const icons = [
  // One Prompt Everywhere
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>,
  // Side-by-Side
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <rect x="3" y="3" width="7" height="18" rx="1"/>
    <rect x="14" y="3" width="7" height="18" rx="1"/>
  </svg>,
  // Two Modes
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
  </svg>,
  // Privacy
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>,
  // Sessions
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
  </svg>,
  // Open Source
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
  </svg>,
];

interface FeatureItem {
  title: string;
  description: string;
}

export function FeaturesSection() {
  const { t } = useTranslation();
  const features = t('features.items', { returnObjects: true }) as FeatureItem[];

  return (
    <section className={styles.features} id="features">
      <Container>
        <h2 className={styles.title}>{t('features.title')}</h2>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <Card key={index} variant="feature">
              <div className={styles.icon}>{icons[index]}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
