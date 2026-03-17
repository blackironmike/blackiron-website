import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// --- Config ---

const WODIFY_BASE = 'https://api.wodify.com/v1';
const GHL_BASE = 'https://services.leadconnectorhq.com';

const LEAD_STATUS_TO_STAGE = {
  'New':       'New Lead',
  'Contacted': 'Contacted',
  'Trial':     'Needs Follow-up',
  'Converted': 'Closed',
  'Lost':      'Closed',
  'Dead':      'Closed',
};

const LEAD_STATUS_TO_TAGS = {
  'New':       ['new lead'],
  'Contacted': [],
  'Trial':     ['trial visited'],
  'Converted': ['won - member', 'converted'],
  'Lost':      ['lost - not interested'],
  'Dead':      ['lost - not interested'],
};

// --- Helpers ---

function getEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function hashContact(contact) {
  const str = JSON.stringify({
    email: contact.email,
    phone: contact.phone,
    firstName: contact.firstName,
    lastName: contact.lastName,
    status: contact.status,
  });
  return crypto.createHash('md5').update(str).digest('hex');
}

function supabase() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

// --- Wodify API ---

async function wodifyFetch(path) {
  const res = await fetch(`${WODIFY_BASE}${path}`, {
    headers: {
      'x-api-key': getEnv('WODIFY_API_KEY'),
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Wodify ${path}: ${res.status} - ${body}`);
  }
  return res.json();
}

async function wodifyGetAllLeads() {
  const leads = [];
  let page = 1;
  while (true) {
    const data = await wodifyFetch(`/leads?page=${page}&pageSize=100`);
    const items = data.data || data.results || data;
    if (!Array.isArray(items) || items.length === 0) break;
    leads.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return leads;
}

async function wodifyCreateLead(contact) {
  const res = await fetch(`${WODIFY_BASE}/leads`, {
    method: 'POST',
    headers: {
      'x-api-key': getEnv('WODIFY_API_KEY'),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      firstName: contact.firstName || contact.first_name || '',
      lastName: contact.lastName || contact.last_name || '',
      email: contact.email,
      phone: contact.phone,
      source: 'GoHighLevel',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Wodify POST /leads: ${res.status} - ${body}`);
  }
  return res.json();
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

async function ghlCreateContact(lead) {
  return ghlFetch('/contacts/', {
    method: 'POST',
    body: JSON.stringify({
      locationId: getEnv('GHL_LOCATION_ID'),
      firstName: lead.firstName || lead.first_name || '',
      lastName: lead.lastName || lead.last_name || '',
      email: lead.email,
      phone: lead.phone,
      tags: buildTagsForLead(lead),
      customFields: [
        { key: 'wodify_lead_status', field_value: lead.status || 'New' },
      ],
    }),
  });
}

async function ghlUpdateContact(contactId, updates) {
  return ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

async function ghlGetRecentContacts(sinceIso) {
  // Fetch contacts created after a given timestamp that don't have the 'wodify' tag
  const data = await ghlFetch(
    `/contacts/?locationId=${getEnv('GHL_LOCATION_ID')}&startAfter=${encodeURIComponent(sinceIso)}&limit=100`
  );
  return (data.contacts || []).filter(c => !(c.tags || []).includes('wodify'));
}

function buildTagsForLead(lead) {
  const tags = ['wodify'];
  const statusTags = LEAD_STATUS_TO_TAGS[lead.status] || LEAD_STATUS_TO_TAGS['New'];
  tags.push(...statusTags);
  if (lead.source || lead.leadSource) {
    tags.push(`source: ${(lead.source || lead.leadSource).toLowerCase()}`);
  }
  return tags;
}

// --- Sync Logic ---

async function syncWodifyToGhl(db, log, processedEmails) {
  const leads = await wodifyGetAllLeads();
  log.records_processed += leads.length;

  for (const lead of leads) {
    const email = (lead.email || '').toLowerCase().trim();
    if (!email || processedEmails.has(email)) continue;
    processedEmails.add(email);

    try {
      // Check if already synced
      const { data: existing } = await db
        .from('sync_contacts')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      const currentHash = hashContact({
        email,
        phone: lead.phone,
        firstName: lead.firstName || lead.first_name,
        lastName: lead.lastName || lead.last_name,
        status: lead.status,
      });

      if (existing && existing.data_hash === currentHash) {
        continue; // No changes
      }

      // Search or create in GHL
      let ghlContact = await ghlSearchContact(email);

      if (ghlContact) {
        // Update existing GHL contact
        const tags = buildTagsForLead(lead);
        const existingTags = ghlContact.tags || [];
        const mergedTags = [...new Set([...existingTags, ...tags])];

        await ghlUpdateContact(ghlContact.id, {
          tags: mergedTags,
          customFields: [
            { key: 'wodify_lead_status', field_value: lead.status || 'New' },
          ],
        });
        log.records_updated++;
      } else {
        // Create new GHL contact
        const result = await ghlCreateContact(lead);
        ghlContact = result.contact || result;
        log.records_created++;
      }

      // Upsert sync_contacts mapping
      const syncRecord = {
        email,
        phone: lead.phone || null,
        wodify_lead_id: String(lead.id || lead.leadId || ''),
        ghl_contact_id: ghlContact.id,
        source: 'wodify',
        data_hash: currentHash,
        last_synced_at: new Date().toISOString(),
      };

      if (existing) {
        await db
          .from('sync_contacts')
          .update(syncRecord)
          .eq('id', existing.id);
      } else {
        await db.from('sync_contacts').insert(syncRecord);
      }
    } catch (err) {
      console.error(`Error syncing Wodify lead ${email}:`, err.message);
    }
  }
}

async function syncGhlToWodify(db, log, processedEmails) {
  // Get last successful sync time for GHL->Wodify direction
  const { data: lastSync } = await db
    .from('sync_log')
    .select('completed_at')
    .eq('sync_type', 'leads')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Default to 24 hours ago if no previous sync
  const sinceIso = lastSync?.completed_at || new Date(Date.now() - 86400000).toISOString();

  const ghlContacts = await ghlGetRecentContacts(sinceIso);

  for (const contact of ghlContacts) {
    const email = (contact.email || '').toLowerCase().trim();
    if (!email || processedEmails.has(email)) continue;
    processedEmails.add(email);

    log.records_processed++;

    try {
      // Check if already in sync_contacts
      const { data: existing } = await db
        .from('sync_contacts')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existing) continue; // Already synced

      // Create lead in Wodify
      const wodifyLead = await wodifyCreateLead(contact);

      // Tag the GHL contact so we don't process it again
      const existingTags = contact.tags || [];
      await ghlUpdateContact(contact.id, {
        tags: [...existingTags, 'wodify'],
      });

      // Store mapping
      await db.from('sync_contacts').insert({
        email,
        phone: contact.phone || null,
        wodify_lead_id: String(wodifyLead.id || wodifyLead.leadId || ''),
        ghl_contact_id: contact.id,
        source: 'ghl',
        data_hash: hashContact({
          email,
          phone: contact.phone,
          firstName: contact.firstName,
          lastName: contact.lastName,
          status: 'New',
        }),
      });

      log.records_created++;
    } catch (err) {
      console.error(`Error syncing GHL contact ${email} to Wodify:`, err.message);
    }
  }
}

// --- Handler ---

export default async function handler(req, res) {
  // Verify cron secret
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  // Manual testing: ?secret=<CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret;
    const authorized =
      authHeader === `Bearer ${cronSecret}` ||
      querySecret === cronSecret;
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
    .insert({ sync_type: 'leads', status: 'running' })
    .select()
    .single();

  try {
    const processedEmails = new Set();

    // Direction 1: Wodify -> GHL
    await syncWodifyToGhl(db, logEntry, processedEmails);

    // Direction 2: GHL -> Wodify
    await syncGhlToWodify(db, logEntry, processedEmails);

    // Update sync log
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
    console.error('Lead sync failed:', err);

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

    return res.status(500).json({ error: 'Lead sync failed', message: err.message });
  }
}
