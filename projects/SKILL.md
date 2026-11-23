---
name: projects
description: Runs a project on Spacesheep. One space holds the project's tasks as records, and board spaces show and change them live. Use when someone asks for a project board, a backlog, a kanban, or to track tasks for people and agents.
license: MIT
---

# Projects

A project is one **database space** holding its tasks, labels and settings as shared records, and any number of
**board spaces** that read and change them as the reader. Every shape is in
[references/task-shape.md](references/task-shape.md): never add fields of your own; put extra words in `body`.

## Make a project from one ask

1. **The database.** Fill `templates/database.html` (`{{NAME}}`, and `{{BOARDS}}` once the boards exist) and publish it.
   Its `spacesheep:records` meta makes `tasks`, `labels` and `settings` shared, editable by anyone it's shared with.
   Keep that meta on every publish of this space.
2. **The settings record.** `create_record` in `settings`: `{"key": "PROJ", "name": "<project name>", "next": 1}`.
   The key is 3-5 capital letters, from the name unless the person gives one. Add the labels they ask for in `labels`.
3. **Each board.** Fill `templates/board.html`: `{{SOURCE}}` is the database as `@owner/slug`, `{{TITLE}}` the
   board's name. Publish it as its own space.
4. **Let the boards write.** `update_collection` on the database, once for `tasks` and once for `settings`, with
   `writers` = every board's address. The list replaces the one before, so name all the boards each time. A board that
   isn't listed can read but not change anything.
5. **Share** the database and every board with the same people. A board shows the tasks only to readers who can open
   the database too.
6. Re-publish the database with `{{BOARDS}}` filled, then send the person the boards' links.

## Change tasks as an agent

- Make a task: read the settings record, `update_record` it to `next + 1` with the `revision` you read, then
  `create_record` in `tasks` with `key` = `<key>-<the number you took>`. A conflict means someone took that number:
  read again and take the next.
- Change a task: `update_record` with the whole data and the `revision` you read. A conflict means it changed since:
  read it again, apply your change to the new data, and send that.
- Moving a task between columns sets `state`, and `rank` to text that sorts between its new neighbours.
- Done means the `done_when` evidence exists: link it in `links` before setting `state` to `done`.

## The board

The board is the Quiet Ledger design: kanban columns with counts, Done folded to one line, a task opened in a panel
beside the board, Board and List (⌘B), a command menu showing every key (⌘K), and N for a new task. On a phone it shows
one column at a time, under status tabs. A change anyone makes reaches every open board within a second.

Never give a board the keys C, / or Escape: Spacesheep's viewer uses them.
