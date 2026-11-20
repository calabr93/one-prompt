import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { isLang, pathFor } from '../routes';
import { COMPARE_CONTENT, PLANS } from './compareContent';
import styles from './ComparePage.module.css';

// The article in the page language, with that country's prices (text and sources in compareContent.ts).

/** Keeps prices on one line: "4,99 € / mese", "R$ 99,90", "$20 / ay" never break inside the amount. */
function keepPrices(text: string): string {
  return text.replace(/(\d) €/g, '$1\u00a0€').replace(/R\$ (?=\d)/g, 'R$\u00a0').replace(/ \/ /g, '\u00a0/ ');
}

/** *word* → italics, {OnePrompt} → link to the home page. */
function rich(text: string, homeHref: string): ReactNode[] {
  return keepPrices(text).split(/(\*[^*]+\*|\{OnePrompt\})/).map((part, i) => {
    if (part === '{OnePrompt}') {
      return (
        <a key={i} href={homeHref}>
          OnePrompt
        </a>
      );
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function ComparePage() {
  const { i18n } = useTranslation();
  const lang = isLang(i18n.language) ? i18n.language : 'en';
  const c = COMPARE_CONTENT[lang];
  const homeHref = pathFor(lang, 'home');

  return (
    <>
      <Navbar homeHref={homeHref} />
      <main className={styles.main}>
        <Container>
          <article className={styles.article}>
            <a href={homeHref} className={styles.backLink}>
              ← OnePrompt
            </a>
            <h1 className={styles.title}>{c.title}</h1>
            <p className={styles.updated}>{c.checked}</p>

            <p className={styles.lead}>{rich(c.lead, homeHref)}</p>

            <h2>{c.glanceTitle}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className={styles.srOnly}>{c.featureHeader}</span>
                    </th>
                    {PLANS.map((plan) => (
                      <th scope="col" key={plan}>
                        {plan}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.values.map((value, i) => (
                        <td key={PLANS[i]}>{keepPrices(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.sources}>{c.tableNote}</p>

            {c.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{keepPrices(section.text)}</p>
              </section>
            ))}

            <h2>{c.pickTitle}</h2>
            <ul>
              {c.picks.map((pick) => (
                <li key={pick.when}>
                  <strong>{pick.when}</strong> {keepPrices(pick.what)}
                </li>
              ))}
            </ul>
            <p>{c.pickAfter}</p>

            <h2>{c.tryTitle}</h2>
            <p>{c.tryText}</p>
            <p>{rich(c.appText, homeHref)}</p>

            <div className={styles.cta}>
              <h2>{c.ctaTitle}</h2>
              <p>{c.ctaText}</p>
              <Button href={`${homeHref}#download`} size="large">
                {c.ctaButton}
              </Button>
            </div>

            <h2>{c.sourcesTitle}</h2>
            <ul className={styles.sources}>
              {c.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        </Container>
      </main>
      <Footer />
    </>
  );
}
