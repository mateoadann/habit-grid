import { getDb } from "../db/connection.js";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

/**
 * Builds the Strava OAuth authorization URL.
 * Redirects user to Strava to grant access.
 */
function getAuthorizationUrl() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.API_URL + "/api/auth/strava/callback";

  if (!clientId) {
    throw new Error("STRAVA_CLIENT_ID no está configurado");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,activity:read_all",
    approval_prompt: "auto",
  });

  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 * Saves tokens to the integrations table.
 */
async function exchangeCodeForTokens(code) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciales de Strava no configuradas (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET)");
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al intercambiar código con Strava: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_at } = data;

  // Save tokens to integrations table
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO integrations (id, access_token, refresh_token, expires_at, status, created_at, updated_at)
    VALUES ('strava', ?, ?, ?, 'connected', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      status = 'connected',
      updated_at = excluded.updated_at
  `).run(access_token, refresh_token, expires_at, now, now);

  return { access_token, refresh_token, expires_at };
}

/**
 * Checks if the Strava access token is expired, refreshes if needed.
 * Returns a valid access_token.
 */
async function refreshTokenIfNeeded() {
  const db = getDb();
  const integration = db.prepare("SELECT * FROM integrations WHERE id = 'strava'").get();

  if (!integration) {
    throw new Error("Integración de Strava no encontrada. Conectá tu cuenta primero");
  }

  const now = Math.floor(Date.now() / 1000);

  // Token is still valid (with 60s buffer)
  if (integration.expires_at && integration.expires_at > now + 60) {
    return integration.access_token;
  }

  // Token expired — refresh it
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciales de Strava no configuradas");
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    db.prepare(`
      UPDATE integrations SET status = 'error', updated_at = ? WHERE id = 'strava'
    `).run(new Date().toISOString());
    throw new Error(`Error al renovar token de Strava: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_at } = data;

  // Update tokens in DB
  db.prepare(`
    UPDATE integrations
    SET access_token = ?, refresh_token = ?, expires_at = ?, status = 'connected', updated_at = ?
    WHERE id = 'strava'
  `).run(access_token, refresh_token, expires_at, new Date().toISOString());

  return access_token;
}

/**
 * Fetches activities from Strava API.
 * Handles pagination (per_page=200).
 * @param {string} accessToken - Valid Strava access token
 * @param {number} after - Unix timestamp (fetch activities after this time)
 * @param {number} before - Unix timestamp (fetch activities before this time)
 * @returns {Array} Array of Strava activity objects
 */
async function fetchActivities(accessToken, after, before) {
  const allActivities = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
    });

    if (after) params.set("after", String(after));
    if (before) params.set("before", String(before));

    const response = await fetch(`${STRAVA_API_URL}/athlete/activities?${params.toString()}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error al obtener actividades de Strava: ${response.status} — ${errorBody}`);
    }

    const activities = await response.json();

    if (activities.length === 0) break;

    allActivities.push(...activities);

    // If we got fewer than perPage, we've reached the end
    if (activities.length < perPage) break;

    page++;
  }

  return allActivities;
}

/**
 * Main sync function: fetches Strava activities and upserts contributions.
 * @param {string} habitId - The habit to sync contributions for
 * @returns {{ synced: number }} Count of synced days
 */
async function syncActivities(habitId) {
  const db = getDb();

  // Verify habit exists
  const habit = db.prepare("SELECT id FROM habits WHERE id = ?").get(habitId);
  if (!habit) {
    throw new Error(`Hábito '${habitId}' no encontrado`);
  }

  // Get integration
  const integration = db.prepare("SELECT * FROM integrations WHERE id = 'strava'").get();
  if (!integration || integration.status !== "connected") {
    throw new Error("Strava no está conectado");
  }

  // Refresh token if needed
  const accessToken = await refreshTokenIfNeeded();

  // Calculate fetch range
  let after;
  if (integration.last_sync_at) {
    // Sync since last sync (convert ISO to Unix timestamp)
    after = Math.floor(new Date(integration.last_sync_at).getTime() / 1000);
  } else {
    // First sync: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    after = Math.floor(thirtyDaysAgo.getTime() / 1000);
  }

  const before = Math.floor(Date.now() / 1000);

  // Fetch activities
  const activities = await fetchActivities(accessToken, after, before);

  // Group activities by date — sum minutes (moving_time is in seconds)
  const byDate = {};
  for (const activity of activities) {
    const dateKey = (activity.start_date_local || activity.start_date).split("T")[0];
    const minutes = Math.round((activity.moving_time || 0) / 60);
    byDate[dateKey] = (byDate[dateKey] || 0) + minutes;
  }

  // UPSERT contributions
  const upsert = db.prepare(`
    INSERT INTO contributions (habit_id, date, count, source, metadata)
    VALUES (?, ?, ?, 'strava', '{}')
    ON CONFLICT(habit_id, date, source) DO UPDATE SET
      count = excluded.count
  `);

  const upsertAll = db.transaction(() => {
    for (const [date, count] of Object.entries(byDate)) {
      upsert.run(habitId, date, count);
    }
  });

  upsertAll();

  // Update last_sync_at
  db.prepare(`
    UPDATE integrations SET last_sync_at = ?, updated_at = ? WHERE id = 'strava'
  `).run(new Date().toISOString(), new Date().toISOString());

  return { synced: Object.keys(byDate).length };
}

export {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshTokenIfNeeded,
  fetchActivities,
  syncActivities,
};
