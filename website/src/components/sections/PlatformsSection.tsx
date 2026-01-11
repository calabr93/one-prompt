import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import styles from './PlatformsSection.module.css';

const apiPlatforms = [
  { name: 'ChatGPT', logo: 'chatgpt.png' },
  { name: 'Claude', logo: 'claude.png' },
  { name: 'Gemini', logo: 'gemini.png' },
  { name: 'Grok', logo: 'grok.png' },
];

const injectionPlatforms = [
  { name: 'ChatGPT', logo: 'chatgpt.png' },
  { name: 'Claude', logo: 'claude.png' },
  { name: 'Gemini', logo: 'gemini.png' },
  { name: 'Grok', logo: 'grok.png' },
  { name: 'DeepSeek', logo: 'deepseek.png' },
  { name: 'Perplexity', logo: 'perplexity.png' },
];

export function PlatformsSection() {
  const { t } = useTranslation();

  return (
    <section className={styles.platforms}>
      <Container>
        <h2 className={styles.title}>{t('platforms.title')}</h2>

        <div className={styles.groups}>
          <div className={styles.group}>
            <h3>{t('platforms.api')}</h3>
            <div className={styles.logos}>
              {apiPlatforms.map((platform) => (
                <div key={platform.name} className={styles.platform}>
                  <img
                    src={`./assets/ai-services/${platform.logo}`}
                    alt={platform.name}
                  />
                  <span>{platform.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <h3>{t('platforms.injection')}</h3>
            <div className={styles.logos}>
              {injectionPlatforms.map((platform) => (
                <div key={platform.name} className={styles.platform}>
                  <img
                    src={`./assets/ai-services/${platform.logo}`}
                    alt={platform.name}
                  />
                  <span>{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
