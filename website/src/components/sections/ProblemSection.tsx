import { useTranslation } from 'react-i18next';
import { Container } from '../layout/Container';
import styles from './ProblemSection.module.css';

export function ProblemSection() {
  const { t } = useTranslation();

  return (
    <section className={styles.problem}>
      <Container>
        <h2 className={styles.title}>{t('problem.title')}</h2>
        <p className={styles.subtitle}>{t('problem.subtitle')}</p>
      </Container>

      {/* Before/After Visual */}
      <div className={styles.beforeAfterContainer}>
        {/* BEFORE Card - Overlapping windows with chaotic cursor */}
        <div className={styles.beforeCard}>
          <div className={styles.cardLabel}>{t('problem.before')}</div>
          <div className={styles.chaosContainer}>
            {/* Floating problem badges */}
            <div className={`${styles.problemBadge} ${styles.badge1}`}>{t('problem.comparisonFatigue')}</div>
            <div className={`${styles.problemBadge} ${styles.badge2}`}>{t('problem.copyPasteLoop')}</div>
            <div className={`${styles.problemBadge} ${styles.badge3}`}>{t('problem.tabOverload')}</div>
            <div className={`${styles.problemBadge} ${styles.badge4}`}>{t('problem.inconsistentOutputs')}</div>
            
            {/* Overlapping browser windows */}
            <div className={`${styles.browserWindow} ${styles.windowChatGPT}`}>
              <div className={styles.windowHeader}>
                <div className={styles.windowDots}>
                  <span></span><span></span><span></span>
                </div>
                <span className={styles.windowTitle}>ChatGPT</span>
              </div>
              <div className={styles.windowContent}>
                <div className={styles.textLine}></div>
                <div className={styles.textLine} style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div className={`${styles.browserWindow} ${styles.windowClaude}`}>
              <div className={styles.windowHeader}>
                <div className={styles.windowDots}>
                  <span></span><span></span><span></span>
                </div>
                <span className={styles.windowTitle}>Claude</span>
              </div>
              <div className={styles.windowContent}>
                <div className={styles.textLine}></div>
                <div className={styles.textLine} style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div className={`${styles.browserWindow} ${styles.windowGemini}`}>
              <div className={styles.windowHeader}>
                <div className={styles.windowDots}>
                  <span></span><span></span><span></span>
                </div>
                <span className={styles.windowTitle}>Gemini</span>
              </div>
              <div className={styles.windowContent}>
                <div className={styles.textLine}></div>
                <div className={styles.textLine} style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div className={`${styles.browserWindow} ${styles.windowPerplexity}`}>
              <div className={styles.windowHeader}>
                <div className={styles.windowDots}>
                  <span></span><span></span><span></span>
                </div>
                <span className={styles.windowTitle}>Perplexity</span>
              </div>
              <div className={styles.windowContent}>
                <div className={styles.textLine}></div>
                <div className={styles.textLine} style={{ width: '70%' }}></div>
              </div>
            </div>
            
            {/* Animated cursor */}
            <div className={styles.cursor}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4l16 8-7 2-2 7z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className={styles.arrow}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* AFTER Card - Single window with horizontal layout */}
        <div className={styles.afterCard}>
          <div className={styles.cardLabel}>{t('problem.after')}</div>
          <div className={styles.appWindow}>
            {/* macOS-style window header */}
            <div className={styles.appWindowHeader}>
              <div className={styles.windowDots}>
                <span></span><span></span><span></span>
              </div>
              <div className={styles.appTitle}>
                <span className={styles.logoIcon}>⬡</span>
                OnePrompt
              </div>
              <div className={styles.sessionTabs}>
                <span className={styles.sessionTab}>{t('problem.session')} 1</span>
                <span className={styles.sessionTabInactive}>+</span>
              </div>
            </div>
            {/* Horizontal AI panels */}
            <div className={styles.horizontalPanels}>
              <div className={`${styles.hPanel} ${styles.hPanelChatGPT}`}>
                <div className={styles.hPanelHeader}>
                  <span className={styles.panelDot}></span>
                  ChatGPT
                </div>
                <div className={styles.hPanelBody}>
                  <div className={styles.textLine}></div>
                  <div className={styles.textLine} style={{ width: '85%' }}></div>
                  <div className={styles.textLine} style={{ width: '70%' }}></div>
                </div>
              </div>
              <div className={`${styles.hPanel} ${styles.hPanelClaude}`}>
                <div className={styles.hPanelHeader}>
                  <span className={styles.panelDot}></span>
                  Claude
                </div>
                <div className={styles.hPanelBody}>
                  <div className={styles.textLine}></div>
                  <div className={styles.textLine} style={{ width: '75%' }}></div>
                  <div className={styles.textLine} style={{ width: '90%' }}></div>
                </div>
              </div>
              <div className={`${styles.hPanel} ${styles.hPanelGemini}`}>
                <div className={styles.hPanelHeader}>
                  <span className={styles.panelDot}></span>
                  Gemini
                </div>
                <div className={styles.hPanelBody}>
                  <div className={styles.textLine}></div>
                  <div className={styles.textLine} style={{ width: '80%' }}></div>
                  <div className={styles.textLine} style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className={`${styles.hPanel} ${styles.hPanelPerplexity}`}>
                <div className={styles.hPanelHeader}>
                  <span className={styles.panelDot}></span>
                  Perplexity
                </div>
                <div className={styles.hPanelBody}>
                  <div className={styles.textLine}></div>
                  <div className={styles.textLine} style={{ width: '70%' }}></div>
                  <div className={styles.textLine} style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.successIndicator}>
            <span className={styles.checkIcon}>✓</span>
            <span>{t('problem.allInOneView')}</span>
          </div>
        </div>
      </div>

      <Container>
        <p className={styles.solution}>{t('problem.solution')}</p>
        <p className={styles.tagline}>{t('problem.tagline')}</p>
      </Container>
    </section>
  );
}
