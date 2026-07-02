import { publishAudited } from '../lib/dispatch.js';
import * as queue          from '../queue/store.js';
import * as followups      from '../lib/followups.js';

const POLL_INTERVAL_MS = 60_000; // 1 minute

async function tick(): Promise<void> {
  await dispatchDueQueueItems();
  await runDueFollowups();
}

async function dispatchDueQueueItems(): Promise<void> {
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
      const result = await publishAudited(item.platform, item.content, item.account ?? '', { source: 'scheduler', sponsored: item.sponsored ?? false });
      queue.update(item.id, {
        status:       'published',
        published_at: new Date().toISOString(),
        result:       result.summary,
      });
      log(`✓ dispatched ${item.id} → ${item.platform}`);
    } catch (err) {
      queue.update(item.id, { status: 'failed', error: (err as Error).message });
      log(`✗ failed ${item.id} → ${item.platform}: ${(err as Error).message}`);
    }
  }
}

async function runDueFollowups(): Promise<void> {
  try {
    const r = await followups.runDue();
    if (r.processed) {
      log(`analytics follow-ups: ${r.succeeded} fetched, ${r.failed} deferred (${r.dropped} dropped) of ${r.processed} due`);
    }
  } catch (err) {
    log(`follow-up error: ${(err as Error).message}`);
  }
}

function log(msg: string): void {
  process.stdout.write(`[honk-scheduler ${new Date().toISOString()}] ${msg}\n`);
}

log(`Started. Polling every ${POLL_INTERVAL_MS / 1000}s for due queue items.`);

tick().catch(err => log(`tick error: ${(err as Error).message}`));
setInterval(() => tick().catch(err => log(`tick error: ${(err as Error).message}`)), POLL_INTERVAL_MS);
