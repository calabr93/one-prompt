import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui/Button';
import { pathFor } from '../routes';
import styles from './ComparePage.module.css';

// English-only article. Prices and features come from the providers' official pages (links at the
// bottom). Plans change often: re-check them and update COMPARE_UPDATED together with the text.
export const COMPARE_UPDATED = '2026-11-20';
const UPDATED_LABEL = '20 November 2026';

const PLANS = ['ChatGPT Plus', 'Claude Pro', 'Google AI Pro'] as const;

const ROWS: { label: string; values: [string, string, string] }[] = [
  { label: 'Price (US)', values: ['$20 / month', '$20 / month', '$19.99 / month'] },
  {
    label: 'Yearly plan',
    values: ['No (monthly only)', '$200 / year ($17 / month)', '$199.99 / year'],
  },
  { label: 'Free plan', values: ['Yes', 'Yes', 'Yes'] },
  {
    label: 'Cheaper plan',
    values: ['ChatGPT Go, $8 / month (may include ads)', 'None', 'Google AI Plus, $4.99 / month'],
  },
  {
    label: 'Bigger plans',
    values: [
      'ChatGPT Pro, $100, $200 or $500 / month',
      'Max $100 / month (5x Pro usage), Ultra $200 / month (10x)',
      'Google AI Ultra, $99.99 (5x) or $199.99 / month (20x)',
    ],
  },
  {
    label: 'Models',
    values: [
      'GPT-6 reasoning models (GPT-6.1 Sol, GPT-6 Astra…) and GPT-5.6',
      'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable only with paid credits)',
      'Gemini 4 Neon and Gemini 4 Hydrogen',
    ],
  },
  {
    label: 'Usage limits',
    values: [
      'Everyday chats unlimited within fair use; Codex measured per 5 hours, weekly limits may apply',
      'More than Free, reset every 5 hours, plus a weekly limit shared with Claude Code',
      '4x Free usage, refreshed every 5 hours up to a weekly limit; extendable with AI credits',
    ],
  },
  {
    label: 'Context window',
    values: ['Up to 256K tokens (reasoning models)', 'Up to 1M tokens', '1M tokens (about 1,500 pages)'],
  },
  { label: 'Image generation', values: ['Yes', 'No (charts and diagrams only)', 'Yes'] },
  { label: 'Video generation', values: ['Not listed', 'No', 'Yes, plus 1,000 Flow credits / month'] },
  { label: 'Deep research', values: ['Yes', 'Yes', 'Yes'] },
  {
    label: 'Coding tool',
    values: ['Codex (web, CLI, IDE, iOS)', 'Claude Code (terminal and IDEs)', 'Google Antigravity and AI Studio'],
  },
  {
    label: 'Extras',
    values: [
      'Memory, projects, custom GPTs, scheduled tasks, voice with video',
      'Memory, projects, file creation with code execution, voice mode',
      '5 TB storage, Gemini in Gmail and Docs, YouTube Premium Lite, share with up to 5 people',
    ],
  },
];

const SOURCES: { label: string; url: string }[] = [
  { label: 'ChatGPT pricing', url: 'https://chatgpt.com/pricing' },
  { label: 'ChatGPT plans and Codex usage', url: 'https://learn.chatgpt.com/docs/pricing' },
  { label: 'Claude pricing', url: 'https://claude.com/pricing' },
  { label: 'What is the Claude Pro plan?', url: 'https://support.claude.com/en/articles/8325606-what-is-the-pro-plan' },
  {
    label: 'Context window on paid Claude plans',
    url: 'https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans',
  },
  { label: 'Can Claude produce images?', url: 'https://support.claude.com/en/articles/9002504-can-claude-produce-images' },
  { label: 'Gemini subscriptions (US)', url: 'https://gemini.google/us/subscriptions/?hl=en' },
  { label: 'Google One AI plans (US)', url: 'https://one.google.com/intl/en_us/about/google-ai-plans/' },
  { label: 'Gemini Apps limits', url: 'https://support.google.com/gemini/answer/16275805?hl=en' },
];

export function ComparePage() {
  const { i18n } = useTranslation();
  const homeHref = pathFor(i18n.language, 'home');

  return (
    <>
      <Navbar homeHref={homeHref} />
      <main className={styles.main}>
        <Container>
          <article className={styles.article} lang="en">
            <a href={homeHref} className={styles.backLink}>
              ← OnePrompt
            </a>
            <h1 className={styles.title}>Claude Pro vs ChatGPT Plus vs Gemini: which AI subscription?</h1>
            <p className={styles.updated}>
              US prices and features checked on the official pages on {UPDATED_LABEL}. Plans change often: the
              sources are at the bottom of the page.
            </p>

            <p className={styles.lead}>
              The three plans cost almost the same: $20 a month for ChatGPT Plus and Claude Pro, $19.99 for Google AI
              Pro (the Gemini plan). What changes is what comes with the price: image and video generation, coding
              tools, storage and how the usage limits work. Here is what each one includes, and how to find out which
              one answers <em>your</em> questions best before you pay.
            </p>

            <h2>At a glance</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className={styles.srOnly}>Feature</span>
                    </th>
                    {PLANS.map((plan) => (
                      <th scope="col" key={plan}>
                        {plan}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.values.map((value, i) => (
                        <td key={PLANS[i]}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.sources}>
              Claude's prices exclude tax; the other two pages don't say. The Google AI Pro yearly price appears in the
              Google One savings calculator.
            </p>

            <h2>ChatGPT Plus: the widest set of tools</h2>
            <p>
              Plus gives access to OpenAI's GPT-6 reasoning models, image creation, deep research, Codex for coding
              (on the web, in the terminal, in your IDE and on iOS), custom GPTs, projects, scheduled tasks and voice
              with video. Everyday chats are unlimited within fair use, while Codex and agent work are measured over
              five-hour windows. There is no yearly discount, and the cheaper ChatGPT Go ($8) may show ads.
            </p>

            <h2>Claude Pro: long documents and code</h2>
            <p>
              Claude Pro includes Opus, Sonnet and Haiku with a context window of up to 1 million tokens, file uploads
              up to 500 MB (PDFs up to 1,000 pages), Research, web search and Claude Code in the terminal and in VS
              Code, Cursor or JetBrains. Usage resets every five hours with a weekly cap, shared between chat and
              Claude Code. Claude does not generate photos, illustrations or videos. Paying yearly brings it to $17 a
              month.
            </p>

            <h2>Google AI Pro: the bundle</h2>
            <p>
              Google AI Pro is a Google One plan: besides Gemini 4 with a 1 million token context window, it includes
              image and video generation, 1,000 Flow credits a month, Deep Research, Gemini inside Gmail and Docs,
              5 TB of storage, YouTube Premium Lite and sharing with up to five other people. For coding it gives
              access to Google Antigravity and AI Studio. If you already pay for Google storage, part of the price is
              money you are spending anyway. US college students get it free for a year.
            </p>

            <h2>Which one should you pick?</h2>
            <ul>
              <li>
                <strong>You live in Google apps or need storage:</strong> Google AI Pro, the most complete bundle for
                the price.
              </li>
              <li>
                <strong>You want images, voice and the most features in one app:</strong> ChatGPT Plus.
              </li>
              <li>
                <strong>You work on long documents or code:</strong> Claude Pro, with Claude Code included and PDFs
                up to 1,000 pages.
              </li>
              <li>
                <strong>Tight budget:</strong> Google AI Plus ($4.99) and ChatGPT Go ($8) are cheaper; Claude has no
                plan below Pro.
              </li>
            </ul>
            <p>
              Features only tell half the story. The same question can get a great answer from one assistant and a
              mediocre one from another, and which one wins depends on the kind of questions you ask: writing,
              research, code, numbers.
            </p>

            <h2>Try them on your own questions before you pay</h2>
            <p>
              All three have a free plan. Use them for a week on the work you actually do, sending each question to
              all three, and subscribe to the one that keeps giving you the best answers. Doing it by hand means
              three tabs and a lot of copy and paste.
            </p>
            <p>
              <a href={homeHref}>OnePrompt</a> is a free, open source desktop app for Mac, Windows and Linux that
              shows ChatGPT, Claude, Gemini, Grok, DeepSeek and Perplexity side by side in one window, using the
              accounts you already have (free plans included). With Cross-Check, each AI can also review the other
              answers and point out errors and gaps.
            </p>

            <div className={styles.cta}>
              <h2>Compare them side by side</h2>
              <p>Write once, see every answer, keep the subscription that wins.</p>
              <Button href={`${homeHref}#download`} size="large">
                Download OnePrompt free
              </Button>
            </div>

            <h2>Sources</h2>
            <ul className={styles.sources}>
              {SOURCES.map((s) => (
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
