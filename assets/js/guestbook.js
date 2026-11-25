const guestbook = document.querySelector("[data-guestbook-api]");
const api = guestbook.dataset.guestbookApi;

if (api) {
  const form = guestbook.querySelector(".guestbook__form");
  const message = guestbook.querySelector("#guestbook-message");
  const count = guestbook.querySelector(".guestbook__count");
  const emojiPicker = guestbook.querySelector(".guestbook__emoji");
  const submit = form.querySelector("button[type=submit]");
  const postStatus = guestbook.querySelector("[data-post-status]");
  const refresh = guestbook.querySelector(".guestbook__refresh");
  const list = guestbook.querySelector(".guestbook__list");
  const listStatus = guestbook.querySelector("[data-list-status]");
  const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: "medium" });
  let latestLoad = 0;

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

  function renderEntry(entry) {
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

  async function loadEntries() {
    const load = ++latestLoad;
    refresh.disabled = true;
    listStatus.textContent = "Loading visitor notes…";

    try {
      const response = await fetch(api, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);
      const entries = await response.json();
      if (load !== latestLoad) return;
      list.replaceChildren(...entries.map(renderEntry));
      listStatus.textContent = entries.length ? "" : "No notes yet. Say hello!";
    } catch {
      if (load === latestLoad) listStatus.textContent = "Visitor notes are temporarily unavailable. Try Refresh.";
    } finally {
      if (load === latestLoad) refresh.disabled = false;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = message.value.trim();
    if (!text) {
      message.setCustomValidity("Write a message or add an emoji first.");
      message.reportValidity();
      return;
    }
    if (submit.disabled) return;

    submit.disabled = true;
    message.readOnly = true;
    emojiPicker.querySelectorAll("button").forEach(button => { button.disabled = true; });
    postStatus.textContent = "Posting your note…";

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 429) {
        postStatus.textContent = "Please wait a minute before posting another note.";
        return;
      }
      if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);

      message.value = "";
      updateCount();
      postStatus.textContent = "Your note was posted.";
      await loadEntries();
    } catch {
      postStatus.textContent = "Could not confirm your note was posted. Refresh before trying again.";
    } finally {
      submit.disabled = false;
      message.readOnly = false;
      emojiPicker.querySelectorAll("button").forEach(button => { button.disabled = false; });
    }
  });

  updateCount();
  form.hidden = false;
  refresh.hidden = false;
  refresh.addEventListener("click", loadEntries);
  loadEntries();
}
