// Text of the comparison article in every language, with the prices of one reference country per
// language: en United States, it Italy, es Spain, fr France, de Germany, pt Brazil, tr Turkey.
//
// Where the prices come from (all official, read on 20 November 2026):
// - ChatGPT: chatgpt.com/pricing, which shows the visitor's country; the same data for any country is
//   at https://chatgpt.com/backend-anon/checkout_pricing_config/configs/<COUNTRY> (EUR prices include
//   VAT; Turkey is billed in USD).
// - Claude: claude.com/pricing, which loads https://claude.ai/api/billing/subscription_pricing?country=<CC>
//   (prices exclude tax; Turkey is billed in USD). Open it from a claude.com page: it is behind Cloudflare.
// - Google AI: gemini.google/<cc>/subscriptions/ and one.google.com/intl/<lang_cc>/about/google-ai-plans/.
//   Outside the US neither page shows a yearly price.
// Plans change often: re-check every price and update COMPARE_UPDATED and each `checked` line together.
import type { Lang } from '../routes';

export const COMPARE_UPDATED = '2026-11-20';

export interface CompareContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  /** Line under the title: which country the prices are for and when they were checked. */
  checked: string;
  /** *word* is shown in italics. */
  lead: string;
  glanceTitle: string;
  featureHeader: string;
  rows: { label: string; values: [string, string, string] }[];
  tableNote: string;
  sections: { title: string; text: string }[];
  pickTitle: string;
  picks: { when: string; what: string }[];
  pickAfter: string;
  tryTitle: string;
  tryText: string;
  /** {OnePrompt} becomes a link to the home page. */
  appText: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
  sourcesTitle: string;
  sources: { label: string; url: string }[];
}

// Same order as the table columns.
export const PLANS = ['ChatGPT Plus', 'Claude Pro', 'Google AI Pro'] as const;

const CLAUDE_HELP = {
  pro: 'https://support.claude.com/en/articles/8325606-what-is-the-pro-plan',
  context: 'https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans',
  images: 'https://support.claude.com/en/articles/9002504-can-claude-produce-images',
};

function sources(
  labels: [string, string, string, string, string, string, string, string, string],
  google: { gemini: string; one: string; limits: string }
): { label: string; url: string }[] {
  const urls = [
    'https://chatgpt.com/pricing',
    'https://learn.chatgpt.com/docs/pricing',
    'https://claude.com/pricing',
    CLAUDE_HELP.pro,
    CLAUDE_HELP.context,
    CLAUDE_HELP.images,
    google.gemini,
    google.one,
    google.limits,
  ];
  return labels.map((label, i) => ({ label, url: urls[i] }));
}

const en: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): which AI subscription? | OnePrompt',
  metaDescription:
    'Prices, limits and features of Claude Pro, ChatGPT Plus and Google AI Pro side by side, checked on the official pages, and how to pick the right one for writing, coding and research.',
  title: 'Claude Pro vs ChatGPT Plus vs Gemini: which AI subscription?',
  checked:
    'US prices and features checked on the official pages on 20 November 2026. Plans change often: the sources are at the bottom of the page.',
  lead:
    'The three plans cost almost the same: $20 a month for ChatGPT Plus and Claude Pro, $19.99 for Google AI Pro (the Gemini plan). What changes is what comes with the price: image and video generation, coding tools, storage and how the usage limits work. Here is what each one includes, and how to find out which one answers *your* questions best before you pay.',
  glanceTitle: 'At a glance',
  featureHeader: 'Feature',
  rows: [
    { label: 'Price (US)', values: ['$20 / month', '$20 / month', '$19.99 / month'] },
    { label: 'Yearly plan', values: ['No (monthly only)', '$200 / year ($17 / month)', '$199.99 / year'] },
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
  ],
  tableNote:
    "Claude's prices exclude tax; the other two pages don't say. The Google AI Pro yearly price appears in the Google One savings calculator.",
  sections: [
    {
      title: 'ChatGPT Plus: the widest set of tools',
      text: "Plus gives access to OpenAI's GPT-6 reasoning models, image creation, deep research, Codex for coding (on the web, in the terminal, in your IDE and on iOS), custom GPTs, projects, scheduled tasks and voice with video. Everyday chats are unlimited within fair use, while Codex and agent work are measured over five-hour windows. There is no yearly discount, and the cheaper ChatGPT Go ($8) may show ads.",
    },
    {
      title: 'Claude Pro: long documents and code',
      text: 'Claude Pro includes Opus, Sonnet and Haiku with a context window of up to 1 million tokens, file uploads up to 500 MB (PDFs up to 1,000 pages), Research, web search and Claude Code in the terminal and in VS Code, Cursor or JetBrains. Usage resets every five hours with a weekly cap, shared between chat and Claude Code. Claude does not generate photos, illustrations or videos. Paying yearly brings it to $17 a month.',
    },
    {
      title: 'Google AI Pro: the bundle',
      text: 'Google AI Pro is a Google One plan: besides Gemini 4 with a 1 million token context window, it includes image and video generation, 1,000 Flow credits a month, Deep Research, Gemini inside Gmail and Docs, 5 TB of storage, YouTube Premium Lite and sharing with up to five other people. For coding it gives access to Google Antigravity and AI Studio. If you already pay for Google storage, part of the price is money you are spending anyway. US college students get it free for a year.',
    },
  ],
  pickTitle: 'Which one should you pick?',
  picks: [
    { when: 'You live in Google apps or need storage:', what: 'Google AI Pro, the most complete bundle for the price.' },
    { when: 'You want images, voice and the most features in one app:', what: 'ChatGPT Plus.' },
    {
      when: 'You work on long documents or code:',
      what: 'Claude Pro, with Claude Code included and PDFs up to 1,000 pages.',
    },
    {
      when: 'Tight budget:',
      what: 'Google AI Plus ($4.99) and ChatGPT Go ($8) are cheaper; Claude has no plan below Pro.',
    },
  ],
  pickAfter:
    'Features only tell half the story. The same question can get a great answer from one assistant and a mediocre one from another, and which one wins depends on the kind of questions you ask: writing, research, code, numbers.',
  tryTitle: 'Try them on your own questions before you pay',
  tryText:
    'All three have a free plan. Use them for a week on the work you actually do, sending each question to all three, and subscribe to the one that keeps giving you the best answers. Doing it by hand means three tabs and a lot of copy and paste.',
  appText:
    '{OnePrompt} is a free, open source desktop app for Mac, Windows and Linux that shows ChatGPT, Claude, Gemini, Grok, DeepSeek and Perplexity side by side in one window, using the accounts you already have (free plans included). With Cross-Check, each AI can also review the other answers and point out errors and gaps.',
  ctaTitle: 'Compare them side by side',
  ctaText: 'Write once, see every answer, keep the subscription that wins.',
  ctaButton: 'Download OnePrompt free',
  sourcesTitle: 'Sources',
  sources: sources(
    [
      'ChatGPT pricing',
      'ChatGPT plans and Codex usage',
      'Claude pricing',
      'What is the Claude Pro plan?',
      'Context window on paid Claude plans',
      'Can Claude produce images?',
      'Gemini subscriptions (US)',
      'Google One AI plans (US)',
      'Gemini Apps limits',
    ],
    {
      gemini: 'https://gemini.google/us/subscriptions/?hl=en',
      one: 'https://one.google.com/intl/en_us/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=en',
    }
  ),
};

const it: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): quale abbonamento AI scegliere? | OnePrompt',
  metaDescription:
    'Prezzi in euro, limiti e funzioni di Claude Pro, ChatGPT Plus e Google AI Pro a confronto, verificati sulle pagine ufficiali, e come scegliere quello giusto per scrivere, programmare e fare ricerche.',
  title: 'Claude Pro vs ChatGPT Plus vs Gemini: quale abbonamento AI scegliere?',
  checked:
    "Prezzi per l'Italia e funzioni verificati sulle pagine ufficiali il 20 novembre 2026. I piani cambiano spesso: le fonti sono in fondo alla pagina.",
  lead:
    "I tre piani costano quasi uguale: 23 € al mese ChatGPT Plus, 21,99 € Google AI Pro (il piano di Gemini) e 18 € più IVA Claude Pro, cioè 21,96 € con l'IVA al 22%. Cambia quello che è compreso nel prezzo: generazione di immagini e video, strumenti per programmare, spazio di archiviazione e come funzionano i limiti di utilizzo. Ecco cosa include ciascuno, e come capire quale risponde meglio alle *tue* domande prima di pagare.",
  glanceTitle: 'In sintesi',
  featureHeader: 'Caratteristica',
  rows: [
    { label: 'Prezzo (Italia)', values: ['23 € / mese, IVA inclusa', '18 € / mese + IVA (21,96 €)', '21,99 € / mese'] },
    {
      label: 'Piano annuale',
      values: ['No (solo mensile)', '180 € / anno + IVA (15 € al mese)', 'Non indicato sulla pagina italiana'],
    },
    { label: 'Piano gratuito', values: ['Sì', 'Sì', 'Sì'] },
    {
      label: 'Piano più economico',
      values: ['ChatGPT Go, 8 € / mese (può mostrare pubblicità)', 'Nessuno', 'Google AI Plus, 4,99 € / mese'],
    },
    {
      label: 'Piani superiori',
      values: [
        'ChatGPT Pro, 103, 229 o 510 € / mese',
        'Max 90 € / mese (5 volte Pro), Ultra 180 € / mese (10 volte), + IVA',
        'Google AI Ultra, 99,99 € (5 volte) o 219,99 € / mese (20 volte)',
      ],
    },
    {
      label: 'Modelli',
      values: [
        'Modelli di ragionamento GPT-6 (GPT-6.1 Sol, GPT-6 Astra…) e GPT-5.6',
        'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable solo con crediti a pagamento)',
        'Gemini 4 Neon e Gemini 4 Hydrogen',
      ],
    },
    {
      label: 'Limiti di utilizzo',
      values: [
        "Chat di tutti i giorni illimitate nei limiti dell'uso corretto; Codex misurato ogni 5 ore, possibili limiti settimanali",
        'Più del piano gratuito, si azzerano ogni 5 ore, più un limite settimanale condiviso con Claude Code',
        '4 volte il piano gratuito, rinnovato ogni 5 ore fino a un limite settimanale; estendibile con crediti AI',
      ],
    },
    {
      label: 'Finestra di contesto',
      values: ['Fino a 256K token (modelli di ragionamento)', 'Fino a 1M di token', '1M di token (circa 1.500 pagine)'],
    },
    { label: 'Generazione di immagini', values: ['Sì', 'No (solo grafici e diagrammi)', 'Sì'] },
    { label: 'Generazione di video', values: ['Non indicata', 'No', 'Sì, più 1.000 crediti Flow al mese'] },
    { label: 'Ricerca approfondita', values: ['Sì', 'Sì', 'Sì'] },
    {
      label: 'Strumento per programmare',
      values: ['Codex (web, terminale, IDE, iOS)', 'Claude Code (terminale e IDE)', 'Google Antigravity e AI Studio'],
    },
    {
      label: 'Extra',
      values: [
        'Memoria, progetti, GPT personalizzati, attività pianificate, voce con video',
        'Memoria, progetti, creazione di file con esecuzione di codice, modalità vocale',
        '5 TB di spazio, Gemini in Gmail e Documenti, YouTube Premium Lite, condivisione con il gruppo Famiglia',
      ],
    },
  ],
  tableNote: "Claude mostra i prezzi senza IVA, ChatGPT con l'IVA inclusa; la pagina di Google non lo specifica.",
  sections: [
    {
      title: 'ChatGPT Plus: gli strumenti più vari',
      text: "Plus dà accesso ai modelli di ragionamento GPT-6 di OpenAI, alla creazione di immagini, alla ricerca approfondita, a Codex per programmare (sul web, nel terminale, nell'IDE e su iOS), ai GPT personalizzati, ai progetti, alle attività pianificate e alla voce con video. Le chat di tutti i giorni sono illimitate nei limiti dell'uso corretto, mentre Codex e il lavoro degli agenti si misurano su finestre di cinque ore. Non c'è uno sconto annuale, e il piano più economico, ChatGPT Go (8 €), può mostrare pubblicità.",
    },
    {
      title: 'Claude Pro: documenti lunghi e codice',
      text: "Claude Pro include Opus, Sonnet e Haiku con una finestra di contesto fino a 1 milione di token, caricamento di file fino a 500 MB (PDF fino a 1.000 pagine), Research, ricerca sul web e Claude Code nel terminale e in VS Code, Cursor o JetBrains. L'utilizzo si azzera ogni cinque ore con un tetto settimanale, condiviso tra chat e Claude Code. Claude non genera foto, illustrazioni né video. Con il piano annuale scende a 15 € al mese, più IVA.",
    },
    {
      title: 'Google AI Pro: il pacchetto completo',
      text: 'Google AI Pro è un piano di Google One: oltre a Gemini 4 con una finestra di contesto da 1 milione di token, include generazione di immagini e video, 1.000 crediti Flow al mese, Deep Research, Gemini dentro Gmail e Documenti, 5 TB di spazio, YouTube Premium Lite e la condivisione con il gruppo Famiglia. Per programmare dà accesso a Google Antigravity e AI Studio. Se paghi già Google per lo spazio di archiviazione, una parte del prezzo è una spesa che sostieni comunque.',
    },
  ],
  pickTitle: 'Quale scegliere?',
  picks: [
    {
      when: 'Usi soprattutto le app Google o ti serve spazio:',
      what: 'Google AI Pro, il pacchetto più completo per il prezzo.',
    },
    { when: "Vuoi immagini, voce e più funzioni possibili in un'app sola:", what: 'ChatGPT Plus.' },
    {
      when: 'Lavori su documenti lunghi o codice:',
      what: 'Claude Pro, con Claude Code incluso e PDF fino a 1.000 pagine.',
    },
    {
      when: 'Budget ridotto:',
      what: 'Google AI Plus (4,99 €) e ChatGPT Go (8 €) costano meno; Claude non ha piani sotto Pro.',
    },
  ],
  pickAfter:
    'Le funzioni raccontano solo metà della storia. La stessa domanda può avere una risposta ottima da un assistente e mediocre da un altro, e quale vince dipende dal tipo di domande che fai: scrittura, ricerca, codice, numeri.',
  tryTitle: 'Provali sulle tue domande prima di pagare',
  tryText:
    'Tutti e tre hanno un piano gratuito. Usali per una settimana sul lavoro che fai davvero, mandando ogni domanda a tutti e tre, e abbonati a quello che continua a darti le risposte migliori. Farlo a mano significa tre schede e tanto copia e incolla.',
  appText:
    "{OnePrompt} è un'app desktop gratuita e open source per Mac, Windows e Linux che mostra ChatGPT, Claude, Gemini, Grok, DeepSeek e Perplexity affiancati in un'unica finestra, con gli account che hai già (anche quelli gratuiti). Con Cross-Check, ogni AI può anche rivedere le risposte delle altre e segnalare errori e lacune.",
  ctaTitle: 'Confrontali fianco a fianco',
  ctaText: "Scrivi una volta, guarda tutte le risposte, tieni l'abbonamento che vince.",
  ctaButton: 'Scarica OnePrompt gratis',
  sourcesTitle: 'Fonti',
  sources: sources(
    [
      'Prezzi di ChatGPT',
      'Piani di ChatGPT e utilizzo di Codex (in inglese)',
      'Prezzi di Claude',
      "Cos'è il piano Claude Pro (in inglese)",
      'Finestra di contesto nei piani Claude a pagamento (in inglese)',
      'Claude può creare immagini? (in inglese)',
      'Abbonamenti Gemini (Italia)',
      'Piani Google AI di Google One (Italia)',
      'Limiti delle app Gemini',
    ],
    {
      gemini: 'https://gemini.google/it/subscriptions/?hl=it',
      one: 'https://one.google.com/intl/it_it/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=it',
    }
  ),
};

const es: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): ¿qué suscripción de IA elegir? | OnePrompt',
  metaDescription:
    'Precios en euros, límites y funciones de Claude Pro, ChatGPT Plus y Google AI Pro comparados con las páginas oficiales, y cómo elegir el adecuado para escribir, programar e investigar.',
  title: 'Claude Pro vs ChatGPT Plus vs Gemini: ¿qué suscripción de IA elegir?',
  checked:
    'Precios para España y funciones comprobados en las páginas oficiales el 20 de noviembre de 2026. En otros países, también en Latinoamérica, los precios son distintos. Los planes cambian a menudo: las fuentes están al final de la página.',
  lead:
    'Los tres planes cuestan casi lo mismo: 23 € al mes ChatGPT Plus, 21,99 € Google AI Pro (el plan de Gemini) y 18 € más IVA Claude Pro, es decir, 21,78 € con el IVA del 21 %. Lo que cambia es lo que incluye el precio: generación de imágenes y vídeo, herramientas para programar, almacenamiento y cómo funcionan los límites de uso. Esto es lo que incluye cada uno, y cómo saber cuál responde mejor a *tus* preguntas antes de pagar.',
  glanceTitle: 'De un vistazo',
  featureHeader: 'Característica',
  rows: [
    { label: 'Precio (España)', values: ['23 € / mes, IVA incluido', '18 € / mes + IVA (21,78 €)', '21,99 € / mes'] },
    {
      label: 'Plan anual',
      values: ['No (solo mensual)', '180 € / año + IVA (15 € al mes)', 'No aparece en la página española'],
    },
    { label: 'Plan gratuito', values: ['Sí', 'Sí', 'Sí'] },
    {
      label: 'Plan más barato',
      values: ['ChatGPT Go, 8 € / mes (puede incluir anuncios)', 'Ninguno', 'Google AI Plus, 4,99 € / mes'],
    },
    {
      label: 'Planes superiores',
      values: [
        'ChatGPT Pro, 103, 229 o 510 € / mes',
        'Max 90 € / mes (5 veces Pro), Ultra 180 € / mes (10 veces), + IVA',
        'Google AI Ultra, 99,99 € (5 veces) o 219,99 € / mes (20 veces)',
      ],
    },
    {
      label: 'Modelos',
      values: [
        'Modelos de razonamiento GPT-6 (GPT-6.1 Sol, GPT-6 Astra…) y GPT-5.6',
        'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable solo con créditos de pago)',
        'Gemini 4 Neon y Gemini 4 Hydrogen',
      ],
    },
    {
      label: 'Límites de uso',
      values: [
        'Chats diarios ilimitados con un uso razonable; Codex medido cada 5 horas, puede haber límites semanales',
        'Más que el plan gratuito, se reinicia cada 5 horas, con un límite semanal compartido con Claude Code',
        '4 veces el plan gratuito, se renueva cada 5 horas hasta un límite semanal; ampliable con créditos de IA',
      ],
    },
    {
      label: 'Ventana de contexto',
      values: ['Hasta 256K tokens (modelos de razonamiento)', 'Hasta 1M de tokens', '1M de tokens (unas 1.500 páginas)'],
    },
    { label: 'Generación de imágenes', values: ['Sí', 'No (solo gráficos y diagramas)', 'Sí'] },
    { label: 'Generación de vídeo', values: ['No aparece', 'No', 'Sí, más 1.000 créditos de Flow al mes'] },
    { label: 'Investigación a fondo', values: ['Sí', 'Sí', 'Sí'] },
    {
      label: 'Herramienta para programar',
      values: ['Codex (web, terminal, IDE, iOS)', 'Claude Code (terminal e IDE)', 'Google Antigravity y AI Studio'],
    },
    {
      label: 'Extras',
      values: [
        'Memoria, proyectos, GPT personalizados, tareas programadas, voz con vídeo',
        'Memoria, proyectos, creación de archivos con ejecución de código, modo de voz',
        '5 TB de almacenamiento, Gemini en Gmail y Docs, YouTube Premium Lite, compartir con tu grupo familiar',
      ],
    },
  ],
  tableNote: 'Claude muestra los precios sin IVA y ChatGPT con IVA incluido; la página de Google no lo indica.',
  sections: [
    {
      title: 'ChatGPT Plus: el conjunto de herramientas más amplio',
      text: 'Plus da acceso a los modelos de razonamiento GPT-6 de OpenAI, creación de imágenes, investigación a fondo, Codex para programar (en la web, en el terminal, en tu IDE y en iOS), GPT personalizados, proyectos, tareas programadas y voz con vídeo. Los chats diarios son ilimitados con un uso razonable, mientras que Codex y el trabajo de los agentes se miden en ventanas de cinco horas. No hay descuento anual, y el plan más barato, ChatGPT Go (8 €), puede mostrar anuncios.',
    },
    {
      title: 'Claude Pro: documentos largos y código',
      text: 'Claude Pro incluye Opus, Sonnet y Haiku con una ventana de contexto de hasta 1 millón de tokens, archivos de hasta 500 MB (PDF de hasta 1.000 páginas), Research, búsqueda web y Claude Code en el terminal y en VS Code, Cursor o JetBrains. El uso se reinicia cada cinco horas con un tope semanal, compartido entre el chat y Claude Code. Claude no genera fotos, ilustraciones ni vídeos. Con el pago anual baja a 15 € al mes, más IVA.',
    },
    {
      title: 'Google AI Pro: el paquete completo',
      text: 'Google AI Pro es un plan de Google One: además de Gemini 4 con una ventana de contexto de 1 millón de tokens, incluye generación de imágenes y vídeo, 1.000 créditos de Flow al mes, Deep Research, Gemini dentro de Gmail y Docs, 5 TB de almacenamiento, YouTube Premium Lite y la opción de compartirlo con tu grupo familiar. Para programar da acceso a Google Antigravity y AI Studio. Si ya pagas a Google por almacenamiento, parte del precio es dinero que gastas de todos modos.',
    },
  ],
  pickTitle: '¿Cuál elegir?',
  picks: [
    {
      when: 'Usas sobre todo las apps de Google o necesitas almacenamiento:',
      what: 'Google AI Pro, el paquete más completo por ese precio.',
    },
    { when: 'Quieres imágenes, voz y el máximo de funciones en una sola app:', what: 'ChatGPT Plus.' },
    {
      when: 'Trabajas con documentos largos o código:',
      what: 'Claude Pro, con Claude Code incluido y PDF de hasta 1.000 páginas.',
    },
    {
      when: 'Presupuesto ajustado:',
      what: 'Google AI Plus (4,99 €) y ChatGPT Go (8 €) son más baratos; Claude no tiene planes por debajo de Pro.',
    },
  ],
  pickAfter:
    'Las funciones solo cuentan la mitad de la historia. La misma pregunta puede recibir una respuesta excelente de un asistente y una mediocre de otro, y cuál gana depende del tipo de preguntas que hagas: escritura, investigación, código, números.',
  tryTitle: 'Pruébalos con tus propias preguntas antes de pagar',
  tryText:
    'Los tres tienen un plan gratuito. Úsalos durante una semana en el trabajo que haces de verdad, enviando cada pregunta a los tres, y suscríbete al que te siga dando las mejores respuestas. Hacerlo a mano supone tres pestañas y mucho copiar y pegar.',
  appText:
    '{OnePrompt} es una app de escritorio gratuita y de código abierto para Mac, Windows y Linux que muestra ChatGPT, Claude, Gemini, Grok, DeepSeek y Perplexity uno al lado del otro en una sola ventana, con las cuentas que ya tienes (también las gratuitas). Con Cross-Check, cada IA puede además revisar las respuestas de las otras y señalar errores y lagunas.',
  ctaTitle: 'Compáralos uno al lado del otro',
  ctaText: 'Escribe una vez, mira todas las respuestas y quédate con la suscripción que gane.',
  ctaButton: 'Descarga OnePrompt gratis',
  sourcesTitle: 'Fuentes',
  sources: sources(
    [
      'Precios de ChatGPT',
      'Planes de ChatGPT y uso de Codex (en inglés)',
      'Precios de Claude',
      'Qué es el plan Claude Pro (en inglés)',
      'Ventana de contexto en los planes de pago de Claude (en inglés)',
      '¿Puede Claude crear imágenes? (en inglés)',
      'Suscripciones de Gemini (España)',
      'Planes de Google AI en Google One (España)',
      'Límites de las apps de Gemini',
    ],
    {
      gemini: 'https://gemini.google/es/subscriptions/?hl=es',
      one: 'https://one.google.com/intl/es_es/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=es',
    }
  ),
};

const fr: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro) : quel abonnement IA choisir ? | OnePrompt',
  metaDescription:
    "Prix en euros, limites et fonctions de Claude Pro, ChatGPT Plus et Google AI Pro comparés à partir des pages officielles, et comment choisir le bon pour écrire, coder et faire des recherches.",
  title: 'Claude Pro vs ChatGPT Plus vs Gemini : quel abonnement IA choisir ?',
  checked:
    'Prix pour la France et fonctions vérifiés sur les pages officielles le 20 novembre 2026. Les offres changent souvent : les sources sont en bas de la page.',
  lead:
    "Les trois offres coûtent presque la même chose : 23 € par mois pour ChatGPT Plus, 21,99 € pour Google AI Pro (l'offre Gemini) et 18 € HT pour Claude Pro, soit 21,60 € TTC avec une TVA à 20 %. Ce qui change, c'est ce qui est inclus : génération d'images et de vidéos, outils pour coder, stockage et fonctionnement des limites d'utilisation. Voici ce que comprend chacune, et comment savoir laquelle répond le mieux à *vos* questions avant de payer.",
  glanceTitle: "En un coup d'œil",
  featureHeader: 'Fonction',
  rows: [
    { label: 'Prix (France)', values: ['23 € / mois TTC', '18 € / mois HT (21,60 € TTC)', '21,99 € / mois'] },
    {
      label: 'Offre annuelle',
      values: ['Non (mensuel uniquement)', '180 € / an HT (15 € par mois)', 'Non indiquée sur la page française'],
    },
    { label: 'Offre gratuite', values: ['Oui', 'Oui', 'Oui'] },
    {
      label: 'Offre moins chère',
      values: ['ChatGPT Go, 8 € / mois (peut afficher des publicités)', 'Aucune', 'Google AI Plus, 4,99 € / mois'],
    },
    {
      label: 'Offres supérieures',
      values: [
        'ChatGPT Pro, 103, 229 ou 510 € / mois',
        'Max 90 € / mois (5 fois Pro), Ultra 180 € / mois (10 fois), HT',
        'Google AI Ultra, 99,99 € (5 fois) ou 219,99 € / mois (20 fois)',
      ],
    },
    {
      label: 'Modèles',
      values: [
        'Modèles de raisonnement GPT-6 (GPT-6.1 Sol, GPT-6 Astra…) et GPT-5.6',
        'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable seulement avec des crédits payants)',
        'Gemini 4 Neon et Gemini 4 Hydrogen',
      ],
    },
    {
      label: "Limites d'utilisation",
      values: [
        "Discussions quotidiennes illimitées dans le cadre d'un usage raisonnable ; Codex mesuré par tranches de 5 heures, limites hebdomadaires possibles",
        "Plus que l'offre gratuite, remise à zéro toutes les 5 heures, avec une limite hebdomadaire partagée avec Claude Code",
        "4 fois l'offre gratuite, renouvelée toutes les 5 heures jusqu'à une limite hebdomadaire ; extensible avec des crédits IA",
      ],
    },
    {
      label: 'Fenêtre de contexte',
      values: ["Jusqu'à 256K tokens (modèles de raisonnement)", "Jusqu'à 1M de tokens", '1M de tokens (environ 1 500 pages)'],
    },
    { label: "Génération d'images", values: ['Oui', 'Non (graphiques et schémas uniquement)', 'Oui'] },
    { label: 'Génération de vidéos', values: ['Non indiquée', 'Non', 'Oui, plus 1 000 crédits Flow par mois'] },
    { label: 'Recherche approfondie', values: ['Oui', 'Oui', 'Oui'] },
    {
      label: 'Outil pour coder',
      values: ['Codex (web, terminal, IDE, iOS)', 'Claude Code (terminal et IDE)', 'Google Antigravity et AI Studio'],
    },
    {
      label: 'Extras',
      values: [
        'Mémoire, projets, GPT personnalisés, tâches planifiées, voix avec vidéo',
        'Mémoire, projets, création de fichiers avec exécution de code, mode vocal',
        '5 To de stockage, Gemini dans Gmail et Docs, YouTube Premium Lite, partage avec votre groupe familial',
      ],
    },
  ],
  tableNote: 'Claude affiche ses prix HT, ChatGPT TTC ; la page de Google ne le précise pas.',
  sections: [
    {
      title: "ChatGPT Plus : la palette d'outils la plus large",
      text: "Plus donne accès aux modèles de raisonnement GPT-6 d'OpenAI, à la création d'images, à la recherche approfondie, à Codex pour coder (sur le web, dans le terminal, dans votre IDE et sur iOS), aux GPT personnalisés, aux projets, aux tâches planifiées et à la voix avec vidéo. Les discussions quotidiennes sont illimitées dans le cadre d'un usage raisonnable, tandis que Codex et le travail des agents sont mesurés par tranches de cinq heures. Il n'y a pas de remise annuelle, et l'offre moins chère, ChatGPT Go (8 €), peut afficher des publicités.",
    },
    {
      title: 'Claude Pro : longs documents et code',
      text: "Claude Pro comprend Opus, Sonnet et Haiku avec une fenêtre de contexte allant jusqu'à 1 million de tokens, l'envoi de fichiers jusqu'à 500 Mo (PDF jusqu'à 1 000 pages), Research, la recherche web et Claude Code dans le terminal et dans VS Code, Cursor ou JetBrains. L'utilisation se réinitialise toutes les cinq heures avec un plafond hebdomadaire, partagé entre le chat et Claude Code. Claude ne génère ni photos, ni illustrations, ni vidéos. Avec le paiement annuel, il revient à 15 € HT par mois.",
    },
    {
      title: 'Google AI Pro : le pack complet',
      text: "Google AI Pro est une offre Google One : en plus de Gemini 4 avec une fenêtre de contexte de 1 million de tokens, elle comprend la génération d'images et de vidéos, 1 000 crédits Flow par mois, Deep Research, Gemini dans Gmail et Docs, 5 To de stockage, YouTube Premium Lite et le partage avec votre groupe familial. Pour coder, elle donne accès à Google Antigravity et AI Studio. Si vous payez déjà Google pour du stockage, une partie du prix est une dépense que vous faites de toute façon.",
    },
  ],
  pickTitle: 'Laquelle choisir ?',
  picks: [
    {
      when: 'Vous utilisez surtout les applis Google ou avez besoin de stockage :',
      what: 'Google AI Pro, le pack le plus complet pour ce prix.',
    },
    { when: 'Vous voulez des images, la voix et un maximum de fonctions dans une seule appli :', what: 'ChatGPT Plus.' },
    {
      when: 'Vous travaillez sur de longs documents ou du code :',
      what: "Claude Pro, avec Claude Code inclus et des PDF jusqu'à 1 000 pages.",
    },
    {
      when: 'Petit budget :',
      what: "Google AI Plus (4,99 €) et ChatGPT Go (8 €) coûtent moins cher ; Claude n'a pas d'offre en dessous de Pro.",
    },
  ],
  pickAfter:
    "Les fonctions ne racontent que la moitié de l'histoire. La même question peut obtenir une excellente réponse d'un assistant et une réponse médiocre d'un autre, et le gagnant dépend du type de questions que vous posez : rédaction, recherche, code, chiffres.",
  tryTitle: 'Testez-les sur vos propres questions avant de payer',
  tryText:
    "Les trois ont une offre gratuite. Utilisez-les pendant une semaine sur votre vrai travail, en envoyant chaque question aux trois, puis abonnez-vous à celui qui continue à vous donner les meilleures réponses. À la main, cela veut dire trois onglets et beaucoup de copier-coller.",
  appText:
    "{OnePrompt} est une application de bureau gratuite et open source pour Mac, Windows et Linux qui affiche ChatGPT, Claude, Gemini, Grok, DeepSeek et Perplexity côte à côte dans une seule fenêtre, avec les comptes que vous avez déjà (offres gratuites comprises). Avec Cross-Check, chaque IA peut aussi relire les réponses des autres et signaler les erreurs et les oublis.",
  ctaTitle: 'Comparez-les côte à côte',
  ctaText: "Écrivez une fois, voyez toutes les réponses, gardez l'abonnement qui gagne.",
  ctaButton: 'Télécharger OnePrompt gratuitement',
  sourcesTitle: 'Sources',
  sources: sources(
    [
      'Prix de ChatGPT',
      'Offres ChatGPT et utilisation de Codex (en anglais)',
      'Prix de Claude',
      "Qu'est-ce que l'offre Claude Pro (en anglais)",
      'Fenêtre de contexte des offres Claude payantes (en anglais)',
      'Claude peut-il créer des images ? (en anglais)',
      'Abonnements Gemini (France)',
      'Offres Google AI de Google One (France)',
      'Limites des applis Gemini',
    ],
    {
      gemini: 'https://gemini.google/fr/subscriptions/?hl=fr',
      one: 'https://one.google.com/intl/fr_fr/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=fr',
    }
  ),
};

const de: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): Welches KI-Abo passt? | OnePrompt',
  metaDescription:
    'Preise in Euro, Limits und Funktionen von Claude Pro, ChatGPT Plus und Google AI Pro im Vergleich, geprüft auf den offiziellen Seiten, und wie Sie das passende Abo zum Schreiben, Programmieren und Recherchieren finden.',
  title: 'Claude Pro vs ChatGPT Plus vs Gemini: Welches KI-Abo passt zu Ihnen?',
  checked:
    'Preise für Deutschland und Funktionen am 20. November 2026 auf den offiziellen Seiten geprüft. Die Tarife ändern sich oft: Die Quellen stehen am Ende der Seite.',
  lead:
    'Die drei Abos kosten fast gleich viel: 23 € im Monat für ChatGPT Plus, 21,99 € für Google AI Pro (das Gemini-Abo) und 18 € zzgl. MwSt. für Claude Pro, also 21,42 € mit 19 % MwSt. Der Unterschied liegt darin, was im Preis steckt: Bild- und Videoerstellung, Werkzeuge zum Programmieren, Speicherplatz und wie die Nutzungslimits funktionieren. Hier steht, was jedes Abo enthält und wie Sie vor dem Bezahlen herausfinden, welches *Ihre* Fragen am besten beantwortet.',
  glanceTitle: 'Auf einen Blick',
  featureHeader: 'Merkmal',
  rows: [
    {
      label: 'Preis (Deutschland)',
      values: ['23 € / Monat inkl. MwSt.', '18 € / Monat zzgl. MwSt. (21,42 €)', '21,99 € / Monat'],
    },
    {
      label: 'Jahresabo',
      values: ['Nein (nur monatlich)', '180 € / Jahr zzgl. MwSt. (15 € im Monat)', 'Auf der deutschen Seite nicht angegeben'],
    },
    { label: 'Kostenloser Tarif', values: ['Ja', 'Ja', 'Ja'] },
    {
      label: 'Günstigerer Tarif',
      values: ['ChatGPT Go, 8 € / Monat (kann Werbung enthalten)', 'Keiner', 'Google AI Plus, 4,99 € / Monat'],
    },
    {
      label: 'Größere Tarife',
      values: [
        'ChatGPT Pro, 103, 229 oder 510 € / Monat',
        'Max 90 € / Monat (5-fache Pro-Nutzung), Ultra 180 € / Monat (10-fach), zzgl. MwSt.',
        'Google AI Ultra, 99,99 € (5-fach) oder 219,99 € / Monat (20-fach)',
      ],
    },
    {
      label: 'Modelle',
      values: [
        'GPT-6-Reasoning-Modelle (GPT-6.1 Sol, GPT-6 Astra…) und GPT-5.6',
        'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable nur mit bezahlten Credits)',
        'Gemini 4 Neon und Gemini 4 Hydrogen',
      ],
    },
    {
      label: 'Nutzungslimits',
      values: [
        'Alltägliche Chats im Rahmen fairer Nutzung unbegrenzt; Codex in 5-Stunden-Fenstern gemessen, Wochenlimits möglich',
        'Mehr als im kostenlosen Tarif, Zurücksetzung alle 5 Stunden, dazu ein Wochenlimit, das mit Claude Code geteilt wird',
        '4-fache Nutzung des kostenlosen Tarifs, alle 5 Stunden erneuert bis zu einem Wochenlimit; mit KI-Credits erweiterbar',
      ],
    },
    {
      label: 'Kontextfenster',
      values: ['Bis zu 256K Tokens (Reasoning-Modelle)', 'Bis zu 1M Tokens', '1M Tokens (etwa 1.500 Seiten)'],
    },
    { label: 'Bilderstellung', values: ['Ja', 'Nein (nur Diagramme und Grafiken)', 'Ja'] },
    { label: 'Videoerstellung', values: ['Nicht angegeben', 'Nein', 'Ja, dazu 1.000 Flow-Credits im Monat'] },
    { label: 'Deep Research', values: ['Ja', 'Ja', 'Ja'] },
    {
      label: 'Werkzeug zum Programmieren',
      values: ['Codex (Web, Terminal, IDE, iOS)', 'Claude Code (Terminal und IDEs)', 'Google Antigravity und AI Studio'],
    },
    {
      label: 'Extras',
      values: [
        'Gedächtnis, Projekte, eigene GPTs, geplante Aufgaben, Sprache mit Video',
        'Gedächtnis, Projekte, Dateierstellung mit Codeausführung, Sprachmodus',
        '5 TB Speicher, Gemini in Gmail und Docs, YouTube Premium Lite, Teilen mit Ihrer Familiengruppe',
      ],
    },
  ],
  tableNote: 'Claude zeigt die Preise ohne MwSt., ChatGPT inklusive MwSt.; die Google-Seite gibt es nicht an.',
  sections: [
    {
      title: 'ChatGPT Plus: die größte Auswahl an Werkzeugen',
      text: 'Plus bietet Zugang zu den GPT-6-Reasoning-Modellen von OpenAI, Bilderstellung, Deep Research, Codex zum Programmieren (im Web, im Terminal, in Ihrer IDE und auf iOS), eigenen GPTs, Projekten, geplanten Aufgaben und Sprache mit Video. Alltägliche Chats sind im Rahmen fairer Nutzung unbegrenzt, während Codex und die Arbeit von Agenten in Fenstern von fünf Stunden gemessen werden. Einen Jahresrabatt gibt es nicht, und das günstigere ChatGPT Go (8 €) kann Werbung zeigen.',
    },
    {
      title: 'Claude Pro: lange Dokumente und Code',
      text: 'Claude Pro enthält Opus, Sonnet und Haiku mit einem Kontextfenster von bis zu 1 Million Tokens, Datei-Uploads bis 500 MB (PDFs bis 1.000 Seiten), Research, Websuche und Claude Code im Terminal sowie in VS Code, Cursor oder JetBrains. Die Nutzung wird alle fünf Stunden zurückgesetzt, mit einer wöchentlichen Obergrenze, die Chat und Claude Code teilen. Claude erstellt keine Fotos, Illustrationen oder Videos. Bei jährlicher Zahlung sind es 15 € im Monat zzgl. MwSt.',
    },
    {
      title: 'Google AI Pro: das Komplettpaket',
      text: 'Google AI Pro ist ein Google-One-Abo: Neben Gemini 4 mit einem Kontextfenster von 1 Million Tokens enthält es Bild- und Videoerstellung, 1.000 Flow-Credits im Monat, Deep Research, Gemini in Gmail und Docs, 5 TB Speicher, YouTube Premium Lite und das Teilen mit Ihrer Familiengruppe. Zum Programmieren gibt es Zugang zu Google Antigravity und AI Studio. Wenn Sie Google ohnehin für Speicherplatz bezahlen, ist ein Teil des Preises Geld, das Sie sowieso ausgeben.',
    },
  ],
  pickTitle: 'Welches sollten Sie wählen?',
  picks: [
    {
      when: 'Sie nutzen vor allem Google-Apps oder brauchen Speicher:',
      what: 'Google AI Pro, das vollständigste Paket für den Preis.',
    },
    { when: 'Sie wollen Bilder, Sprache und möglichst viele Funktionen in einer App:', what: 'ChatGPT Plus.' },
    {
      when: 'Sie arbeiten mit langen Dokumenten oder Code:',
      what: 'Claude Pro, mit Claude Code und PDFs bis 1.000 Seiten.',
    },
    {
      when: 'Knappes Budget:',
      what: 'Google AI Plus (4,99 €) und ChatGPT Go (8 €) sind günstiger; Claude hat keinen Tarif unter Pro.',
    },
  ],
  pickAfter:
    'Funktionen erzählen nur die halbe Geschichte. Dieselbe Frage kann von einem Assistenten eine hervorragende und von einem anderen eine mittelmäßige Antwort bekommen, und wer gewinnt, hängt von Ihren Fragen ab: Schreiben, Recherche, Code, Zahlen.',
  tryTitle: 'Testen Sie sie mit Ihren eigenen Fragen, bevor Sie zahlen',
  tryText:
    'Alle drei haben einen kostenlosen Tarif. Nutzen Sie sie eine Woche lang für Ihre echte Arbeit, schicken Sie jede Frage an alle drei und abonnieren Sie das, das Ihnen immer wieder die besten Antworten gibt. Von Hand heißt das: drei Tabs und viel Kopieren und Einfügen.',
  appText:
    '{OnePrompt} ist eine kostenlose Open-Source-Desktop-App für Mac, Windows und Linux, die ChatGPT, Claude, Gemini, Grok, DeepSeek und Perplexity nebeneinander in einem Fenster zeigt, mit den Konten, die Sie schon haben (auch kostenlosen). Mit Cross-Check kann jede KI außerdem die Antworten der anderen prüfen und auf Fehler und Lücken hinweisen.',
  ctaTitle: 'Vergleichen Sie sie nebeneinander',
  ctaText: 'Einmal schreiben, alle Antworten sehen, das Abo behalten, das gewinnt.',
  ctaButton: 'OnePrompt kostenlos herunterladen',
  sourcesTitle: 'Quellen',
  sources: sources(
    [
      'ChatGPT-Preise',
      'ChatGPT-Tarife und Codex-Nutzung (Englisch)',
      'Claude-Preise',
      'Was ist der Claude-Pro-Tarif (Englisch)',
      'Kontextfenster der bezahlten Claude-Tarife (Englisch)',
      'Kann Claude Bilder erstellen? (Englisch)',
      'Gemini-Abos (Deutschland)',
      'Google-AI-Abos bei Google One (Deutschland)',
      'Limits der Gemini-Apps',
    ],
    {
      gemini: 'https://gemini.google/de/subscriptions/?hl=de',
      one: 'https://one.google.com/intl/de_de/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=de',
    }
  ),
};

const pt: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): qual assinatura de IA escolher? | OnePrompt',
  metaDescription:
    'Preços em reais, limites e recursos do Claude Pro, ChatGPT Plus e Google AI Pro lado a lado, conferidos nas páginas oficiais, e como escolher o certo para escrever, programar e pesquisar.',
  title: 'Claude Pro vs ChatGPT Plus vs Gemini: qual assinatura de IA escolher?',
  checked:
    'Preços para o Brasil e recursos conferidos nas páginas oficiais em 20 de novembro de 2026. Em Portugal e em outros países os preços são diferentes. Os planos mudam com frequência: as fontes estão no fim da página.',
  lead:
    'Os três planos custam quase o mesmo: R$ 96,99 por mês o Google AI Pro (o plano do Gemini), R$ 99,90 o ChatGPT Plus e R$ 110 o Claude Pro. O que muda é o que vem junto: geração de imagens e vídeos, ferramentas de programação, armazenamento e como funcionam os limites de uso. Veja o que cada um inclui e como descobrir qual responde melhor às *suas* perguntas antes de pagar.',
  glanceTitle: 'Resumo',
  featureHeader: 'Recurso',
  rows: [
    { label: 'Preço (Brasil)', values: ['R$ 99,90 / mês', 'R$ 110 / mês', 'R$ 96,99 / mês'] },
    {
      label: 'Plano anual',
      values: ['Não (só mensal)', 'R$ 1.100 / ano (cerca de R$ 92 / mês)', 'Não informado na página brasileira'],
    },
    { label: 'Plano gratuito', values: ['Sim', 'Sim', 'Sim'] },
    {
      label: 'Plano mais barato',
      values: ['ChatGPT Go, R$ 39,99 / mês (pode ter anúncios)', 'Nenhum', 'Google AI Plus, R$ 24,99 / mês'],
    },
    {
      label: 'Planos maiores',
      values: [
        'ChatGPT Pro, R$ 525, R$ 999,90 ou R$ 2.600 / mês',
        'Max R$ 550 / mês (5x o uso do Pro), Ultra R$ 1.100 / mês (10x)',
        'Google AI Ultra, R$ 779,90 (5x) ou R$ 999,90 / mês (20x)',
      ],
    },
    {
      label: 'Modelos',
      values: [
        'Modelos de raciocínio GPT-6 (GPT-6.1 Sol, GPT-6 Astra…) e GPT-5.6',
        'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable só com créditos pagos)',
        'Gemini 4 Neon e Gemini 4 Hydrogen',
      ],
    },
    {
      label: 'Limites de uso',
      values: [
        'Conversas do dia a dia ilimitadas dentro do uso justo; Codex medido a cada 5 horas, podem existir limites semanais',
        'Mais que o plano gratuito, renovado a cada 5 horas, com um limite semanal compartilhado com o Claude Code',
        '4x o plano gratuito, renovado a cada 5 horas até um limite semanal; ampliável com créditos de IA',
      ],
    },
    {
      label: 'Janela de contexto',
      values: [
        'Até 256 mil tokens (modelos de raciocínio)',
        'Até 1 milhão de tokens',
        '1 milhão de tokens (cerca de 1.500 páginas)',
      ],
    },
    { label: 'Geração de imagens', values: ['Sim', 'Não (só gráficos e diagramas)', 'Sim'] },
    { label: 'Geração de vídeos', values: ['Não informado', 'Não', 'Sim, mais 1.000 créditos do Flow por mês'] },
    { label: 'Pesquisa aprofundada', values: ['Sim', 'Sim', 'Sim'] },
    {
      label: 'Ferramenta de programação',
      values: ['Codex (web, terminal, IDE, iOS)', 'Claude Code (terminal e IDEs)', 'Google Antigravity e AI Studio'],
    },
    {
      label: 'Extras',
      values: [
        'Memória, projetos, GPTs personalizados, tarefas agendadas, voz com vídeo',
        'Memória, projetos, criação de arquivos com execução de código, modo de voz',
        '5 TB de armazenamento, Gemini no Gmail e no Docs, YouTube Premium Lite, compartilhamento com o grupo familiar',
      ],
    },
  ],
  tableNote:
    'O Claude mostra os preços sem impostos e o ChatGPT pode acrescentar impostos no pagamento; a página do Google não informa.',
  sections: [
    {
      title: 'ChatGPT Plus: o maior conjunto de ferramentas',
      text: 'O Plus dá acesso aos modelos de raciocínio GPT-6 da OpenAI, criação de imagens, pesquisa aprofundada, Codex para programar (na web, no terminal, no seu IDE e no iOS), GPTs personalizados, projetos, tarefas agendadas e voz com vídeo. As conversas do dia a dia são ilimitadas dentro do uso justo, enquanto o Codex e o trabalho de agentes são medidos em janelas de cinco horas. Não há desconto anual, e o plano mais barato, ChatGPT Go (R$ 39,99), pode mostrar anúncios.',
    },
    {
      title: 'Claude Pro: documentos longos e código',
      text: 'O Claude Pro inclui Opus, Sonnet e Haiku com uma janela de contexto de até 1 milhão de tokens, envio de arquivos de até 500 MB (PDFs de até 1.000 páginas), Research, pesquisa na web e o Claude Code no terminal e no VS Code, Cursor ou JetBrains. O uso é renovado a cada cinco horas, com um teto semanal compartilhado entre o chat e o Claude Code. O Claude não gera fotos, ilustrações nem vídeos. No plano anual, sai por cerca de R$ 92 por mês.',
    },
    {
      title: 'Google AI Pro: o pacote completo',
      text: 'O Google AI Pro é um plano do Google One: além do Gemini 4 com uma janela de contexto de 1 milhão de tokens, inclui geração de imagens e vídeos, 1.000 créditos do Flow por mês, Deep Research, o Gemini dentro do Gmail e do Docs, 5 TB de armazenamento, YouTube Premium Lite e compartilhamento com o grupo familiar. Para programar, dá acesso ao Google Antigravity e ao AI Studio. Se você já paga o Google por armazenamento, parte do preço é um gasto que você já tem.',
    },
  ],
  pickTitle: 'Qual escolher?',
  picks: [
    {
      when: 'Você usa principalmente os apps do Google ou precisa de armazenamento:',
      what: 'Google AI Pro, o pacote mais completo pelo preço.',
    },
    { when: 'Você quer imagens, voz e o máximo de recursos num só app:', what: 'ChatGPT Plus.' },
    {
      when: 'Você trabalha com documentos longos ou código:',
      what: 'Claude Pro, com o Claude Code incluído e PDFs de até 1.000 páginas.',
    },
    {
      when: 'Orçamento apertado:',
      what: 'Google AI Plus (R$ 24,99) e ChatGPT Go (R$ 39,99) custam menos; o Claude não tem plano abaixo do Pro.',
    },
  ],
  pickAfter:
    'Os recursos contam só metade da história. A mesma pergunta pode receber uma resposta ótima de um assistente e uma mediana de outro, e quem ganha depende do tipo de pergunta que você faz: escrita, pesquisa, código, números.',
  tryTitle: 'Teste com as suas perguntas antes de pagar',
  tryText:
    'Os três têm plano gratuito. Use-os durante uma semana no trabalho que você realmente faz, mandando cada pergunta para os três, e assine aquele que continuar dando as melhores respostas. Fazer isso à mão significa três abas e muito copiar e colar.',
  appText:
    '{OnePrompt} é um app de desktop gratuito e de código aberto para Mac, Windows e Linux que mostra ChatGPT, Claude, Gemini, Grok, DeepSeek e Perplexity lado a lado numa única janela, usando as contas que você já tem (inclusive as gratuitas). Com o Cross-Check, cada IA também pode revisar as respostas das outras e apontar erros e lacunas.',
  ctaTitle: 'Compare lado a lado',
  ctaText: 'Escreva uma vez, veja todas as respostas e fique com a assinatura que vencer.',
  ctaButton: 'Baixe o OnePrompt grátis',
  sourcesTitle: 'Fontes',
  sources: sources(
    [
      'Preços do ChatGPT',
      'Planos do ChatGPT e uso do Codex (em inglês)',
      'Preços do Claude',
      'O que é o plano Claude Pro (em inglês)',
      'Janela de contexto nos planos pagos do Claude (em inglês)',
      'O Claude pode criar imagens? (em inglês)',
      'Assinaturas do Gemini (Brasil)',
      'Planos Google AI do Google One (Brasil)',
      'Limites dos apps do Gemini',
    ],
    {
      gemini: 'https://gemini.google/br/subscriptions/?hl=pt-BR',
      one: 'https://one.google.com/intl/pt_br/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=pt-BR',
    }
  ),
};

const tr: CompareContent = {
  metaTitle: 'Claude Pro vs ChatGPT Plus vs Gemini (Google AI Pro): Hangi yapay zeka aboneliği? | OnePrompt',
  metaDescription:
    "Claude Pro, ChatGPT Plus ve Google AI Pro'nun Türkiye fiyatları, limitleri ve özellikleri resmi sayfalardan kontrol edilerek yan yana; yazı, kod ve araştırma için doğru olanı nasıl seçersiniz.",
  title: 'Claude Pro vs ChatGPT Plus vs Gemini: Hangi yapay zeka aboneliğini seçmeli?',
  checked:
    "Türkiye fiyatları ve özellikler 20 Kasım 2026'da resmi sayfalardan kontrol edildi. Planlar sık değişir: kaynaklar sayfanın sonunda.",
  lead:
    "Türkiye'de Google AI Pro (Gemini planı) aylık ₺869,99; ChatGPT Plus ve Claude Pro ise dolarla ücretlendirilir ve ikisi de aylık $20. Asıl fark fiyata dahil olanlarda: görsel ve video üretimi, kod araçları, depolama alanı ve kullanım limitlerinin işleyişi. Her birinin neler sunduğunu ve ödeme yapmadan önce *sizin* sorularınıza hangisinin en iyi cevabı verdiğini nasıl anlayacağınızı aşağıda bulabilirsiniz.",
  glanceTitle: 'Bir bakışta',
  featureHeader: 'Özellik',
  rows: [
    { label: 'Fiyat (Türkiye)', values: ['$20 / ay', '$20 / ay', '₺869,99 / ay'] },
    {
      label: 'Yıllık plan',
      values: ['Yok (yalnızca aylık)', '$200 / yıl (aylık $17)', 'Türkiye sayfasında belirtilmemiş'],
    },
    { label: 'Ücretsiz plan', values: ['Var', 'Var', 'Var'] },
    {
      label: 'Daha ucuz plan',
      values: ['ChatGPT Go, $6 / ay (reklam içerebilir)', 'Yok', 'Google AI Plus, ₺199,99 / ay'],
    },
    {
      label: 'Daha büyük planlar',
      values: [
        'ChatGPT Pro, $120, $200 veya $600 / ay',
        "Max $100 / ay (Pro'nun 5 katı kullanım), Ultra $200 / ay (10 katı)",
        'Google AI Ultra, ₺4.749,99 (5 kat) veya ₺8.999,99 / ay (20 kat)',
      ],
    },
    {
      label: 'Modeller',
      values: [
        'GPT-6 akıl yürütme modelleri (GPT-6.1 Sol, GPT-6 Astra…) ve GPT-5.6',
        'Opus 5.5, Sonnet 5.5, Haiku 5.5 (Fable yalnızca ücretli kredilerle)',
        'Gemini 4 Neon ve Gemini 4 Hydrogen',
      ],
    },
    {
      label: 'Kullanım limitleri',
      values: [
        'Günlük sohbetler adil kullanım kapsamında sınırsız; Codex 5 saatlik dilimlerle ölçülür, haftalık limitler olabilir',
        'Ücretsiz plandan fazla, her 5 saatte yenilenir; ayrıca Claude Code ile paylaşılan haftalık bir limit',
        'Ücretsiz planın 4 katı, haftalık limite kadar her 5 saatte yenilenir; yapay zeka kredileriyle artırılabilir',
      ],
    },
    {
      label: 'Bağlam penceresi',
      values: ['256K tokena kadar (akıl yürütme modelleri)', '1M tokena kadar', '1M token (yaklaşık 1.500 sayfa)'],
    },
    { label: 'Görsel üretimi', values: ['Var', 'Yok (yalnızca grafik ve diyagram)', 'Var'] },
    { label: 'Video üretimi', values: ['Belirtilmemiş', 'Yok', 'Var, ayrıca ayda 1.000 Flow kredisi'] },
    { label: 'Derin araştırma', values: ['Var', 'Var', 'Var'] },
    {
      label: 'Kod aracı',
      values: ['Codex (web, terminal, IDE, iOS)', "Claude Code (terminal ve IDE'ler)", 'Google Antigravity ve AI Studio'],
    },
    {
      label: 'Ekstralar',
      values: [
        "Bellek, projeler, özel GPT'ler, zamanlanmış görevler, görüntülü sesli sohbet",
        'Bellek, projeler, kod çalıştırarak dosya oluşturma, sesli mod',
        "5 TB depolama, Gmail ve Dokümanlar'da Gemini, YouTube Premium Lite, aile grubuyla paylaşım",
      ],
    },
  ],
  tableNote:
    "ChatGPT ve Claude Türkiye'de dolarla ücretlendirilir ve ödeme sırasında vergi eklenebilir; Google'ın sayfası bunu belirtmiyor.",
  sections: [
    {
      title: 'ChatGPT Plus: en geniş araç yelpazesi',
      text: "Plus; OpenAI'ın GPT-6 akıl yürütme modellerine, görsel oluşturmaya, derin araştırmaya, kod yazmak için Codex'e (web'de, terminalde, IDE'nizde ve iOS'ta), özel GPT'lere, projelere, zamanlanmış görevlere ve görüntülü sesli sohbete erişim sağlar. Günlük sohbetler adil kullanım kapsamında sınırsızdır; Codex ve ajan çalışmaları ise beş saatlik dilimlerle ölçülür. Yıllık indirim yoktur ve daha ucuz olan ChatGPT Go ($6) reklam gösterebilir.",
    },
    {
      title: 'Claude Pro: uzun belgeler ve kod',
      text: "Claude Pro; 1 milyon tokena kadar bağlam penceresiyle Opus, Sonnet ve Haiku'yu, 500 MB'a kadar dosya yüklemeyi (1.000 sayfaya kadar PDF), Research'ü, web aramasını ve terminalde, VS Code, Cursor veya JetBrains'te Claude Code'u içerir. Kullanım her beş saatte bir yenilenir ve sohbet ile Claude Code arasında paylaşılan haftalık bir üst sınır vardır. Claude fotoğraf, illüstrasyon veya video üretmez. Yıllık ödemeyle aylık $17'ye düşer.",
    },
    {
      title: 'Google AI Pro: eksiksiz paket',
      text: "Google AI Pro bir Google One planıdır: 1 milyon token bağlam penceresine sahip Gemini 4'ün yanında görsel ve video üretimi, ayda 1.000 Flow kredisi, Deep Research, Gmail ve Dokümanlar'ın içinde Gemini, 5 TB depolama alanı, YouTube Premium Lite ve aile grubuyla paylaşım sunar. Kod için Google Antigravity ve AI Studio erişimi verir. Google'a zaten depolama için ödeme yapıyorsanız, fiyatın bir kısmı zaten yaptığınız bir harcamadır.",
    },
  ],
  pickTitle: 'Hangisini seçmeli?',
  picks: [
    {
      when: 'Çoğunlukla Google uygulamalarını kullanıyor veya depolama alanına ihtiyaç duyuyorsanız:',
      what: 'Google AI Pro; bu fiyata en kapsamlı paket.',
    },
    { when: 'Görsel, ses ve tek uygulamada en fazla özelliği istiyorsanız:', what: 'ChatGPT Plus.' },
    {
      when: 'Uzun belgeler veya kodla çalışıyorsanız:',
      what: 'Claude Pro; Claude Code dahil ve 1.000 sayfaya kadar PDF.',
    },
    {
      when: 'Bütçeniz kısıtlıysa:',
      what: "Google AI Plus (₺199,99) ve ChatGPT Go ($6) daha ucuz; Claude'un Pro'dan ucuz bir planı yok.",
    },
  ],
  pickAfter:
    'Özellikler hikâyenin yalnızca yarısını anlatır. Aynı soru bir asistandan harika, diğerinden vasat bir cevap alabilir; hangisinin kazanacağı sorduğunuz soruların türüne bağlıdır: yazı, araştırma, kod, sayılar.',
  tryTitle: 'Ödemeden önce kendi sorularınızla deneyin',
  tryText:
    'Üçünün de ücretsiz planı var. Bir hafta boyunca gerçek işinizde kullanın, her soruyu üçüne birden gönderin ve size en iyi cevapları vermeye devam edene abone olun. Bunu elle yapmak üç sekme ve bolca kopyala-yapıştır demek.',
  appText:
    "{OnePrompt}; ChatGPT, Claude, Gemini, Grok, DeepSeek ve Perplexity'yi mevcut hesaplarınızla (ücretsiz planlar dahil) tek pencerede yan yana gösteren, Mac, Windows ve Linux için ücretsiz ve açık kaynaklı bir masaüstü uygulamasıdır. Cross-Check ile her yapay zeka diğerlerinin cevaplarını inceleyip hataları ve eksikleri de gösterebilir.",
  ctaTitle: 'Yan yana karşılaştırın',
  ctaText: 'Bir kez yazın, tüm cevapları görün, kazanan aboneliği tutun.',
  ctaButton: "OnePrompt'u ücretsiz indirin",
  sourcesTitle: 'Kaynaklar',
  sources: sources(
    [
      'ChatGPT fiyatları',
      'ChatGPT planları ve Codex kullanımı (İngilizce)',
      'Claude fiyatları',
      'Claude Pro planı nedir (İngilizce)',
      'Ücretli Claude planlarında bağlam penceresi (İngilizce)',
      'Claude görsel oluşturabilir mi? (İngilizce)',
      'Gemini abonelikleri (Türkiye)',
      "Google One'da Google AI planları (Türkiye)",
      'Gemini uygulamalarının limitleri',
    ],
    {
      gemini: 'https://gemini.google/tr/subscriptions/?hl=tr',
      one: 'https://one.google.com/intl/tr_tr/about/google-ai-plans/',
      limits: 'https://support.google.com/gemini/answer/16275805?hl=tr',
    }
  ),
};

export const COMPARE_CONTENT: Record<Lang, CompareContent> = { en, it, es, fr, de, pt, tr };
