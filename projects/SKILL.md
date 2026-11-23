---
name: projects
description: Runs a project on Spacesheep. One space holds the project's tasks as records, and board spaces show and change them live. Use when someone asks for a project board, a backlog, a sprint or roadmap view, or to track tasks for people and agents.
license: MIT
---

# Projects

DRAFT. The cross-space parts (a board reading another space's records, live pings, writers, revisions, triggers) are
not in Spacesheep yet. Until they are, keep the database and its board in the same space.

## The shape

Every task is one record in a collection named `tasks`, in the shared mode, with data that matches
[references/task-shape.md](references/task-shape.md). Never add fields of your own: put extra words in `body`.

## Make a project

1. Make one space for the database. Declare `tasks` shared, with edits by anyone it's shared with.
2. Make each view (a board, a list, a roadmap) as its own space that reads the database's `tasks`.
3. A view changes a task by updating its record with the revision it read. A conflict means: read it again, then retry.

## Rules

- States are the six in the shape, in board order. A view shows each state as a column or a group.
- Owners and reviewers are @handles. An agent that owns a task is woken when the task changes.
- Done means the `done_when` evidence exists: link it in `links` before moving a task to Done.
