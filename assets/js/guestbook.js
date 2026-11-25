const guestbook = document.querySelector("[data-guestbook-api]");
const api = guestbook.dataset.guestbookApi;

if (api) {
  const title = document.querySelector("[data-guestbook-title]");
  const form = guestbook.querySelector(".guestbook__form");
  const replyTemplate = form.cloneNode(true);
  const refresh = guestbook.querySelector(".guestbook__entries-head .guestbook__refresh");
  const list = guestbook.querySelector(".guestbook__list");
  const listStatus = guestbook.querySelector("[data-list-status]");
  const actionStatus = guestbook.querySelector("[data-action-status]");
  const confirmation = guestbook.querySelector(".guestbook__confirmation");
  const confirmTitle = confirmation.querySelector("h2");
  const confirmDescription = confirmation.querySelector("p");
  const dateFormat = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: "medium" });
  const replyDateFormat = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: "medium", timeStyle: "short" });
  const requestTimeout = 15000;
  const visibleReplies = 1;
  const deviceKeyStorage = "pandybright-guestbook-device";
  const voterKeyStorage = "pandybright-guestbook-voter";
  let ownerKey;
  let voterKey;
  let isOwner = false;
  let ownerTitleAvatar;
  let pendingDeletion;
  let latestLoad = 0;
  let firstEntriesLoaded = false;

  try {
    ownerKey = localStorage.getItem(deviceKeyStorage) || undefined;
    voterKey = localStorage.getItem(voterKeyStorage) || undefined;
  } catch {
    // Anonymous posting is still available when browser storage is blocked.
  }

  async function send(payload) {
    return fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(requestTimeout),
    });
  }

  function createOwnerAvatar(size, alt = "") {
    const avatar = document.createElement("img");
    avatar.src = guestbook.dataset.ownerAvatar;
    avatar.alt = alt;
    avatar.width = size;
    avatar.height = size;
    return avatar;
  }

  function setOwnerState(verified) {
    isOwner = verified;
    guestbook.toggleAttribute("data-owner", isOwner);
    if (!isOwner) {
      ownerTitleAvatar?.remove();
      ownerTitleAvatar = undefined;
      return;
    }
    if (!title || ownerTitleAvatar) return;
    ownerTitleAvatar = createOwnerAvatar(34, guestbook.dataset.ownerName);
    ownerTitleAvatar.className = "guestbook__title-avatar";
    title.append(ownerTitleAvatar);
  }

  function getVoterKey() {
    if (voterKey) return voterKey;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    voterKey = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(voterKeyStorage, voterKey);
    } catch {
      // Keep the vote key for this page when storage is unavailable.
    }
    return voterKey;
  }

  function authorLabel(entry) {
    const name = entry.is_owner === 1 ? guestbook.dataset.ownerName : "Guest";
    return entry.location ? `${name} from ${entry.location}` : name;
  }

  function renderMessage(entry, kind) {
    const item = document.createElement("li");
    item.dataset.entryKey = `${entry.id}:${entry.created_at}`;
    item.id = `guestbook-${kind}-${entry.id}`;
    item.tabIndex = -1;
    const header = document.createElement("div");
    header.className = "guestbook__byline";

    const author = document.createElement("strong");
    author.className = "guestbook__author";
    if (entry.is_owner === 1) author.append(createOwnerAvatar(28));
    const label = document.createElement("span");
    label.textContent = authorLabel(entry);
    author.append(label);

    const date = document.createElement("time");
    date.dateTime = entry.created_at;
    date.textContent = dateFormat.format(new Date(entry.created_at));
    const metadata = document.createElement("div");
    metadata.className = "guestbook__metadata";
    if (Number.isSafeInteger(entry.id)) metadata.append(renderActions(item, entry, kind));
    metadata.append(date);
    header.append(author, metadata);

    const note = document.createElement("p");
    note.textContent = entry.message;
    const content = document.createElement("div");
    content.className = "guestbook__message";
    content.append(note);
    item.append(header, content);
    if (Number.isSafeInteger(entry.id)) {
      const { trigger, composer } = renderReplyForm(item, entry, kind);
      content.append(trigger);
      const ownerLike = document.createElement("small");
      ownerLike.className = "guestbook__owner-like";
      ownerLike.hidden = true;
      ownerLike.append(createOwnerAvatar(16), `${guestbook.dataset.ownerName} Likes This`);
      item.append(ownerLike, composer);
      if (kind === "note") appendReplyList(item);
    }
    return item;
  }

  function appendReplyList(note) {
    const replies = document.createElement("ol");
    replies.id = `${note.id}-replies`;
    replies.className = "guestbook__replies";
    replies.setAttribute("aria-label", "Replies");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "guestbook__replies-toggle";
    toggle.hidden = true;
    toggle.setAttribute("aria-controls", replies.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => updateReplyVisibility(note, toggle.getAttribute("aria-expanded") !== "true"));
    note.append(replies, toggle);
  }

  function updateReplyVisibility(note, expanded) {
    const replies = note.querySelector(":scope > .guestbook__replies");
    const toggle = note.querySelector(":scope > .guestbook__replies-toggle");
    if (expanded === undefined) expanded = toggle.getAttribute("aria-expanded") === "true";
    const extra = replies.children.length - visibleReplies;
    for (const [index, reply] of Array.from(replies.children).entries()) {
      reply.hidden = !expanded && index >= visibleReplies;
    }
    toggle.hidden = extra <= 0;
    toggle.setAttribute("aria-expanded", expanded);
    if (extra > 0) {
      toggle.textContent = expanded ? "Show fewer replies" : `Show ${extra} more ${extra === 1 ? "reply" : "replies"}`;
    }
  }

  function revealLinkedEntry(hash) {
    if (!/^#guestbook-(?:note|reply)-\d+$/.test(hash)) return;
    const entry = document.getElementById(hash.slice(1));
    if (entry?.hidden) updateReplyVisibility(entry.closest(".guestbook__list > li"), true);
    return entry;
  }

  function scrollToLinkedEntry() {
    revealLinkedEntry(location.hash)?.scrollIntoView();
  }

  function updateReplyReference(item, target) {
    const previous = item.querySelector(":scope > .guestbook__reply-reference");
    if (target?.kind !== "reply") {
      previous?.remove();
      return;
    }
    if (previous?.dataset.deleted === String(Boolean(target.deleted))) return;

    const reference = document.createElement(target.deleted ? "div" : "a");
    reference.className = "guestbook__reply-reference";
    reference.dataset.deleted = String(Boolean(target.deleted));
    const time = document.createElement("time");
    time.dateTime = target.created_at;
    time.textContent = replyDateFormat.format(new Date(target.created_at));
    const subject = target.deleted ? "a deleted reply" : authorLabel(target);
    reference.append(`Replying to ${subject} · `, time);
    if (!target.deleted) {
      reference.href = `#guestbook-reply-${target.id}`;
      reference.addEventListener("click", () => revealLinkedEntry(reference.hash));
      const excerpt = document.createElement("span");
      excerpt.className = "guestbook__reply-excerpt";
      const text = target.message.replace(/\s+/g, " ").trim();
      const characters = Array.from(text);
      excerpt.textContent = characters.length > 100 ? `${characters.slice(0, 100).join("")}…` : text;
      reference.append(excerpt);
    }
    if (previous) previous.replaceWith(reference);
    else item.querySelector(":scope > .guestbook__byline").after(reference);
  }

  function renderActions(item, entry, kind) {
    const target = { kind, id: entry.id, createdAt: entry.created_at };
    const actions = document.createElement("div");
    actions.className = "guestbook__actions";

    const star = document.createElement("button");
    star.type = "button";
    star.className = "guestbook__star";
    star.innerHTML = '<span class="guestbook__star-icon" aria-hidden="true">☆</span> <span class="guestbook__star-count" aria-hidden="true">0</span>';
    star.addEventListener("click", async () => {
      star.disabled = true;
      actionStatus.textContent = "";
      const liked = star.getAttribute("aria-pressed") !== "true";
      try {
        const response = await send({ action: "like", ...target, liked,
          ownerKey: isOwner ? ownerKey : undefined, voterKey: isOwner ? undefined : getVoterKey() });
        if (response.status === 429) {
          actionStatus.textContent = "Give it a moment before changing this star again.";
          return;
        }
        if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);
        updateLike(item, await response.json());
        await loadEntries();
      } catch {
        actionStatus.textContent = "Could not update the star. Try refreshing the notes.";
      } finally {
        star.disabled = false;
      }
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "guestbook__delete";
    remove.setAttribute("aria-label", `Delete ${kind}`);
    remove.title = `Delete ${kind}`;
    remove.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
    remove.addEventListener("click", () => {
      if (!isOwner || confirmation.open) return;
      pendingDeletion = { target, item, button: remove };
      confirmTitle.textContent = `Delete this ${kind}?`;
      confirmDescription.textContent = kind === "note"
        ? "The note and all of its replies will be permanently deleted."
        : "This reply will be permanently deleted. Responses to it will stay in the thread.";
      confirmation.returnValue = "";
      confirmation.showModal();
    });

    actions.append(star, remove);
    return actions;
  }

  function updateLike(item, entry) {
    const star = item.querySelector(":scope > .guestbook__byline .guestbook__star");
    const count = entry.like_count ?? 0;
    const liked = entry.liked === 1;
    star.setAttribute("aria-pressed", liked);
    star.setAttribute("aria-label", `Star, ${count} ${count === 1 ? "like" : "likes"}`);
    star.querySelector(".guestbook__star-icon").textContent = liked ? "★" : "☆";
    star.querySelector(".guestbook__star-count").textContent = count;
    item.querySelector(":scope > .guestbook__owner-like").hidden = entry.owner_liked !== 1;
  }

  confirmation.addEventListener("close", async () => {
    const deletion = pendingDeletion;
    pendingDeletion = undefined;
    if (!deletion || confirmation.returnValue !== "delete" || !isOwner) return;

    const { target, item, button } = deletion;
    button.disabled = true;
    actionStatus.textContent = "";
    try {
      const response = await send({ action: "delete", ...target, ownerKey });
      if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);
      const thread = target.kind === "reply" ? item.closest(".guestbook__list > li") : null;
      item.remove();
      if (thread) updateReplyVisibility(thread);
      refresh.focus();
      await loadEntries();
    } catch {
      actionStatus.textContent = `Could not confirm the ${target.kind} was deleted. Try refreshing the notes.`;
    } finally {
      button.disabled = false;
    }
  });

  function renderReplyForm(item, entry, kind) {
    const messageId = `guestbook-compose-${kind}-${entry.id}`;
    const composer = document.createElement("div");
    composer.className = "guestbook__reply-form";
    composer.id = `${messageId}-panel`;
    composer.hidden = true;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "guestbook__reply";
    trigger.textContent = "Reply";
    trigger.setAttribute("aria-controls", composer.id);
    trigger.setAttribute("aria-expanded", "false");

    function setExpanded(expanded) {
      composer.hidden = !expanded;
      trigger.setAttribute("aria-expanded", expanded);
    }

    trigger.addEventListener("click", () => {
      const expanding = composer.hidden;
      setExpanded(expanding);
      if (!expanding || composer.firstElementChild) return;

      const replyForm = replyTemplate.cloneNode(true);
      const field = replyForm.querySelector("textarea");
      field.id = messageId;
      field.value = "";
      field.rows = 3;
      field.placeholder = "Write a reply…";
      field.setAttribute("aria-describedby", `${messageId}-help`);
      const label = replyForm.querySelector("label");
      label.htmlFor = messageId;
      label.textContent = "Your reply";
      const help = document.createElement("p");
      help.className = "guestbook__help";
      help.id = `${messageId}-help`;
      help.textContent = "Your reply and approximate location will be public.";
      replyForm.querySelector("button[type=submit]").textContent = "Post reply";
      const postStatus = replyForm.querySelector("[data-post-status]");
      postStatus.textContent = "";
      postStatus.before(help);
      composer.append(replyForm);
      setupComposer(replyForm, { replyTo: entry.id, replyCreatedAt: entry.created_at, replyToKind: kind }, () => {
        const restoreFocus = !composer.hidden &&
          (composer.contains(document.activeElement) || document.activeElement === document.body);
        setExpanded(false);
        if (restoreFocus) trigger.focus({ preventScroll: true });
        const note = item.closest(".guestbook__list > li");
        const replies = note?.querySelector(":scope > .guestbook__replies");
        if (replies?.children.length >= visibleReplies) updateReplyVisibility(note, true);
        actionStatus.textContent = "Your reply was posted.";
      });
    });
    return { trigger, composer };
  }

  function renderEntries(container, entries, kind) {
    // Keep open reply forms and drafts in place when refreshing the list.
    const existing = new Map([...container.children].map(item => [item.dataset.entryKey, item]));
    let next = container.firstElementChild;
    for (const entry of entries) {
      const key = `${entry.id}:${entry.created_at}`;
      const item = existing.get(key) ?? renderMessage(entry, kind);
      existing.delete(key);
      if (Number.isSafeInteger(entry.id)) updateLike(item, entry);
      if (kind === "reply") updateReplyReference(item, entry.reply_to);
      const replies = item.querySelector(":scope > .guestbook__replies");
      if (replies) {
        renderEntries(replies, entry.replies ?? [], "reply");
        updateReplyVisibility(item);
      }
      if (item === next) next = next.nextElementSibling;
      else container.insertBefore(item, next);
    }
    for (const item of existing.values()) item.remove();
  }

  async function loadEntries() {
    const load = ++latestLoad;
    refresh.disabled = true;
    listStatus.textContent = "Loading visitor notes…";

    try {
      const response = ownerKey || voterKey
        ? await send({ action: "list", ownerKey, voterKey })
        : await fetch(api, { signal: AbortSignal.timeout(requestTimeout) });
      if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data) ? data : data.entries;
      if (load !== latestLoad) return;
      setOwnerState(data.isOwner === true);
      renderEntries(list, entries, "note");
      if (!firstEntriesLoaded) {
        firstEntriesLoaded = true;
        scrollToLinkedEntry();
      }
      listStatus.textContent = entries.length ? "" : "No notes yet. Say hello!";
    } catch {
      if (load === latestLoad) listStatus.textContent = "Visitor notes are temporarily unavailable. Try Refresh.";
    } finally {
      if (load === latestLoad) refresh.disabled = false;
    }
  }

  function setupComposer(form, parent, onPosted) {
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
      const kind = parent ? "reply" : "note";

      submit.disabled = true;
      message.readOnly = true;
      emojiPicker.querySelectorAll("button").forEach(button => { button.disabled = true; });
      postStatus.textContent = `Posting your ${kind}…`;

      try {
        const response = await send({ message: text, ...parent, ownerKey });

        if (response.status === 429) {
          postStatus.textContent = "Please wait a minute before posting another note.";
          return;
        }
        if (response.status === 404 && parent) {
          postStatus.textContent = "The message you’re replying to is no longer available. Your draft is still here.";
          return;
        }
        if (response.status === 403 && ownerKey) {
          setOwnerState(false);
          postStatus.textContent = "Could not verify your identity. Your draft is still here.";
          return;
        }
        if (!response.ok) throw new Error(`Guestbook returned ${response.status}`);

        if (ownerKey) setOwnerState(true);
        message.value = "";
        updateCount();
        postStatus.textContent = onPosted ? "" : `Your ${kind} was posted.`;
        onPosted?.();
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
  window.addEventListener("hashchange", scrollToLinkedEntry);
  loadEntries();
}
