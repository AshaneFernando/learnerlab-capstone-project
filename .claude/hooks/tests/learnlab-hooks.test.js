'use strict';

// Run with: node --test .claude/hooks/tests/
// Each hook gets at least one input it must block (exit 2) and one it must allow (exit 0).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS = path.join(__dirname, '..');

function project(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnlab-hooks-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

function run(hook, dir, event) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, hook)], {
    input: JSON.stringify({ cwd: dir, ...event }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8',
  });
  return { code: r.status, stderr: r.stderr };
}

// ---------------------------------------------------------------- attempt-immutability-check
const AIC = 'attempt-immutability-check.js';
const MIG = 'backend/migrations/versions/0001_baseline.py';

test('AIC blocks editing an existing migration', () => {
  const dir = project({ [MIG]: 'revision = "0001"\n' });
  const r = run(AIC, dir, { tool_name: 'Edit', tool_input: { file_path: MIG, old_string: '0001', new_string: '0001b' } });
  assert.strictEqual(r.code, 2, r.stderr);
  assert.match(r.stderr, /NFR-05/);
});

test('AIC allows creating a new migration', () => {
  const dir = project({ [MIG]: 'revision = "0001"\n' });
  const r = run(AIC, dir, { tool_name: 'Write', tool_input: { file_path: 'backend/migrations/versions/0002_quiz_version.py', content: 'revision = "0002"\n' } });
  assert.strictEqual(r.code, 0, r.stderr);
});

test('AIC blocks an update method in an append-only repository', () => {
  const dir = project();
  const r = run(AIC, dir, {
    tool_name: 'Write',
    tool_input: { file_path: 'backend/src/learnlab/repositories/attempt_repository.py', content: 'class AttemptRepository:\n    def update_score(self, attempt_id, score):\n        ...\n' },
  });
  assert.strictEqual(r.code, 2, r.stderr);
  assert.match(r.stderr, /NFR-02/);
});

test('AIC allows add and read methods in an append-only repository', () => {
  const dir = project();
  const r = run(AIC, dir, {
    tool_name: 'Write',
    tool_input: { file_path: 'backend/src/learnlab/repositories/enrollment_repository.py', content: 'class EnrollmentRepository:\n    def add(self, enrollment):\n        self.session.add(enrollment)\n\n    def get_for_learner(self, learner_id):\n        ...\n' },
  });
  assert.strictEqual(r.code, 0, r.stderr);
});

test('AIC allows update methods in a mutable repository', () => {
  const dir = project();
  const r = run(AIC, dir, {
    tool_name: 'Write',
    tool_input: { file_path: 'backend/src/learnlab/repositories/course_repository.py', content: 'def update_details(self, course):\n    ...\n' },
  });
  assert.strictEqual(r.code, 0, r.stderr);
});

test('AIC blocks sed -i on a migration', () => {
  const dir = project();
  const r = run(AIC, dir, { tool_name: 'Bash', tool_input: { command: 'sed -i s/a/b/ backend/migrations/versions/0001_baseline.py' } });
  assert.strictEqual(r.code, 2, r.stderr);
});

test('AIC allows alembic revision commands', () => {
  const dir = project();
  const r = run(AIC, dir, { tool_name: 'Bash', tool_input: { command: 'cd backend && uv run alembic revision -m "add quiz version"' } });
  assert.strictEqual(r.code, 0, r.stderr);
});

// ---------------------------------------------------------------- course-publish-gate
const CPG = 'course-publish-gate.js';
const SVC = 'backend/src/learnlab/services/course_authoring_service.py';

test('CPG blocks a content-changing method without PublishedContentGuard', () => {
  const dir = project();
  const content = [
    'class CourseAuthoringService:',
    '    def add_lesson(self, instructor, module_id, data):',
    '        module = self.courses.get_module(module_id)',
    '        return self.courses.add_lesson(module, data)',
    '',
  ].join('\n');
  const r = run(CPG, dir, { tool_name: 'Write', tool_input: { file_path: SVC, content } });
  assert.strictEqual(r.code, 2, r.stderr);
  assert.match(r.stderr, /add_lesson/);
});

test('CPG allows guarded methods and an unguarded create_course', () => {
  const dir = project();
  const content = [
    'class CourseAuthoringService:',
    '    def create_course(self, instructor, data):',
    '        return self.courses.add(data)',
    '',
    '    def add_lesson(self, instructor, module_id, data):',
    '        module = self.courses.get_module(module_id)',
    '        PublishedContentGuard.ensure_editable(module.course.state)',
    '        return self.courses.add_lesson(module, data)',
    '',
    '    def get_outline(self, course_id):',
    '        return self.courses.outline(course_id)',
    '',
  ].join('\n');
  const r = run(CPG, dir, { tool_name: 'Write', tool_input: { file_path: SVC, content } });
  assert.strictEqual(r.code, 0, r.stderr);
});

test('CPG checks the file as it will look after an Edit', () => {
  const dir = project({
    [SVC]: 'class CourseAuthoringService:\n    def update_course(self, c, data):\n        PublishedContentGuard.ensure_editable(c.state)\n        return c\n',
  });
  const r = run(CPG, dir, {
    tool_name: 'Edit',
    tool_input: { file_path: SVC, old_string: '        PublishedContentGuard.ensure_editable(c.state)\n', new_string: '' },
  });
  assert.strictEqual(r.code, 2, r.stderr);
});

test('CPG ignores other services', () => {
  const dir = project();
  const r = run(CPG, dir, {
    tool_name: 'Write',
    tool_input: { file_path: 'backend/src/learnlab/services/enrollment_service.py', content: 'def add_enrollment(self):\n    ...\n' },
  });
  assert.strictEqual(r.code, 0, r.stderr);
});

// ---------------------------------------------------------------- pii-log-guard
const PII = 'pii-log-guard.js';

test('PII blocks logging an email', () => {
  const dir = project();
  const r = run(PII, dir, {
    tool_name: 'Write',
    tool_input: { file_path: 'backend/src/learnlab/services/auth_service.py', content: 'logger.info("registered user", extra={"email": user.email})\n' },
  });
  assert.strictEqual(r.code, 2, r.stderr);
  assert.match(r.stderr, /NFR-03/);
});

test('PII blocks logging a quiz score in the frontend', () => {
  const dir = project();
  const r = run(PII, dir, {
    tool_name: 'Edit',
    tool_input: { file_path: 'frontend/src/pages/QuizPage.tsx', old_string: '', new_string: 'console.log("result", result.score_percent);' },
  });
  assert.strictEqual(r.code, 2, r.stderr);
});

test('PII allows logging ids and redacted values', () => {
  const dir = project();
  const content = [
    'logger.info("enrolment created", extra={"enrollment_id": e.id, "course_id": e.course_id})',
    'logger.warning("login failed", extra={"email": redact(email)})',
    '',
  ].join('\n');
  const r = run(PII, dir, { tool_name: 'Write', tool_input: { file_path: 'backend/src/learnlab/services/enrollment_service.py', content } });
  assert.strictEqual(r.code, 0, r.stderr);
});

test('PII ignores test files', () => {
  const dir = project();
  const r = run(PII, dir, {
    tool_name: 'Write',
    tool_input: { file_path: 'backend/tests/unit/test_x.py', content: 'print(user.email)\n' },
  });
  assert.strictEqual(r.code, 0, r.stderr);
});
