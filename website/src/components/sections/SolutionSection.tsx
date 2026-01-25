import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import styles from './SolutionSection.module.css';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function SolutionSection() {
  const { t } = useTranslation();
  const features = t('solution.features', { returnObjects: true }) as string[];

  return (
    <section className={styles.solution}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.content}>
            <h2 className={styles.title}>{t('solution.title')}</h2>
            <p className={styles.description}>{t('solution.description')}</p>

            <ul className={styles.features}>
              {features.map((feature, index) => (
                <li key={index}>
                  <span className={styles.check}><CheckIcon /></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.visual}>
            <img
              src="./assets/media/One-Prompt-demo-vertical.gif"
              alt="OnePrompt in action"
              className={`${styles.gif} ${styles.gifDesktop}`}
            />
            <img
              src="./assets/media/OnePrompt-demo.gif"
              alt="OnePrompt in action"
              className={`${styles.gif} ${styles.gifMobile}`}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
