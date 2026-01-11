import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../ui/LanguageToggle';
import { Button } from '../ui/Button';
import styles from './Navbar.module.css';

export function Navbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <a href="#" className={styles.logo}>
          <img src="./assets/logo/logo.png" alt="OnePrompt" />
          <span>OnePrompt</span>
        </a>

        <div className={styles.mobileControls}>
          <LanguageToggle />
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <div className={`${styles.nav} ${mobileMenuOpen ? styles.open : ''}`}>
          <a href="#features" className={styles.link} onClick={() => setMobileMenuOpen(false)}>
            {t('nav.features')}
          </a>
          <a href="#pricing" className={styles.link} onClick={() => setMobileMenuOpen(false)}>
            {t('nav.pricing')}
          </a>
          <a
            href="https://github.com/calabr93/one-prompt"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('nav.github')}
          </a>
        </div>

        <div className={styles.actions}>
          <LanguageToggle />
          <Button href="#download" size="small">
            {t('nav.download')}
          </Button>
        </div>
      </div>
    </nav>
  );
}
