# social-publisher

Post content directly to X (Twitter) and Instagram from Claude.

## What it does

- Post single tweets or full threads to X
- Post images with captions to Instagram
- Integrates with the content pipeline queue

## Components

| Component | Description |
|---|---|
| MCP Server | Node.js stdio server wrapping X API v2 + Instagram Graph API |
| Skill: post-to-x | Trigger: "post to X", "tweet this", "publish this thread" |
| Skill: post-to-instagram | Trigger: "post to Instagram", "publish this to IG" |

## Setup

### 1. Install Node.js (v18+)

Download from https://nodejs.org if you don't have it.

### 2. Install server dependencies

```bash
cd /path/to/social-publisher/servers
npm install
```

### 3. Get your API credentials

#### X (Twitter)

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new App (or use an existing one)
3. Under "Keys and Tokens", generate:
   - API Key & Secret
   - Access Token & Secret (make sure it has **Read and Write** permissions)

#### Instagram

1. Go to https://developers.facebook.com
2. Create a Meta App → add **Instagram Graph API** product
3. Connect your Instagram Professional (Business or Creator) account
4. Get your **Instagram User ID** from the Graph API Explorer:
   ```
   GET https://graph.facebook.com/v19.0/me?fields=id,name&access_token=YOUR_TOKEN
   ```
5. Generate a **long-lived User Access Token** (valid 60 days — you'll need to refresh it periodically)

### 4. Set environment variables

Add these to your system environment (or a `.env` file if your setup supports it):

```bash
# X (Twitter)
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

# Instagram
INSTAGRAM_USER_ID=your_ig_user_id
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
```

### 5. Install the plugin in Cowork

Drop the `social-publisher.plugin` file into Cowork and click Install.

## Usage

Once installed and credentials are set, just talk to Claude naturally:

- "Post this tweet: ..."
- "Publish this thread to X"
- "Post to Instagram with this caption: ..."

## Notes

- Instagram posts require a **publicly accessible image URL** — local files won't work. Use Imgur, Cloudinary, or your own CDN.
- Instagram access tokens expire after 60 days. Refresh them at https://developers.facebook.com/tools/explorer
- X free tier allows up to 1,500 tweets/month. Check your plan at https://developer.twitter.com
