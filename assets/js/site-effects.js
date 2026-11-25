const progress = document.querySelector(".reading-progress");

if (progress) {
  const scroller = document.scrollingElement;
  let frame = 0;

  function updateProgress() {
    frame = 0;
    const distance = scroller.scrollHeight - scroller.clientHeight;
    const fraction = distance > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / distance)) : 1;
    progress.style.setProperty("--reading-progress", fraction);
  }

  function scheduleProgress() {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  }

  window.addEventListener("scroll", scheduleProgress, { passive: true });
  window.addEventListener("resize", scheduleProgress);
  window.addEventListener("pageshow", scheduleProgress);
  if ("ResizeObserver" in window) {
    new ResizeObserver(scheduleProgress).observe(document.body);
  }
  updateProgress();
}

const orbit = document.querySelector(".home-orbit");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (orbit) {
  function updateOrbitVisibility() {
    orbit.hidden = reducedMotion.matches;
  }

  orbit.addEventListener("click", () => {
    const paused = orbit.getAttribute("aria-pressed") === "true";
    orbit.setAttribute("aria-pressed", String(!paused));
  });
  reducedMotion.addEventListener("change", updateOrbitVisibility);
  updateOrbitVisibility();
}

const easterEggs = document.querySelectorAll("details[data-easter-egg]");

if (easterEggs.length) {
  document.addEventListener("click", (event) => {
    for (const egg of easterEggs) {
      if (egg.open && !egg.contains(event.target)) egg.open = false;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    for (const egg of easterEggs) {
      if (!egg.open) continue;
      const hadFocus = egg.contains(document.activeElement);
      egg.open = false;
      if (hadFocus) egg.querySelector("summary").focus();
    }
  });
}

const moonNote = document.querySelector(".moon-note");

if (moonNote) {
  const message = moonNote.querySelector(".moon-note__message");
  const next = moonNote.querySelector(".moon-note__next");
  const notes = [
    message.textContent,
    "I tried working from a cloud. The Wi-Fi had other plans.",
    "The lab robot learned to hop today. It still refuses to share its carrots.",
    "If you see a shooting star, please sign for it. That might be my delivery.",
  ];
  let index = 0;

  next.hidden = false;
  next.addEventListener("click", () => {
    index = (index + 1) % notes.length;
    message.textContent = notes[index];
  });
}

const spotlight = document.querySelector("[data-spotlight]");
const pointerMotion = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");

if (spotlight) {
  spotlight.addEventListener("pointermove", (event) => {
    if (!pointerMotion.matches || event.pointerType === "touch") return;

    const bounds = spotlight.getBoundingClientRect();
    spotlight.style.setProperty("--light-x", `${event.clientX - bounds.left}px`);
    spotlight.style.setProperty("--light-y", `${event.clientY - bounds.top}px`);
    spotlight.classList.add("has-spotlight");
  }, { passive: true });

  const clearSpotlight = () => spotlight.classList.remove("has-spotlight");
  spotlight.addEventListener("pointerleave", clearSpotlight);
  spotlight.addEventListener("pointercancel", clearSpotlight);
  pointerMotion.addEventListener("change", clearSpotlight);
}
