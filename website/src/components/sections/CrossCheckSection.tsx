import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import styles from './CrossCheckSection.module.css';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32" fill="currentColor">
    <path
      d="M24.414,16.586L30.828,23l-6.414,6.414l-2.828-2.828L23.172,25H22c-3.924,0-6.334-2.289-8.173-4.747c0.987-1.097,1.799-2.285,2.516-3.36C18.109,19.46,19.521,21,22,21h1.172l-1.586-1.586L24.414,16.586z M22,11h1.172l-1.586,1.586l2.828,2.828L30.828,9l-6.414-6.414l-2.828,2.828L23.172,7H22c-5.07,0-7.617,3.82-9.664,6.891C10.224,17.059,8.788,19,6,19H2v4h4c5.07,0,7.617-3.82,9.664-6.891C17.776,12.941,19.212,11,22,11z M10.212,15.191c0.399-0.539,1.957-2.848,2.322-3.365C10.917,10.216,8.86,9,6,9H2v4h4C7.779,13,9.007,13.797,10.212,15.191z" />
  </svg>
);

export function CrossCheckSection() {
  const { t } = useTranslation();
  const features = t('crossCheck.features', { returnObjects: true }) as string[];

  return (
    <section className={styles.crossCheck}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.visual}>
            <div className={styles.iconWrapper}>
              <CrossCheckIcon />
            </div>
            <img
              src="./assets/media/OnePrompt-cross-check.gif"
              alt="Cross-Check feature demo"
              className={styles.demoGif}
            />
          </div>

          <div className={styles.content}>
            <span className={styles.badge}>{t('crossCheck.title')}</span>
            <div className={styles.iconWrapperMobile}>
              <CrossCheckIcon />
            </div>
            <h2 className={styles.title}>{t('crossCheck.subtitle')}</h2>
            <p className={styles.description}>{t('crossCheck.description')}</p>

            <div className={styles.visualMobile}>
              <img
                src="./assets/media/OnePrompt-cross-check.gif"
                alt="Cross-Check feature demo"
                className={styles.demoGif}
              />
            </div>

            <ul className={styles.features}>
              {features.map((feature, index) => (
                <li key={index}>
                  <span className={styles.check}><CheckIcon /></span>
                  {feature}
                </li>
              ))}
            </ul>

            <a href="#/prompts" className={styles.promptsLink}>
              {t('crossCheck.viewPrompts')}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
