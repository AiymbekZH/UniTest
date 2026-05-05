/**
 * One-time migration: copy DMMessage + Message (group) into the unified
 * ChatMessage collection.
 *
 *   node server/scripts/migrate-chat-messages.js                  # dry-run
 *   node server/scripts/migrate-chat-messages.js --apply          # actually write
 *   node server/scripts/migrate-chat-messages.js --apply --reset  # also drop ChatMessage first
 *
 * Idempotency: each old document carries its `_id`. The script preserves
 * that `_id` in ChatMessage so re-running the migration is a no-op (the
 * second insertMany call hits a duplicate-key error per doc and we just
 * count it as already-migrated).
 *
 * Designed to be paused-and-resumed safe: processes in batches of 500,
 * logs progress every batch. On Atlas Free tier this is the difference
 * between "completed in 8 minutes" and "OOM-killed at message #12000".
 *
 * Phase 5 step is to run this with `--apply`, verify counts, then point
 * the live socket handlers at ChatMessage and retire the old collections.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const DMMessage = require('../models/DMMessage');
const Message = require('../models/Message'); // group
const ChatMessage = require('../models/ChatMessage');

const APPLY = process.argv.includes('--apply');
const RESET = process.argv.includes('--reset');
const BATCH_SIZE = 500;

function dmDocToChatDoc(dm) {
  // Preserve `_id` so the migration is idempotent and replyTo references
  // continue to resolve via raw ObjectId equality.
  return {
    _id: dm._id,
    chatType: 'dm',
    chatId: dm.conversation,
    sender: dm.sender,
    type: dm.type || 'text',
    text: dm.text || '',
    attachments: dm.attachments || [],
    replyTo: dm.replyTo || null, // points to a DMMessage._id which == ChatMessage._id post-migration
    forwardedFrom: dm.forwardedFrom || undefined,
    mentions: dm.mentions || [],
    isEdited: !!dm.isEdited,
    editedAt: dm.editedAt || null,
    isPinned: false, // DMs had no concept of pinned messages
    isDeleted: !!dm.isDeleted,
    deletedFor: dm.deletedFor || [],
    readBy: dm.readBy || [],
    reactions: dm.reactions || [],
    meta: dm.meta || {},
    createdAt: dm.createdAt,
    updatedAt: dm.updatedAt,
  };
}

function groupDocToChatDoc(gm) {
  return {
    _id: gm._id,
    chatType: 'group',
    chatId: gm.group,
    sender: gm.sender,
    type: gm.type || 'text',
    text: gm.text || '',
    attachments: gm.attachments || [],
    replyTo: gm.replyTo || null,
    forwardedFrom: gm.forwardedFrom || undefined,
    mentions: gm.mentions || [],
    isEdited: !!gm.isEdited,
    editedAt: gm.editedAt || null,
    isPinned: !!gm.isPinned,
    isDeleted: !!gm.isDeleted,
    deletedFor: gm.deletedFor || [],
    // Group messages had no readBy field; default to empty.
    readBy: [],
    reactions: gm.reactions || [], // post Phase 1 group can have reactions; pre-migration this is []
    meta: gm.meta || {},
    createdAt: gm.createdAt,
    updatedAt: gm.updatedAt,
  };
}

async function migrateCollection(name, sourceModel, mapper) {
  const total = await sourceModel.countDocuments({});
  if (total === 0) {
    console.log(`[${name}] empty — nothing to migrate.`);
    return { total: 0, copied: 0, skipped: 0 };
  }

  console.log(`[${name}] ${total} docs to process (batch=${BATCH_SIZE})`);

  let copied = 0;
  let skipped = 0; // docs that already exist in ChatMessage (idempotent re-runs)
  let processed = 0;

  // Cursor with batchSize + lean for memory safety. Without lean(), the
  // 16MB attachments balloon JS heap usage on large packs.
  const cursor = sourceModel.find({}).lean().batchSize(BATCH_SIZE).cursor();

  let batch = [];
  for await (const doc of cursor) {
    batch.push(mapper(doc));
    if (batch.length >= BATCH_SIZE) {
      const result = await flush(batch);
      copied += result.copied;
      skipped += result.skipped;
      processed += batch.length;
      batch = [];
      console.log(`[${name}] ${processed}/${total} (copied=${copied}, skipped=${skipped})`);
    }
  }
  if (batch.length > 0) {
    const result = await flush(batch);
    copied += result.copied;
    skipped += result.skipped;
    processed += batch.length;
    console.log(`[${name}] ${processed}/${total} (copied=${copied}, skipped=${skipped}) — done`);
  }

  return { total, copied, skipped };
}

async function flush(batch) {
  if (!APPLY) {
    return { copied: batch.length, skipped: 0 };
  }
  try {
    // ordered:false lets duplicate-key errors per doc continue past, which
    // is exactly the idempotent behavior we want on re-runs.
    await ChatMessage.insertMany(batch, { ordered: false, lean: true });
    return { copied: batch.length, skipped: 0 };
  } catch (err) {
    // BulkWriteError carries `result.insertedCount` and `writeErrors`.
    const insertedCount = err.result?.insertedCount ?? err.insertedDocs?.length ?? 0;
    const skipped = batch.length - insertedCount;
    return { copied: insertedCount, skipped };
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI / MONGO_URI env var required.');
    process.exit(1);
  }

  console.log(`[migrate] connecting to mongo… (apply=${APPLY}, reset=${RESET})`);
  await mongoose.connect(uri);
  console.log('[migrate] connected.');

  if (RESET) {
    if (!APPLY) {
      console.log('[reset] dry-run: would drop ChatMessage collection.');
    } else {
      console.log('[reset] dropping ChatMessage collection…');
      try {
        await ChatMessage.collection.drop();
        console.log('[reset] dropped.');
      } catch (err) {
        if (err.codeName === 'NamespaceNotFound') {
          console.log('[reset] (collection did not exist, skipping)');
        } else {
          throw err;
        }
      }
    }
  }

  const startedAt = Date.now();

  const dmStats = await migrateCollection('DMMessage', DMMessage, dmDocToChatDoc);
  const groupStats = await migrateCollection('Message (group)', Message, groupDocToChatDoc);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('');
  console.log('─── summary ───────────────────────────');
  console.log(`DMMessage:       ${dmStats.copied}/${dmStats.total} copied (${dmStats.skipped} already migrated)`);
  console.log(`Group Message:   ${groupStats.copied}/${groupStats.total} copied (${groupStats.skipped} already migrated)`);
  console.log(`elapsed:         ${elapsed}s`);
  console.log(`mode:            ${APPLY ? 'APPLY (writes committed)' : 'DRY RUN (no writes)'}`);
  console.log('───────────────────────────────────────');

  if (!APPLY) {
    console.log('');
    console.log('Re-run with --apply to actually write. Add --reset to wipe ChatMessage first.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[migrate] fatal:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
