import { publishAudited } from '../lib/dispatch.js';
import * as queue          from '../queue/store.js';
import * as followups      from '../lib/followups.js';

const POLL_INTERVAL_MS = 60_000; // 1 minute

async function tick() {
  await dispatchDueQueueItems();
  await runDueFollowups();
}

// Publish queued posts whose scheduled_at has passed.
async function dispatchDueQueueItems() {
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

// Fetch engagement metrics for posts whose ~24h analytics follow-up is due (ALPHA-008).
async function runDueFollowups() {
  try {
    const r = await followups.runDue();
    if (r.processed) {
      log(`analytics follow-ups: ${r.succeeded} fetched, ${r.failed} deferred (${r.dropped} dropped) of ${r.processed} due`);
    }
  } catch (err) {
    log(`follow-up error: ${err.message}`);
  }
}

function log(msg) {
  process.stdout.write(`[spmc-scheduler ${new Date().toISOString()}] ${msg}\n`);
}

log(`Started. Polling every ${POLL_INTERVAL_MS / 1000}s for due queue items.`);

// Run immediately on start, then on interval
tick().catch(err => log(`tick error: ${err.message}`));
setInterval(() => tick().catch(err => log(`tick error: ${err.message}`)), POLL_INTERVAL_MS);
