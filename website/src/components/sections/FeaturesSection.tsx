import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import styles from './FeaturesSection.module.css';

const icons = [
  // All AIs in one window
  <svg viewBox="0 -16 544 544" fill="currentColor" width="32" height="32">
    <path d="M336 48C336 30.3269 321.673 16 304 16L240 16C222.327 16 208 30.3269 208 48L208 168.781C191.576 204.561 171.382 242.914 150.776 269.309C130.007 295.913 96.5681 326.066 66.9006 350.421C65.8889 351.251 64.8839 352.073 63.8863 352.886L27.3137 316.314C17.2343 306.234 0 313.373 0 327.627V433C0 441.837 7.16345 449 16 449H121.373C135.627 449 142.766 431.766 132.686 421.686L109.363 398.363C139.35 373.639 176.387 340.506 201.224 308.691C215.051 290.979 228.151 269.765 240 248.021V384H190.879C168.841 384 158.455 411.213 174.888 425.896L255.342 497.785C264.414 505.892 278.117 505.927 287.231 497.868L368.528 425.979C385.082 411.34 374.728 384 352.629 384H304V248.021C315.849 269.765 328.949 290.979 342.776 308.691C367.613 340.506 404.65 373.639 434.637 398.363L411.314 421.686C401.234 431.766 408.373 449 422.627 449H528C536.837 449 544 441.837 544 433V327.627C544 313.373 526.766 306.234 516.686 316.314L480.114 352.886C479.116 352.073 478.111 351.251 477.099 350.421C447.432 326.066 413.993 295.913 393.224 269.309C372.618 242.914 352.424 204.561 336 168.781V48Z"/>
  </svg>,
  // Side-by-Side
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <rect x="3" y="3" width="7" height="18" rx="1"/>
    <rect x="14" y="3" width="7" height="18" rx="1"/>
  </svg>,
  // Cross-Check (icon from app crossCheckBtn)
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
    <path d="M24.414,16.586L30.828,23l-6.414,6.414l-2.828-2.828L23.172,25H22c-3.924,0-6.334-2.289-8.173-4.747c0.987-1.097,1.799-2.285,2.516-3.36C18.109,19.46,19.521,21,22,21h1.172l-1.586-1.586L24.414,16.586z M22,11h1.172l-1.586,1.586l2.828,2.828L30.828,9l-6.414-6.414l-2.828,2.828L23.172,7H22c-5.07,0-7.617,3.82-9.664,6.891C10.224,17.059,8.788,19,6,19H2v4h4c5.07,0,7.617-3.82,9.664-6.891C17.776,12.941,19.212,11,22,11z M10.212,15.191c0.399-0.539,1.957-2.848,2.322-3.365C10.917,10.216,8.86,9,6,9H2v4h4C7.779,13,9.007,13.797,10.212,15.191z" />
  </svg>,
  // Two Modes (slider toggles)
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
    <rect x="16" y="16" width="224" height="224" rx="32"/>
    <path d="M64 64H80"/>
    <circle cx="96" cy="64" r="16"/>
    <path d="M112 64H192"/>
    <path d="M192 128H176"/>
    <circle cx="160" cy="128" r="16"/>
    <path d="M144 128H64"/>
    <path d="M64 192H80"/>
    <circle cx="96" cy="192" r="16"/>
    <path d="M112 192H192"/>
  </svg>,
  // Sessions
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
  </svg>,
  // Privacy
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
