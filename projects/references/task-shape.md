# The task shape

A project is one database space with three shared collections. The repo's `proto/task.proto` is the same shape as
protobuf messages.

| Collection | One record per | Holds |
|---|---|---|
| `tasks` | task | the fields below |
| `labels` | label | `{name, color}`: a task names its labels by record id, so a rename reaches every card |
| `settings` | project (exactly one) | `{key, name, next, home, boards}`: the project key, the next task number, and where the project lives |

## A task

| Field | Type | Holds |
|---|---|---|
| `key` | text, `<KEY>-<n>` | Its key, `PROJ-12`. Taken from `settings.next` when the task is made; never reused |
| `title` | text, 1-200 characters | What it is, in a line |
| `body` | Markdown, at most 10,000 characters | What done means, and anything else worth knowing |
| `state` | `backlog`, `todo`, `in_progress`, `in_review`, `done` or `dropped` | Where it is; a board's columns, in this order. `dropped` is hidden from the board |
| `assignees` | @handles, at most 10 | Who does it: people or agents |
| `priority` | `urgent`, `high`, `medium`, `low` or `none` | How soon |
| `labels` | label record ids, at most 10 | Its labels. An id with no label record is hidden |
| `due` | date, `YYYY-MM-DD` | When it's due |
| `blocked_by` | task keys, at most 20 | What must finish first. A board shows the other side as "Blocks" |
| `parent` | task key | The task it's part of. A task others name here is an epic: the board shows it in the Epics view, not as a card |
| `rank` | text | Its place in its column: sorts as text, so a move changes one task |
| `reviewers` | @handles, at most 10 | Who checks it before it's done (optional) |
| `done_when` | text, at most 10 | The evidence that closes it: "the PR is merged" (optional) |
| `links` | URLs, at most 20 | A PR, a space, a thread (optional) |

Who made a task, and when it was made and last changed, come from the record itself (`author`, `created_at`,
`updated_at`), never from its data. Boards show them as "Created" and "Last updated".

```json
{
  "key": "PROJ-2",
  "title": "Read another space's records",
  "state": "in_progress",
  "assignees": ["@space-builder"],
  "priority": "high",
  "labels": ["<a label record's id>"],
  "due": "2026-12-02",
  "blocked_by": ["PROJ-7"],
  "rank": "i"
}
```

## A label

```json
{ "name": "Design", "color": "#4f46e5" }
```

`color` is `#rrggbb`. Offer these first: `#6b7280` grey, `#4f46e5` indigo, `#0e7490` teal, `#15803d` green,
`#b45309` amber, `#b91c1c` red, `#9333ea` purple.

## The settings record

```json
{ "key": "PROJ", "name": "Projects skill", "next": 1,
  "home": "https://spacesheep.dev/@you/projects-skill",
  "boards": [{ "name": "Board", "url": "https://spacesheep.dev/@you/projects-skill-board" }] }
```

`home` is the database space; `boards` is every board, which the database page lists. A new board is added here, and
to the writers of `tasks`, `labels` and `settings`.

`key` is 3-5 capital letters, from the project's name unless someone gives one. To make a task, read this record, then
update it to `next + 1` with the `revision` you read. A 409 means someone else took that number: read it again and take
the next. The task's key is `<key>-<the number you took>`.
