import { useState, useEffect } from 'react';
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

function App() {
  const [currentPage, setCurrentPage] = useState<string>('/');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      
      // Only treat paths starting with / as page navigation
      if (hash.startsWith('/')) {
        setCurrentPage(hash);
        window.scrollTo(0, 0);
      } else {
        // For anchor links like #features, #pricing, #download
        // let the browser handle the scroll natively
        setCurrentPage('/');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentPage === '/prompts') {
    return <PromptsPage />;
  }

  return <HomePage />;
}

export default App;
