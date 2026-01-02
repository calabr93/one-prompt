/**
 * OnePrompt Update Server - Cloudflare Worker
 *
 * This worker serves as an intermediary between OnePrompt app and GitHub Releases.
 * It logs anonymous usage statistics (timestamp, version, platform) to understand
 * active users without collecting personal data.
 *
 * Deploy instructions in: cloudflare-worker/DEPLOY.md
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Extract anonymous usage data from User-Agent
    const userAgent = request.headers.get('user-agent') || '';
    const version = extractVersion(userAgent);
    const platform = extractPlatform(userAgent);

    // Log anonymous usage statistics
    // This data is used to estimate DAU/MAU (Daily/Monthly Active Users)
    const statsLog = {
      timestamp: new Date().toISOString(),
      version: version || 'unknown',
      platform: platform || 'unknown',
      // We DON'T log: IP addresses, user identifiers, or any personal data
    };

    // Log to console (viewable in Cloudflare Dashboard > Workers > Logs)
    console.log('Update check:', JSON.stringify(statsLog));

    // Optional: Store stats in Cloudflare KV or D1 for analytics
    // if (env.STATS_KV) {
    //   const key = `stats:${Date.now()}`;
    //   await env.STATS_KV.put(key, JSON.stringify(statsLog), {
    //     expirationTtl: 60 * 60 * 24 * 90 // 90 days
    //   });
    // }

    try {
      // Fetch latest release info from GitHub
      const githubResponse = await fetch(
        'https://api.github.com/repos/calabr93/one-prompt/releases/latest',
        {
          headers: {
            'User-Agent': 'OnePrompt-Update-Server',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!githubResponse.ok) {
        throw new Error(`GitHub API returned ${githubResponse.status}`);
      }

      const release = await githubResponse.json();

      // Find the appropriate asset based on platform
      const assets = release.assets || [];
      const dmgAsset = assets.find(a => a.name.endsWith('.dmg'));
      const zipAsset = assets.find(a => a.name.endsWith('.zip') && !a.name.includes('blockmap'));
      const exeAsset = assets.find(a => a.name.endsWith('.exe'));

      // Format response for electron-updater
      const updateResponse = {
        version: release.tag_name.replace('v', ''), // Remove 'v' prefix
        releaseDate: release.published_at,
        releaseName: release.name || release.tag_name,
        releaseNotes: release.body || 'No release notes available',
        files: []
      };

      // Add platform-specific download URLs
      if (dmgAsset) {
        updateResponse.files.push({
          url: dmgAsset.browser_download_url,
          size: dmgAsset.size,
          sha512: '', // electron-updater can work without this
        });
      }

      if (zipAsset) {
        updateResponse.files.push({
          url: zipAsset.browser_download_url,
          size: zipAsset.size,
          sha512: '',
        });
      }

      if (exeAsset) {
        updateResponse.files.push({
          url: exeAsset.browser_download_url,
          size: exeAsset.size,
          sha512: '',
        });
      }

      // Return update info
      return new Response(JSON.stringify(updateResponse), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });

    } catch (error) {
      console.error('Error fetching release info:', error);

      return new Response(JSON.stringify({
        error: 'Failed to fetch update information',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};

/**
 * Extract app version from User-Agent
 * Example: "OnePrompt/1.0.0 (Macintosh; Intel Mac OS X 10_15_7)"
 */
function extractVersion(userAgent) {
  const match = userAgent.match(/OnePrompt[\/\s]([\d.]+)/i);
  return match ? match[1] : null;
}

/**
 * Extract platform from User-Agent
 * Returns: "macOS", "Windows", "Linux", or null
 */
function extractPlatform(userAgent) {
  if (userAgent.includes('Macintosh') || userAgent.includes('Darwin')) {
    return 'macOS';
  } else if (userAgent.includes('Windows')) {
    return 'Windows';
  } else if (userAgent.includes('Linux')) {
    return 'Linux';
  }
  return null;
}
