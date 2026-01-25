import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import styles from './PlatformsSection.module.css';

const apiPlatforms = [
  { name: 'ChatGPT', logo: 'chatgpt.png', url: 'https://platform.openai.com/api-keys' },
  { name: 'Claude', logo: 'claude.png', url: 'https://console.anthropic.com/settings/keys' },
  { name: 'Gemini', logo: 'gemini.png', url: 'https://aistudio.google.com/apikey' },
];

const webPlatforms = [
  { name: 'ChatGPT', logo: 'chatgpt.png', url: 'https://chatgpt.com/' },
  { name: 'Claude', logo: 'claude.png', url: 'https://claude.ai/' },
  { name: 'Gemini', logo: 'gemini.png', url: 'https://gemini.google.com/' },
  { name: 'Grok', logo: 'grok.png', url: 'https://x.com/i/grok' },
  { name: 'DeepSeek', logo: 'deepseek.png', url: 'https://chat.deepseek.com/' },
  { name: 'Perplexity', logo: 'perplexity.png', url: 'https://www.perplexity.ai/' },
];

export function PlatformsSection() {
  const { t } = useTranslation();

  return (
    <section className={styles.platforms}>
      <Container>
        <h2 className={styles.title}>{t('platforms.title')}</h2>

        <div className={styles.groups}>
          <div className={styles.group}>
            <h3>{t('platforms.web')}</h3>
            <div className={styles.logos}>
              {webPlatforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.platform}
                >
                  <img
                    src={`./assets/ai-services/${platform.logo}`}
                    alt={platform.name}
                  />
                  <span>{platform.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <h3>{t('platforms.api')}</h3>
            <div className={styles.logos}>
              {apiPlatforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.platform}
                >
                  <img
                    src={`./assets/ai-services/${platform.logo}`}
                    alt={platform.name}
                  />
                  <span>{platform.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
