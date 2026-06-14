import { publishAudited } from '../lib/dispatch.js';
import * as queue          from '../queue/store.js';

const POLL_INTERVAL_MS = 60_000; // 1 minute

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
      const result = await publishAudited(item.platform, item.content, item.account ?? '', { source: 'scheduler' });
      queue.update(item.id, {
        status:       'published',
        published_at: new Date().toISOString(),
        result:       result.summary,
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
