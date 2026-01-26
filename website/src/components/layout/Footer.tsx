import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from './Container';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer className={styles.footer}>
        <Container>
          <div className={styles.content}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <img src="./assets/logo/logo.png" alt="OnePrompt" />
                <span>OnePrompt</span>
              </div>
              <p className={styles.tagline}>{t('footer.tagline')}</p>
            </div>

            <div className={styles.links}>
              <a
                href="https://github.com/calabr93/one-prompt"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://github.com/calabr93/one-prompt/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('footer.reportBug')}
              </a>
              <a
                href="https://buy.stripe.com/28E6oIcRUcc0cE48oO2wU04"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('footer.support')}
              </a>
            </div>
          </div>

          <div className={styles.bottom}>
            <p className={styles.copyright}>© 2026 OnePrompt • {t('footer.copyright')}</p>
            <a href="mailto:info@one-prompt.app" className={styles.emailLink}>info@one-prompt.app</a>
            <p className={styles.license}>{t('footer.license')}</p>
            <p className={styles.builtIn}>
              <button
                type="button"
                className={styles.legalLink}
                onClick={() => setShowPrivacy(true)}
              >
                {t('footer.privacyPolicy')}
              </button>
              {' • '}
              <button
                type="button"
                className={styles.legalLink}
                onClick={() => setShowTerms(true)}
              >
                {t('footer.termsOfService')}
              </button>
            </p>
          </div>
        </Container>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className={styles.modalOverlay} onClick={() => setShowPrivacy(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setShowPrivacy(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2>{t('footer.privacyPolicy')}</h2>
            <div className={styles.modalContent}>
              <p><strong>{t('privacy.lastUpdated')}</strong></p>

              <h3>{t('privacy.intro.title')}</h3>
              <p>{t('privacy.intro.text')}</p>

              <h3>{t('privacy.dataCollection.title')}</h3>
              <p>{t('privacy.dataCollection.text')}</p>
              <ul>
                <li>{t('privacy.dataCollection.item1')}</li>
                <li>{t('privacy.dataCollection.item2')}</li>
                <li>{t('privacy.dataCollection.item3')}</li>
              </ul>

              <h3>{t('privacy.dataStorage.title')}</h3>
              <p>{t('privacy.dataStorage.text')}</p>

              <h3>{t('privacy.thirdParty.title')}</h3>
              <p>{t('privacy.thirdParty.text')}</p>

              <h3>{t('privacy.apiKeys.title')}</h3>
              <p>{t('privacy.apiKeys.text')}</p>

              <h3>{t('privacy.proFeatures.title')}</h3>
              <p>{t('privacy.proFeatures.text')}</p>

              <h3>{t('privacy.rights.title')}</h3>
              <p>{t('privacy.rights.text')}</p>

              <h3>{t('privacy.contact.title')}</h3>
              <p>{t('privacy.contact.text')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className={styles.modalOverlay} onClick={() => setShowTerms(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setShowTerms(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2>{t('footer.termsOfService')}</h2>
            <div className={styles.modalContent}>
              <p><strong>{t('terms.lastUpdated')}</strong></p>

              <h3>{t('terms.acceptance.title')}</h3>
              <p>{t('terms.acceptance.text')}</p>

              <h3>{t('terms.license.title')}</h3>
              <p>{t('terms.license.text')}</p>
              <ul>
                <li>{t('terms.license.item1')}</li>
                <li>{t('terms.license.item2')}</li>
              </ul>

              <h3>{t('terms.proFeatures.title')}</h3>
              <p>{t('terms.proFeatures.text')}</p>

              <h3>{t('terms.usage.title')}</h3>
              <p>{t('terms.usage.text')}</p>
              <ul>
                <li>{t('terms.usage.item1')}</li>
                <li>{t('terms.usage.item2')}</li>
                <li>{t('terms.usage.item3')}</li>
                <li>{t('terms.usage.item4')}</li>
              </ul>

              <h3>{t('terms.thirdParty.title')}</h3>
              <p>{t('terms.thirdParty.text')}</p>

              <h3>{t('terms.disclaimer.title')}</h3>
              <p>{t('terms.disclaimer.text')}</p>

              <h3>{t('terms.limitation.title')}</h3>
              <p>{t('terms.limitation.text')}</p>

              <h3>{t('terms.changes.title')}</h3>
              <p>{t('terms.changes.text')}</p>

              <h3>{t('terms.governing.title')}</h3>
              <p>{t('terms.governing.text')}</p>

              <h3>{t('terms.contact.title')}</h3>
              <p>{t('terms.contact.text')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
