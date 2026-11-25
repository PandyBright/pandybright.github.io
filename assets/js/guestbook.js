const guestbook = document.querySelector("[data-guestbook-api]");
const api = guestbook.dataset.guestbookApi;

if (api) {
  const form = guestbook.querySelector(".guestbook__form");
  const replyTemplate = form.cloneNode(true);
  const refresh = guestbook.querySelector(".guestbook__refresh");
  const list = guestbook.querySelector(".guestbook__list");
  const listStatus = guestbook.querySelector("[data-list-status]");
  const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: "medium" });
  const requestTimeout = 15000;
  let latestLoad = 0;

  function renderMessage(entry) {
    const item = document.createElement("li");
    const header = document.createElement("div");
    header.className = "guestbook__byline";

    const guest = document.createElement("strong");
    guest.textContent = entry.location ? `Guest from ${entry.location}` : "Guest";

    const date = document.createElement("time");
    date.dateTime = entry.created_at;
    date.textContent = dateFormat.format(new Date(entry.created_at));
    header.append(guest, date);

    const note = document.createElement("p");
    note.textContent = entry.message;
    item.append(header, note);
    return item;
  }

  function renderThread(entry) {
    const item = renderMessage(entry);
    if (!Number.isSafeInteger(entry.id)) return item;
    item.dataset.noteId = entry.id;

    const replies = document.createElement("ol");
    replies.className = "guestbook__replies";
    replies.setAttribute("aria-label", "Replies");

    const disclosure = document.createElement("details");
    disclosure.className = "guestbook__reply";
    const trigger = document.createElement("summary");
    trigger.textContent = "Reply";
    disclosure.append(trigger);
    disclosure.addEventListener("toggle", () => {
      if (!disclosure.open || disclosure.querySelector("form")) return;

      const replyForm = replyTemplate.cloneNode(true);
      const messageId = `guestbook-reply-${entry.id}`;
      const field = replyForm.querySelector("textarea");
      field.id = messageId;
      field.value = "";
      field.rows = 3;
      field.placeholder = "Write a reply…";
      field.setAttribute("aria-describedby", `${messageId}-help`);
      const label = replyForm.querySelector("label");
      label.htmlFor = messageId;
      label.textContent = "Your reply";
      const help = replyForm.querySelector(".guestbook__help");
      help.id = `${messageId}-help`;
      help.textContent = "Your reply and approximate location will be public.";
      replyForm.querySelector("button[type=submit]").textContent = "Post reply";
      replyForm.querySelector("[data-post-status]").textContent = "";
      disclosure.append(replyForm);
      setupComposer(replyForm, entry.id);
    });
    item.append(replies, disclosure);
    return item;
  }

  function renderEntries(entries) {
    if (entries.some(entry => !Number.isSafeInteger(entry.id))) {
      list.replaceChildren(...entries.map(renderThread));
      return;
    }

    // Keep open reply forms and drafts in place when refreshing the list.
    const existing = new Map([...list.children].map(item => [Number(item.dataset.noteId), item]));
    let next = list.firstElementChild;
    for (const entry of entries) {
      const item = existing.get(entry.id) ?? renderThread(entry);
      existing.delete(entry.id);
      const replies = item.querySelector(".guestbook__replies");
      replies?.replaceChildren(...(entry.replies ?? []).map(renderMessage));
      if (item === next) next = next.nextElementSibling;
      else list.insertBefore(item, next);
    }
    for (const item of existing.values()) item.remove();
  }

  async function loadEntries() {
    const load = ++latestLoad;
    refresh.disabled = true;
    listStatus.textContent = "Loading visitor notes…";

    try {
      const response = await fetch(api, { signal: AbortSignal.timeout(requestTimeout) });
      if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);
      const entries = await response.json();
      if (load !== latestLoad) return;
      renderEntries(entries);
      listStatus.textContent = entries.length ? "" : "No notes yet. Say hello!";
    } catch {
      if (load === latestLoad) listStatus.textContent = "Visitor notes are temporarily unavailable. Try Refresh.";
    } finally {
      if (load === latestLoad) refresh.disabled = false;
    }
  }

  function setupComposer(form, replyTo) {
    const message = form.querySelector("textarea");
    const count = form.querySelector(".guestbook__count");
    const emojiPicker = form.querySelector(".guestbook__emoji");
    const submit = form.querySelector("button[type=submit]");
    const postStatus = form.querySelector("[data-post-status]");

    function updateCount() {
      count.textContent = `${message.value.length} / ${message.maxLength}`;
      message.setCustomValidity("");
    }

    message.addEventListener("input", updateCount);
    emojiPicker.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const emoji = button.textContent.trim();
      const start = message.selectionStart;
      const end = message.selectionEnd;
      if (message.value.length - (end - start) + emoji.length <= message.maxLength) {
        message.setRangeText(emoji, start, end, "end");
        updateCount();
      } else {
        message.setCustomValidity("Make a little room to add this emoji.");
        message.reportValidity();
        message.setCustomValidity("");
        return;
      }
      message.focus();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = message.value.trim();
      if (!text) {
        message.setCustomValidity("Write a message or add an emoji first.");
        message.reportValidity();
        return;
      }
      if (submit.disabled) return;
      const kind = replyTo === undefined ? "note" : "reply";

      submit.disabled = true;
      message.readOnly = true;
      emojiPicker.querySelectorAll("button").forEach(button => { button.disabled = true; });
      postStatus.textContent = `Posting your ${kind}…`;

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, replyTo }),
          signal: AbortSignal.timeout(requestTimeout),
        });

        if (response.status === 429) {
          postStatus.textContent = "Please wait a minute before posting another note.";
          return;
        }
        if (response.status === 404 && replyTo !== undefined) {
          postStatus.textContent = "This note is no longer available.";
          return;
        }
        if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);

        message.value = "";
        updateCount();
        postStatus.textContent = `Your ${kind} was posted.`;
        await loadEntries();
      } catch {
        postStatus.textContent = `Could not confirm your ${kind} was posted. Your draft is still here. Check Visitor notes before trying again.`;
      } finally {
        submit.disabled = false;
        message.readOnly = false;
        emojiPicker.querySelectorAll("button").forEach(button => { button.disabled = false; });
      }
    });

    updateCount();
    form.hidden = false;
  }

  setupComposer(form);
  refresh.hidden = false;
  refresh.addEventListener("click", loadEntries);
  loadEntries();
}
