import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import styles from './PromptsPage.module.css';

const MAX_CHARS = 280;

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface Prompt {
  title: string;
  content: string;
}

// Parse prompts from markdown file
function parsePrompts(markdown: string): Prompt[] {
  return markdown
    .split('---')
    .slice(1) // Skip header before first ---
    .map(section => section.trim())
    .filter(section => section && section.includes('{{OTHER_RESPONSES}}'))
    .map(section => {
      // Check if section starts with a title (## Title)
      const lines = section.split('\n');
      if (lines[0].startsWith('## ')) {
        return {
          title: lines[0].replace('## ', '').trim(),
          content: lines.slice(1).join('\n').trim()
        };
      }
      return {
        title: '',
        content: section
      };
    });
}

function PromptCard({ prompt, index, copiedIndex, onCopy, t }: {
  prompt: Prompt;
  index: number;
  copiedIndex: number | null;
  onCopy: (content: string, index: number) => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = prompt.content.length > MAX_CHARS;
  const displayText = expanded || !isLong ? prompt.content : prompt.content.slice(0, MAX_CHARS) + '...';

  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div
      className={`${styles.card} ${copiedIndex === index ? styles.copied : ''}`}
      onClick={() => onCopy(prompt.content, index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onCopy(prompt.content, index);
        }
      }}
    >
      <div className={styles.cardHeader}>
        {prompt.title && <h3 className={styles.cardTitle}>{prompt.title}</h3>}
        <span className={styles.copyIcon}>
          {copiedIndex === index ? <CheckIcon /> : <CopyIcon />}
        </span>
      </div>
      <p className={styles.cardPrompt}>{displayText}</p>
      {isLong && (
        <button className={styles.readMore} onClick={handleReadMore}>
          {expanded ? t('promptsPage.readLess') : t('promptsPage.readMore')}
        </button>
      )}
      <span className={styles.clickHint}>{t('promptsPage.clickToCopy')}</span>
    </div>
  );
}

export function PromptsPage() {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    fetch('./data/prompts.md')
      .then(res => res.text())
      .then(text => setPrompts(parsePrompts(text)))
      .catch(err => console.error('Failed to load prompts:', err));
  }, []);

  const copyToClipboard = async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIndex(index);
      setNotification(t('promptsPage.copied'));
      
      setTimeout(() => {
        setCopiedIndex(null);
        setNotification(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <Container>
          <div className={styles.header}>
            <a href="#/" className={styles.backLink}>
              ← {t('promptsPage.back')}
            </a>
            <h1 className={styles.title}>{t('promptsPage.title')}</h1>
            <p className={styles.subtitle}>{t('promptsPage.subtitle')}</p>
          </div>

          <div className={styles.grid}>
            {prompts.map((prompt, index) => (
              <PromptCard
                key={index}
                prompt={prompt}
                index={index}
                copiedIndex={copiedIndex}
                onCopy={copyToClipboard}
                t={t}
              />
            ))}
          </div>
        </Container>
      </main>
      <Footer />

      {notification && (
        <div className={styles.notification}>
          <CheckIcon />
          {notification}
        </div>
      )}
    </>
  );
}
