# OnePrompt

**Un'applicazione desktop Electron per confrontare risposte di AI multiple contemporaneamente.**

Sei stanco di dover copiare-incollare lo stesso prompt in ChatGPT, Claude, Gemini e Perplexity per confrontare le risposte? OnePrompt risolve questo problema: scrivi il tuo prompt una sola volta e invialo automaticamente a tutte le AI che vuoi, ottenendo risposte multiple da confrontare side-by-side.

## 🎯 Il Problema che Risolve

Quando lavori su qualcosa di importante, vuoi le migliori risposte possibili. Spesso questo significa:
1. Aprire ChatGPT → incollare il prompt → attendere risposta
2. Aprire Claude → incollare lo stesso prompt → attendere risposta
3. Aprire Gemini → incollare ancora → attendere risposta
4. Aprire Perplexity → ... e così via

**OnePrompt automatizza questo workflow**: un prompt, tutte le AI, risposte immediate da confrontare.

## Caratteristiche

- 🚀 **Un solo prompt per tutte le AI**: Scrivi una volta, invia ovunque
- 🎯 **Selezione flessibile**: Scegli quali AI utilizzare per ogni prompt
- 🔐 **Sessioni persistenti**: Mantiene i tuoi login attivi (come Franz)
- 💻 **Nativo per macOS**: Ottimizzato per macOS (Windows in arrivo)
- 🎨 **Interfaccia pulita**: Design minimalista e intuitivo

## AI Supportate

- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Perplexity
- Altri in arrivo...

## Installazione

### Download Binari (Consigliato)

Scarica l'ultima versione dalla [pagina Releases](https://github.com/calabr93/one-prompt/releases):
- **macOS**: Scarica il file `.dmg` o `.zip`
- **Windows**: Scarica il file `.exe`

### Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev
```

### Build

```bash
# Build per macOS
npm run build:mac

# Build per Windows
npm run build:win
```

## Release e Statistiche Download

### Creare una Nuova Release

Le release vengono create automaticamente tramite GitHub Actions quando si pusha un nuovo tag:

```bash
# Crea e pusha un tag di versione
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions compilerà automaticamente l'applicazione per macOS e Windows e creerà una release con i binari.

### Visualizzare le Statistiche Download

Puoi consultare le statistiche di download in due modi:

**1. Script locale (consigliato)**

```bash
# Statistiche di tutte le release
node scripts/download-stats.js

# Statistiche di una release specifica
node scripts/download-stats.js --release v1.0.0
```

**2. GitHub API manualmente**

```bash
# Tutte le release
curl https://api.github.com/repos/calabr93/one-prompt/releases

# Release specifica
curl https://api.github.com/repos/calabr93/one-prompt/releases/tags/v1.0.0
```

Le statistiche mostrano:
- Numero di download per ogni file (DMG, ZIP, EXE)
- Download totali per release
- Download totali del progetto

## Come Funziona

OnePrompt usa **Electron webviews** per incorporare le varie piattaforme AI direttamente nell'app, mantenendo le sessioni attive proprio come un browser multi-tab dedicato.

**Architettura tecnica**:
- Ogni AI gira in una webview isolata con sessione persistente
- Injection automatica del prompt tramite preload script
- Nessuna API esterna richiesta (funziona con i tuoi account gratuiti esistenti)

**Vantaggi**:
- ✅ **Nessun costo aggiuntivo**: Non servono API keys a pagamento
- ✅ **Accesso completo**: Tutte le funzionalità delle piattaforme web
- ✅ **Sessioni persistenti**: I tuoi login rimangono attivi tra una sessione e l'altra
- ✅ **Privacy**: Nessun dato passa attraverso server terzi

## ⚠️ Note Importanti

### Stato del Progetto

**Questo è un progetto sperimentale in fase di sviluppo attivo.**

Attualmente sto lavorando su:
- ✅ Interfaccia base e gestione webview (completato)
- 🔄 Injection automatica prompt (in sviluppo - focus su Perplexity)
- ⏳ Supporto login per ChatGPT, Claude, Gemini (prossimamente)
- ⏳ Visualizzazione risposte side-by-side (pianificato)

### Compliance e Disclaimer Legale

**IMPORTANTE**: Questa applicazione usa automazione browser per interagire con servizi AI di terze parti. Questo **potrebbe violare i Termini di Servizio** di alcune piattaforme:

- ⚠️ OpenAI (ChatGPT) - ToS vietano automazione non autorizzata
- ⚠️ Anthropic (Claude) - ToS vietano bot e scraping
- ⚠️ Google (Gemini) - ToS vietano accesso tramite metodi non ufficiali
- 🟡 Perplexity - ToS meno restrittivi ma comunque limitano automazione

**Uso consigliato**:
- ✅ Solo per uso personale ed educativo
- ❌ Non per distribuzione commerciale
- ❌ Non per uso intensivo/abusivo

**Alternative conformi ai ToS**:
In futuro l'app potrebbe supportare una modalità "API" che usa le API ufficiali (a pagamento) invece dell'automazione browser, garantendo piena compliance legale.

Per maggiori dettagli sui rischi legali, consulta la documentazione nel file di piano del progetto.

### Intento dell'Autore

Questo progetto nasce dalla mia esigenza personale di **confrontare risposte di AI diverse** per prendere decisioni migliori. Spesso una AI fornisce una prospettiva che le altre non hanno, e dover gestire 4-5 tab browser separati è scomodo.

**Obiettivi**:
1. **Breve termine**: Creare un MVP funzionante per uso personale con Perplexity (no login richiesto)
2. **Medio termine**: Estendere il supporto a tutte le AI principali con gestione login
3. **Lungo termine**: Valutare passaggio a modalità API per compliance totale o mantenere dual-mode (webview + API)

Non è mia intenzione violare ToS o danneggiare le piattaforme AI. Se questo progetto dovesse causare problemi, sono aperto a:
- Passare completamente a API ufficiali
- Rimuovere feature di automazione
- Rendere il progetto puramente educativo

## Licenza

MIT

**Disclaimer**: Utilizzando questo software, accetti di essere l'unico responsabile per la compliance con i Termini di Servizio delle piattaforme AI che utilizzi. L'autore non si assume alcuna responsabilità per eventuali ban, limitazioni o altre conseguenze derivanti dall'uso di questa applicazione.

## Autore

**Fabio Calabretta**

Sviluppatore con interesse in AI tooling e productivity. Questo è un progetto personale di sperimentazione e apprendimento.
