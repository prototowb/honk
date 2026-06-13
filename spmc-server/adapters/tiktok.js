const BASE = 'https://open.tiktokapis.com/v2';

function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

export async function postVideo(videoUrl, caption, privacyLevel = 'SELF_ONLY', account = '') {
  const accessToken = env('TIKTOK_ACCESS_TOKEN', account);

  const initRes = await fetch(`${BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title:                    caption,
        privacy_level:            privacyLevel,
        disable_duet:             false,
        disable_comment:          false,
        disable_stitch:           false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
    }),
  });

  if (!initRes.ok)
    throw new Error(`TikTok init ${initRes.status}: ${await initRes.text()}`);

  const initJson = await initRes.json();
  if (initJson.error && initJson.error.code !== 'ok')
    throw new Error(`TikTok API error ${initJson.error.code}: ${initJson.error.message}`);

  return initJson.data;
}

export async function checkStatus(publishId, account = '') {
  const accessToken = env('TIKTOK_ACCESS_TOKEN', account);

  const res = await fetch(`${BASE}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });

  if (!res.ok) throw new Error(`TikTok status ${res.status}: ${await res.text()}`);

  const json = await res.json();
  if (json.error && json.error.code !== 'ok')
    throw new Error(`TikTok API error ${json.error.code}: ${json.error.message}`);

  return json.data;
}
