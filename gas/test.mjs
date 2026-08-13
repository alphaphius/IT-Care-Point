import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function makeSandbox() {
  const props = new Map();
  const folders = new Map();
  const files = new Map();
  const sheetData = new Map();
  const mailLog = [];
  let currentUser = "a@itcp.test";
  let seq = 0;
  let folderShare = null;
  let fileShare = null;

  function makeSheet(name) {
    if (!sheetData.has(name)) sheetData.set(name, { header: [], rows: [] });
    const d = sheetData.get(name);
    return {
      getName: () => name,
      getLastRow: () => (d.header.length ? 1 : 0) + d.rows.length,
      getLastColumn: () =>
        Math.max(d.header.length, ...d.rows.map((r) => r.length), 0),
      appendRow: (arr) => {
        if (d.header.length === 0) d.header = [...arr];
        else d.rows.push([...arr]);
      },
      setFrozenRows: () => {},
      getRange: (r, c, numRows, numCols) => {
        if (numRows !== undefined) {
          if (r === 1) {
            return {
              getValues: () => [d.header.slice(0, numCols)],
              setFontWeight: () => {},
            };
          }
          const vals = [];
          for (let i = 0; i < numRows; i++) {
            const row = d.rows[r - 2 + i] || [];
            vals.push(Array.from({ length: numCols }, (_, j) => row[j] ?? ""));
          }
          return { getValues: () => vals, setFontWeight: () => {} };
        }
        return {
          setValue: (v) => {
            const ri = r - 2;
            const ci = c - 1;
            while (d.rows.length <= ri) d.rows.push([]);
            d.rows[ri][ci] = v;
          },
        };
      },
    };
  }

  const ss = {
    getId: () => "SPREADSHEET_ID_1",
    getSheetByName: (n) => (sheetData.has(n) ? makeSheet(n) : null),
    insertSheet: (n) => makeSheet(n),
    deleteSheet: (sh) => {
      const n = sh.getName();
      if (sheetData.has(n)) {
        sheetData.delete(n);
        return true;
      }
      return false;
    },
    getSheets: () => Array.from(sheetData.keys()).map(makeSheet),
  };

  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    encodeURIComponent,
    Utilities: {
      getUuid: () => "uuid-" + ++seq,
      base64Decode: (b64) => Buffer.from(b64, "base64"),
      newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => props.get(k) ?? null,
        setProperty: (k, v) => props.set(k, String(v)),
      }),
    },
    SpreadsheetApp: {
      create: () => ss,
      openById: (id) => {
        if (id !== ss.getId()) throw new Error("no access to spreadsheet");
        return ss;
      },
    },
    DriveApp: {
      getFileById: (id) => {
        if (!files.has(id)) {
          files.set(id, {
            id,
            url: "https://drive.google.com/file/" + id,
            setSharing: (a, p) => {
              fileShare = [a, p];
            },
          });
        }
        return files.get(id);
      },
      createFolder: (name) => {
        const id = "folder-" + name;
        const f = {
          getId: () => id,
          setSharing: (a, p) => {
            folderShare = [a, p];
          },
          createFile: () => {
            const fid = "file-" + ++seq;
            return {
              getUrl: () => "https://drive.google.com/open?id=" + fid,
              setSharing: () => {},
            };
          },
        };
        folders.set(id, f);
        return f;
      },
      getFolderById: (id) => folders.get(id),
      Access: { ANYONE_WITH_LINK: "ANYONE_WITH_LINK" },
      Permission: { VIEW: "VIEW", EDIT: "EDIT" },
    },
    Session: { getActiveUser: () => ({ getEmail: () => currentUser }) },
    MailApp: {
      sendEmail: (...a) => {
        mailLog.push(a);
      },
    },
    Logger: { log: () => {} },
    HtmlService: {
      createHtmlOutput: (html) => ({ html }),
    },
    ScriptApp: {
      getProjectTriggers: () => [],
      deleteTrigger: () => {},
      newTrigger: () => ({
        timeBased: () => ({ everyHours: () => ({ create: () => {} }) }),
      }),
    },
    ContentService: {
      createTextOutput: (s) => {
        const o = { content: s, mime: null };
        o.setMimeType = (m) => {
          o.mime = m;
          return o;
        };
        return o;
      },
      MimeType: { JSON: "JSON" },
    },
    __setUser: (e) => {
      currentUser = e;
    },
    __setCell: (name, keyField, keyValue, col, val) => {
      const d = sheetData.get(name);
      const ki = d.header.indexOf(keyField);
      const ci = d.header.indexOf(col);
      const row = d.rows.find((r) => String(r[ki]) === String(keyValue));
      assert.ok(row, "row " + keyValue + " not found in " + name);
      row[ci] = val;
    },
    __sheet: (name) => sheetData.get(name),
    __sheetNames: () => [...sheetData.keys()],
    __dump: () => ({
      props: [...props],
      mailLog,
      files: [...files.keys()],
      folders: [...folders.keys()],
      folderShare,
      fileShare,
    }),
  };
  return sandbox;
}

function load(sandbox) {
  const code = readFileSync(new URL("./Code.gs", import.meta.url), "utf8");
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

function post(s, action, body) {
  const res = s.doPost({
    postData: { contents: JSON.stringify({ action, ...body }) },
  });
  return JSON.parse(res.content).data;
}

function postErr(s, action, body) {
  const res = s.doPost({
    postData: { contents: JSON.stringify({ action, ...body }) },
  });
  return JSON.parse(res.content);
}

function login(s, redirect) {
  const out = s.doGet({ parameter: { action: "login", redirect } });
  const m = /code=([^"]+)/.exec(out.html);
  assert.ok(m, "login redirect must carry code, got: " + out.html);
  return m[1];
}

function run() {
  const s = load(makeSandbox());
  const HOST = "https://itcp.example.com/IT-Care-Point/";
  const A = "a@itcp.test", B = "b@itcp.test", C = "c@itcp.test";

  // ---- doGet defaults ----
  const hello = JSON.parse(s.doGet({}).content);
  assert.equal(hello.ok, true);

  // ---- login ----
  const codeA = login(s, HOST + "#/login");
  const verifyA = post(s, "verify", { code: codeA });
  assert.equal(verifyA.user.email, A);

  // ---- session -> bootstrap admin ----
  const sessA = post(s, "session", { token: codeA });
  assert.equal(sessA.user.role, "admin");
  assert.deepEqual(sessA.settings.admin_emails, [A]);

  // ---- admin sets staff ----
  post(s, "settings.update", {
    token: codeA,
    settings: { ...sessA.settings, staff_emails: [B] },
  });
  assert.equal(post(s, "session", { token: codeA }).settings.staff_emails[0], B);

  // ---- user C logs in + creates ticket ----
  s.__setUser(C);
  const codeC = login(s, HOST + "#/login");
  post(s, "session", { token: codeC });
  const newTicket = post(s, "tickets.create", {
    token: codeC,
    subject: "คอมพิวเตอร์เปิดไม่ติด",
    category: "Hardware",
    urgency: "critical",
    description: "จอดำ กดปุ่มแล้วไม่ติด",
    attachment: { name: "photo.png", kind: "image", data: Buffer.from([1, 2, 3]).toString("base64") },
  }).ticket;
  assert.equal(newTicket.status, "Received");
  assert.equal(newTicket.sla_hours, 2);
  assert.match(newTicket.attachment.url, /drive.google.com/);
  assert.match(newTicket.id, /^T\d{8}-\d+$/);

  const mine = post(s, "tickets.list", { token: codeC, scope: "mine" }).tickets;
  assert.equal(mine.length, 1);

  // ---- user cannot change status to In Progress ----
  const denied = postErr(s, "tickets.update", {
    token: codeC,
    id: newTicket.id,
    patch: { status: "In Progress" },
  });
  assert.equal(denied.code, "server");
  assert.match(denied.error, /ยกเลิก/);

  // ---- staff B claims + progresses ----
  s.__setUser(B);
  const codeB = login(s, HOST + "#/login");
  post(s, "session", { token: codeB });
  const assigned = post(s, "tickets.assign", {
    token: codeB,
    id: newTicket.id,
    assignee_email: B,
  }).ticket;
  assert.equal(assigned.assignee_email, B);
  assert.ok(assigned.assigned_at);

  // ---- chat both directions ----
  const m1 = post(s, "messages.send", {
    token: codeC,
    ticket_id: newTicket.id,
    body: "แจ้งเพิ่มเติมครับ",
  }).message;
  assert.equal(m1.author_email, C);
  const m2 = post(s, "messages.send", {
    token: codeB,
    ticket_id: newTicket.id,
    body: "กำลังดำเนินการ",
    attachment: { name: "clip.mp4", kind: "video", data: Buffer.from([9]).toString("base64") },
  }).message;
  assert.equal(m2.kind, "attachment");

  post(s, "tickets.update", { token: codeB, id: newTicket.id, patch: { status: "In Progress" } });
  const resolved = post(s, "tickets.update", {
    token: codeB,
    id: newTicket.id,
    patch: { status: "Resolved" },
  }).ticket;
  assert.equal(resolved.status, "Resolved");
  assert.ok(resolved.resolved_at);

  // ---- user rates ----
  const rated = post(s, "tickets.update", {
    token: codeC,
    id: newTicket.id,
    patch: { rating: 5, feedback: "ดีมาก" },
  }).ticket;
  assert.equal(rated.rating, 5);

  // ---- getTicket includes messages ----
  const detail = post(s, "tickets.get", { token: codeC, id: newTicket.id });
  assert.equal(detail.messages.length, 2);
  assert.deepEqual(detail.ticket.attachment, newTicket.attachment);

  // ---- staff B sees notifications ----
  const notifsB = post(s, "notifications.list", { token: codeB });
  assert.ok(notifsB.unread >= 1);
  const ids = notifsB.items.filter((n) => !n.read).map((n) => n.id);
  post(s, "notifications.read", { token: codeB, ids });
  assert.equal(post(s, "notifications.list", { token: codeB }).unread, 0);

  // ---- assets ----
  const asset = post(s, "assets.create", {
    token: codeA,
    tag: "itcp-001",
    name: "คอมพิวเตอร์ Office",
    category: "Hardware",
  }).asset;
  assert.equal(asset.tag, "ITCP-001");
  const dup = postErr(s, "assets.create", { token: codeA, tag: "itcp-001", name: "ซ้ำ" });
  assert.match(dup.error, /มีรหัสครุภัณฑ์/);

  // ---- PM ----
  const pm = post(s, "pm.create", { token: codeA, title: "PM เซิร์ฟเวอร์", scope: "ทำความสะอาด", cadence_days: 30 }).item;
  assert.match(pm.id, /^PM\d+$/);
  assert.ok(pm.next_due > pm.last_run);
  post(s, "pm.complete", { token: codeA, id: pm.id });

  // ---- dashboard ----
  const dash = post(s, "dashboard", { token: codeA });
  assert.equal(dash.open, 0);
  assert.equal(dash.resolved_30d, 1);
  assert.ok(dash.avg_mttr_hours > 0);
  assert.equal(dash.recent[0].id, newTicket.id);
  assert.ok(dash.staff_perf.length >= 1);
  assert.deepEqual(dash.top_issues, []);

  // ---- SLA escalation ----
  const slaTicket = post(s, "tickets.create", {
    token: codeC,
    subject: "งานเร่งด่วน",
    category: "Network",
    urgency: "high",
    description: "เน็ตหลุดทั้งบริษัท",
  }).ticket;
  assert.deepEqual(post(s, "dashboard", { token: codeA }).top_issues.map((t) => t.category), ["Network"]);
  s.__setCell("Tickets", "id", slaTicket.id, "sla_deadline", "2000-01-01T00:00:00.000Z");
  s.checkSla();
  const escalated = post(s, "tickets.get", { token: codeC, id: slaTicket.id }).ticket;
  assert.equal(escalated.escalated, true);
  const adminNotifs = post(s, "notifications.list", { token: codeA });
  assert.ok(adminNotifs.items.some((n) => n.body.includes("เกิน SLA")));
  assert.ok(s.__dump().mailLog.length >= 1);

  // ---- regular user cannot admin routes ----
  const forbidden = postErr(s, "dashboard", { token: codeC });
  assert.match(forbidden.error, /ผู้ดูแล/);

  // ---- auth hardening ----
  const noToken = postErr(s, "tickets.list", {});
  assert.equal(noToken.code, "auth");
  const badCode = postErr(s, "verify", { code: "nope" });
  assert.equal(badCode.code, "auth");
  const badJson = s.doPost({ postData: { contents: "{oops" } });
  assert.equal(JSON.parse(badJson.content).code, "bad-json");

  // ---- user cancels own ticket ----
  const cancel = post(s, "tickets.update", {
    token: codeC,
    id: slaTicket.id,
    patch: { status: "Canceled" },
  }).ticket;
  assert.equal(cancel.status, "Canceled");

  // ---- closed ticket rejects new messages ----
  const closedChat = postErr(s, "messages.send", {
    token: codeC,
    ticket_id: slaTicket.id,
    body: "เฮ้",
  });
  assert.match(closedChat.error, /ปิดแล้ว/);

  // ---- second login shares same DB (props path) ----
  s.__setUser("d@itcp.test");
  const codeD = login(s, HOST + "#/login");
  const allD = post(s, "tickets.list", { token: codeD, scope: "all" }).tickets;
  assert.equal(allD.length, 2);

  const dump = s.__dump();
  assert.deepEqual(dump.fileShare, ["ANYONE_WITH_LINK", "EDIT"]);
  assert.deepEqual(dump.folderShare, ["ANYONE_WITH_LINK", "EDIT"]);

  console.log("GAS TEST: ALL PASS");
}

run();
