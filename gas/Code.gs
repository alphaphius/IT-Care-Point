/**
 * IT Care Point - Google Apps Script backend
 *
 * Setup (in the Apps Script editor):
 *  1. Paste this whole file into Code.gs.
 *  2. Deploy -> New deployment -> Web app
 *     - Execute as: User accessing the web app
 *     - Who has access: Anyone with Google account
 *  3. Copy the /exec URL into the app's setup screen.
 *  4. Run `setupTriggers()` once (menu Run) to enable SLA escalation checks.
 *
 * Auth model: no OAuth dance needed. The deployment itself requires a Google
 * account. `doGet?action=login` reads the signed-in user via Session.getActiveUser(),
 * mints a session token (Sessions sheet), and redirects the browser back to the
 * frontend with ?code=TOKEN. The frontend then sends that token in the request
 * body for every API call - robust across browsers and CORS.
 */

var SPREADSHEET_ID_KEY = "SPREADSHEET_ID";
var FOLDER_ID_KEY = "ATTACH_FOLDER_ID";
var SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/* ============ Entry points ============ */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "login") return handleLogin(e.parameter);
  return json({ ok: true, data: { hello: "IT Care Point" } });
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return errJson("ข้อมูลไม่ถูกต้อง", "bad-json");
  }
  var action = body.action || "";
  try {
    if (action === "verify") return json({ ok: true, data: verify(body) });
    var session = requireSession(body);
    var user = { email: session.email, name: session.name, role: roleOf(session.email) };
    return json({ ok: true, data: route(action, body, user) });
  } catch (err) {
    if (err && err.code === "AUTH") return errJson(err.message, "auth");
    Logger.log("ACTION_ERROR " + action + ": " + (err && err.stack || err));
    return errJson((err && err.message) || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", "server");
  }
}

function route(action, body, user) {
  switch (action) {
    case "session": return sessionPayload(user);
    case "settings.get": requireAdmin(user); return { settings: getSettings() };
    case "settings.update": requireAdmin(user); setSettings(body.settings); return { settings: getSettings() };
    case "tickets.list": return { tickets: listTickets(body.scope, user) };
    case "tickets.create": return { ticket: createTicket(body, user) };
    case "tickets.get": return getTicket(body.id, user);
    case "tickets.update": return { ticket: updateTicket(body.id, body.patch || {}, user) };
    case "tickets.assign": return { ticket: assignTicket(body.id, body.assignee_email, user) };
    case "messages.send": return { message: sendMessage(body, user) };
    case "notifications.list": return listNotifications(user.email);
    case "notifications.read": markNotificationsRead(body.ids || []); return { ok: true };
    case "assets.list": return { assets: listAssets() };
    case "assets.create": requireAdmin(user); return { asset: createAsset(body, user) };
    case "dashboard": requireAdmin(user); return dashboard();
    case "pm.list": requireAdmin(user); return { items: listPM() };
    case "pm.create": requireAdmin(user); return { item: createPM(body, user) };
    case "pm.complete": requireAdmin(user); return { item: completePM(body.id) };
    default: throw new Error("Action ไม่รู้จัก: " + action);
  }
}

/* ============ Auth ============ */

function handleLogin(params) {
  var redirect = params.redirect;
  if (!redirect || redirect.indexOf("http") !== 0) redirect = "";
  var user = Session.getActiveUser();
  var email = user ? user.getEmail() : "";
  if (!email) {
    var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px">'
      + '<h2>กรุณาเข้าสู่ระบบ Google ก่อน</h2>'
      + '<a href="https://accounts.google.com/" style="font-size:18px">เข้าสู่ระบบ Google</a></body></html>';
    return HtmlService.createHtmlOutput(html);
  }
  var name = displayName(email);
  var token = createSession(email, name);
  var sep = redirect.indexOf("?") >= 0 ? "&" : "?";
  var target = redirect + sep + "code=" + encodeURIComponent(token);
  return HtmlService.createHtmlOutput(
    '<script>window.location.replace(' + JSON.stringify(target) + ');</script>'
  );
}

function requireSession(body) {
  var token = body.token;
  if (!token) throw authError();
  var rows = getRows("Sessions");
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].token === token) {
      if (new Date(rows[i].expires_at) < new Date()) throw authError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      return rows[i];
    }
  }
  throw authError();
}

function createSession(email, name) {
  var token = Utilities.getUuid().replace(/-/g, "");
  var now = new Date();
  appendRow("Sessions", {
    token: token, email: email, name: name,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  });
  return token;
}

function verify(body) {
  var rows = getRows("Sessions");
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].token === body.code) {
      if (new Date(rows[i].expires_at) < new Date()) throw authError("เซสชันหมดอายุ");
      return { token: body.code, user: { email: rows[i].email, name: rows[i].name, role: roleOf(rows[i].email) } };
    }
  }
  throw authError("ลิงก์เข้าสู่ระบบไม่ถูกต้อง กรุณากดปุ่มเข้าสู่ระบบอีกครั้ง");
}

function authError(msg) {
  var e = new Error(msg || "กรุณาเข้าสู่ระบบ");
  e.code = "AUTH";
  return e;
}

function roleOf(email) {
  var s = getSettings();
  var admin = s.admin_emails.indexOf(email) >= 0;
  if (admin) return "admin";
  if (s.staff_emails.indexOf(email) >= 0) return "staff";
  return "user";
}

function requireAdmin(user) {
  if (user.role !== "admin") throw new Error("ต้องเป็นผู้ดูแลระบบ");
}

function requireStaff(user) {
  if (user.role !== "staff" && user.role !== "admin") throw new Error("ต้องเป็นเจ้าหน้าที่ IT");
}

/* ============ Settings ============ */

function defaultSettings() {
  return {
    staff_emails: [],
    admin_emails: [],
    sla_hours: { low: 48, medium: 24, high: 8, critical: 2 },
    email_notify: true
  };
}

function getSettings() {
  var out = defaultSettings();
  var rows = getRows("Settings");
  for (var i = 0; i < rows.length; i++) {
    var k = rows[i].key, v = rows[i].value;
    if (k === "staff_emails" || k === "admin_emails") out[k] = (v || "").split(",").filter(Boolean);
    else if (k === "sla_hours") out[k] = JSON.parse(v);
    else if (k === "email_notify") out[k] = v === "true";
  }
  return out;
}

function setSettings(settings) {
  var s = settings || {};
  setSetting("staff_emails", (s.staff_emails || []).join(","));
  setSetting("admin_emails", (s.admin_emails || []).join(","));
  setSetting("sla_hours", JSON.stringify(s.sla_hours || defaultSettings().sla_hours));
  if (s.email_notify !== undefined) setSetting("email_notify", s.email_notify ? "true" : "false");
}

function setSetting(key, value) {
  var rows = getRows("Settings");
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      updateRow("Settings", "key", key, { value: String(value) });
      return;
    }
  }
  appendRow("Settings", { key: key, value: String(value) });
}

function bootstrapAdmin(email, name) {
  var s = getSettings();
  if (s.admin_emails.length === 0 && s.staff_emails.length === 0) {
    setSettings({ staff_emails: [], admin_emails: [email], sla_hours: s.sla_hours });
    notify(email, "", "ยินดีต้อนรับ! คุณเป็นผู้ดูแลระบบคนแรกของ " + name, false);
  }
}

function sessionPayload(user) {
  var s = getSettings();
  if (user.role === "user") bootstrapAdmin(user.email, user.name);
  user.role = roleOf(user.email);
  return { user: user, settings: getSettings() };
}

/* ============ Tickets ============ */

function listTickets(scope, user) {
  var rows = getRows("Tickets");
  var out = rows.map(rowToTicket).sort(function (a, b) { return b.opened_at.localeCompare(a.opened_at); });
  if (scope === "mine") out = out.filter(function (t) { return t.reporter_email === user.email; });
  if (scope === "open") out = out.filter(function (t) { return !isClosed(t.status); });
  return out;
}

function getTicket(id, user) {
  var rows = getRows("Tickets");
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) { found = rowToTicket(rows[i]); break; }
  }
  if (!found) throw new Error("ไม่พบงานนี้");
  if (user.role === "user" && found.reporter_email !== user.email) throw new Error("คุณไม่มีสิทธิ์ดูงานนี้");
  var messages = getRows("Messages").filter(function (m) { return m.ticket_id === id; })
    .map(rowToMessage).sort(function (a, b) { return a.ts.localeCompare(b.ts); });
  return { ticket: found, messages: messages };
}

function createTicket(body, user) {
  var s = getSettings();
  var hours = s.sla_hours[body.urgency] || 24;
  var now = new Date();
  var id = "T" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + pad(nextSeq("tickets"));
  var rec = {
    id: id,
    subject: String(body.subject || "").slice(0, 200),
    category: body.category || "Other",
    urgency: body.urgency || "medium",
    description: String(body.description || "").slice(0, 5000),
    reporter_email: user.email,
    reporter_name: user.name,
    status: "Received",
    assignee_email: "",
    assignee_name: "",
    sla_hours: hours,
    sla_deadline: new Date(now.getTime() + hours * 3600000).toISOString(),
    escalated: false,
    opened_at: now.toISOString(),
    assigned_at: "",
    resolved_at: "",
    closed_at: "",
    rating: "",
    feedback: "",
    asset_tag: body.asset_tag || "",
    attachment_name: "",
    attachment_kind: "",
    attachment_url: ""
  };
  if (body.attachment) {
    var att = saveAttachment(body.attachment, id);
    rec.attachment_name = att.name;
    rec.attachment_kind = att.kind;
    rec.attachment_url = att.url;
  }
  appendRow("Tickets", rec);
  notifyStaff("งานใหม่ #" + id, id, "มีงานแจ้งซ่อมใหม่: " + rec.subject);
  if (s.email_notify) mailToStaff("งานแจ้งซ่อมใหม่ #" + id, buildSubject(rec) + "\n\n" + rec.description);
  return rowToTicket(rec);
}

function updateTicket(id, patch, user) {
  var rows = getRows("Tickets");
  var rec = null;
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) { rec = rows[i]; break; }
  if (!rec) throw new Error("ไม่พบงานนี้");
  var prev = rowToTicket(rec);
  if (user.role === "user" && rec.reporter_email !== user.email) throw new Error("คุณไม่มีสิทธิ์แก้ไขงานนี้");
  var changes = {};
  var now = new Date();

  if (patch.status) {
    if (user.role === "user") {
      if (patch.status !== "Canceled") throw new Error("ผู้แจ้งสามารถยกเลิกงานได้เท่านั้น");
    }
    var from = rec.status;
    if (!isClosed(from)) {
      if (patch.status === "Resolved") {
        changes.status = "Resolved";
        changes.resolved_at = now.toISOString();
        changes.closed_at = now.toISOString();
      } else if (patch.status === "Canceled") {
        changes.status = "Canceled";
        changes.closed_at = now.toISOString();
      } else {
        changes.status = patch.status;
      }
    }
  }
  if (patch.escalated !== undefined) changes.escalated = patch.escalated ? true : false;
  if (patch.rating !== undefined) changes.rating = String(patch.rating);
  if (patch.feedback !== undefined) changes.feedback = String(patch.feedback).slice(0, 2000);
  if (patch.asset_tag !== undefined) changes.asset_tag = patch.asset_tag;

  if (Object.keys(changes).length) {
    updateRow("Tickets", "id", id, changes);
    for (var k in changes) rec[k] = changes[k];
  }

  // notifications
  if (changes.status) {
    var label = statusLabel(changes.status);
    notify(rec.reporter_email, id, "งาน #" + id + " เปลี่ยนสถานะเป็น " + label);
    if (user.role !== "user") {
      var s = getSettings();
      if (s.email_notify) mail(rec.reporter_email, "อัปเดตสถานะงาน #" + id, buildSubject(rec) + "\n\nสถานะใหม่: " + label);
    }
    if (changes.status === "Resolved") notify(rec.assignee_email, id, "งาน #" + id + " ถูกประเมินโดยผู้แจ้งแล้ว");
  }
  if (changes.escalated && changes.escalated) {
    notifyAdmins("งาน #" + id, "งานถูก Escalate: " + rec.subject);
  }
  return rowToTicket(rec);
}

function assignTicket(id, assigneeEmail, user) {
  requireStaff(user);
  var rows = getRows("Tickets");
  var rec = null;
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) { rec = rows[i]; break; }
  if (!rec) throw new Error("ไม่พบงานนี้");
  if (isClosed(rec.status)) throw new Error("งานปิดแล้ว ไม่สามารถรับงานได้");
  var now = new Date();
  var changes = {
    assignee_email: assigneeEmail,
    assignee_name: displayName(assigneeEmail),
    assigned_at: rec.assigned_at || now.toISOString()
  };
  updateRow("Tickets", "id", id, changes);
  notify(rec.reporter_email, id, "งาน #" + id + " รับงานโดย " + changes.assignee_name);
  notify(assigneeEmail, id, "คุณได้รับมอบงาน #" + id);
  return rowToTicket(merge(rec, changes));
}

function sendMessage(body, user) {
  var ticket = findTicket(body.ticket_id);
  if (!ticket) throw new Error("ไม่พบงานนี้");
  if (isClosed(ticket.status)) throw new Error("งานปิดแล้ว ไม่สามารถส่งข้อความได้");
  var now = new Date();
  var id = "M" + nextSeq("messages");
  var rec = {
    id: id,
    ticket_id: ticket.id,
    author_email: user.email,
    author_name: user.name,
    author_role: user.role,
    body: String(body.body || "").slice(0, 4000),
    kind: "text",
    attachment_name: "",
    attachment_kind: "",
    attachment_url: "",
    ts: now.toISOString()
  };
  if (body.attachment) {
    var att = saveAttachment(body.attachment, ticket.id);
    rec.kind = "attachment";
    rec.attachment_name = att.name;
    rec.attachment_kind = att.kind;
    rec.attachment_url = att.url;
  }
  appendRow("Messages", rec);
  var other = user.email === ticket.reporter_email ? ticket.assignee_email : ticket.reporter_email;
  if (other) {
    notify(other, ticket.id, "ข้อความใหม่ในงาน #" + ticket.id + " จาก " + user.name);
  }
  return rowToMessage(rec);
}

/* ============ Attachments ============ */

function saveAttachment(att, ticketId) {
  var folder = getAttachFolder();
  var base64 = att.data || "";
  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, guessMime(att.name, att.kind), safeName(ticketId + "-" + att.name));
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { name: att.name, kind: att.kind === "video" ? "video" : "image", url: file.getUrl() };
}

function getAttachFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(FOLDER_ID_KEY);
  try {
    if (id) return DriveApp.getFolderById(id);
  } catch (e) { /* recreate */ }
  var folder = DriveApp.createFolder("IT Care Point Attachments");
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  props.setProperty(FOLDER_ID_KEY, folder.getId());
  return folder;
}

/* ============ Assets ============ */

function listAssets() {
  return getRows("Assets").map(rowToAsset);
}

function createAsset(body, user) {
  var now = new Date();
  var rec = {
    tag: String(body.tag || "").trim().toUpperCase(),
    name: String(body.name || "").slice(0, 200),
    category: String(body.category || "").slice(0, 100),
    owner: String(body.owner || "").slice(0, 200),
    location: String(body.location || "").slice(0, 200),
    notes: String(body.notes || "").slice(0, 2000),
    created_at: now.toISOString()
  };
  if (!rec.tag || !rec.name) throw new Error("กรอกรหัสและชื่อครุภัณฑ์");
  var rows = getRows("Assets");
  for (var i = 0; i < rows.length; i++) if (rows[i].tag === rec.tag) throw new Error("มีรหัสครุภัณฑ์นี้อยู่แล้ว");
  appendRow("Assets", rec);
  return rowToAsset(rec);
}

/* ============ PM ============ */
function listPM() {
  return getRows("PM").map(rowToPM);
}

function createPM(body, user) {
  var now = new Date();
  var days = Math.max(1, Number(body.cadence_days) || 30);
  var rec = {
    id: "PM" + nextSeq("pm"),
    title: String(body.title || "").slice(0, 200),
    scope: String(body.scope || "").slice(0, 500),
    cadence_days: days,
    last_run: now.toISOString(),
    next_due: new Date(now.getTime() + days * 86400000).toISOString()
  };
  appendRow("PM", rec);
  return rowToPM(rec);
}

function completePM(id) {
  var rows = getRows("PM");
  var rec = null;
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) { rec = rows[i]; break; }
  if (!rec) throw new Error("ไม่พบงาน PM");
  var now = new Date();
  var days = Number(rec.cadence_days) || 30;
  var changes = {
    last_run: now.toISOString(),
    next_due: new Date(now.getTime() + days * 86400000).toISOString()
  };
  updateRow("PM", "id", id, changes);
  return rowToPM(merge(rec, changes));
}

/* ============ Notifications ============ */

function listNotifications(email) {
  var rows = getRows("Notifications").filter(function (n) { return n.email === email; });
  var items = rows.map(rowToNotif).sort(function (a, b) { return b.ts.localeCompare(a.ts); }).slice(0, 30);
  var unread = items.filter(function (n) { return !n.read; }).length;
  return { items: items, unread: unread };
}

function markNotificationsRead(ids) {
  var rows = getRows("Notifications");
  for (var i = 0; i < rows.length; i++) {
    if (ids.indexOf(rows[i].id) >= 0) updateRow("Notifications", "id", rows[i].id, { read: "true" });
  }
}

function notify(email, ticketId, body) {
  if (!email) return;
  appendRow("Notifications", {
    id: "N" + nextSeq("notifications"),
    email: email,
    ticket_id: ticketId || "",
    body: body,
    ts: new Date().toISOString(),
    read: "false"
  });
}

function notifyStaff(body, ticketId) {
  var s = getSettings();
  s.staff_emails.concat(s.admin_emails).forEach(function (e) { notify(e, ticketId, body); });
}

function notifyAdmins(body, ticketId) {
  getSettings().admin_emails.forEach(function (e) { notify(e, ticketId, body); });
}

/* ============ Mail ============ */

function mail(to, subject, body) {
  try { MailApp.sendEmail(to, subject, body); } catch (e) { Logger.log("MAIL_FAIL " + to + ": " + e); }
}

function mailToStaff(subject, body) {
  var s = getSettings();
  var to = s.admin_emails.concat(s.staff_emails).filter(Boolean);
  if (to.length) { try { MailApp.sendEmail(to.join(","), subject, body); } catch (e) { Logger.log("MAIL_FAIL: " + e); } }
}

/* ============ Dashboard ============ */

function dashboard() {
  var rows = getRows("Tickets").map(rowToTicket).sort(function (a, b) { return b.opened_at.localeCompare(a.opened_at); });
  var now = Date.now();
  var open = rows.filter(function (t) { return !isClosed(t.status); });
  var overdue = open.filter(function (t) { return t.sla_deadline && new Date(t.sla_deadline) < new Date(); }).length;
  var d30 = now - 30 * 86400000;
  var resolved30 = rows.filter(function (t) {
    return t.status === "Resolved" && t.resolved_at && new Date(t.resolved_at).getTime() >= d30;
  });
  var resolvedAll = rows.filter(function (t) { return t.status === "Resolved" && t.resolved_at && t.opened_at; });
  var totalMs = resolvedAll.reduce(function (acc, t) { return acc + (new Date(t.resolved_at) - new Date(t.opened_at)); }, 0);

  var topMap = {};
  open.forEach(function (t) { topMap[t.category] = (topMap[t.category] || 0) + 1; });
  var topIssues = Object.keys(topMap).map(function (c) { return { category: c, count: topMap[c] }; })
    .sort(function (a, b) { return b.count - a.count; }).slice(0, 5);

  var perfMap = {};
  resolvedAll.forEach(function (t) {
    var e = t.assignee_email || "ไม่ระบุ";
    if (!perfMap[e]) perfMap[e] = { name: t.assignee_name || displayName(e), count: 0, ms: 0 };
    perfMap[e].count++;
    perfMap[e].ms += new Date(t.resolved_at) - new Date(t.opened_at);
  });
  var staffPerf = Object.keys(perfMap).map(function (e) {
    return {
      name: perfMap[e].name,
      resolved: perfMap[e].count,
      avg_hours: perfMap[e].count ? perfMap[e].ms / perfMap[e].count / 3600000 : null
    };
  }).sort(function (a, b) { return b.resolved - a.resolved; });

  return {
    open: open.length,
    received: open.filter(function (t) { return t.status === "Received"; }).length,
    in_progress: open.filter(function (t) { return t.status === "In Progress"; }).length,
    pending_parts: open.filter(function (t) { return t.status === "Pending Parts"; }).length,
    resolved_30d: resolved30.length,
    avg_mttr_hours: resolvedAll.length ? totalMs / resolvedAll.length / 3600000 : null,
    top_issues: topIssues,
    staff_perf: staffPerf,
    overdue: overdue,
    recent: rows.slice(0, 6)
  };
}

/* ============ SLA check trigger ============ */

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("checkSla").timeBased().everyHours(1).create();
}

function checkSla() {
  var rows = getRows("Tickets");
  var now = new Date();
  var s = getSettings();
  rows.forEach(function (rec) {
    if (isClosed(rec.status)) return;
    if (rec.escalated === true || rec.escalated === "true") return;
    if (rec.sla_deadline && new Date(rec.sla_deadline) < now) {
      updateRow("Tickets", "id", rec.id, { escalated: true });
      notifyAdmins("งานเกิน SLA #" + rec.id, rec.subject);
      if (s.email_notify) mailToStaff("งานเกิน SLA #" + rec.id, "งาน: " + rec.subject);
    }
  });
}

/* ============ Sheet access ============ */

function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SPREADSHEET_ID_KEY);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* recreate */ }
  }
  var ss = SpreadsheetApp.create("IT Care Point Database");
  props.setProperty(SPREADSHEET_ID_KEY, ss.getId());
  DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  initSheets(ss);
  return ss;
}

function initSheets(ss) {
  var defs = {
    "Tickets": ["id","subject","category","urgency","description","reporter_email","reporter_name","status","assignee_email","assignee_name","sla_hours","sla_deadline","escalated","opened_at","assigned_at","resolved_at","closed_at","rating","feedback","asset_tag","attachment_name","attachment_kind","attachment_url"],
    "Messages": ["id","ticket_id","author_email","author_name","author_role","body","kind","attachment_name","attachment_kind","attachment_url","ts"],
    "Assets": ["tag","name","category","owner","location","notes","created_at"],
    "PM": ["id","title","scope","cadence_days","last_run","next_due"],
    "Settings": ["key","value"],
    "Sessions": ["token","email","name","created_at","expires_at"],
    "Notifications": ["id","email","ticket_id","body","ts","read"]
  };
  Object.keys(defs).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(defs[name]);
      sh.getRange(1, 1, 1, defs[name].length).setFontWeight("bold");
    }
    sh.setFrozenRows(1);
  });
  ensureSetting("seq_tickets", "0");
}

function ensureSetting(key, value) {
  var rows = getRows("Settings");
  for (var i = 0; i < rows.length; i++) if (rows[i].key === key) return;
  appendRow("Settings", { key: key, value: value });
}

function getSheet(name) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { initSheets(ss); sh = ss.getSheetByName(name); }
  return sh;
}

function getRows(name) {
  var sh = getSheet(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var v = values[r][c];
      obj[headers[c]] = v == null ? "" : (typeof v === "object" && v instanceof Date ? v.toISOString() : String(v));
    }
    out.push(obj);
  }
  return out;
}

function appendRow(name, obj) {
  var sh = getSheet(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ""; });
  sh.appendRow(row);
}

function updateRow(name, keyField, keyValue, changes) {
  var sh = getSheet(name);
  var last = sh.getLastRow();
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var keyCol = headers.indexOf(keyField);
  var changeCols = {};
  Object.keys(changes).forEach(function (k) {
    var idx = headers.indexOf(k);
    if (idx >= 0) changeCols[k] = idx;
  });
  if (Object.keys(changeCols).length === 0) return;
  for (var r = 0; r < values.length; r++) {
    if (String(values[r][keyCol]) === String(keyValue)) {
      var rowNum = r + 2;
      Object.keys(changeCols).forEach(function (k) {
        sh.getRange(rowNum, changeCols[k] + 1).setValue(changes[k]);
      });
      return;
    }
  }
}

function nextSeq(name) {
  var key = "seq_" + name;
  var rows = getRows("Settings");
  var val = 0;
  for (var i = 0; i < rows.length; i++) if (rows[i].key === key) val = Number(rows[i].value) || 0;
  val++;
  setSetting(key, String(val));
  return val;
}

/* ============ Mapping helpers ============ */

function rowToTicket(r) {
  return {
    id: r.id, subject: r.subject, category: r.category, urgency: r.urgency,
    description: r.description, reporter_email: r.reporter_email, reporter_name: r.reporter_name,
    status: r.status, assignee_email: r.assignee_email || undefined, assignee_name: r.assignee_name || undefined,
    sla_hours: Number(r.sla_hours) || 0, sla_deadline: r.sla_deadline || undefined,
    escalated: r.escalated === "true", opened_at: r.opened_at,
    assigned_at: r.assigned_at || undefined, resolved_at: r.resolved_at || undefined, closed_at: r.closed_at || undefined,
    rating: r.rating ? Number(r.rating) : undefined, feedback: r.feedback || undefined,
    asset_tag: r.asset_tag || undefined,
    attachment: r.attachment_url ? { name: r.attachment_name, kind: r.attachment_kind, url: r.attachment_url } : undefined
  };
}

function rowToMessage(r) {
  return {
    id: r.id, ticket_id: r.ticket_id, author_email: r.author_email, author_name: r.author_name,
    author_role: r.author_role, body: r.body, kind: r.kind, ts: r.ts,
    attachment: r.attachment_url ? { name: r.attachment_name, kind: r.attachment_kind, url: r.attachment_url } : undefined
  };
}

function rowToAsset(r) {
  return { tag: r.tag, name: r.name, category: r.category, owner: r.owner, location: r.location, notes: r.notes, created_at: r.created_at };
}

function rowToPM(r) {
  return { id: r.id, title: r.title, scope: r.scope, cadence_days: Number(r.cadence_days), last_run: r.last_run, next_due: r.next_due };
}

function rowToNotif(r) {
  return { id: r.id, email: r.email, ticket_id: r.ticket_id, body: r.body, ts: r.ts, read: r.read === "true" };
}

/* ============ Utils ============ */

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function errJson(message, code) {
  return json({ ok: false, error: message, code: code || "error" });
}

function findTicket(id) {
  var rows = getRows("Tickets");
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
  return null;
}

function isClosed(status) {
  return status === "Resolved" || status === "Canceled";
}

function statusLabel(status) {
  return { "Received": "รับเรื่อง", "In Progress": "กำลังดำเนินการ", "Pending Parts": "รออะไหล่", "Resolved": "เสร็จสิ้น", "Canceled": "ยกเลิก" }[status] || status;
}

function buildSubject(t) {
  return "[" + t.id + "] " + t.subject;
}

function displayName(email) {
  var local = (email || "").split("@")[0] || "";
  var clean = local.replace(/[._-]+/g, " ").replace(/\d+$/g, "").trim();
  if (!clean) return email;
  return clean.split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
}

function pad(n) { return n < 10 ? "0" + n : String(n); }

function safeName(name) {
  return String(name).replace(/[\/\\:*?"<>|]/g, "_");
}

function guessMime(name, kind) {
  var n = String(name).toLowerCase();
  if (kind === "video" || n.indexOf(".mp4") >= 0) return "video/mp4";
  if (n.indexOf(".png") >= 0) return "image/png";
  if (n.indexOf(".webp") >= 0) return "image/webp";
  if (n.indexOf(".gif") >= 0) return "image/gif";
  if (n.indexOf(".heic") >= 0) return "image/heic";
  return "image/jpeg";
}

function merge(a, b) {
  var out = {};
  for (var k in a) out[k] = a[k];
  for (var k2 in b) out[k2] = b[k2];
  return out;
}
