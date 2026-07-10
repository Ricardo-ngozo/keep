const colors = ["#ffffff", "#f28b82", "#fbbc04", "#fff475", "#ccff90", "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb", "#fdcfe8", "#e6c9a8", "#e8eaed"];
const storeKey = "keepClone.notes.v1";
const state = {
  notes: JSON.parse(localStorage.getItem(storeKey) || "[]"),
  view: "notes",
  search: "",
  selected: new Set(),
  draft: { color: colors[0], pinned: false, labels: [], checklist: [], image: "", reminder: "" },
  editing: null
};

const $ = (id) => document.getElementById(id);
const save = () => localStorage.setItem(storeKey, JSON.stringify(state.notes));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

function seed() {
  if (state.notes.length) return;
  state.notes = [
    { id: uid(), title: "Welcome to Keep", body: "Create notes, lists, reminders, labels, colors, image notes, archive items, and restore deleted notes.", color: "#fff475", pinned: true, archived: false, trashed: false, labels: ["Home"], checklist: [], image: "", reminder: "", updated: Date.now() },
    { id: uid(), title: "Launch checklist", body: "", color: "#cbf0f8", pinned: false, archived: false, trashed: false, labels: ["Work"], checklist: [{ text: "Search notes", done: true }, { text: "Try color swatches", done: false }, { text: "Export backup", done: false }], image: "", reminder: "", updated: Date.now() }
  ];
  save();
}

function noteMatches(note) {
  const q = state.search.toLowerCase();
  const all = [note.title, note.body, note.labels.join(" "), note.checklist.map(i => i.text).join(" ")].join(" ").toLowerCase();
  if (q && !all.includes(q)) return false;
  if (state.view === "notes") return !note.archived && !note.trashed;
  if (state.view === "archive") return note.archived && !note.trashed;
  if (state.view === "trash") return note.trashed;
  if (state.view === "reminders") return note.reminder && !note.trashed;
  return note.labels.includes(state.view) && !note.trashed;
}

function makeIcon(name) {
  return `<span class="material-symbols-outlined">${name}</span>`;
}

function emptyNode(text, icon) {
  return `<div class="empty"><div><span class="material-symbols-outlined">${icon}</span><p>${text}</p></div></div>`;
}

function noteCard(note) {
  const checks = note.checklist?.length ? note.checklist.map(item => `<div class="check-item ${item.done ? "done" : ""}"><span class="material-symbols-outlined">${item.done ? "check_box" : "check_box_outline_blank"}</span><span>${escapeHtml(item.text)}</span><span></span></div>`).join("") : "";
  const chips = [
    ...note.labels.map(label => `<span class="chip">${escapeHtml(label)}</span>`),
    note.reminder ? `<span class="chip">${new Date(note.reminder).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>` : ""
  ].join("");
  const trashTools = note.trashed
    ? `<button class="tool" data-act="restore" title="Restore">${makeIcon("restore_from_trash")}</button><button class="tool" data-act="destroy" title="Delete forever">${makeIcon("delete_forever")}</button>`
    : `<button class="tool" data-act="pin" title="Pin">${makeIcon("push_pin")}</button><button class="tool" data-act="archive" title="Archive">${makeIcon(note.archived ? "unarchive" : "archive")}</button><button class="tool" data-act="delete" title="Delete">${makeIcon("delete")}</button><button class="tool" data-act="copy" title="Copy">${makeIcon("content_copy")}</button>`;
  return `<article class="note ${state.selected.has(note.id) ? "selected" : ""}" data-id="${note.id}" style="--note-color:${note.color}">
    ${note.pinned ? `<span class="pin-mark material-symbols-outlined">push_pin</span>` : ""}
    ${note.image ? `<img src="${note.image}" alt="">` : ""}
    <div class="note-content">
      ${note.title ? `<h3>${escapeHtml(note.title)}</h3>` : ""}
      ${note.body ? `<p>${escapeHtml(note.body)}</p>` : ""}
      ${checks}
      ${chips ? `<div class="chips">${chips}</div>` : ""}
    </div>
    <div class="note-tools">${trashTools}</div>
  </article>`;
}

function render() {
  const matches = state.notes.filter(noteMatches).sort((a, b) => b.updated - a.updated);
  const pinned = matches.filter(n => n.pinned && state.view === "notes");
  const others = matches.filter(n => !(n.pinned && state.view === "notes"));
  $("pinnedSection").classList.toggle("hidden", !pinned.length);
  $("pinnedGrid").innerHTML = pinned.map(noteCard).join("");
  $("notesGrid").innerHTML = others.length ? others.map(noteCard).join("") : emptyNode(emptyText(), emptyIcon());
  $("mainHeading").textContent = heading();
  $("bulkBar").classList.toggle("hidden", !state.selected.size);
  $("selectedCount").textContent = `${state.selected.size} selected`;
  renderLabels();
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === state.view));
}

function heading() {
  return state.view === "notes" ? "Notes" : state.view[0].toUpperCase() + state.view.slice(1);
}

function emptyText() {
  return { notes: "Notes you add appear here", archive: "Archived notes appear here", trash: "Deleted notes appear here", reminders: "Notes with reminders appear here" }[state.view] || `No notes labeled ${state.view}`;
}

function emptyIcon() {
  return { notes: "lightbulb", archive: "archive", trash: "delete", reminders: "notifications" }[state.view] || "label";
}

function renderLabels() {
  const labels = [...new Set(state.notes.flatMap(n => n.labels))].sort();
  $("labelList").innerHTML = labels.map(label => `<button class="nav-item" data-view="${escapeAttr(label)}"><span class="material-symbols-outlined">label</span><span>${escapeHtml(label)}</span></button>`).join("");
}

function createNote() {
  const title = $("titleInput").value.trim();
  const body = $("bodyInput").value.trim();
  const checklist = readChecklist("checkEditor");
  if (!title && !body && !checklist.length && !state.draft.image) return;
  state.notes.unshift({ id: uid(), title, body, color: state.draft.color, pinned: state.draft.pinned, archived: false, trashed: false, labels: state.draft.labels, checklist, image: state.draft.image, reminder: state.draft.reminder, updated: Date.now() });
  state.draft = { color: colors[0], pinned: false, labels: [], checklist: [], image: "", reminder: "" };
  $("titleInput").value = "";
  $("bodyInput").value = "";
  $("checkEditor").innerHTML = "";
  $("imagePreview").removeAttribute("src");
  $("composer").style.background = "";
  save();
  render();
}

function readChecklist(id) {
  return [...$(id).querySelectorAll(".check-row")].map(row => ({ text: row.querySelector("input[type=text]").value.trim(), done: row.querySelector("input[type=checkbox]").checked })).filter(i => i.text);
}

function addCheckRow(target, item = { text: "", done: false }) {
  const row = document.createElement("div");
  row.className = "check-row";
  row.innerHTML = `<input type="checkbox" ${item.done ? "checked" : ""}><input type="text" value="${escapeAttr(item.text)}"><button type="button" class="tool" title="Remove">${makeIcon("close")}</button>`;
  row.querySelector("button").onclick = () => row.remove();
  $(target).appendChild(row);
  row.querySelector("input[type=text]").focus();
}

function updateNote(id, patch) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  Object.assign(note, patch, { updated: Date.now() });
  save();
  render();
}

function openEditor(note) {
  state.editing = note.id;
  $("editTitle").value = note.title || "";
  $("editBody").value = note.body || "";
  $("editChecklist").innerHTML = "";
  note.checklist.forEach(item => addCheckRow("editChecklist", item));
  $("editDialog").showModal();
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function escapeAttr(str = "") {
  return escapeHtml(str).replace(/`/g, "&#96;");
}

function wire() {
  seed();
  colors.forEach(color => {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.style.background = color;
    btn.onclick = () => { state.draft.color = color; $("composer").style.background = color; $("colorPop").classList.remove("open"); };
    $("colorPop").appendChild(btn);
  });
  $("saveButton").onclick = createNote;
  $("searchInput").oninput = e => { state.search = e.target.value; render(); };
  $("menuButton").onclick = () => $("sidebar").classList.toggle("hidden");
  $("themeButton").onclick = () => document.body.classList.toggle("dark");
  $("pinButton").onclick = () => { state.draft.pinned = !state.draft.pinned; $("pinButton").classList.toggle("active", state.draft.pinned); };
  $("checkModeButton").onclick = () => addCheckRow("checkEditor");
  $("editChecklistButton").onclick = () => addCheckRow("editChecklist");
  $("colorButton").onclick = () => $("colorPop").classList.toggle("open");
  $("labelButton").onclick = () => $("labelPop").classList.toggle("open");
  $("reminderButton").onclick = () => $("reminderPop").classList.toggle("open");
  $("addLabelButton").onclick = () => { const label = $("labelInput").value.trim(); if (label && !state.draft.labels.includes(label)) state.draft.labels.push(label); $("labelInput").value = ""; $("labelPop").classList.remove("open"); };
  $("setReminderButton").onclick = () => { state.draft.reminder = $("reminderInput").value; $("reminderPop").classList.remove("open"); };
  $("imageButton").onclick = () => $("fileInput").click();
  $("fileInput").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { state.draft.image = reader.result; $("imagePreview").src = reader.result; };
    reader.readAsDataURL(file);
  };
  $("exportButton").onclick = () => {
    const blob = new Blob([JSON.stringify(state.notes, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "keep-notes.json" });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  document.body.addEventListener("click", event => {
    const nav = event.target.closest(".nav-item");
    const card = event.target.closest(".note");
    const action = event.target.closest("[data-act]");
    const bulk = event.target.closest("[data-bulk]");
    if (nav) { state.view = nav.dataset.view; state.selected.clear(); render(); return; }
    if (bulk) { bulkAction(bulk.dataset.bulk); return; }
    if (!card) return;
    const note = state.notes.find(n => n.id === card.dataset.id);
    if (action) { runAction(note, action.dataset.act); return; }
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      state.selected.has(note.id) ? state.selected.delete(note.id) : state.selected.add(note.id);
      render();
    } else {
      openEditor(note);
    }
  });
  $("editSaveButton").onclick = event => {
    event.preventDefault();
    updateNote(state.editing, { title: $("editTitle").value.trim(), body: $("editBody").value.trim(), checklist: readChecklist("editChecklist") });
    $("editDialog").close();
  };
  render();
}

function runAction(note, action) {
  if (action === "pin") updateNote(note.id, { pinned: !note.pinned });
  if (action === "archive") updateNote(note.id, { archived: !note.archived, pinned: false });
  if (action === "delete") updateNote(note.id, { trashed: true, archived: false, pinned: false });
  if (action === "restore") updateNote(note.id, { trashed: false });
  if (action === "destroy") { state.notes = state.notes.filter(n => n.id !== note.id); save(); render(); }
  if (action === "copy") { state.notes.unshift({ ...note, id: uid(), pinned: false, updated: Date.now() }); save(); render(); }
}

function bulkAction(action) {
  if (action === "clear") { state.selected.clear(); render(); return; }
  [...state.selected].forEach(id => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    if (action === "pin") note.pinned = !note.pinned;
    if (action === "archive") { note.archived = true; note.pinned = false; }
    if (action === "delete") { note.trashed = true; note.archived = false; note.pinned = false; }
    note.updated = Date.now();
  });
  state.selected.clear();
  save();
  render();
}

wire();
