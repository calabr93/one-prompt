import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CookieBanner } from './components/ui/CookieBanner';
import { HeroSection } from './components/sections/HeroSection';
import { ProblemSection } from './components/sections/ProblemSection';
import { SolutionSection } from './components/sections/SolutionSection';
import { CrossCheckSection } from './components/sections/CrossCheckSection';
import { FeaturesSection } from './components/sections/FeaturesSection';
import { PricingSection } from './components/sections/PricingSection';
import { PlatformsSection } from './components/sections/PlatformsSection';
import { FAQSection } from './components/sections/FAQSection';
import { CTASection } from './components/sections/CTASection';
import { PromptsPage } from './pages/PromptsPage';
import { ComparePage } from './pages/ComparePage';
import { parsePath, pathFor, type Page } from './routes';
import { pageMeta } from './meta';

import './styles/globals.css';

function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <CrossCheckSection />
        <FeaturesSection />
        <PricingSection />
        <PlatformsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <CookieBanner />
    </>
  );
}

// Old links used hash routes (#/prompts, #/): they still work and are moved to the real address.
function legacyHashPage(): Page | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (hash === '#/prompts') return 'prompts';
  if (hash === '#/') return 'home';
  return null;
}

function App({ path }: { path?: string }) {
  const { i18n } = useTranslation();
  const route = parsePath(path ?? (typeof window === 'undefined' ? '/' : window.location.pathname));
  const [page, setPage] = useState<Page>(() => legacyHashPage() ?? route.page);

  // index.html hides the prerendered markup for visitors who need another language or page:
  // show the root again once React has rendered.
  useEffect(() => {
    document.documentElement.classList.remove('prerender-wait');
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const legacy = legacyHashPage();
      if (legacy) {
        window.history.replaceState(null, '', pathFor(i18n.language, legacy));
        setPage(legacy);
        window.scrollTo(0, 0);
      }
      // Anchors like #features, #pricing, #download: the browser scrolls natively.
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [i18n.language]);

  // Title and description follow the language chosen in the page.
  useEffect(() => {
    const lang = route.lang ?? i18n.language;
    const meta = pageMeta(lang, page);
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
  }, [page, i18n.language, route.lang]);

  if (page === 'prompts') {
    return <PromptsPage />;
  }
  if (page === 'compare') {
    return <ComparePage />;
  }
  return <HomePage />;
}

export default App;
