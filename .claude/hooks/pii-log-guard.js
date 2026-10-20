#!/usr/bin/env node
'use strict';

// PreToolUse(Write|Edit|MultiEdit) — keeps learner PII and performance data out of logs (NFR-03).
// Blocks newly written log / print / console calls whose arguments mention
// email, phone, password, score or progress, unless the value is passed through redact()/mask().

const { readEvent, relPath, insertedContent, block, allow, isWriteTool } = require('./lib/learnlab-hook-utils');

const HOOK = 'pii-log-guard';
const SOURCE = /(^|\/)(backend\/src|frontend\/src)\/.+\.(py|ts|tsx|js|jsx)$/;
const LOG_CALL = /\b(?:logger|log|logging|_logger|self\.logger|self\.log)\s*\.\s*(?:debug|info|warning|warn|error|exception|critical)\s*\(|\bprint\s*\(|\bconsole\s*\.\s*(?:log|info|warn|error|debug)\s*\(/;
const SENSITIVE = /\b(e_?mail|phone|password|passwd|pwd|score(?:_percent)?|best_score\w*|progress(?:_percent)?|percent)\b/i;
const SAFE = /\b(redact|mask)\s*\(/;

const event = readEvent();
if (!isWriteTool(event)) allow();

const rel = relPath(event);
if (!SOURCE.test(rel) || /(^|\/)tests?\//.test(rel)) allow();

const offending = insertedContent(event)
  .split(/\r?\n/)
  .map((line, i) => ({ line: line.trim(), n: i + 1 }))
  .filter(({ line }) => LOG_CALL.test(line) && SENSITIVE.test(line) && !SAFE.test(line) && !line.startsWith('#') && !line.startsWith('//'));

if (offending.length) {
  const sample = offending.slice(0, 3).map((o) => `  > ${o.line}`).join('\n');
  block(HOOK, `${rel} logs a PII or performance field:\n${sample}`,
    'NFR-03 — never log email, phone, password, scores or progress; omit the field or wrap it in redact().');
}

allow();
