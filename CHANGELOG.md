# Changelog

Each release is a heading with its tag. The release workflow uses the words under it as the release's notes.

## v1.2.0

- Imports keep their own keys (`PROJ-12`); new tasks count on from the highest.
- `new` takes `--team` and `--team-access`, so a project can live in a team.
- `projects.js check <database>` reports what is wrong with a project.
- Sprints and estimates: `sprint` and `estimate` on a task, and a sprint filter on the board with *This sprint*.
- Assignees and reviewers take names as well as @handles.
- `source {ref, url, created_at, author}` keeps where a task came from, shown as *Imported from* and *Created*; ⌘K finds
  the old key.
- An `archive` collection past the 2,000-task cap: `--archive done` on `new`, and `projects.js archive`.
- `add` reads every task (it stopped at 200), and the command's answer lists any body it had to cut.

## v1.1.0

- Epics: a task that others name as their parent. The board has an Epics view with each one's progress, a filter by epic,
  and an Epic field on a task. An epic's panel lists its tasks.
- A public board: `--show public` opens the boards to everyone, read only, while the database stays private. A visitor sees
  the tasks and nothing to edit; a property with nothing in it isn't shown.
- The database page counts every task (it stopped at 200), and leaves epics out of its counts.

## v1.0.0

- The first release.
- One command, `assets/projects.js new`, builds a project in about a second: the database space, its settings and
  labels, every task, every board, each board allowed to write, all shared alike. `add` adds tasks later.
- Boards show a change the moment it's made and send it after, and draw at once from what the reader last saw.
- The database page is the project's home: its boards, where things stand, and the last changes, live.
