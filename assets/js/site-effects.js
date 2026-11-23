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

const mascot = document.querySelector(".avatar-mascot");

if (mascot) {
  document.addEventListener("click", (event) => {
    if (mascot.open && !mascot.contains(event.target)) mascot.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !mascot.open) return;
    mascot.open = false;
    if (mascot.contains(document.activeElement)) mascot.querySelector("summary").focus();
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
