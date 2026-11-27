---
name: projects
description: Runs a project on Spacesheep. One space holds the project's tasks as records, and live board spaces show and change them, for people and agents alike. Use when someone asks for a project board, a kanban, a backlog, a task tracker, a sprint or roadmap board, or to track work across people and agents.
license: MIT
---

# Projects

A project is one **database space** holding its tasks, labels and settings as shared records, and one or more **board
spaces** that read and change them as the reader, live. Every shape is in
[references/task-shape.md](references/task-shape.md): never add fields of your own; put extra words in `body`.

**Your budget:** the board's link in the person's hands within 30 seconds of their ask. Building takes about a second;
the rest is you.

## Make a project: one command

`assets/projects.js` builds everything in one go: the database, its settings and labels, every task, every board,
each board allowed to write, all shared alike. It talks to Spacesheep through the spacesheep CLI (downloaded by npx
if it isn't installed) and prints the links as JSON.

1. **The tasks, if the ask names any** (or implies them: "a launch plan", "the steps to …"). One Write call, never
   edited after: a `tasks.json` list. You need no other file for it; each task is an object of these, all but
   `title` optional:

   | Field | Value |
   |---|---|
   | `title` | one line |
   | `body` | Markdown: what done means, and anything else |
   | `state` | `backlog`, `todo` (the default), `in_progress`, `in_review`, `done` |
   | `priority` | `urgent`, `high`, `medium`, `low`, `none` |
   | `labels` | label names from `--labels`: `["Design"]` |
   | `assignees`, `reviewers` | `@handle` for someone on Spacesheep, else a name: `["@ana", "Carlos", "Release agent"]` |
   | `due` | `YYYY-MM-DD` |
   | `sprint`, `estimate` | a sprint's name; a number (points or hours) |
   | `blocked_by`, `parent` | other tasks in this list, by their exact title |
   | `done_when`, `links` | the evidence that closes it; URLs |

   No tasks asked for: skip this, the board starts empty. With sprints, write `{"tasks": [...], "sprints": [{"name",
   "start", "end"}]}` instead of a bare list.
2. **One command:**

   ```
   node <this skill's folder>/assets/projects.js new "<project name>" --tasks tasks.json \
     --labels "Design, Bug:#b91c1c" --boards "Board" --people "a@b.c, @handle" --visibility private
   ```

   - `--key` sets the project key (3-5 capitals); by default it comes from the name (Crumb launch → CLA).
   - `--boards` names each board: one `Board` unless the person asks for more ("a board for design").
   - `--people` and `--visibility` share the database and every board alike: a reader needs both to see tasks.
     Leave them out and everything is private to the person.
   - `--show public` (or `signed_in`) opens the boards alone to everyone, read only: they see the tasks and nothing to
     edit, and the database stays private. Use it for a project shown in public, never `--visibility public`, which lets
     anyone signed in change tasks. Nothing in a task is hidden there: keep private words out of titles and bodies.
   - `--labels` takes names, each with an optional `#rrggbb`; without one, each takes the next of the skill's
     palette.
   - `--team "<team>"` (and `--team-access view|edit`, view by default) puts the database and every board in one of
     the person's teams.
3. **Reply with the board's link first**, then one line on what's in it ("6 tasks, 4 labels, key CLA"). Name the
   database space as the project's home: it lists the boards and where things stand, and every board links to it.

Without this skill's folder: `npx -y spacesheep@latest skills get @spacesheep/projects -o <an empty folder>`, then the
same command from that folder.

Spacesheep takes 120 record writes a minute from one person, so a bigger import may pause for a minute and go on by
itself. A project holds at most 2,000 tasks, and anyone but the database's owner makes at most
200 of them.

**Epics:** a task that others name as their `parent` is an epic. Put it in the list before its tasks and give it a one-line
`body` saying what it's for. The board shows epics in their own view with their progress, and filters by one; they have no
card in the columns. Use them once a project has more than about 20 tasks.

**Moving a project in** (Linear, GitHub, a spreadsheet): keep its keys with `--key` set to theirs (ALA) and each task's
`"key": "ALA-2135"`; new tasks then count on from the highest. If the project takes a new key, put the old one in
`"source": {"ref": "ALA-2135", "url": "…"}`: the board shows it and finds it in ⌘K. Either way, put when and by whom
it was made in `source.created_at` and `source.author`. Add `--archive done` to file done and dropped tasks in the
archive straight away: a collection holds 2,000 tasks. The command's answer lists any body it cut at 10,000
characters. Then run `check` (below) and say what it found.

**Add tasks later** the same way: `node <folder>/assets/projects.js add <database @owner/slug or link> --tasks
more.json`. It takes their keys in one guarded claim, so two agents adding at once never share a key.

**Archive** finished work: `projects.js archive <database> [--before YYYY-MM-DD]` moves done and dropped tasks off the
boards into the `archive` collection. **Check** a project: `projects.js check <database>` counts tasks per state and
lists anything that points at nothing (a parent, a blocker or a label), repeated keys, a counter behind the keys, and
boards that can't write. It can't show you how a board looks: open it.

## No shell (a chat connector, Shepherd)

Do the same with the MCP tools, each step as soon as what it needs exists, side by side:

1. `create_space` the database: `templates/database.html` with `{{NAME}}` and `{{KEY}}` filled. Its answer's `name`
   is its address, `@owner/slug`.
2. Then, side by side: `create_space` each board (`templates/board.html`, `{{SOURCE}}` = the database's
   `@owner/slug`, `{{TITLE}}` = the board's name), and `create_record` each label in `labels`.
3. Then, side by side: `create_record` each task in `tasks` (`key` = `<KEY>-1`, `-2`…; `rank` in order per column,
   `"i"`, `"r"`, `"v"`…; `labels` as label record ids), `create_record` in `settings`
   (`{"key", "name", "next": <tasks + 1>, "home": <database url>, "boards": [{"name", "url"}]}`), and
   `update_collection` on `tasks`, `labels` and `settings` with `writers_ids` = every board's id.

Share every space alike: `visibility` and `people` on each `create_space`. A Spacesheep account makes at most 20
spaces an hour, and a project is one space plus one per board.

## Change tasks as an agent

- Change a task: `update_record` with the whole data and the `revision` you read. A conflict means it changed since:
  read it again, apply your change to the new data, and send that.
- Make one task: read the settings record, `update_record` it to `next + 1` with the `revision` you read, then
  `create_record` in `tasks` with `key` = `<key>-<the number you took>`. A conflict means someone took that number:
  read again and take the next. (`projects.js add` does this for you.)
- Moving a task between columns sets `state`, and `rank` to text that sorts between its new neighbours.
- Done means the `done_when` evidence exists: link it in `links` before setting `state` to `done`.
- Keep the database page's `spacesheep:records` meta on every publish of it: a publish without it makes the
  collections private again, and every board goes blank.

## The board

Kanban columns with counts (Backlog, Todo, In progress, In review, Done folded to one line), a task opened in a panel
beside the board, Board and List (⌘B), Epics (⇧E) and a filter by epic once any task has a `parent`, a command menu showing every key (⌘K), and N for a new task. A change shows on
the board that made it at once, and on every other open board within a second. A board opened before draws at once
from what it last saw, then catches up. On a phone it shows one column at a time, under status tabs.

Never give a board the keys C, / or Escape: Spacesheep's viewer uses them.
