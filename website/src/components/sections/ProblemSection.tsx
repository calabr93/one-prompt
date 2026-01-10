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

        <div className={styles.stepsContainer}>
          {/* Row 1: Steps 1 and 2 */}
          <div className={styles.row}>
            <Card className={`${styles.step} ${styles.step1}`}>
              <span className={styles.number}>1</span>
              <p>{steps[0]}</p>
            </Card>

            <div className={styles.connectorHorizontal}>
              <span className={styles.dot} />
              <span className={styles.line} />
              <span className={styles.dot} />
            </div>

            <Card className={`${styles.step} ${styles.step2}`}>
              <span className={styles.number}>2</span>
              <p>{steps[1]}</p>
            </Card>
          </div>

          {/* Vertical connector */}
          <div className={styles.connectorVertical}>
            <span className={styles.dot} />
            <span className={styles.line} />
            <span className={styles.dot} />
          </div>

          {/* Row 2: Steps 4 and 3 (reversed for S pattern) */}
          <div className={styles.row}>
            <Card className={`${styles.step} ${styles.step4}`}>
              <span className={styles.number}>4</span>
              <p>{steps[3]}</p>
            </Card>

            <div className={styles.connectorHorizontal}>
              <span className={styles.dot} />
              <span className={styles.line} />
              <span className={styles.dot} />
            </div>

            <Card className={`${styles.step} ${styles.step3}`}>
              <span className={styles.number}>3</span>
              <p>{steps[2]}</p>
            </Card>
          </div>
        </div>

        <p className={styles.closing}>{t('problem.closing')}</p>
      </Container>
    </section>
  );
}
