/**
 * push-knowledge-base.js
 * Pushes ghl-chatbot-knowledge-base.md into the GHL chatbot knowledge base,
 * replacing the manual delete-and-re-upload in docs/ghl-update-guide.md §1.
 *
 * The Knowledge Base API has no file upload endpoint, so this does not
 * reproduce that workflow. It parses the markdown into question/answer pairs
 * and writes them as FAQ records instead. The file is already written as
 * "## Question?" followed by its answer, so the mapping is one to one, and
 * each answer becomes an addressable record rather than a blob.
 *
 * Safety:
 *   - Requires CRON_SECRET. A missing secret fails closed.
 *   - DRY RUN BY DEFAULT. Writing needs BOTH a POST and ?apply=1. A GET can
 *     never change anything, so a stray click on a URL cannot fire it.
 *   - Reads the markdown from its own deployment, so a preview pushes the
 *     branch's copy and production pushes main's.
 *
 * Usage:
 *   GET  /api/push-knowledge-base                  dry run, shows the plan
 *   POST /api/push-knowledge-base?apply=1          performs it
 *   ...&kb=<name>                                  target an existing base by name
 *   ...&createKb=<name>                            create a new base, then fill it
 *
 * createKb exists because GHL will not let you delete a knowledge base while
 * an agent is using it, and the old base holds a stale uploaded file that the
 * API cannot remove. Building a clean base beside it and repointing the agent
 * is the only cutover with no gap in what the bot knows, and it reverses by
 * pointing the agent back.
 *
 * Note the Version header: the Knowledge Base API wants 2021-04-15, not the
 * 2021-07-28 the rest of the v2 API uses. A wrong value here reads as a
 * confusing 400 rather than a version error.
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const KB_VERSION = '2021-04-15';
const SOURCE_FILE = '/ghl-chatbot-knowledge-base.md';

/* The live knowledge base, confirmed by Michael. The location has two, and the
   other one ("Existing knowledge base") is not what the chatbot reads. Named
   rather than positional on purpose: taking the first of the list would send
   ninety records somewhere nobody looks if GHL ever reorders them. Override
   with ?kb=<name>. */
const DEFAULT_KB_NAME = 'Black Iron Knowledge base';
const CALL_SPACING_MS = 400;
const MAX_ANSWER_CHARS = 2000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ghl(path, key, options = {}, retries = 2) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      Version: KB_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 429 && retries > 0) {
    await sleep(5000);
    return ghl(path, key, options, retries - 1);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  await sleep(CALL_SPACING_MS);
  return text ? JSON.parse(text) : {};
}

/* Every "## " heading is a question; everything up to the next "## " is its
   answer. Deeper headings stay inside the answer, since they are part of it. */
function parseFaqs(md) {
  const faqs = [];
  const warnings = [];
  const lines = md.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    const m = /^##\s+(.*\S)\s*$/.exec(line);
    if (m && !line.startsWith('###')) {
      if (current) faqs.push(current);
      current = { question: m[1].trim(), answerLines: [] };
    } else if (current) {
      current.answerLines.push(line);
    }
  }
  if (current) faqs.push(current);

  const out = [];
  const seen = new Map();
  for (const f of faqs) {
    const answer = f.answerLines.join('\n').trim();
    if (!answer) {
      warnings.push(`Skipped "${f.question}": no answer body beneath it`);
      continue;
    }
    if (answer.length > MAX_ANSWER_CHARS) {
      warnings.push(`"${f.question}": answer is ${answer.length} chars, over the ${MAX_ANSWER_CHARS} guideline`);
    }
    const key = f.question.toLowerCase();
    if (seen.has(key)) {
      warnings.push(`Duplicate question "${f.question}", keeping the first`);
      continue;
    }
    seen.set(key, true);
    out.push({ question: f.question, answer });
  }
  return { faqs: out, warnings };
}

async function listAllFaqs(key, locationId, knowledgeBaseId) {
  const all = [];
  let lastFaqId = null;
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ locationId, knowledgeBaseId, limit: '100' });
    if (lastFaqId) qs.set('lastFaqId', lastFaqId);
    const body = await ghl(`/knowledge-bases/faqs?${qs}`, key);
    const data = body.data || body;
    const batch = data.faqs || data.faqDocuments || [];
    all.push(...batch);
    if (!data.hasMore || !batch.length) break;
    lastFaqId = data.lastFaqId || batch[batch.length - 1].id;
  }
  return all;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return res.status(503).json({ error: 'CRON_SECRET not configured; disabled' });
  const authorized =
    req.headers.authorization === `Bearer ${cronSecret}` || req.query.secret === cronSecret;
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const key = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!key || !locationId) return res.status(503).json({ error: 'GHL_API_KEY or GHL_LOCATION_ID not set' });

  /* Two independent gates. A GET is always a dry run. */
  const apply = req.method === 'POST' && req.query.apply === '1';

  try {
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const sourceUrl = `${proto}://${req.headers.host}${SOURCE_FILE}`;
    const mdRes = await fetch(sourceUrl);
    if (!mdRes.ok) throw new Error(`Could not read ${sourceUrl}: ${mdRes.status}`);
    const md = await mdRes.text();

    const { faqs, warnings } = parseFaqs(md);

    const kbList = await ghl(`/knowledge-bases/?locationId=${locationId}&limit=50`, key);
    const bases = (kbList.data && kbList.data.knowledgeBases) || kbList.knowledgeBases || [];
    if (!bases.length) {
      return res.status(200).json({ mode: 'dry-run', error: 'No knowledge base exists for this location', bases });
    }
    const createName = (req.query.createKb || '').trim();
    let target;
    let creating = null;

    if (createName) {
      const clash = bases.find(b => (b.name || '').toLowerCase() === createName.toLowerCase());
      if (clash) {
        return res.status(200).json({
          error: `A knowledge base named "${createName}" already exists`,
          note: 'Pick a different name, or target it with ?kb= instead of creating it.',
          available: bases.map(b => b.name),
        });
      }
      if (bases.length >= 15) {
        return res.status(200).json({ error: 'This location already has 15 knowledge bases, the GHL maximum' });
      }
      creating = { name: createName, existingCount: bases.length };
      if (apply) {
        const made = await ghl('/knowledge-bases/', key, {
          method: 'POST',
          body: JSON.stringify({
            locationId,
            name: createName,
            description:
              'Generated from ghl-chatbot-knowledge-base.md in the website repo. ' +
              'Do not edit by hand: edits are overwritten on the next push.',
          }),
        });
        const madeKb = (made.data && (made.data.knowledgeBase || made.data)) || made;
        target = { id: madeKb.id, name: madeKb.name || createName };
        creating.createdId = target.id;
      }
    } else {
      const wanted = req.query.kb || DEFAULT_KB_NAME;
      target = bases.find(b => (b.name || '').toLowerCase() === wanted.toLowerCase());
      if (!target) {
        return res.status(200).json({
          error: `No knowledge base named "${wanted}"`,
          available: bases.map(b => b.name),
          note: 'Refusing to guess. Pass ?kb=<name> or fix DEFAULT_KB_NAME.',
        });
      }
    }

    /* A base we are about to create has no FAQs yet, and does not exist at all
       during a dry run, so there is nothing to list or delete. */
    const existing = target ? await listAllFaqs(key, locationId, target.id) : [];

    const plan = {
      mode: apply ? 'APPLIED' : 'dry-run',
      source: { url: sourceUrl, bytes: md.length },
      knowledgeBase: target
        ? { id: target.id, name: target.name, of: bases.length }
        : { willCreate: createName, of: bases.length, existing: bases.map(b => b.name) },
      willCreateKnowledgeBase: creating ? createName : false,
      willDelete: existing.length,
      willCreate: faqs.length,
      warnings,
      questions: faqs.map((f, i) => `${String(i + 1).padStart(2, '0')}. ${f.question}  (${f.answer.length} chars)`),
    };

    if (!apply) {
      plan.note = 'Nothing was changed. Re-send as POST with ?apply=1 to perform this.';
      return res.status(200).json(plan);
    }

    const deleted = [];
    const failed = [];
    for (const f of existing) {
      try {
        await ghl(`/knowledge-bases/faqs/${f.id}`, key, { method: 'DELETE' });
        deleted.push(f.id);
      } catch (e) {
        failed.push({ stage: 'delete', id: f.id, error: e.message });
      }
    }
    const created = [];
    for (const f of faqs) {
      try {
        await ghl('/knowledge-bases/faqs', key, {
          method: 'POST',
          body: JSON.stringify({
            locationId,
            knowledgeBaseId: target.id,
            question: f.question,
            answer: f.answer,
          }),
        });
        created.push(f.question);
      } catch (e) {
        failed.push({ stage: 'create', question: f.question, error: e.message });
      }
    }

    return res.status(200).json({ ...plan, deleted: deleted.length, created: created.length, failed });
  } catch (e) {
    return res.status(500).json({ mode: apply ? 'APPLIED-PARTIAL' : 'dry-run', error: e.message });
  }
}
