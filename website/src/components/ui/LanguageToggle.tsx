import { useTranslation } from 'react-i18next';
import styles from './LanguageToggle.module.css';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${currentLang === 'it' ? styles.active : ''}`}
        onClick={() => handleChange('it')}
      >
        IT
      </button>
      <button
        className={`${styles.btn} ${currentLang === 'en' ? styles.active : ''}`}
        onClick={() => handleChange('en')}
      >
        EN
      </button>
    </div>
  );
}
