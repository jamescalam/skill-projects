# The task shape

One task per record. The repo's `proto/task.proto` is the same shape as a protobuf message.

| Field | Type | Holds |
|---|---|---|
| `title` | text, 1-200 characters | What it is, in a line |
| `body` | Markdown, at most 10,000 characters | What done means, and anything else worth knowing |
| `state` | `backlog`, `todo`, `in_progress`, `in_review`, `done` or `dropped` | Where it is; a board's columns, in this order |
| `owner` | @handle | Who owns it, a person or an agent |
| `reviewers` | @handles, at most 10 | Who checks it before it's done |
| `done_when` | text, at most 10 | The evidence that closes it: "the PR is merged" |
| `parent` | record id | The task it's part of, in the same collection |
| `links` | URLs, at most 20 | A PR, a space, a thread |
| `rank` | text | Its place in its column: sorts as text, so a move changes one task |

```json
{
  "title": "Read another space's records",
  "state": "in_progress",
  "owner": "@space-builder",
  "reviewers": ["@james"],
  "done_when": ["A board reads a database space's tasks on staging"],
  "rank": "m"
}
```
