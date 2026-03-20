const btn = document.getElementById("action");
const root = document.documentElement;

function logFullscreen(...args) {
  console.log("[fullscreen]", ...args);
}

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
  const inApi = !!getFullscreenElement();
  const inPseudo = document.documentElement.classList.contains("immersive-fallback");
  btn.textContent = inApi || inPseudo ? "Выйти" : "Полный экран";
}

function isImmersive() {
  return !!getFullscreenElement() || document.documentElement.classList.contains("immersive-fallback");
}

function enterPseudoFullscreen() {
  document.documentElement.classList.add("immersive-fallback");
}

function exitPseudoFullscreen() {
  document.documentElement.classList.remove("immersive-fallback");
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

function tryRequestFullscreen() {
  if (!window.isSecureContext) {
    return Promise.reject(new Error("Fullscreen API требует HTTPS или localhost"));
  }
  return requestFullscreenFor(root).catch((err) => {
    console.warn("[fullscreen] documentElement.requestFullscreen отклонён:", err?.message || err);
    return requestFullscreenFor(document.body);
  });
}

btn.addEventListener("click", () => {
  if (isImmersive()) {
    logFullscreen("выход из режима");
    if (getFullscreenElement()) {
      exitFullscreenDoc().catch((err) => {
        console.warn("[fullscreen] exitFullscreen не удался:", err?.message || err);
      });
    }
    exitPseudoFullscreen();
    syncLabel();
    return;
  }

  if (isIosTouchDevice()) {
    logFullscreen("iOS: скролл (Fullscreen API для страницы недоступен)");
    tryImmersiveScrollOnIos();
    return;
  }

  logFullscreen("запрос API fullscreen…", { isSecureContext: window.isSecureContext });
  tryRequestFullscreen()
    .then(() => logFullscreen("вошли в API fullscreen"))
    .catch((err) => {
      console.warn("[fullscreen] API fullscreen недоступен, включаю CSS-fallback:", err?.message || err);
      enterPseudoFullscreen();
    })
    .finally(syncLabel);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!document.documentElement.classList.contains("immersive-fallback")) return;
  exitPseudoFullscreen();
  syncLabel();
});

["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach((ev) => {
  document.addEventListener(ev, () => {
    logFullscreen("событие:", ev, "element =", getFullscreenElement()?.tagName ?? null);
    syncLabel();
  });
});
syncLabel();

logFullscreen("готово", {
  isSecureContext: window.isSecureContext,
  protocol: window.location.protocol,
  origin: window.location.origin || "(пусто)",
});


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
