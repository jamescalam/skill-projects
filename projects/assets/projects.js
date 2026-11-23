#!/usr/bin/env node
// Every command the Projects skill runs, so a person allows this one script instead of a dozen calls.
// It talks to Spacesheep through the spacesheep CLI's MCP bridge (`spacesheep mcp`, one process for the
// whole run, its calls side by side), so a whole project is three round trips, not twenty. It runs only
// the CLI, with fixed arguments; if the CLI isn't installed, npx downloads it from npm. It reads only the
// files named on its command line and writes nothing on this machine.
//
//   node projects.js new "<project name>" [--key PROJ] [--boards "Board, Design review"]
//                         [--labels "Design:#4f46e5, Bug:#b91c1c"] [--tasks tasks.json]
//                         [--visibility private|members|signed_in|public] [--people "a@b.c, @handle"]
//       The database space, its settings and labels, the tasks in tasks.json, and each board, every
//       board allowed to write, all shared alike. Prints the links as JSON.
//   node projects.js add <database: @owner/slug or link> --tasks tasks.json
//       More tasks: takes their keys in one guarded claim, then makes them side by side.
//
// tasks.json is a list of tasks (or {"tasks": [...]}) in the task shape (references/task-shape.md), with
// two conveniences: `labels` may name labels ("Design") as well as give record ids, and `blocked_by` /
// `parent` may give a task's place in this list (1 = the first) as well as a key. Leave `key` and
// `rank` out: they are given here.

"use strict";
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const TEMPLATES = path.join(__dirname, "..", "templates");
const STATES = ["backlog", "todo", "in_progress", "in_review", "done", "dropped"];
const PRIORITIES = ["urgent", "high", "medium", "low", "none"];
const PALETTE = ["#4f46e5", "#0e7490", "#15803d", "#b45309", "#b91c1c", "#9333ea", "#6b7280"];
const t0 = Date.now();
const ms = () => Date.now() - t0;
const log = (line) => process.stderr.write(`[${(ms() / 1000).toFixed(2)}s] ${line}\n`);
const die = (why) => { process.stderr.write(`projects.js: ${why}\n`); process.exit(2); };

// --- Arguments ---
const argv = process.argv.slice(2);
const cmd = argv.shift();
const flags = {}, rest = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) { const k = a.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith("--")) die(`--${k} needs a value`); flags[k] = v; i++; }
  else rest.push(a);
}
const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

// --- The CLI's MCP bridge: one process, calls side by side ---
function findCli() {
  if (process.env.PROJECTS_CLI) return [process.env.PROJECTS_CLI];
  // npx's own copy, from its cache when it has one (0.2 s, not 0.8 s asking npm): the bridge rarely changes.
  for (const find of ["command -v spacesheep", "npx --prefer-offline -y -p spacesheep@latest -c 'command -v spacesheep'"]) {
    try { const bin = execSync(find, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, killSignal: "SIGKILL" }).trim(); if (bin) return [bin]; } catch {}
  }
  return ["npx", "-y", "spacesheep@latest"];
}
function bridge() {
  const cli = findCli();
  const p = spawn(cli[0], [...cli.slice(1), "mcp"], { stdio: ["pipe", "pipe", "pipe"] });
  let buf = "", n = 0, err = "";
  const waits = new Map();
  p.stderr.on("data", (d) => { err += d; });
  p.stdout.on("data", (d) => {
    buf += d;
    for (let i; (i = buf.indexOf("\n")) >= 0;) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let m; try { m = JSON.parse(line); } catch { continue; }
      const w = waits.get(m.id); if (w) { waits.delete(m.id); w(m); }
    }
  });
  p.on("exit", () => { for (const w of waits.values()) w({ error: { message: err.trim().split("\n").pop() || "the spacesheep CLI stopped" } }); waits.clear(); });
  const rpc = (method, params) => new Promise((ok) => { const id = ++n; waits.set(id, ok); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
  // Spacesheep's MCP server keeps no session, so calls go straight out: an initialize first would cost a whole round
  // trip. A server that asks for one refuses the call before running it, so then it's made and the call sent again.
  let ready = null;
  const initialize = () => ready || (ready = rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "projects-skill", version: "1" } })
    .then((m) => { if (m.error) throw new Error(m.error.message); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n"); }));
  async function call(name, args) {
    const t = Date.now();
    try { return await callOnce(name, args); } finally { if (process.env.PROJECTS_TRACE) log(`  ${name} ${args.collection || ""} ${Date.now() - t} ms`); }
  }
  async function callOnce(name, args) {
    if (ready) await ready;
    let m = await rpc("tools/call", { name, arguments: args });
    if (m.error && /initiali[sz]|session/i.test(m.error.message || "")) { await initialize(); m = await rpc("tools/call", { name, arguments: args }); }
    if (m.error) throw new Error(`${name}: ${m.error.message}`);
    const r = m.result || {};
    const text = (r.content || []).map((c) => c.text || "").join("\n");
    if (r.isError) { const e = new Error(`${name}: ${text.slice(0, 400)}`); e.text = text; throw e; }
    if (r.structuredContent) return r.structuredContent;
    try { return JSON.parse(text); } catch { return { text }; }
  }
  return { call, close: () => p.stdin.end() };
}

// --- Shapes ---
const AL = "0123456789abcdefghijklmnopqrstuvwxyz";
function between(a, b) { // the board's own rank rule: text that sorts between two, never ending in 0
  a = a || ""; let out = "";
  for (let i = 0; ; i++) {
    let ca = i < a.length ? AL.indexOf(a[i]) : 0, cb = b != null && i < b.length ? AL.indexOf(b[i]) : 36;
    if (ca < 0) ca = 0; if (cb < 0) cb = 36;
    if (cb - ca > 1) return out + AL[(ca + cb) >> 1];
    out += AL[ca]; if (cb - ca === 1) b = null;
    if (i > 40) return out + "i";
  }
}
function keyFrom(name) { // initials, topped up from the last word: Crumb launch → CLA, Bakery → BAK
  const words = String(name).toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  if (!words.length) return "TASK";
  let k = words.map((w) => w[0]).join("").slice(0, 5);
  const last = words[words.length - 1].slice(1);
  for (let i = 0; k.length < 3 && i < last.length; i++) k += last[i];
  return k.padEnd(3, "X");
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fill = (file, vars) => fs.readFileSync(path.join(TEMPLATES, file), "utf8").replace(/\{\{([A-Z]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
function readTasks(file) {
  if (!file) return [];
  let j; try { j = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { die(`can't read ${file}: ${e.message}`); }
  const tasks = Array.isArray(j) ? j : j && j.tasks;
  if (!Array.isArray(tasks)) die(`${file} holds no list of tasks`);
  tasks.forEach((t, i) => {
    if (!t || typeof t !== "object" || !String(t.title || "").trim()) die(`task ${i + 1} in ${file} has no title`);
    if (t.state && !STATES.includes(t.state)) die(`task ${i + 1}: state "${t.state}" isn't one of ${STATES.join(", ")}`);
    if (t.priority && !PRIORITIES.includes(t.priority)) die(`task ${i + 1}: priority "${t.priority}" isn't one of ${PRIORITIES.join(", ")}`);
  });
  return tasks;
}
function parseLabels(v) {
  return list(v).map((s, i) => { const m = /^(.*?)(?::\s*(#[0-9a-fA-F]{6}))?$/.exec(s); return { name: m[1].trim(), color: (m[2] || PALETTE[i % PALETTE.length]).toLowerCase() }; }).filter((l) => l.name);
}
// The tasks as records: keys from `first`, ranks in order per column, labels and links resolved.
function taskRecords(tasks, key, first, labelIds, lastRank = {}) {
  const keyAt = (ref) => (typeof ref === "number" || /^\d+$/.test(String(ref)) ? (tasks[Number(ref) - 1] ? `${key}-${first + Number(ref) - 1}` : null) : String(ref).toUpperCase());
  return tasks.map((t, i) => {
    const d = { ...t, key: `${key}-${first + i}`, title: String(t.title).trim().slice(0, 200), state: t.state || "todo" };
    delete d.rank;
    d.rank = lastRank[d.state] = between(lastRank[d.state] || "", null);
    if (Array.isArray(t.labels)) d.labels = t.labels.map((l) => labelIds[String(l).toLowerCase()] || l).filter((l) => Object.values(labelIds).includes(l)).slice(0, 10);
    if (Array.isArray(t.blocked_by)) d.blocked_by = t.blocked_by.map(keyAt).filter(Boolean).slice(0, 20);
    if (t.parent != null) { const p = keyAt(t.parent); if (p) d.parent = p; else delete d.parent; }
    if (Array.isArray(t.assignees)) d.assignees = t.assignees.map((h) => (String(h).startsWith("@") ? h : "@" + h)).slice(0, 10);
    return d;
  });
}
const all = (xs) => Promise.all(xs);
// Record writes go 24 at a time. Spacesheep takes 120 record writes a minute from one person; one it refused for that
// was never written, so it is sent again after the wait it names. Any other failure is not retried: it may have landed.
let slots = 24, slowed = false;
const queue = [];
async function write(fn) {
  if (slots <= 0) await new Promise((ok) => queue.push(ok)); else slots--;
  try {
    for (let tries = 0; ; tries++) {
      try { return await fn(); }
      catch (e) {
        if (tries >= 6 || !/rate_limited|too many|429/i.test(e.message)) throw e;
        if (!slowed) { slowed = true; log("Spacesheep's limit of 120 record writes a minute: waiting, then going on"); }
        await new Promise((ok) => setTimeout(ok, 31000));
      }
    }
  } finally { const next = queue.shift(); if (next) next(); else slots++; }
}

// The address create_space gives a title when it's free (shared/slug.ts), so the boards can name the database
// before it exists.
function slugify(title) {
  return String(title).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "untitled";
}

async function newProject() {
  const name = rest[0] && rest[0].trim();
  if (!name) die('new needs the project\'s name: projects.js new "<name>"');
  const key = (flags.key || keyFrom(name)).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{2,4}$/.test(key)) die(`--key ${key}: 3-5 capital letters or digits, starting with a letter`);
  const boards = list(flags.boards || "Board");
  const labels = parseLabels(flags.labels);
  const tasks = readTasks(flags.tasks);
  const share = { ...(flags.visibility ? { visibility: flags.visibility } : {}), ...(flags.people ? { people: list(flags.people) } : {}) };
  const ss = bridge();
  const slug = slugify(name);
  const boardTitle = (b) => (b === "Board" ? `${name} · Board` : `${name} · ${b}`);
  const boardFile = (src, b) => [{ path: "index.html", content: fill("board.html", { SOURCE: src, TITLE: esc(b === "Board" ? name : b) }) }];

  // Everything starts as soon as what it needs exists, so the build takes its longest chain, not the sum:
  //   the database ─┬─ labels ─ tasks
  //                 ├─ settings (with the boards) ─┐
  //   who you are ─ boards (naming the database at the address it asked for) ─┴─ boards allowed to write
  // A database that got another address (the name was taken) has its boards re-published to name it.
  const dbP = ss.call("create_space", { title: name, slug, emoji: "🗂️", description: `${name}: the project's tasks`, label: "Project database", ...share,
    files: [{ path: "index.html", content: fill("database.html", { NAME: esc(name), KEY: key }) }] }).then((r) => { log(`database ${r.space.name}`); return r.space; });
  // Your @handle, from your profile (its text says "Username: @you"); without it the boards wait for the database.
  const meP = ss.call("get_account", {}).then((r) => { const m = /Username:\s*@([a-z0-9-]+)/i.exec(r.text || ""); return m ? m[1].toLowerCase() : (r.username || null); }, () => null);
  const planned = meP.then((h) => (h ? `@${String(h).replace(/^@/, "")}/${slug}` : null));
  const boardsP = Promise.all([planned, planned.then((src) => (src ? null : dbP))]).then(([src, db]) => {
    const source = src || db.name;
    return all(boards.map((b) => ss.call("create_space", { title: boardTitle(b), emoji: "📋", description: `${b}: ${name}'s tasks, live`, label: "Board", ...share, files: boardFile(source, b) })
      .then((r) => r.space))).then((spaces) => ({ spaces, source }));
  }).then(async ({ spaces, source }) => {
    const db = await dbP;
    if (source !== db.name) { log(`${source} was taken: the boards now name ${db.name}`); await all(spaces.map((sp, i) => ss.call("create_version", { space_id: sp.id, label: "Board", files: boardFile(db.name, boards[i]) }))); }
    log(`${spaces.length} board(s)`);
    return spaces;
  });
  const labelsP = dbP.then((db) => all(labels.map((l) => write(() => ss.call("create_record", { space_id: db.id, collection: "labels", data: l })).then((r) => r.record))));
  // A task with no labels goes as soon as the database exists; one with labels once they do.
  const make = (db, d) => write(() => ss.call("create_record", { space_id: db.id, collection: "tasks", data: d }));
  const labelled = tasks.map((t) => Array.isArray(t.labels) && t.labels.length > 0);
  const plainP = dbP.then((db) => all(taskRecords(tasks, key, 1, {}).filter((d, i) => !labelled[i]).map((d) => make(db, d))));
  const labelledP = Promise.all([dbP, labelsP]).then(([db, labelRecs]) => {
    const labelIds = {}; labelRecs.forEach((r) => { labelIds[String(r.data.name).toLowerCase()] = r.id; });
    return all(taskRecords(tasks, key, 1, labelIds).filter((d, i) => labelled[i]).map((d) => make(db, d)));
  });
  const tasksP = Promise.all([plainP, labelledP]).then(([a, b]) => log(`${labels.length} label(s), ${a.length + b.length} task(s)`));
  const restP = Promise.all([dbP, boardsP]).then(([db, spaces]) => all([
    write(() => ss.call("create_record", { space_id: db.id, collection: "settings", data: { key, name, next: tasks.length + 1, home: db.url, boards: spaces.map((sp, i) => ({ name: boards[i], url: sp.url })) } })),
    all(["tasks", "labels", "settings"].map((c) => ss.call("update_collection", { space_id: db.id, collection: c, writers_ids: spaces.map((sp) => sp.id) }))),
  ]).then(() => log("settings, boards allowed to write")));
  const [db, spaces] = await Promise.all([dbP, boardsP, tasksP, restP]);
  ss.close();
  process.stdout.write(JSON.stringify({ project: name, key, database: { name: db.name, url: db.url }, boards: spaces.map((sp, i) => ({ name: boards[i], url: sp.url })), labels: labels.length, tasks: tasks.length, ms: ms() }, null, 2) + "\n");
}

async function addTasks() {
  const where = String(rest[0] || "").replace(/^https?:\/\/[^/]+\//, "").replace(/\/+$/, "");
  if (!/^@?[a-z0-9-]+\/[a-z0-9-]+$/.test(where)) die("add needs the database as @owner/slug or its link");
  const space = where.startsWith("@") ? where : "@" + where;
  const tasks = readTasks(flags.tasks);
  if (!tasks.length) die("add needs --tasks with at least one task");
  const ss = bridge();
  const [settingsList, labelList, taskList] = await all(["settings", "labels", "tasks"].map((c) => ss.call("list_records", { space, collection: c, limit: 200 })));
  // Take the keys in one guarded claim: a conflict means someone else took some; read again and claim after them.
  let s = (settingsList.records || [])[0];
  if (!s) die(`${space} has no settings record: is it a Projects database?`);
  let first;
  for (let tries = 0; ; tries++) {
    first = Math.max(1, Math.floor(Number(s.data.next)) || 1);
    try { await ss.call("update_record", { space, collection: "settings", record: s.id, revision: s.revision, data: { ...s.data, next: first + tasks.length } }); break; }
    catch (e) { if (tries > 5 || !/conflict|409|revision/i.test(e.message)) throw e; s = await ss.call("get_record", { space, collection: "settings", record: s.id }).then((r) => r.record); }
  }
  const labelIds = {}; (labelList.records || []).forEach((r) => { labelIds[String(r.data.name).toLowerCase()] = r.id; });
  const lastRank = {}; (taskList.records || []).forEach((r) => { const st = r.data.state || "backlog", rk = String(r.data.rank || ""); if (rk > (lastRank[st] || "")) lastRank[st] = rk; });
  const made = await all(taskRecords(tasks, String(s.data.key), first, labelIds, lastRank).map((d) => write(() => ss.call("create_record", { space, collection: "tasks", data: d }))));
  ss.close();
  process.stdout.write(JSON.stringify({ added: made.map((m) => m.record && m.record.data.key), ms: ms() }, null, 2) + "\n");
}

const run = { new: newProject, add: addTasks }[cmd];
if (!run) die("commands: new, add (see the top of this file)");
run().catch((e) => { process.stderr.write(`projects.js ${cmd}: ${e.message}\n`); process.exit(1); });
