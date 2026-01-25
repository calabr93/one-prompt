import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import { FAQItem } from '../ui/FAQItem';
import styles from './FAQSection.module.css';

interface FAQItemData {
  question: string;
  answer: string;
}

export function FAQSection() {
  const { t } = useTranslation();
  const items = t('faq.items', { returnObjects: true }) as FAQItemData[];

  return (
    <section className={styles.faq}>
      <Container>
        <h2 className={styles.title}>{t('faq.title')}</h2>

        <div className={styles.list}>
          {items.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
