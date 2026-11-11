<!--
wiki:
  project: {{PROJECT_NAME}}
  repo: {{OWNER}}/{{REPO}}
  lang: en                      # canonical source language; translations point back here
  source_commit: {{GIT_SHA}}    # commit the facts below were checked against
  updated: {{YYYY-MM-DD}}
  translations:
    zh-CN: WIKI.zh-CN.md        # each translation stores the sha256 of this file's body in its own header
  publish_as: Home.md           # name inside {{REPO}}.wiki.git (zh-CN -> Home-zh-CN.md); sync rewrites WIKI*.md links to wiki page names
Rules: every number, benchmark, and capability claim carries an evidence pointer
(file:line, test name, run id, or release asset). No pointer, no claim. Delete any
section that does not answer a reader question for this repo.
-->

# {{PROJECT_NAME}}

**English** | [简体中文](WIKI.zh-CN.md)

{{One paragraph: what this is, who it is for, and the one thing it does that its neighbours do not. Plain words, no launch copy.}}

| | |
| --- | --- |
| Status | {{experimental / alpha / beta / stable}} as of {{VERSION}} ({{YYYY-MM-DD}}) |
| Language / runtime | {{e.g. Python 3.11+, Node 22, Rust 1.8x}} |
| License | {{SPDX id}} |
| Latest release | [{{VERSION}}](https://github.com/{{OWNER}}/{{REPO}}/releases/tag/{{VERSION}}) |
| Cite | [CITATION.cff](https://github.com/{{OWNER}}/{{REPO}}/blob/main/CITATION.cff) {{DOI badge if one exists}} |

## Contents

This list routes you to the section that answers your question.

1. [Why it exists](#why-it-exists)
2. [How it works](#how-it-works)
3. [Components](#components)
4. [Install](#install)
5. [Use](#use)
6. [Configuration](#configuration)
7. [Results and evidence](#results-and-evidence)
8. [API reference](#api-reference)
9. [Status and roadmap](#status-and-roadmap)
10. [Contributing](#contributing)
11. [Changelog](#changelog)
12. [License and citation](#license-and-citation)
13. [Glossary](#glossary)

## Why it exists

This section states the problem and why existing approaches fall short.

{{2-4 short paragraphs. Name the failure modes in other systems precisely.}}

| Problem | Usual approach | What {{PROJECT_NAME}} does instead | Evidence |
| --- | --- | --- | --- |
| {{problem}} | {{approach}} | {{mechanism}} | {{file:line or doc link}} |

## How it works

This section gives the end-to-end flow before the parts.

```text
{{INPUT}} -> {{STAGE 1}} -> {{STAGE 2}} -> {{STAGE 3}} -> {{OUTPUT}}
```

{{Optional Mermaid diagram. GitHub wikis render ```mermaid blocks.}}

### Core idea

{{The mechanism in prose, then the math or contract if there is one.}}

```text
{{formula or protocol definition}}
```

Where:

- `{{symbol}}`: {{meaning}}

## Components

This section explains each part: what it is for, its contract, and where it lives.

### {{Component 1}}

- **Purpose:** {{one sentence}}
- **Lives in:** `{{path/to/module}}`
- **Inputs / outputs:** {{types or shapes}}
- **Key behaviour:** {{2-3 bullets}}

```{{lang}}
{{minimal real call, copied from tests or examples}}
```

### {{Component 2}}

{{Repeat the block above.}}

## Install

This section gets a working copy on your machine.

**Prerequisites:** {{runtime and version}}, {{system deps}}, {{hardware if relevant}}

```bash
git clone https://github.com/{{OWNER}}/{{REPO}}.git
cd {{REPO}}
{{install command}}
```

Development install:

```bash
{{dev install command}}
```

Check that it worked:

```bash
{{smoke command}}   # expected: {{expected output}}
```

## Use

This section shows the shortest real path to a result, then the common variations.

### Quick start

```{{lang}}
{{copy-pasteable example that runs as written}}
```

### Common tasks

| I want to | Run / call | Notes |
| --- | --- | --- |
| {{task}} | `{{command}}` | {{caveat}} |

## Configuration

This section lists every setting a user can change.

| Key | Default | Effect | Defined in |
| --- | --- | --- | --- |
| `{{key}}` | `{{default}}` | {{effect}} | `{{file:line}}` |

## Results and evidence

This section reports measured results only, each with how to reproduce it.

> Leave this section empty, or delete it, until a run exists. Projected or target numbers go in Status and roadmap and are labelled as targets.

| Metric | Value | Setup | Reproduce |
| --- | --- | --- | --- |
| {{metric}} | {{value}} | {{hardware, dataset, seed}} | `{{command}}` / run `{{id}}` |

## API reference

This section documents the public interface. Anything not listed here is internal and may change.

### `{{ClassOrFunction}}`

```{{lang}}
{{signature}}
```

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `{{param}}` | `{{type}}` | `{{default}}` | {{meaning}} |

Returns: {{type and meaning}}. Raises: {{errors}}.

## Status and roadmap

This section says what works today, what does not, and what comes next.

| Area | State | Notes |
| --- | --- | --- |
| {{area}} | Working / Partial / Planned | {{evidence or blocker}} |

Known limits:

- {{limit}}

Next:

- {{next item}} (target: {{milestone}})

## Contributing

This section tells a contributor how to make a change that will be accepted.

1. Read `AGENTS.md` and `CONTRIBUTING.md`.
2. Branch from `{{default branch}}` as `{{branch convention}}`.
3. Run `{{test command}}` and `{{lint command}}` before you push.
4. Open a pull request using the template. Put the test output in the evidence section.

Issue forms: [bug report](https://github.com/{{OWNER}}/{{REPO}}/issues/new?template=bug_report.yml) and [feature request](https://github.com/{{OWNER}}/{{REPO}}/issues/new?template=feature_request.yml).

## Changelog

This section summarises recent releases. The full history is in [CHANGELOG.md](https://github.com/{{OWNER}}/{{REPO}}/blob/main/CHANGELOG.md).

| Version | Date | Highlights |
| --- | --- | --- |
| {{VERSION}} | {{YYYY-MM-DD}} | {{one line}} |

## License and citation

This section states the terms of use and how to credit the work.

Licensed under {{LICENSE}}. See [LICENSE](https://github.com/{{OWNER}}/{{REPO}}/blob/main/LICENSE).

```bibtex
@software{{{CITE_KEY}},
  author  = {{{AUTHOR}}},
  title   = {{{PROJECT_NAME}}},
  version = {{{VERSION}}},
  year    = {{{YEAR}}},
  url     = {https://github.com/{{OWNER}}/{{REPO}}}{{, doi = {DOI} only if minted}}
}
```

## Glossary

This section defines the project's own terms so the rest of the page reads cleanly.

| Term | Meaning |
| --- | --- |
| {{term}} | {{definition}} |

---

<sub>Facts checked against commit `{{GIT_SHA}}` on {{YYYY-MM-DD}}. Translations: [简体中文](WIKI.zh-CN.md).</sub>
