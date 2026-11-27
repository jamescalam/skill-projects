# Changelog

All notable changes to this skill are documented in this file. Keep each release short: at most 6 lines.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this skill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-11-27

### Added

- Imports keep their own keys (`ALA-2135`), authors and dates; new tasks count on from there.
- Sprints and estimates on tasks, and a This sprint filter on the board.
- Assignees and reviewers by name as well as by @handle.
- `--team` puts a project in a team; `archive` moves finished tasks off the boards.
- `check` lists broken parents, blockers, labels and repeated keys.

### Fixed

- `add` read only the first 200 tasks.

## [1.1.0] - 2026-11-27

### Added

- Epics, with an Epics view, an epic filter and an Epic field on each task.
- `--show public` opens the boards to everyone, read only; the database stays private.

### Fixed

- The database page counted only the first 200 tasks.

## [1.0.0] - 2026-11-23

### Added

- `projects.js new` builds a project in about a second: database, labels, tasks and boards.
- `add` adds tasks later, and two agents adding at once never share a key.
- Boards show changes live and open at once on what the reader saw last.
- The database page lists the boards, where things stand and the last changes.

[unreleased]: https://github.com/jamescalam/skill-projects/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/jamescalam/skill-projects/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/jamescalam/skill-projects/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/jamescalam/skill-projects/releases/tag/v1.0.0
