/**
 * HTTP health checks for Operations dashboard (see HEALTH_CHECK_URLS in .env).
 * GET returns cached results immediately (stale-while-revalidate); checks run in the background.
 * Green = HTTP 200 only.
 *
 * Uses GET (like a browser). HEAD is often blocked or returns 403 while GET returns 200.
 * Response body is not downloaded (stream destroyed after status line).
 */

const axios = require('axios');
const { GROUPS, expectedUrlCount } = require('../config/endpointHealthLayout');

const TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT_MS) || 5000;
/** Refresh in background if cache is older than this (ms). Default aligns with ~5s UI poll. */
const STALE_AFTER_MS = Number(process.env.HEALTH_CHECK_STALE_MS) || 4500;

let cached = { items: null, checkedAt: null };
let refreshing = false;
let layoutMismatchLogged = false;

function parseHealthCheckUrls() {
  const raw = process.env.HEALTH_CHECK_URLS || '';
  const parts = raw
    .split(/[\n,]+/)
    .map(function(s) {
      return s.trim();
    })
    .filter(Boolean);
  const urls = [];
  for (let i = 0; i < parts.length; i++) {
    try {
      const u = new URL(parts[i]);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      urls.push(u.href);
    } catch (_) {}
  }
  return urls;
}

function healthHeaders() {
  const ua =
    process.env.HEALTH_CHECK_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  return {
    'User-Agent': ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
}

function resultFromResponse(url, hostname, resp) {
  const code = resp.status;
  return { url, hostname, statusCode: code, ok: code === 200 };
}

function resultFromError(url, hostname, err) {
  const code = err.response && err.response.status;
  if (code !== undefined) {
    return { url, hostname, statusCode: code, ok: code === 200 };
  }
  return {
    url,
    hostname,
    statusCode: null,
    ok: false,
    error: err.code || err.message || 'unreachable',
  };
}

function axiosOptsGet() {
  return {
    timeout: TIMEOUT_MS,
    validateStatus: function() {
      return true;
    },
    maxRedirects: 5,
    headers: healthHeaders(),
    responseType: 'stream',
  };
}

function destroyBodyStream(resp) {
  try {
    if (resp && resp.data && typeof resp.data.destroy === 'function') {
      resp.data.destroy();
    }
  } catch (_) {}
}

/**
 * GET only (browser-like). Drops body immediately after headers to avoid slow/large downloads.
 * @returns {Promise<{ url: string, hostname: string, statusCode: number|null, ok: boolean, error?: string }>}
 */
async function checkOne(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (_) {
    return { url, hostname: url, statusCode: null, ok: false, error: 'invalid url' };
  }

  const opts = axiosOptsGet();

  try {
    const resp = await axios.get(url, opts);
    destroyBodyStream(resp);
    return resultFromResponse(url, hostname, resp);
  } catch (err) {
    if (err.response) {
      destroyBodyStream(err.response);
      return resultFromError(url, hostname, err);
    }
    return resultFromError(url, hostname, err);
  }
}

async function checkAll() {
  const urls = parseHealthCheckUrls();
  const items = await Promise.all(urls.map(checkOne));
  return { items };
}

function sliceItemsIntoGroups(items) {
  let idx = 0;
  const groups = [];
  for (let i = 0; i < GROUPS.length; i++) {
    const def = GROUPS[i];
    groups.push({
      title: def.title,
      items: items.slice(idx, idx + def.count)
    });
    idx += def.count;
  }
  const overflow = idx < items.length ? items.slice(idx) : [];
  return { groups, overflow };
}

function attachGroupMetadata(payload) {
  const items = payload.items;
  const expected = expectedUrlCount();
  if (!items || !items.length) {
    payload.groups = [];
    payload.overflow = [];
    payload.urlCount = 0;
    payload.layoutExpectedUrlCount = expected;
    payload.layoutMismatch = false;
    return payload;
  }
  const sliced = sliceItemsIntoGroups(items);
  payload.groups = sliced.groups;
  payload.overflow = sliced.overflow;
  payload.urlCount = items.length;
  payload.layoutExpectedUrlCount = expected;
  payload.layoutMismatch = items.length !== expected;
  return payload;
}

/**
 * Instant response payload: last completed check, or placeholder rows while warming.
 */
function getSnapshot() {
  const urls = parseHealthCheckUrls();
  if (urls.length === 0) {
    return attachGroupMetadata({ items: [], pending: false, checkedAt: null });
  }
  if (
    cached.items &&
    cached.items.length === urls.length &&
    cached.items.every(function(row, i) {
      return row.url === urls[i];
    })
  ) {
    return attachGroupMetadata({
      items: cached.items,
      pending: false,
      checkedAt: cached.checkedAt
    });
  }
  const items = urls.map(function(url) {
    const hostname = new URL(url).hostname;
    return { url, hostname, statusCode: null, ok: null, pending: true };
  });
  return attachGroupMetadata({ items, pending: true, checkedAt: null });
}

/**
 * Run HTTP checks in the background; next GET sees fresh cache.
 */
function maybeRefresh() {
  const urls = parseHealthCheckUrls();
  const exp = expectedUrlCount();
  if (urls.length > 0 && urls.length !== exp && !layoutMismatchLogged) {
    layoutMismatchLogged = true;
    console.warn(
      '[endpointHealth] HEALTH_CHECK_URLS has ' +
        urls.length +
        ' URL(s) but layout expects ' +
        exp +
        '. Update .env and restart this process.'
    );
  }
  if (urls.length === exp) layoutMismatchLogged = false;
  if (urls.length === 0) return;
  if (refreshing) return;
  const needWarm = !cached.items || cached.items.length !== urls.length;
  const stale =
    needWarm ||
    !cached.checkedAt ||
    Date.now() - cached.checkedAt > STALE_AFTER_MS;
  if (!stale) return;

  refreshing = true;
  setImmediate(function() {
    checkAll()
      .then(function(data) {
        cached.items = data.items;
        cached.checkedAt = Date.now();
      })
      .catch(function(err) {
        console.error('[endpointHealth]', err.message);
      })
      .finally(function() {
        refreshing = false;
      });
  });
}

module.exports = {
  checkAll,
  parseHealthCheckUrls,
  getSnapshot,
  maybeRefresh,
};
