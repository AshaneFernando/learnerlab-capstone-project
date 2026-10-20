# Feature Spec: Course Authoring

| Field | Value |
|---|---|
| Spec ID | AUTH-COURSE |
| Parent | [app_spec.md](app_spec.md) |
| Requirements | FR-06 – FR-11 |
| Acceptance criteria | AC-02, AC-03 |
| Domain rules | DR-01, DR-05, DR-06 (business-case §5.1) |
| Service | `CourseAuthoringService` |
| Domain files | `CourseStateMachine`, `PublishedContentGuard`, `RoleBoundaryPolicy` |
| Sprint | 1 (course details) · 2 (modules and lessons) |

## 1. Purpose

Let instructors build a course as an ordered hierarchy — **course → modules → lessons** — and keep that content safe once learners can see it. Content can only change while a course is DRAFT or UNPUBLISHED.

## 2. Actors and permissions

| Action | Learner | Instructor (owner) | Instructor (not owner) | Admin |
|---|---|---|---|---|
| Create course | 403 | ✅ | ✅ (becomes owner) | 403 |
| Edit course details | 403 | ✅ if editable | 403 | 403 |
| Add module / lesson | 403 | ✅ if editable | 403 | 403 |
| Edit module / lesson | 403 | ✅ if editable | 403 | 403 |
| Delete module / lesson | 403 | ✅ DRAFT only | 403 | 403 |
| List own courses | 403 | ✅ | — | — |

"Editable" means the course state is DRAFT or UNPUBLISHED.

## 3. Business rules

| ID | Rule | Source |
|---|---|---|
| CA-1 | A new course is created in DRAFT with `instructor_id` set to the caller. | DR-01 |
| CA-2 | Title: 3–120 characters. Description: 1–2000 characters. Category: 2–50 characters. Difficulty: one of `BEGINNER`, `INTERMEDIATE`, `ADVANCED`. | — |
| CA-3 | Content (course details, modules, lessons, quiz) can change only while the course is DRAFT or UNPUBLISHED. Otherwise `PublishedContentGuard` rejects the change with 409 `CONTENT_LOCKED`. | DR-05 |
| CA-4 | A new module is appended at `position = max(position) + 1` within the course, starting at 1. | — |
| CA-5 | A new lesson is appended at `position = max(position) + 1` within its module, starting at 1. | — |
| CA-6 | Module title: 3–120 characters. Lesson title: 3–120 characters. Lesson content: 1–20 000 characters of text (Markdown allowed; raw HTML is not rendered). `video_ref` is optional; when present it must be an `https://` URL of at most 500 characters, otherwise 422. It is never fetched and never rendered as a clickable link — the UI shows a placeholder only. | A-7, spec-review R-26 |
| CA-7 | Modules and lessons can be deleted only while the course is DRAFT; otherwise 409 `DELETE_NOT_ALLOWED`. Remaining items keep their positions; gaps are allowed and order is by ascending position. | Out of scope: post-publish reordering |
| CA-10 | A PATCH with an empty body returns 422 `VALIDATION_ERROR`. | spec-review R-25 |
| CA-8 | Only the owning instructor can change a course or its contents. | DR-24 |
| CA-9 | Changing course state is not an authoring action; it belongs to the admin (see catalog_spec). | DR-04 |

## 4. API contract

| Method | Path | Role | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/courses` | INSTRUCTOR | `{title, description, category, difficulty}` | 201 `Course` | 422 |
| GET | `/api/instructor/courses` | INSTRUCTOR | — | 200 `Course[]` (own, any state) | — |
| GET | `/api/instructor/courses/{course_id}` | INSTRUCTOR | — | 200 `CourseOutline` | 403, 404 |
| PATCH | `/api/courses/{course_id}` | INSTRUCTOR | any of `{title, description, category, difficulty}` | 200 `Course` | 403, 404, 409 `CONTENT_LOCKED`, 422 |
| POST | `/api/courses/{course_id}/modules` | INSTRUCTOR | `{title}` | 201 `Module` | 403, 404, 409 `CONTENT_LOCKED`, 422 |
| PATCH | `/api/modules/{module_id}` | INSTRUCTOR | `{title}` | 200 `Module` | 403, 404, 409, 422 |
| DELETE | `/api/modules/{module_id}` | INSTRUCTOR | — | 204 | 403, 404, 409 `DELETE_NOT_ALLOWED` |
| POST | `/api/modules/{module_id}/lessons` | INSTRUCTOR | `{title, content, video_ref?}` | 201 `Lesson` | 403, 404, 409, 422 |
| PATCH | `/api/lessons/{lesson_id}` | INSTRUCTOR | any of `{title, content, video_ref}` | 200 `Lesson` | 403, 404, 409, 422 |
| DELETE | `/api/lessons/{lesson_id}` | INSTRUCTOR | — | 204 | 403, 404, 409 `DELETE_NOT_ALLOWED` |

`DELETE` returns 409 `DELETE_NOT_ALLOWED` for any state other than DRAFT.

**Shapes**

```text
Course        { id, title, description, category, difficulty, state, instructor_id, created_at }
Module        { id, course_id, position, title }
Lesson        { id, module_id, position, title, content, video_ref }
CourseOutline { ...Course, modules: [ { ...Module, lessons: [Lesson], has_quiz } ] }
```

## 5. UI

**Instructor Workbench → My Courses**
- List of own courses with state badges and a "New course" button.
- Course editor: details form; an ordered list of modules, each with an ordered list of lessons; "Add module" and "Add lesson" actions.
- When a course is PUBLISHED or ARCHIVED, the editor is read-only and shows: "Ask an admin to unpublish this course before editing."
- Layout stacks to a single column at 375 px.

## 6. Acceptance criteria

### AC-02 — Instructor creates a course that starts in DRAFT

**AC-02.1 Create course**
- **Given** an authenticated instructor
- **When** they `POST /api/courses` with title "Intro to Python", description "Learn Python basics", category "Programming", difficulty "BEGINNER"
- **Then** the response is 201, `state` is `"DRAFT"` and `instructor_id` equals the instructor's ID

**AC-02.2 Missing or invalid fields are rejected**
- **Given** an authenticated instructor
- **When** they create a course with a 2-character title, or difficulty "EXPERT"
- **Then** the response is 422 `VALIDATION_ERROR` and no course is created

**AC-02.3 Only instructors can create courses**
- **Given** an authenticated learner or admin
- **When** they `POST /api/courses` with valid data
- **Then** the response is 403

**AC-02.4 Edit details while DRAFT**
- **Given** an instructor who owns a DRAFT course
- **When** they `PATCH /api/courses/{id}` with difficulty "INTERMEDIATE"
- **Then** the response is 200, `difficulty` is `"INTERMEDIATE"` and `state` is still `"DRAFT"`

### AC-03 — Instructor adds modules and nested lessons

**AC-03.1 Add modules in order**
- **Given** an instructor who owns a DRAFT course with no modules
- **When** they add modules "Basics" and then "Control Flow"
- **Then** both responses are 201 and the outline lists "Basics" at position 1 and "Control Flow" at position 2

**AC-03.2 Add nested lessons in order**
- **Given** a DRAFT course with module "Basics"
- **When** the owner adds lessons "Variables" and then "Types" to "Basics"
- **Then** the outline shows "Basics" containing "Variables" (position 1) then "Types" (position 2)

**AC-03.3 Published content is locked**
- **Given** a PUBLISHED course owned by the instructor
- **When** they add a module, add a lesson, edit a lesson or edit the course details
- **Then** each response is 409 `CONTENT_LOCKED` and the outline is unchanged

**AC-03.4 Unpublished content is editable again**
- **Given** an UNPUBLISHED course owned by the instructor
- **When** they add a lesson to an existing module
- **Then** the response is 201 and the lesson appears at the next position

**AC-03.5 Non-owner cannot change content**
- **Given** instructor B and a DRAFT course owned by instructor A
- **When** instructor B adds a module to that course
- **Then** the response is 403 and the outline is unchanged

**AC-03.6 Delete only while DRAFT**
- **Given** an UNPUBLISHED course with one lesson
- **When** the owner deletes the lesson
- **Then** the response is 409 `DELETE_NOT_ALLOWED` and the lesson still exists

**AC-03.7 Unsafe video references rejected**
- **Given** an instructor who owns a DRAFT course with a module
- **When** they add a lesson with `video_ref` set to `javascript:alert(1)` or `http://example.test/v.mp4`
- **Then** the response is 422 `VALIDATION_ERROR`; with `https://video.example.test/v1` it is 201

## 7. Non-functional

- NFR-04: role and ownership checks on every route above.
- NFR-08: `PublishedContentGuard` is covered by an architecture test that every content-changing service method calls it.

## 8. Out of scope

- Reordering modules or lessons; media upload; rich-text editor beyond a textarea.
- Co-authoring or transferring course ownership.
- Quiz authoring (see [quiz-engine_spec.md](quiz-engine_spec.md)).

## 9. Test traceability

| Test file | Covers |
|---|---|
| `backend/tests/unit/domain/test_published_content_guard.py` | CA-3, CA-7 · AC-03.3, AC-03.6 |
| `backend/tests/unit/services/test_course_authoring_service.py` | CA-1, CA-4, CA-5, CA-8 · AC-02.1, AC-03.1, AC-03.2 |
| `backend/tests/api/test_course_authoring_api.py` | AC-02.1 – AC-02.4, AC-03.1 – AC-03.7, CA-10 |
| `e2e/instructor-authoring.spec.ts` | AC-02.1, AC-03.2 in the UI at 375 px and 1280 px |
