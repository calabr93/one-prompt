import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { Card } from '../ui/Card';
import styles from './ProblemSection.module.css';

export function ProblemSection() {
  const { t } = useTranslation();
  const steps = t('problem.steps', { returnObjects: true }) as string[];

  return (
    <section className={styles.problem}>
      <Container>
        <h2 className={styles.title}>{t('problem.title')}</h2>

        <div className={styles.steps}>
          {steps.map((step, index) => (
            <Card key={index} className={styles.step}>
              <span className={styles.number}>{index + 1}</span>
              <p>{step}</p>
            </Card>
          ))}
        </div>

        <p className={styles.closing}>{t('problem.closing')}</p>
      </Container>
    </section>
  );
}
