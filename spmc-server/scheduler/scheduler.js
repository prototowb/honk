import * as x         from '../adapters/x.js';
import * as instagram from '../adapters/instagram.js';
import * as tiktok    from '../adapters/tiktok.js';
import * as facebook  from '../adapters/facebook.js';
import * as threads   from '../adapters/threads.js';
import * as bluesky   from '../adapters/bluesky.js';
import * as queue     from '../queue/store.js';

const POLL_INTERVAL_MS = 60_000; // 1 minute

async function publish(platform, content) {
  switch (platform) {
    case 'x':
      if (content.tweets) return await x.postThread(content.tweets);
      return await x.postSingleTweet(content.text);
    case 'instagram': return await instagram.post(content.image_url, content.caption);
    case 'tiktok':    return await tiktok.postVideo(content.video_url, content.caption, content.privacy_level);
    case 'facebook':  return await facebook.post(content.message, content.image_url);
    case 'threads':   return await threads.post(content.text, content.image_url);
    case 'bluesky':   return await bluesky.post(content.text);
    default: throw new Error(`Unknown platform: ${platform}`);
  }
}

async function tick() {
  const now = new Date();
  const due = queue.list({ status: 'pending' }).filter(item => {
    if (!item.scheduled_at) return false;
    return new Date(item.scheduled_at) <= now;
  });

  if (due.length === 0) return;

  log(`${due.length} item(s) due for dispatch`);

  for (const item of due) {
    queue.update(item.id, { status: 'dispatched' });
    try {
      const result = await publish(item.platform, item.content);
      queue.update(item.id, {
        status:       'published',
        published_at: new Date().toISOString(),
        result:       JSON.stringify(result),
      });
      log(`✓ dispatched ${item.id} → ${item.platform}`);
    } catch (err) {
      queue.update(item.id, { status: 'failed', error: err.message });
      log(`✗ failed ${item.id} → ${item.platform}: ${err.message}`);
    }
  }
}

function log(msg) {
  process.stdout.write(`[spmc-scheduler ${new Date().toISOString()}] ${msg}\n`);
}

log(`Started. Polling every ${POLL_INTERVAL_MS / 1000}s for due queue items.`);

// Run immediately on start, then on interval
tick().catch(err => log(`tick error: ${err.message}`));
setInterval(() => tick().catch(err => log(`tick error: ${err.message}`)), POLL_INTERVAL_MS);
