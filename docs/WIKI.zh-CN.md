<!--
wiki:
  lang: zh-CN
  translation_of: WIKI.md
  source_sha256: ecc33f3ddbeffeb491dedd2b8f4b139ac41a1d0bc1384304090f37f575a45473   # sha256 of WIKI.md body at translation time; mismatch = stale
  source_commit: {{GIT_SHA}}
  publish_as: Home-zh-CN.md
Translate prose and table text. Keep code, commands, paths, keys, and numbers unchanged.
If source_sha256 no longer matches WIKI.md, put the stale banner at the top until re-translated.
-->
<!-- STALE BANNER (use only when stale): > 本页翻译落后于英文版，以 [English](WIKI.md) 为准。 -->


# {{PROJECT_NAME}}

[English](WIKI.md) | **简体中文**

{{One paragraph: what this is, who it is for, and the one thing it does that its neighbours do not. Plain words, no launch copy.}}

| | |
| --- | --- |
| Status | {{experimental / alpha / beta / stable}} as of {{VERSION}} ({{YYYY-MM-DD}}) |
| Language / runtime | {{e.g. Python 3.11+, Node 22, Rust 1.8x}} |
| License | {{SPDX id}} |
| Latest release | [{{VERSION}}](https://github.com/{{OWNER}}/{{REPO}}/releases/tag/{{VERSION}}) |
| Cite | [CITATION.cff](https://github.com/{{OWNER}}/{{REPO}}/blob/main/CITATION.cff) {{DOI badge if one exists}} |

## 目录

按问题查找对应章节。

1. [为什么要做](#为什么要做)
2. [工作原理](#工作原理)
3. [组件](#组件)
4. [安装](#安装)
5. [使用](#使用)
6. [配置](#配置)
7. [结果与证据](#结果与证据)
8. [API 参考](#api-参考)
9. [状态与路线图](#状态与路线图)
10. [参与贡献](#参与贡献)
11. [更新日志](#更新日志)
12. [许可与引用](#许可与引用)
13. [术语表](#术语表)

## 为什么要做

This section states the problem and why existing approaches fall short.

{{2-4 short paragraphs. Name the failure modes in other systems precisely.}}

| Problem | Usual approach | What {{PROJECT_NAME}} does instead | Evidence |
| --- | --- | --- | --- |
| {{problem}} | {{approach}} | {{mechanism}} | {{file:line or doc link}} |

## 工作原理

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

## 组件

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

## 安装

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

## 使用

This section shows the shortest real path to a result, then the common variations.

### Quick start

```{{lang}}
{{copy-pasteable example that runs as written}}
```

### Common tasks

| I want to | Run / call | Notes |
| --- | --- | --- |
| {{task}} | `{{command}}` | {{caveat}} |

## 配置

This section lists every setting a user can change.

| Key | Default | Effect | Defined in |
| --- | --- | --- | --- |
| `{{key}}` | `{{default}}` | {{effect}} | `{{file:line}}` |

## 结果与证据

This section reports measured results only, each with how to reproduce it.

> Leave this section empty, or delete it, until a run exists. Projected or target numbers go in Status and roadmap and are labelled as targets.

| Metric | Value | Setup | Reproduce |
| --- | --- | --- | --- |
| {{metric}} | {{value}} | {{hardware, dataset, seed}} | `{{command}}` / run `{{id}}` |

## API 参考

This section documents the public interface. Anything not listed here is internal and may change.

### `{{ClassOrFunction}}`

```{{lang}}
{{signature}}
```

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `{{param}}` | `{{type}}` | `{{default}}` | {{meaning}} |

Returns: {{type and meaning}}. Raises: {{errors}}.

## 状态与路线图

This section says what works today, what does not, and what comes next.

| Area | State | Notes |
| --- | --- | --- |
| {{area}} | Working / Partial / Planned | {{evidence or blocker}} |

Known limits:

- {{limit}}

Next:

- {{next item}} (target: {{milestone}})

## 参与贡献

This section tells a contributor how to make a change that will be accepted.

1. Read `AGENTS.md` and `CONTRIBUTING.md`.
2. Branch from `{{default branch}}` as `{{branch convention}}`.
3. Run `{{test command}}` and `{{lint command}}` before you push.
4. Open a pull request using the template. Put the test output in the evidence section.

Issue forms: [bug report](https://github.com/{{OWNER}}/{{REPO}}/issues/new?template=bug_report.yml) and [feature request](https://github.com/{{OWNER}}/{{REPO}}/issues/new?template=feature_request.yml).

## 更新日志

This section summarises recent releases. The full history is in [CHANGELOG.md](https://github.com/{{OWNER}}/{{REPO}}/blob/main/CHANGELOG.md).

| Version | Date | Highlights |
| --- | --- | --- |
| {{VERSION}} | {{YYYY-MM-DD}} | {{one line}} |

## 许可与引用

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

## 术语表

This section defines the project's own terms so the rest of the page reads cleanly.

| Term | Meaning |
| --- | --- |
| {{term}} | {{definition}} |

---

<sub>Facts checked against commit `{{GIT_SHA}}` on {{YYYY-MM-DD}}. English source: [English](WIKI.md).</sub>
