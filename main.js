const btn = document.getElementById("action");
const root = document.documentElement;

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function requestFullscreenFor(el) {
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (fn) return fn.call(el);
  return Promise.reject(new Error("Fullscreen API не поддерживается"));
}

function exitFullscreenDoc() {
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.webkitCancelFullScreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (fn) return fn.call(document);
  return Promise.reject(new Error("Выход из полноэкранного режима не поддерживается"));
}

function syncLabel() {
  btn.textContent = getFullscreenElement() ? "Выйти" : "Полный экран";
}

function isIosTouchDevice() {
  return /(iPhone|iPad|iPod)/.test(navigator.userAgent);
}

/** В iOS Safari нет полноэкранного API для страницы — панель вкладок убирают скроллом (см. isl-spacer / .isl-scroller). */
function tryImmersiveScrollOnIos() {
  const locked = document.documentElement.classList.contains("isl-locked");
  const scroller = document.querySelector(".isl-scroller");

  if (locked && scroller) {
    const delta = Math.max(48, Math.floor(scroller.clientHeight * 0.35));
    const max = scroller.scrollHeight - scroller.clientHeight;
    const target = Math.min(max, scroller.scrollTop + delta);
    scroller.scrollTo({ top: target, behavior: "smooth" });
    return;
  }

  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const delta = Math.max(48, Math.floor(window.innerHeight * 0.35));
  let next = Math.min(maxScroll, window.pageYOffset + delta);
  if (next <= window.pageYOffset && maxScroll > 0) next = Math.min(maxScroll, 1);
  window.scrollTo({ top: next, behavior: "smooth" });
}

btn.addEventListener("click", () => {
  if (!getFullscreenElement()) {
    if (isIosTouchDevice()) {
      tryImmersiveScrollOnIos();
      return;
    }
    requestFullscreenFor(root).catch(() => {});
  } else {
    exitFullscreenDoc().catch(() => {});
  }
});

["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach((ev) => {
  document.addEventListener(ev, syncLabel);
});
syncLabel();


function initIosSafariTabLayout() {
  if (!/(iPhone|iPad|iPod)/.test(navigator.userAgent)) return;

  const overlay = document.querySelector(".isl-overlay");
  const spacer = document.querySelector(".isl-spacer");
  const appRoot = document.getElementById("app-root");
  const islContent = document.getElementById("isl-content");
  if (!overlay || !spacer || !appRoot || !islContent) return;

  let tabsOpen = false;
  let rafId = null;

  function measure() {
    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--isl-vh", `${window.innerHeight * 0.01}px`);

      const screenShort = Math.min(window.screen.width, window.screen.height);
      const vv = window.visualViewport;

      const MOBILE_CHROME_TOP_BAR = 20;
      const open = !!(vv && vv.height + vv.offsetTop < screenShort - MOBILE_CHROME_TOP_BAR);

      if (open === tabsOpen) return;
      tabsOpen = open;

      window.setTimeout(() => {
        document.documentElement.classList.toggle("isl-locked", !open);
        overlay.classList.toggle("isl-visible", open);
        spacer.classList.toggle("isl-visible", open);

        if (!open) {
          islContent.appendChild(appRoot);
        } else {
          document.body.appendChild(appRoot);
        }

        Object.assign(appRoot.style, {
          position: open ? "fixed" : "relative",
          inset: open ? "0" : "auto",
          height: open ? "100dvh" : "100%",
          width: open ? "100vw" : "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
      }, open ? 0 : 100);
    });
  }

  measure();
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("orientationchange", measure, { passive: true });
  window.addEventListener("scroll", measure, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", measure, { passive: true });
    window.visualViewport.addEventListener("scroll", measure, { passive: true });
  }
}

initIosSafariTabLayout();
