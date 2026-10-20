#!/usr/bin/env node
'use strict';

// PreToolUse(Write|Edit|MultiEdit|Bash) — protects append-only data (NFR-02, NFR-05).
//  1. Blocks any change to an existing Alembic migration file (new revisions are allowed).
//  2. Blocks update/delete code in the append-only repositories:
//     enrolments, lesson completions, quiz attempts, progress snapshots, course state changes.
//  3. Blocks shell commands that rewrite or remove existing migration files.

const fs = require('fs');
const { readEvent, relPath, absPath, insertedContent, block, allow, isWriteTool } = require('./lib/learnlab-hook-utils');

const HOOK = 'attempt-immutability-check';
const MIGRATIONS = /(^|\/)backend\/migrations\/versions\/[^/]+\.py$/;
const APPEND_ONLY_REPO =
  /(^|\/)backend\/src\/learnlab\/repositories\/(enrollment|completion|lesson_completion|attempt|quiz_attempt|progress_snapshot|course_state_change)[a-z_]*\.py$/;
const MUTATION_PATTERNS = [
  [/\bdef\s+(update|delete|remove|edit|modify|patch|upsert|overwrite)\w*\s*\(/i, 'defines an update/delete method'],
  [/\.delete\s*\(/, 'calls .delete()'],
  [/\.update\s*\(/, 'calls .update()'],
  [/\bUPDATE\s+\w+\s+SET\b/i, 'contains SQL UPDATE'],
  [/\bDELETE\s+FROM\b/i, 'contains SQL DELETE'],
  [/\bmerge\s*\(/, 'calls session.merge(), which can overwrite rows'],
];
const SHELL_MIGRATION_EDIT = /(sed\s+-i|\brm\b|\bmv\b|>\s*|tee\b|truncate\b|git\s+(rm|mv|checkout\s+--))[^|;&]*backend\/migrations\/versions\//;

const event = readEvent();

if (event.tool_name === 'Bash') {
  const cmd = String((event.tool_input || {}).command || '').replace(/\\/g, '/');
  if (SHELL_MIGRATION_EDIT.test(cmd)) {
    block(HOOK, 'shell command would modify or remove an existing migration.', 'NFR-05 — migrations are append-only; add a new revision instead.');
  }
  allow();
}

if (!isWriteTool(event)) allow();

const rel = relPath(event);

if (MIGRATIONS.test(rel) && fs.existsSync(absPath(event))) {
  block(HOOK, `${rel} is an existing migration.`, 'NFR-05 — never edit an existing migration; create a new Alembic revision.');
}

if (APPEND_ONLY_REPO.test(rel)) {
  const added = insertedContent(event);
  for (const [pattern, what] of MUTATION_PATTERNS) {
    if (pattern.test(added)) {
      block(HOOK, `${rel} ${what}.`, 'NFR-02 — enrolments, completions, attempts, snapshots and state changes are insert-only.');
    }
  }
}

allow();
