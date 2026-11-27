# Changelog

Newest first. Each release is `## v<major>.<minor>.<patch> · YYYY-MM-DD`, then at most 6 lines, one per change, each
starting with Added, Changed, Fixed, Removed or Breaking, about 100 characters at most. The release workflow copies
the lines under a tag's heading into its GitHub release, and Spacesheep shows them on the skill's Versions tab.

## v1.2.0 · 2026-11-27
- Added: imports keep their own keys (`ALA-2135`), authors and dates; new tasks count on from there.
- Added: sprints and estimates on tasks, and a This sprint filter on the board.
- Added: assignees and reviewers by name as well as by @handle.
- Added: `--team` puts a project in a team; `archive` moves finished tasks off the boards.
- Added: `check` lists broken parents, blockers, labels and repeated keys.
- Fixed: `add` read only the first 200 tasks.

## v1.1.0 · 2026-11-27
- Added: epics, with an Epics view, an epic filter and an Epic field on each task.
- Added: `--show public` opens the boards to everyone, read only; the database stays private.
- Fixed: the database page counted only the first 200 tasks.

## v1.0.0 · 2026-11-23
- Added: `projects.js new` builds a project in about a second: database, labels, tasks and boards.
- Added: `add` adds tasks later, and two agents adding at once never share a key.
- Added: boards show changes live and open at once on what the reader saw last.
- Added: the database page lists the boards, where things stand and the last changes.
