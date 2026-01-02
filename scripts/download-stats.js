#!/usr/bin/env node

/**
 * GitHub Releases Download Statistics
 *
 * Questo script recupera le statistiche di download dalle GitHub Releases
 * usando le API native di GitHub (nessun account o token richiesto per repo pubbliche)
 *
 * Uso:
 *   node scripts/download-stats.js
 *   node scripts/download-stats.js --release v1.0.0
 */

const https = require('https');

const REPO_OWNER = 'calabr93';
const REPO_NAME = 'one-prompt';

function fetchReleaseStats(releaseTag = null) {
  const endpoint = releaseTag
    ? `/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${releaseTag}`
    : `/repos/${REPO_OWNER}/${REPO_NAME}/releases`;

  const options = {
    hostname: 'api.github.com',
    path: endpoint,
    method: 'GET',
    headers: {
      'User-Agent': 'OnePrompt-Stats-Script',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function displayReleaseStats(release) {
  console.log(`\n📦 Release: ${release.tag_name}`);
  console.log(`   Nome: ${release.name || 'N/A'}`);
  console.log(`   Data: ${new Date(release.published_at).toLocaleDateString('it-IT')}`);
  console.log(`   URL: ${release.html_url}`);

  if (release.assets && release.assets.length > 0) {
    console.log(`\n   📊 Download per asset:`);
    let totalDownloads = 0;

    release.assets.forEach(asset => {
      console.log(`      • ${asset.name}: ${asset.download_count.toLocaleString()} download`);
      totalDownloads += asset.download_count;
    });

    console.log(`\n   ✅ Totale download: ${totalDownloads.toLocaleString()}`);
  } else {
    console.log(`   ⚠️  Nessun asset disponibile`);
  }

  console.log('\n' + '─'.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);
  const releaseTag = args.includes('--release')
    ? args[args.indexOf('--release') + 1]
    : null;

  console.log('🔍 Recupero statistiche download da GitHub...\n');
  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log('─'.repeat(60));

  try {
    const data = await fetchReleaseStats(releaseTag);

    if (releaseTag) {
      // Mostra una singola release
      displayReleaseStats(data);
    } else {
      // Mostra tutte le release
      if (data.length === 0) {
        console.log('\n⚠️  Nessuna release trovata.');
        console.log('\nPer creare una release:');
        console.log('  1. Crea un tag: git tag v1.0.0');
        console.log('  2. Push del tag: git push origin v1.0.0');
        console.log('  3. GitHub Actions creerà automaticamente la release\n');
        return;
      }

      let grandTotalDownloads = 0;

      data.forEach(release => {
        displayReleaseStats(release);

        if (release.assets) {
          release.assets.forEach(asset => {
            grandTotalDownloads += asset.download_count;
          });
        }
      });

      console.log(`\n🎉 TOTALE DOWNLOAD COMPLESSIVE: ${grandTotalDownloads.toLocaleString()}\n`);
    }

  } catch (error) {
    console.error('\n❌ Errore:', error.message);
    console.error('\nAssicurati che:');
    console.error('  • La repository sia pubblica');
    console.error('  • Ci siano release pubblicate');
    console.error('  • Il nome del tag sia corretto (se specificato)\n');
    process.exit(1);
  }
}

main();
