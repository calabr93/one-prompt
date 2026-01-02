# Deploy OnePrompt Update Server to Cloudflare Workers

This guide will help you deploy the update server to Cloudflare Workers. The server logs anonymous usage statistics and serves update information to the OnePrompt app.

## Prerequisites

- A Cloudflare account (free tier works fine)
- Domain name (optional, but recommended for `updates.oneprompt.dev`)

## Option A: Deploy via Cloudflare Dashboard (Easiest)

### Step 1: Create a Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on **Workers & Pages** in the left sidebar
3. Click **Create Application** → **Create Worker**
4. Give it a name: `oneprompt-update-server`
5. Click **Deploy**

### Step 2: Add the Code

1. After deployment, click **Edit Code**
2. Delete the default code
3. Copy the entire content of `cloudflare-worker/worker.js`
4. Paste it into the editor
5. Click **Save and Deploy**

### Step 3: Get Your Worker URL

After deployment, you'll see a URL like:
```
https://oneprompt-update-server.YOUR-SUBDOMAIN.workers.dev
```

**Important**: Copy this URL, you'll need it!

### Step 4: (Optional) Add Custom Domain

If you own a domain:

1. In the Worker settings, click **Triggers** tab
2. Click **Add Custom Domain**
3. Enter: `updates.oneprompt.dev` (or your preferred subdomain)
4. Click **Add Custom Domain**

Now your worker will be available at `https://updates.oneprompt.dev`

### Step 5: Update OnePrompt Code

Open `src/main.js` and replace this line:

```javascript
url: 'https://updates.oneprompt.dev/latest'
```

With your actual worker URL:

```javascript
url: 'https://oneprompt-update-server.YOUR-SUBDOMAIN.workers.dev/latest'
```

**Or** if you set up a custom domain:

```javascript
url: 'https://updates.oneprompt.dev/latest'
```

## Option B: Deploy via Wrangler CLI (Advanced)

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Create wrangler.toml

Create `cloudflare-worker/wrangler.toml`:

```toml
name = "oneprompt-update-server"
main = "worker.js"
compatibility_date = "2024-01-01"

[env.production]
workers_dev = true
```

### Step 4: Deploy

```bash
cd cloudflare-worker
wrangler deploy
```

You'll see output like:
```
Published oneprompt-update-server
  https://oneprompt-update-server.YOUR-SUBDOMAIN.workers.dev
```

## Verify Deployment

Test your worker by visiting:
```
https://your-worker-url.workers.dev/latest
```

You should see JSON with the latest release info from GitHub.

## View Usage Statistics

### Option 1: Real-time Logs (Free)

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Click on your worker
3. Click **Logs** tab
4. Click **Begin log stream**

Every time someone opens OnePrompt, you'll see a log entry like:
```json
{
  "timestamp": "2024-01-02T12:34:56.789Z",
  "version": "1.0.0",
  "platform": "macOS"
}
```

### Option 2: Store in KV for Analytics (Optional)

If you want to store stats for later analysis:

1. Create a KV namespace:
   - Dashboard → **Workers & Pages** → **KV**
   - Click **Create namespace**: `oneprompt-stats`

2. Bind it to your worker:
   - Worker settings → **Settings** → **Variables**
   - Add **KV Namespace Binding**:
     - Variable name: `STATS_KV`
     - KV namespace: `oneprompt-stats`

3. Uncomment these lines in `worker.js`:
```javascript
if (env.STATS_KV) {
  const key = `stats:${Date.now()}`;
  await env.STATS_KV.put(key, JSON.stringify(statsLog), {
    expirationTtl: 60 * 60 * 24 * 90 // 90 days
  });
}
```

4. Redeploy the worker

Now you can query stats programmatically or build a dashboard!

## Costs

- **Worker requests**: 100,000/day free (OnePrompt will use ~1 request per app open)
- **KV storage** (optional): 1GB free
- **Custom domain**: Free if you already own the domain

For a personal project with <100 daily users, everything stays in the free tier! 🎉

## Troubleshooting

### "Failed to fetch update information"

- Check that your worker is deployed and accessible
- Verify the URL in `src/main.js` matches your worker URL
- Check Cloudflare Dashboard logs for errors

### "No release found"

- Make sure you've created at least one GitHub release (tag with binaries)
- The release must have `.dmg`, `.zip`, or `.exe` assets

### Testing Locally

You can test the worker locally before deploying:

```bash
cd cloudflare-worker
wrangler dev
```

This starts a local server at `http://localhost:8787`

Update `src/main.js` temporarily:
```javascript
url: 'http://localhost:8787/latest'
```

## Next Steps

After deployment:
1. Update `src/main.js` with your worker URL
2. Commit and push changes
3. Create a release to test the auto-update flow
4. Monitor logs to see usage statistics!
