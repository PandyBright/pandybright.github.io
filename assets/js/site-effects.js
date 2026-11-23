const progress = document.querySelector(".reading-progress");

if (progress) {
  const scroller = document.scrollingElement;
  let frame = 0;

  function updateProgress() {
    frame = 0;
    const distance = scroller.scrollHeight - scroller.clientHeight;
    const fraction = distance > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / distance)) : 0;
    progress.style.setProperty("--reading-progress", fraction);
  }

  function scheduleProgress() {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  }

  window.addEventListener("scroll", scheduleProgress, { passive: true });
  window.addEventListener("resize", scheduleProgress);
  window.addEventListener("pageshow", scheduleProgress);
  updateProgress();
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
