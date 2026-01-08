import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/sections/HeroSection';
import { ProblemSection } from './components/sections/ProblemSection';
import { SolutionSection } from './components/sections/SolutionSection';
import { FeaturesSection } from './components/sections/FeaturesSection';
import { PricingSection } from './components/sections/PricingSection';
import { PlatformsSection } from './components/sections/PlatformsSection';
import { FAQSection } from './components/sections/FAQSection';
import { CTASection } from './components/sections/CTASection';

import './styles/globals.css';

function App() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <PricingSection />
        <PlatformsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

export default App;
