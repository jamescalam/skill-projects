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

1. **The tasks, if the ask names any** (or implies them: "a launch plan", "the steps to …"). One Write call: a
   `tasks.json` list in the task shape, without `key` or `rank`. Two shortcuts: `labels` may name labels
   (`["Design"]`), and `blocked_by` / `parent` may give another task's place in the list (`[2]`). Keep titles to a
   line; put the rest in `body`. No tasks asked for: skip this, the board starts empty.
2. **One command:**

   ```
   node <this skill's folder>/assets/projects.js new "<project name>" --tasks tasks.json \
     --labels "Design, Bug:#b91c1c" --boards "Board" --people "a@b.c, @handle" --visibility private
   ```

   - `--key` sets the project key (3-5 capitals); by default it comes from the name (Crumb launch → CLA).
   - `--boards` names each board: one `Board` unless the person asks for more ("a board for design").
   - `--people` and `--visibility` share the database and every board alike: a reader needs both to see tasks.
     Leave them out and everything is private to the person.
   - `--labels` takes names, each with an optional `#rrggbb` (references/task-shape.md has the palette).
3. **Reply with the board's link first**, then one line on what's in it ("6 tasks, 4 labels, key CLA"). Name the
   database space as the project's home.

Without this skill's folder: `npx -y spacesheep@latest skills get @spacesheep/projects -o <an empty folder>`, then the
same command from that folder.

**Add tasks later** the same way: `node <folder>/assets/projects.js add <database @owner/slug or link> --tasks
more.json`. It takes their keys in one guarded claim, so two agents adding at once never share a key.

## No shell (a chat connector, Shepherd)

Do the same with the MCP tools, side by side wherever a step allows:

1. `create_space` the database: `templates/database.html` with `{{NAME}}`, `{{KEY}}` filled, `{{SOURCE}}` and
   `{{BOARDS}}` empty. Its answer's `name` is its address, `@owner/slug`.
2. Side by side: `create_space` each board (`templates/board.html`, `{{SOURCE}}` = the database's `@owner/slug`,
   `{{TITLE}}` = the board's name), `create_record` each label in `labels`, and `create_record` in `settings`:
   `{"key": "CLA", "name": "<project name>", "next": <number of tasks + 1>}`.
3. Side by side: `create_record` each task in `tasks` (`key` = `<KEY>-1`, `-2`…; `rank` in order per column,
   `"i"`, `"r"`, `"v"`…; `labels` as label record ids), `update_collection` on `tasks`, `labels` and `settings` with
   `writers_ids` = every board's id, and `create_version` of the database page with `{{SOURCE}}` and `{{BOARDS}}`
   filled (`<a href="<board url>">Board name</a>` each).

Share every space alike: `visibility` and `people` on each `create_space`.

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
beside the board, Board and List (⌘B), a command menu showing every key (⌘K), and N for a new task. A change shows on
the board that made it at once, and on every other open board within a second. A board opened before draws at once
from what it last saw, then catches up. On a phone it shows one column at a time, under status tabs.

Never give a board the keys C, / or Escape: Spacesheep's viewer uses them.
