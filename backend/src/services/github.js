import { getDb } from "../db/connection.js";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * Fetches contribution data from GitHub's GraphQL API.
 * @param {string} username - GitHub username
 * @param {string} token - GitHub Personal Access Token
 * @param {string} from - ISO 8601 datetime (e.g., "2025-01-01T00:00:00Z")
 * @param {string} to - ISO 8601 datetime (e.g., "2025-12-31T23:59:59Z")
 * @returns {Array<{ date: string, count: number }>} Flat array of daily contributions
 */
async function fetchContributions(username, token, from, to) {
  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { username, from, to },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al consultar GitHub GraphQL: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();

  // Check for GraphQL errors
  if (data.errors) {
    const messages = data.errors.map((e) => e.message).join(", ");
    throw new Error(`Error de GitHub GraphQL: ${messages}`);
  }

  // Check user exists
  if (!data.data?.user) {
    throw new Error(`Usuario de GitHub '${username}' no encontrado`);
  }

  // Flatten weeks → contributionDays into a flat array
  const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks;
  const contributions = [];

  for (const week of weeks) {
    for (const day of week.contributionDays) {
      contributions.push({
        date: day.date,
        count: day.contributionCount,
      });
    }
  }

  return contributions;
}

/**
 * Main sync function: fetches GitHub contributions and upserts into DB.
 * @param {string} habitId - The habit to sync contributions for
 * @returns {{ synced: number }} Count of synced days
 */
async function syncContributions(habitId) {
  const db = getDb();

  // Verify habit exists
  const habit = db.prepare("SELECT id FROM habits WHERE id = ?").get(habitId);
  if (!habit) {
    throw new Error(`Hábito '${habitId}' no encontrado`);
  }

  // Read config from env
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;

  if (!token || !username) {
    throw new Error("GitHub no está configurado (GITHUB_TOKEN y GITHUB_USERNAME requeridos)");
  }

  // Get integration for last_sync_at
  const integration = db.prepare("SELECT * FROM integrations WHERE id = 'github'").get();

  // Calculate date range
  let from;
  if (integration?.last_sync_at) {
    from = new Date(integration.last_sync_at).toISOString();
  } else {
    // First sync: beginning of current year
    const year = new Date().getFullYear();
    from = `${year}-01-01T00:00:00Z`;
  }
  const to = new Date().toISOString();

  // Fetch contributions from GitHub
  const contributions = await fetchContributions(username, token, from, to);

  // Filter only days with count > 0
  const withActivity = contributions.filter((c) => c.count > 0);

  // UPSERT contributions
  const upsert = db.prepare(`
    INSERT INTO contributions (habit_id, date, count, source, metadata)
    VALUES (?, ?, ?, 'github', '{}')
    ON CONFLICT(habit_id, date, source) DO UPDATE SET
      count = excluded.count
  `);

  const upsertAll = db.transaction(() => {
    for (const { date, count } of withActivity) {
      upsert.run(habitId, date, count);
    }
  });

  upsertAll();

  // Ensure integration row exists and update it
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO integrations (id, habit_id, status, last_sync_at, created_at, updated_at)
    VALUES ('github', ?, 'connected', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      habit_id = COALESCE(excluded.habit_id, integrations.habit_id),
      status = 'connected',
      last_sync_at = excluded.last_sync_at,
      updated_at = excluded.updated_at
  `).run(habitId, now, now, now);

  return { synced: withActivity.length };
}

export { fetchContributions, syncContributions };
