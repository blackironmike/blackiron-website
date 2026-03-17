import { createClient } from '@supabase/supabase-js';

// --- Config ---

const WODIFY_BASE = 'https://api.wodify.com/v1';
const GHL_BASE = 'https://services.leadconnectorhq.com';

const AT_RISK_THRESHOLDS = [
  { days: 30, tag: 'at-risk-30' },
  { days: 14, tag: 'at-risk-14' },
  { days: 7,  tag: 'at-risk-7' },
];

const MILESTONE_THRESHOLDS = [500, 250, 100];
const STREAK_THRESHOLDS = [12, 4];
const ANNIVERSARY_YEARS = [5, 3, 2, 1];
const ALL_AT_RISK_TAGS = AT_RISK_THRESHOLDS.map(t => t.tag);
const ALL_MILESTONE_TAGS = MILESTONE_THRESHOLDS.map(n => `milestone-${n}`);
const ALL_STREAK_TAGS = STREAK_THRESHOLDS.map(n => `streak-${n}`);
const ALL_ANNIVERSARY_TAGS = ANNIVERSARY_YEARS.map(n => `anniversary-${n}yr`);
const ALL_RETENTION_TAGS = [...ALL_AT_RISK_TAGS, ...ALL_MILESTONE_TAGS, ...ALL_STREAK_TAGS, ...ALL_ANNIVERSARY_TAGS];

// --- Helpers ---

function getEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function supabase() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function isWithinDaysOfAnniversary(memberSinceDate, years, windowDays = 14) {
  const memberDate = new Date(memberSinceDate);
  const now = new Date();
  const anniversary = new Date(memberDate);
  anniversary.setFullYear(memberDate.getFullYear() + years);

  // Check if anniversary is within the window (before or after)
  const diff = daysBetween(now, anniversary);
  return diff <= windowDays;
}

// --- Wodify API ---

async function wodifyFetch(path) {
  const res = await fetch(`${WODIFY_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${getEnv('WODIFY_API_KEY')}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Wodify ${path}: ${res.status} - ${body}`);
  }
  return res.json();
}

async function wodifyGetAllClients() {
  const clients = [];
  let page = 1;
  while (true) {
    const data = await wodifyFetch(`/clients?page=${page}&pageSize=100`);
    const items = data.data || data.results || data;
    if (!Array.isArray(items) || items.length === 0) break;
    clients.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return clients;
}

// --- GHL API ---

async function ghlFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${GHL_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getEnv('GHL_API_KEY')}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL ${path}: ${res.status} - ${body}`);
  }
  return res.json();
}

async function ghlSearchContact(email) {
  const data = await ghlFetch(
    `/contacts/?locationId=${getEnv('GHL_LOCATION_ID')}&query=${encodeURIComponent(email)}`
  );
  const contacts = data.contacts || [];
  return contacts.find(c => c.email && c.email.toLowerCase() === email.toLowerCase()) || null;
}

async function ghlUpdateContact(contactId, updates) {
  return ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// --- Tag Logic ---

function computeRetentionTags(client) {
  const tags = [];
  const now = new Date();

  // At-risk tags based on days since last visit
  const lastAttendance = client.lastAttendanceDate || client.last_attendance_date;
  if (lastAttendance) {
    const daysSince = daysBetween(lastAttendance, now);

    // Apply the highest applicable at-risk tag only
    for (const threshold of AT_RISK_THRESHOLDS) {
      if (daysSince >= threshold.days) {
        tags.push(threshold.tag);
        break;
      }
    }
  }

  // Milestone tags based on total classes
  const totalClasses = client.totalClasses || client.total_classes || 0;
  for (const milestone of MILESTONE_THRESHOLDS) {
    if (totalClasses >= milestone) {
      tags.push(`milestone-${milestone}`);
    }
  }

  // Streak tags based on weekly attendance streak
  const weekStreak = client.attendanceWeekStreak || client.attendance_week_streak || 0;
  for (const threshold of STREAK_THRESHOLDS) {
    if (weekStreak >= threshold) {
      tags.push(`streak-${threshold}`);
    }
  }

  // Anniversary tags
  const memberSince = client.memberSinceDate || client.member_since_date;
  if (memberSince) {
    for (const years of ANNIVERSARY_YEARS) {
      if (isWithinDaysOfAnniversary(memberSince, years)) {
        tags.push(`anniversary-${years}yr`);
      }
    }
  }

  return tags;
}

function reconcileTags(existingTags, newRetentionTags) {
  // Start with existing non-retention tags
  const nonRetention = existingTags.filter(t => !ALL_RETENTION_TAGS.includes(t));
  // Add computed retention tags
  return [...new Set([...nonRetention, ...newRetentionTags])];
}

// --- Sync Logic ---

async function syncMembers(db, log) {
  const clients = await wodifyGetAllClients();
  log.records_processed = clients.length;

  const processedEmails = new Set();
  for (const client of clients) {
    const email = (client.email || '').toLowerCase().trim();
    if (!email || processedEmails.has(email)) continue;
    processedEmails.add(email);

    try {
      // Find sync record
      let { data: syncRecord } = await db
        .from('sync_contacts')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      // Find or create GHL contact
      let ghlContactId = syncRecord?.ghl_contact_id;
      let ghlContact;

      if (ghlContactId) {
        // We have a mapping, just update
        ghlContact = { id: ghlContactId };
      } else {
        // Search GHL by email
        ghlContact = await ghlSearchContact(email);
        if (!ghlContact) {
          // Create contact in GHL for this member
          const result = await ghlFetch('/contacts/', {
            method: 'POST',
            body: JSON.stringify({
              locationId: getEnv('GHL_LOCATION_ID'),
              firstName: client.firstName || client.first_name || '',
              lastName: client.lastName || client.last_name || '',
              email,
              phone: client.phone || '',
              tags: ['wodify'],
            }),
          });
          ghlContact = result.contact || result;
          log.records_created++;
        }
        ghlContactId = ghlContact.id;
      }

      // Compute custom field values
      const lastAttendance = client.lastAttendanceDate || client.last_attendance_date || null;
      const daysSinceVisit = lastAttendance ? daysBetween(lastAttendance, new Date()) : null;
      const totalClasses = client.totalClasses || client.total_classes || 0;
      const weekStreak = client.attendanceWeekStreak || client.attendance_week_streak || 0;
      const memberSince = client.memberSinceDate || client.member_since_date || null;
      const membershipStatus = client.status || client.membershipStatus || '';
      const program = client.defaultProgram || client.program || '';

      // Compute retention tags
      const retentionTags = computeRetentionTags(client);

      // Get existing GHL contact tags to reconcile
      let existingTags = [];
      if (syncRecord?.ghl_contact_id) {
        try {
          const existing = await ghlFetch(`/contacts/${ghlContactId}`);
          existingTags = (existing.contact || existing).tags || [];
        } catch {
          existingTags = [];
        }
      }

      const finalTags = reconcileTags(existingTags, retentionTags);

      // Update GHL contact
      await ghlUpdateContact(ghlContactId, {
        tags: finalTags,
        customFields: [
          { key: 'membership_status', field_value: membershipStatus },
          { key: 'last_attendance_date', field_value: lastAttendance || '' },
          { key: 'days_since_last_visit', field_value: String(daysSinceVisit || 0) },
          { key: 'total_classes', field_value: String(totalClasses) },
          { key: 'attendance_week_streak', field_value: String(weekStreak) },
          { key: 'member_since_date', field_value: memberSince || '' },
          { key: 'wodify_program', field_value: program },
        ],
      });

      log.records_updated++;

      // Upsert sync_contacts
      const syncData = {
        email,
        phone: client.phone || null,
        wodify_client_id: String(client.id || client.clientId || ''),
        ghl_contact_id: ghlContactId,
        source: syncRecord?.source || 'wodify',
        last_synced_at: new Date().toISOString(),
      };

      if (syncRecord) {
        await db
          .from('sync_contacts')
          .update(syncData)
          .eq('id', syncRecord.id);
      } else {
        await db.from('sync_contacts').insert(syncData);
      }
    } catch (err) {
      console.error(`Error syncing member ${email}:`, err.message);
    }
  }
}

// --- Handler ---

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = supabase();
  const logEntry = {
    records_processed: 0,
    records_created: 0,
    records_updated: 0,
  };

  // Create sync log entry
  const { data: syncLog } = await db
    .from('sync_log')
    .insert({ sync_type: 'members', status: 'running' })
    .select()
    .single();

  try {
    await syncMembers(db, logEntry);

    await db
      .from('sync_log')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: logEntry.records_processed,
        records_created: logEntry.records_created,
        records_updated: logEntry.records_updated,
      })
      .eq('id', syncLog.id);

    return res.status(200).json({
      success: true,
      ...logEntry,
    });
  } catch (err) {
    console.error('Member sync failed:', err);

    await db
      .from('sync_log')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err.message,
        records_processed: logEntry.records_processed,
        records_created: logEntry.records_created,
        records_updated: logEntry.records_updated,
      })
      .eq('id', syncLog.id);

    return res.status(500).json({ error: 'Member sync failed', message: err.message });
  }
}
