const CHAT_KEY = "morrow.workspace.v1",
  SETTINGS_KEY = "morrow.preferences.v1",
  MAX_CHATS = 80,
  MAX_MESSAGES = 100;
const $ = (id) => document.getElementById(id);
const el = Object.fromEntries(
  [
    "sidebar",
    "sidebar-scrim",
    "sidebar-close",
    "menu-toggle",
    "new-chat",
    "conversation-search",
    "conversation-list",
    "conversation-count",
    "empty-search",
    "open-settings",
    "chat-title",
    "connection-status",
    "connection-label",
    "chat-menu-toggle",
    "chat-menu",
    "rename-chat",
    "clear-chat",
    "delete-chat",
    "conversation-view",
    "welcome-screen",
    "message-list",
    "thinking-indicator",
    "chat-form",
    "message-input",
    "character-count",
    "send-button",
    "settings-dialog",
    "theme-setting",
    "language-setting",
    "style-setting",
    "font-setting",
    "notifications-setting",
    "account-description",
    "account-action",
    "toast",
  ].map((id) => [id, $(id)]),
);
const defaults = {
  theme: "system",
  language: "English",
  style: "balanced",
  fontSize: "comfortable",
  notifications: false,
};
function safeRead(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function normalizeChats(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (chat) =>
        chat && typeof chat.id === "string" && Array.isArray(chat.messages),
    )
    .slice(0, MAX_CHATS)
    .map((chat) => ({
      id: chat.id,
      title:
        typeof chat.title === "string"
          ? chat.title.slice(0, 100)
          : "New conversation",
      updatedAt: Number(chat.updatedAt) || Date.now(),
      messages: chat.messages
        .filter(
          (m) =>
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string",
        )
        .slice(-MAX_MESSAGES)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 16000),
          createdAt: Number(m.createdAt) || Date.now(),
          error: Boolean(m.error),
          feedback: ["helpful", "unhelpful"].includes(m.feedback)
            ? m.feedback
            : null,
        })),
    }));
}
let chats = normalizeChats(safeRead(CHAT_KEY, [])),
  settings = { ...defaults, ...safeRead(SETTINGS_KEY, {}) },
  activeId = chats[0]?.id || null,
  busy = false,
  ready = false,
  toastTimer;
function save() {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
  } catch {
    toast("This browser could not save your conversations.");
  }
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    toast("Your settings could not be saved in this browser.");
  }
}
const current = () => chats.find((chat) => chat.id === activeId) || null;
function startChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "New conversation",
    updatedAt: Date.now(),
    messages: [],
  };
  chats.unshift(chat);
  chats = chats.slice(0, MAX_CHATS);
  activeId = chat.id;
  save();
  closeSidebar();
  render();
  el["message-input"].focus();
}
function render() {
  const chat = current();
  el["chat-title"].textContent = chat?.title || "A fresh start";
  el["welcome-screen"].hidden = Boolean(chat?.messages.length);
  el["message-list"].replaceChildren(
    ...(chat?.messages || []).map(makeMessage),
  );
  el["thinking-indicator"].hidden = !busy;
  renderChats();
  requestAnimationFrame(() => {
    el["conversation-view"].scrollTop = el["conversation-view"].scrollHeight;
  });
}
function renderChats() {
  const query = el["conversation-search"].value.trim().toLocaleLowerCase(),
    visible = chats.filter(
      (c) =>
        !query ||
        `${c.title} ${c.messages.map((m) => m.content).join(" ")}`
          .toLocaleLowerCase()
          .includes(query),
    );
  el["conversation-count"].textContent = chats.length;
  el["empty-search"].hidden = !query || visible.length > 0;
  const fragment = document.createDocumentFragment();
  for (const chat of visible) {
    const button = document.createElement("button");
    button.className = `conversation-item${chat.id === activeId ? " active" : ""}`;
    button.type = "button";
    button.setAttribute(
      "aria-current",
      chat.id === activeId ? "page" : "false",
    );
    button.title = chat.title;
    button.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z"/></svg>';
    const label = document.createElement("span");
    label.textContent = chat.title;
    button.append(label);
    button.addEventListener("click", () => {
      activeId = chat.id;
      closeSidebar();
      render();
    });
    fragment.append(button);
  }
  el["conversation-list"].replaceChildren(fragment);
}
function makeMessage(message) {
  const article = document.createElement("article");
  article.className = `message ${message.role}${message.error ? " error" : ""}`;
  const content = document.createElement("div");
  content.className = "message-content";
  const head = document.createElement("div");
  head.className = "message-head";
  const name = document.createElement("strong");
  name.textContent = message.role === "user" ? "You" : "Morrow";
  const time = document.createElement("time");
  time.dateTime = new Date(message.createdAt).toISOString();
  time.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(message.createdAt);
  head.append(name, time);
  const body = document.createElement("div");
  body.className = "message-body";
  if (message.role === "assistant") body.innerHTML = markdown(message.content);
  else body.textContent = message.content;
  content.append(head, body);
  if (message.error) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-button";
    retry.textContent = "↻  Try again";
    retry.addEventListener("click", retryMessage);
    content.append(retry);
  }
  if (message.role === "assistant" && !message.error) {
    const toolbar = document.createElement("div");
    toolbar.className = "message-toolbar";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.setAttribute("aria-label", "Copy response");
    copy.title = "Copy response";
    copy.textContent = "▢ Copy";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        toast("Response copied.");
      } catch {
        toast("Could not access the clipboard.");
      }
    });
    toolbar.append(
      makeFeedbackButton("Helpful", "helpful", message),
      makeFeedbackButton("Not helpful", "unhelpful", message),
      copy,
    );
    content.append(toolbar);
    const followUps = document.createElement("div");
    followUps.className = "response-followups";
    for (const [label, prompt] of [
      ["Explain more simply", "Explain your previous answer more simply."],
      ["Give an example", "Give a practical example of your previous answer."],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "follow-up-button";
      button.textContent = label;
      button.addEventListener("click", () => send(prompt));
      followUps.append(button);
    }
    content.append(followUps);
  }
  if (message.role === "user") article.append(content);
  else {
    const avatar = document.createElement("span");
    avatar.className = "assistant-avatar";
    avatar.textContent = "m.";
    avatar.setAttribute("aria-hidden", "true");
    article.append(avatar, content);
  }
  return article;
}
function makeFeedbackButton(label, value, message) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `feedback-button${message.feedback === value ? " selected" : ""}`;
  button.setAttribute("aria-label", `${label} response`);
  button.setAttribute("aria-pressed", String(message.feedback === value));
  button.title = label;
  button.textContent = value === "helpful" ? "↑ Helpful" : "↓ Not helpful";
  button.addEventListener("click", () => {
    message.feedback = message.feedback === value ? null : value;
    save();
    const selected = message.feedback === value;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    for (const sibling of button.parentElement.querySelectorAll(
      ".feedback-button",
    )) {
      if (sibling === button) continue;
      sibling.classList.remove("selected");
      sibling.setAttribute("aria-pressed", "false");
    }
  });
  return button;
}
function escapeHtml(text) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function inline(text) {
  const tokens = [];
  let value = text.replace(/`([^`]+)`/g, (_, code) => {
    tokens.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${tokens.length - 1}\u0000`;
  });
  value = escapeHtml(value)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (match, label, target) => {
        try {
          const url = new URL(target);
          if (!["http:", "https:"].includes(url.protocol)) return match;
          tokens.push(
            `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
          );
          return `\u0000${tokens.length - 1}\u0000`;
        } catch {
          return match;
        }
      },
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
  return value.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
}
function markdown(source) {
  const lines = source.replace(/\r/g, "").split("\n"),
    out = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  for (let i = 0; i < lines.length;) {
    const line = lines[i],
      fence = line.match(/^\s*```([\w+-]*)\s*$/);
    if (fence) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i]))
        code.push(lines[i++]);
      if (i < lines.length) i++;
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      out.push(
        `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`,
      );
      i++;
      continue;
    }
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])
    ) {
      flush();
      const cells = (row) =>
          row
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim()),
        header = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|"))
        rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${header.map((_, n) => `<td>${inline(row[n] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*([-*+]\s+|\d+[.)]\s+)/.test(line)) {
      flush();
      const ordered = /^\s*\d/.test(line),
        tag = ordered ? "ol" : "ul",
        items = [];
      while (
        i < lines.length &&
        (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/).test(lines[i])
      )
        items.push(
          `<li>${inline(lines[i++].replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, ""))}</li>`,
        );
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      i++;
      continue;
    }
    if (!line.trim()) flush();
    else paragraph.push(line.trim());
    i++;
  }
  flush();
  return out.join("");
}
function titleFor(text) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > 37
    ? `${value.slice(0, 36).trimEnd()}…`
    : value || "New conversation";
}
function setStatus(isReady, label) {
  ready = isReady;
  el["connection-status"].classList.toggle("connected", isReady);
  el["connection-status"].classList.toggle("error", !isReady);
  el["connection-label"].textContent = label;
  el["connection-status"].title = isReady ? `Connected to ${label}` : label;
}
async function checkConfig() {
  try {
    const response = await fetch("/api/config"),
      config = await response.json();
    setStatus(
      config.ready,
      config.ready ? config.model || "Ready" : "No API key",
    );
  } catch {
    setStatus(false, "Server unavailable");
  }
}
async function send(text = el["message-input"].value.trim()) {
  if (!text || busy) return;
  if (!ready) {
    toast(
      "Set GEMINI_API_KEY on this computer and restart Morrow to connect Gemini.",
    );
    return;
  }
  if (!current()) startChat();
  const chat = current();
  chat.messages.push({ role: "user", content: text, createdAt: Date.now() });
  chat.updatedAt = Date.now();
  if (
    chat.messages.filter((m) => m.role === "user").length === 1 &&
    chat.title === "New conversation"
  )
    chat.title = titleFor(text);
  el["message-input"].value = "";
  resize();
  busy = true;
  render();
  el["send-button"].disabled = true;
  try {
    const messages = chat.messages
      .filter((m) => ["user", "assistant"].includes(m.role))
      .slice(-40)
      .map(({ role, content }) => ({ role, content }));
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          preferences: { language: settings.language, style: settings.style },
        }),
      }),
      data = await response.json();
    if (!response.ok)
      throw Error(
        data.error || "The reply could not be generated. Please try again.",
      );
    chat.messages.push({
      role: "assistant",
      content: data.reply,
      createdAt: Date.now(),
    });
    chat.updatedAt = Date.now();
    if (
      settings.notifications &&
      document.hidden &&
      "Notification" in window &&
      Notification.permission === "granted"
    )
      new Notification("Morrow has replied", {
        body: data.reply.slice(0, 120),
      });
  } catch (error) {
    chat.messages.push({
      role: "assistant",
      content: error.message || "Something went wrong. Please try again.",
      error: true,
      createdAt: Date.now(),
    });
  } finally {
    busy = false;
    save();
    render();
    updateSendButton();
    el["message-input"].focus();
  }
}
function retryMessage() {
  const chat = current();
  if (!chat || busy) return;
  const errorIndex = chat.messages.findLastIndex((message) => message.error);
  if (errorIndex >= 0) chat.messages.splice(errorIndex, 1);
  const last = chat.messages.findLast((message) => message.role === "user");
  if (!last) return;
  const prompt = last.content;
  chat.messages.splice(chat.messages.indexOf(last), 1);
  send(prompt);
}
function updateSendButton() {
  const length = el["message-input"].value.length;
  const formattedLength = length.toLocaleString();
  el["character-count"].textContent = `${formattedLength} / 16,000`;
  el["character-count"].setAttribute(
    "aria-label",
    `${formattedLength} of 16,000 characters`,
  );
  el["character-count"].classList.toggle("near-limit", length >= 14000);
  el["send-button"].disabled = busy || !el["message-input"].value.trim();
}
function resize() {
  el["message-input"].style.height = "auto";
  el["message-input"].style.height =
    `${Math.min(el["message-input"].scrollHeight, 140)}px`;
  updateSendButton();
}
function closeSidebar() {
  el.sidebar.classList.remove("open");
  el["sidebar-scrim"].classList.remove("visible");
  el["menu-toggle"].setAttribute("aria-expanded", "false");
}
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("visible"), 3400);
}
async function refreshAccount() {
  try {
    const response = await fetch("/api/auth/session");
    const session = await response.json();
    if (session.signedIn) {
      el["account-description"].textContent =
        `${session.providerName} · ${session.email || session.name || "Signed in"}`;
      el["account-action"].textContent = "Sign out";
      el["account-action"].dataset.signedIn = "true";
    } else {
      el["account-description"].textContent = "Sign-in is optional.";
      el["account-action"].textContent = "Connect";
      el["account-action"].dataset.signedIn = "false";
    }
  } catch {
    el["account-description"].textContent = "Account status unavailable.";
  }
}
function applySettings() {
  let theme = settings.theme;
  if (theme === "system")
    theme = matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.font =
    settings.fontSize === "large" ? "large" : "comfortable";
  el["theme-setting"].value = settings.theme;
  el["language-setting"].value = settings.language;
  el["style-setting"].value = settings.style;
  el["font-setting"].value = settings.fontSize;
  el["notifications-setting"].checked = Boolean(settings.notifications);
}
el["new-chat"].addEventListener("click", startChat);
el["open-settings"].addEventListener("click", () => {
  el["chat-menu"].hidden = true;
  el["settings-dialog"].showModal();
});
el["account-action"].addEventListener("click", async () => {
  if (el["account-action"].dataset.signedIn !== "true") {
    location.assign("/?manage=1");
    return;
  }
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("signout_failed");
    await refreshAccount();
    toast("Signed out of Morrow.");
  } catch {
    toast("Could not sign out. Try again.");
  }
});
el["menu-toggle"].addEventListener("click", () => {
  const open = el.sidebar.classList.toggle("open");
  el["sidebar-scrim"].classList.toggle("visible", open);
  el["menu-toggle"].setAttribute("aria-expanded", String(open));
});
el["sidebar-close"].addEventListener("click", closeSidebar);
el["sidebar-scrim"].addEventListener("click", closeSidebar);
el["conversation-search"].addEventListener("input", renderChats);
el["chat-menu-toggle"].addEventListener("click", () => {
  el["chat-menu"].hidden = !el["chat-menu"].hidden;
});
el["rename-chat"].addEventListener("click", () => {
  el["chat-menu"].hidden = true;
  const chat = current();
  if (!chat) return toast("Start a conversation before renaming it.");
  const name = prompt("Choose a name for this conversation:", chat.title);
  if (name?.trim()) {
    chat.title = name.trim().slice(0, 100);
    save();
    render();
  }
});
el["clear-chat"].addEventListener("click", () => {
  el["chat-menu"].hidden = true;
  const chat = current();
  if (!chat) return toast("There are no messages to clear.");
  if (!confirm("Clear all messages in this conversation?")) return;
  chat.messages = [];
  chat.title = "New conversation";
  chat.updatedAt = Date.now();
  save();
  render();
});
el["delete-chat"].addEventListener("click", () => {
  el["chat-menu"].hidden = true;
  const chat = current();
  if (!chat || !confirm(`Delete “${chat.title}”? This cannot be undone.`))
    return;
  chats = chats.filter((item) => item.id !== chat.id);
  activeId = chats[0]?.id || null;
  save();
  render();
});
el["chat-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  send();
});
el["message-input"].addEventListener("input", resize);
el["message-input"].addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    send();
  }
});
el["conversation-view"].addEventListener("click", (event) => {
  if (!el["chat-menu"].hidden && !event.target.closest(".topbar-actions"))
    el["chat-menu"].hidden = true;
});
document
  .querySelectorAll("[data-prompt]")
  .forEach((button) =>
    button.addEventListener("click", () => send(button.dataset.prompt)),
  );
el["settings-dialog"].addEventListener("click", (event) => {
  if (event.target === el["settings-dialog"]) el["settings-dialog"].close();
});
el["settings-dialog"].addEventListener("close", () => {
  settings = {
    theme: el["theme-setting"].value,
    language: el["language-setting"].value,
    style: el["style-setting"].value,
    fontSize: el["font-setting"].value,
    notifications: el["notifications-setting"].checked,
  };
  saveSettings();
  applySettings();
});
el["notifications-setting"].addEventListener("change", async () => {
  if (!el["notifications-setting"].checked || !("Notification" in window))
    return;
  if (
    Notification.permission === "default" &&
    (await Notification.requestPermission()) !== "granted"
  ) {
    el["notifications-setting"].checked = false;
    toast("Browser notifications were not enabled.");
  } else if (Notification.permission === "denied") {
    el["notifications-setting"].checked = false;
    toast("Allow notifications for this site in your browser settings.");
  }
});
document.addEventListener("keydown", (event) => {
  const target = event.target,
    typing =
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    startChat();
  } else if (event.key === "/" && !typing) {
    event.preventDefault();
    el["conversation-search"].focus();
  } else if (event.key === "Escape") {
    el["chat-menu"].hidden = true;
    closeSidebar();
  }
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (settings.theme === "system") applySettings();
});
applySettings();
render();
checkConfig();
refreshAccount();
