#!/usr/bin/env python3
"""AC coverage audit for LearnLab.

Checks that every acceptance scenario in specs/ (AC-NN.x, CT-AC.x, NFR-NN.x, UI-AC.x)
has at least one tagged test, and writes specs/reviews/ac-audit.md.

Two passes:
  1. Deterministic (always): extract scenario ids from the specs and look for them in
     backend/tests, frontend/src and e2e test files. Exits 1 if any AC-NN has no test.
  2. Semantic (--deep): a read-only Claude Agent SDK session checks whether the tests
     tagged for each scenario actually assert its "Then" clause, and adds its verdicts
     to the report. Needs the claude-agent-sdk package and Claude credentials.

Usage:
    python scripts/ac_audit.py            # deterministic, used by the CI job `ac-audit`
    python scripts/ac_audit.py --deep     # adds the Agent SDK review
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECS = ROOT / "specs"
REPORT = SPECS / "reviews" / "ac-audit.md"
TEST_GLOBS = [
    "backend/tests/**/*.py",
    "frontend/src/**/*.test.ts",
    "frontend/src/**/*.test.tsx",
    "e2e/**/*.spec.ts",
]
SCENARIO_RE = re.compile(r"\*\*((?:AC-\d{2}\.\d+)|(?:CT-AC\.\d+))\b")
NFR_ROW_RE = re.compile(r"^\|\s*((?:NFR-\d{2}\.\d+)|(?:UI-AC\.\d+))\s*\|", re.MULTILINE)
AC_RE = re.compile(r"\bAC-\d{2}\b")
MODEL = "claude-opus-5-5"


@dataclass
class Scenario:
    sid: str
    spec: str
    tests: list[str] = field(default_factory=list)

    @property
    def ac(self) -> str | None:
        m = AC_RE.match(self.sid)
        return m.group(0) if m else None


def collect_scenarios() -> dict[str, Scenario]:
    found: dict[str, Scenario] = {}
    for spec in sorted(SPECS.glob("*.md")):
        text = spec.read_text(encoding="utf-8")
        ids = SCENARIO_RE.findall(text)
        if spec.name == "app_spec.md":
            ids += NFR_ROW_RE.findall(text)
        for sid in ids:
            found.setdefault(sid, Scenario(sid, spec.name))
    return found


def collect_tests() -> dict[str, str]:
    files: dict[str, str] = {}
    for pattern in TEST_GLOBS:
        for path in ROOT.glob(pattern):
            files[path.relative_to(ROOT).as_posix()] = path.read_text(encoding="utf-8", errors="replace")
    return files


def link(scenarios: dict[str, Scenario], tests: dict[str, str]) -> None:
    for sc in scenarios.values():
        exact = re.compile(re.escape(sc.sid) + r"(?![\d])")
        sc.tests = sorted(path for path, body in tests.items() if exact.search(body))


def ac_status(scenarios: dict[str, Scenario], tests: dict[str, str]) -> dict[str, list[str]]:
    """AC-NN -> test files that carry the AC tag (marker or title), the rubric's unit."""
    acs = sorted({sc.ac for sc in scenarios.values() if sc.ac})
    out: dict[str, list[str]] = {}
    for ac in acs:
        tag = re.compile(r"(ac\(\s*[\"']" + ac + r"[\"']\s*\)|\b" + ac + r"\b)")
        out[ac] = sorted(path for path, body in tests.items() if tag.search(body))
    return out


async def deep_review(scenarios: dict[str, Scenario]) -> list[dict]:
    """Ask a read-only Agent SDK session whether tagged tests assert each scenario's Then clause."""
    from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query

    covered = [{"id": s.sid, "spec": s.spec, "tests": s.tests} for s in scenarios.values() if s.tests]
    if not covered:
        return []
    schema = {
        "type": "object",
        "properties": {
            "verdicts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "verdict": {"type": "string", "enum": ["asserts_then", "partial", "missing_assertion"]},
                        "note": {"type": "string"},
                    },
                    "required": ["id", "verdict", "note"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["verdicts"],
        "additionalProperties": False,
    }
    options = ClaudeAgentOptions(
        model=MODEL,
        cwd=str(ROOT),
        allowed_tools=["Read", "Grep", "Glob"],
        disallowed_tools=["Bash", "Write", "Edit", "MultiEdit", "WebFetch", "WebSearch"],
        permission_mode="dontAsk",
        max_turns=60,
        system_prompt=(
            "You audit acceptance-test coverage for the LearnLab repository. You are read-only. "
            "For each scenario, open its spec in specs/ and find the Given-When-Then text for its id, "
            "then read the listed test files and judge whether at least one test asserts the observable "
            "'Then' outcome (status codes, error codes, values, row counts). Judge only what the code asserts."
        ),
        output_format={"type": "json_schema", "schema": schema},
    )
    prompt = "Audit these scenarios:\n" + json.dumps(covered, indent=2)
    verdicts: list[dict] = []
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, ResultMessage) and not message.is_error and message.structured_output:
            verdicts = message.structured_output.get("verdicts", [])
    return verdicts


def write_report(scenarios: dict[str, Scenario], acs: dict[str, list[str]], verdicts: list[dict]) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    missing_acs = [ac for ac, files in acs.items() if not files]
    missing_sc = [s for s in scenarios.values() if not s.tests]
    lines = [
        "# AC Coverage Audit",
        "",
        "| Field | Value |",
        "|---|---|",
        f"| Generated | {now} by `scripts/ac_audit.py`{' --deep' if verdicts else ''} |",
        f"| Acceptance criteria with a tagged test | {len(acs) - len(missing_acs)} / {len(acs)} |",
        f"| Scenarios referenced by a test | {len(scenarios) - len(missing_sc)} / {len(scenarios)} |",
        f"| Result | {'PASS' if not missing_acs else 'FAIL'} (gate: every AC-NN has at least one tagged test) |",
        "",
        "## Acceptance criteria",
        "",
        "| AC | Tagged test files |",
        "|---|---|",
    ]
    lines += [f"| {ac} | {', '.join(f'`{f}`' for f in files) or '**none**'} |" for ac, files in acs.items()]
    lines += ["", "## Scenarios", "", "| Scenario | Spec | Tests |", "|---|---|---|"]
    lines += [
        f"| {s.sid} | {s.spec} | {', '.join(f'`{t}`' for t in s.tests) or '—'} |"
        for s in sorted(scenarios.values(), key=lambda s: s.sid)
    ]
    if verdicts:
        lines += ["", "## Semantic review (Claude Agent SDK)", "", "| Scenario | Verdict | Note |", "|---|---|---|"]
        lines += [f"| {v['id']} | {v['verdict']} | {v['note']} |" for v in verdicts]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--deep", action="store_true", help="add the Claude Agent SDK semantic review")
    args = parser.parse_args()

    scenarios = collect_scenarios()
    tests = collect_tests()
    link(scenarios, tests)
    acs = ac_status(scenarios, tests)
    verdicts = asyncio.run(deep_review(scenarios)) if args.deep else []
    write_report(scenarios, acs, verdicts)

    missing = [ac for ac, files in acs.items() if not files]
    print(f"{len(scenarios)} scenarios, {len(acs)} ACs, {len(tests)} test files; report: {REPORT.relative_to(ROOT)}")
    if missing:
        print("ACs without a tagged test: " + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
