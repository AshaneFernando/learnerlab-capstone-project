#!/usr/bin/env node
'use strict';

// PreToolUse(Write|Edit|MultiEdit) — enforces the content lock (DR-05, NFR-08).
// In the services that change course content, every content-changing method
// (add_* / update_* / delete_* / replace_* / edit_* / rename_* / patch_*) must call
// PublishedContentGuard before it writes. create_course is exempt: a new course is DRAFT.

const { readEvent, relPath, finalContent, block, allow, isWriteTool } = require('./lib/learnlab-hook-utils');

const HOOK = 'course-publish-gate';
const CONTENT_SERVICES = /(^|\/)backend\/src\/learnlab\/services\/(course_authoring|quiz_engine)_service\.py$/;
const CONTENT_METHOD = /^(add|update|delete|replace|edit|rename|patch|set)_\w+$/;
const EXEMPT = new Set(['create_course']);
const GUARD = /PublishedContentGuard|content_guard|published_content_guard/;

// Split Python source into top-level and class-level function bodies by indentation.
function functions(source) {
  const lines = source.split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/);
    if (!m) continue;
    const indent = m[1].length;
    let j = i + 1;
    while (j < lines.length) {
      const line = lines[j];
      if (line.trim() !== '' && line.match(/^(\s*)/)[1].length <= indent && !line.trim().startsWith(')')) break;
      j++;
    }
    found.push({ name: m[2], body: lines.slice(i, j).join('\n') });
  }
  return found;
}

const event = readEvent();
if (!isWriteTool(event)) allow();

const rel = relPath(event);
if (!CONTENT_SERVICES.test(rel)) allow();

const unguarded = functions(finalContent(event))
  .filter((f) => CONTENT_METHOD.test(f.name) && !EXEMPT.has(f.name) && !f.name.startsWith('_'))
  .filter((f) => !GUARD.test(f.body))
  .map((f) => f.name);

if (unguarded.length) {
  block(HOOK, `${rel}: ${unguarded.join(', ')} change course content without calling PublishedContentGuard.`,
    'DR-05 / NFR-08 — content changes are allowed only while a course is DRAFT or UNPUBLISHED.');
}

allow();
