'use strict';

// Shared helpers for the LearnLab project hooks.
// Claude Code passes the hook event as JSON on stdin; a hook blocks a tool call
// by writing a reason to stderr and exiting with code 2.

const fs = require('fs');
const path = require('path');

function readEvent() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch (_) {
    return {};
  }
}

function projectDir(event) {
  return process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
}

// Repository-relative path with forward slashes, or '' when there is no target file.
function relPath(event) {
  const input = event.tool_input || {};
  const target = input.file_path || input.path || '';
  if (!target) return '';
  const abs = path.isAbsolute(target) ? target : path.join(projectDir(event), target);
  return path.relative(projectDir(event), abs).replace(/\\/g, '/');
}

function absPath(event) {
  return path.join(projectDir(event), relPath(event));
}

function readExisting(event) {
  try {
    return fs.readFileSync(absPath(event), 'utf8');
  } catch (_) {
    return null;
  }
}

function applyEdit(text, oldStr, newStr, replaceAll) {
  if (oldStr === undefined || oldStr === '') return text;
  return replaceAll ? text.split(oldStr).join(newStr) : text.replace(oldStr, () => newStr);
}

// The file as it would look after the tool call.
function finalContent(event) {
  const input = event.tool_input || {};
  if (event.tool_name === 'Write') return input.content || '';
  let text = readExisting(event) || '';
  if (event.tool_name === 'Edit') {
    return applyEdit(text, input.old_string, input.new_string || '', input.replace_all);
  }
  if (event.tool_name === 'MultiEdit') {
    for (const e of input.edits || []) text = applyEdit(text, e.old_string, e.new_string || '', e.replace_all);
    return text;
  }
  return text;
}

// Only the text this tool call introduces, so pre-existing content never blocks an unrelated edit.
function insertedContent(event) {
  const input = event.tool_input || {};
  if (event.tool_name === 'Write') return input.content || '';
  if (event.tool_name === 'Edit') return input.new_string || '';
  if (event.tool_name === 'MultiEdit') return (input.edits || []).map((e) => e.new_string || '').join('\n');
  return '';
}

function block(hook, reason, rule) {
  process.stderr.write(`[${hook}] BLOCKED: ${reason}\nRule: ${rule}\nSee CLAUDE.md and specs/agent-contracts.md.\n`);
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function isWriteTool(event) {
  return ['Write', 'Edit', 'MultiEdit'].includes(event.tool_name);
}

module.exports = {
  readEvent, projectDir, relPath, absPath, readExisting, finalContent, insertedContent,
  block, allow, isWriteTool,
};
