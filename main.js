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
  return (
    !!getFullscreenElement() ||
    document.documentElement.classList.contains("immersive-fallback") ||
    iosNativeVideoFullscreen
  );
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

/** iOS WebKit: нативный полноэкран для HTMLVideoElement — webkitEnterFullscreen (Apple). */
let iosNativeVideoFullscreen = false;

function getPrimaryVideo() {
  return document.getElementById("isl-demo-video") || document.querySelector("video");
}

function ensureIosVideoFullscreenListeners(video) {
  if (!video || video.dataset.islWebkitFsHooks) return;
  video.dataset.islWebkitFsHooks = "1";
  video.addEventListener("webkitbeginfullscreen", () => {
    iosNativeVideoFullscreen = true;
    syncLabel();
  });
  video.addEventListener("webkitendfullscreen", () => {
    iosNativeVideoFullscreen = false;
    syncLabel();
  });
}

function tryIosVideoWebkitEnterFullscreen() {
  if (!isIosTouchDevice()) return false;
  const video = getPrimaryVideo();
  if (!video) return false;
  const enter = video.webkitEnterFullscreen;
  if (typeof enter !== "function") return false;
  ensureIosVideoFullscreenListeners(video);
  try {
    enter.call(video);
    return true;
  } catch (err) {
    logFullscreen("webkitEnterFullscreen не удался:", err?.message || err);
    return false;
  }
}

function tryIosVideoWebkitExitFullscreen() {
  const video = getPrimaryVideo();
  const exit = video?.webkitExitFullscreen;
  if (video && typeof exit === "function") {
    try {
      exit.call(video);
      return true;
    } catch (err) {
      logFullscreen("webkitExitFullscreen не удался:", err?.message || err);
    }
  }
  return false;
}

/** Нативная оболочка WKWebView выставляет флаг; element fullscreen вызывается отсюда же из JS. */
function isWkWebViewShellWithElementFullscreen() {
  return window.__WK_SHELL_ELEMENT_FULLSCREEN__ === true;
}

function pickElementFullscreenTarget() {
  return (
    document.querySelector("canvas") ||
    document.getElementById("app-root") ||
    document.body
  );
}

/** Во фрейме прокрутка document фрейма не двигает окно вкладки Safari — нужен scroll у родителя. */
function isEmbeddedFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

const ISL_PARENT_MSG = Object.freeze({
  source: "hide-mobile-browser-tabs",
  type: "chrome-nudge",
});

function notifyParentChromeNudge(deltaY, behavior = "smooth") {
  if (!isEmbeddedFrame()) return;
  try {
    window.parent.postMessage(
      {
        source: ISL_PARENT_MSG.source,
        type: ISL_PARENT_MSG.type,
        deltaY,
        behavior,
      },
      "*"
    );
  } catch (err) {
    logFullscreen("postMessage родителю не удался:", err?.message || err);
  }
}

/**
 * Верхняя панель Safari чаще реагирует на прокрутку документа вкладки, а не на overflow внутри fixed / iframe.
 * Во фрейме шлём родителю postMessage (обработчик в корневом index.html).
 */
function nudgeWindowScrollForIosTopChrome(done) {
  if (isEmbeddedFrame()) {
    const dy = Math.max(48, Math.floor(window.innerHeight * 0.12));
    notifyParentChromeNudge(dy, "smooth");
    done?.();
    return;
  }

  const bridge = document.getElementById("isl-top-chrome-bridge");
  if (!bridge) {
    done?.();
    return;
  }

  root.classList.add("isl-page-nudge");
  bridge.classList.add("isl-visible");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const room = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const maxY = room > 0 ? Math.max(1, Math.min(Math.floor(window.innerHeight * 0.12), room)) : 0;
      if (maxY > 0) {
        window.scrollTo({ top: maxY, left: 0, behavior: "smooth" });
      }
      done?.();

      window.setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        root.classList.remove("isl-page-nudge");
        bridge.classList.remove("isl-visible");
      }, 420);
    });
  });
}

/** В iOS Safari нет полноэкранного API для страницы — панель вкладок убирают скроллом (см. isl-spacer / .isl-scroller). */
function tryImmersiveScrollOnIos() {
  const locked = document.documentElement.classList.contains("isl-locked");
  const scroller = document.querySelector(".isl-scroller");

  if (locked && scroller) {
    nudgeWindowScrollForIosTopChrome(() => {
      const delta = Math.max(48, Math.floor(scroller.clientHeight * 0.35));
      const max = scroller.scrollHeight - scroller.clientHeight;
      const target = Math.min(max, scroller.scrollTop + delta);
      scroller.scrollTo({ top: target, behavior: "smooth" });
    });
    return;
  }

  if (isEmbeddedFrame()) {
    const dy = Math.max(48, Math.floor(window.innerHeight * 0.35));
    notifyParentChromeNudge(dy, "smooth");
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
    if (iosNativeVideoFullscreen) {
      tryIosVideoWebkitExitFullscreen();
    }
    if (getFullscreenElement()) {
      exitFullscreenDoc().catch((err) => {
        console.warn("[fullscreen] exitFullscreen не удался:", err?.message || err);
      });
    }
    exitPseudoFullscreen();
    syncLabel();
    return;
  }

  if (isWkWebViewShellWithElementFullscreen()) {
    const target = pickElementFullscreenTarget();
    logFullscreen("WKWebView shell: element fullscreen из web на", target?.tagName ?? "(нет узла)");
    requestFullscreenFor(target)
      .then(() => logFullscreen("element fullscreen принят"))
      .catch((err) => {
        console.warn("[fullscreen] element fullscreen в shell отклонён:", err?.message || err);
        tryImmersiveScrollOnIos();
      })
      .finally(syncLabel);
    return;
  }

  if (isIosTouchDevice()) {
    if (tryIosVideoWebkitEnterFullscreen()) {
      logFullscreen("iOS: webkitEnterFullscreen для video");
      syncLabel();
      return;
    }
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

ensureIosVideoFullscreenListeners(getPrimaryVideo());

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

function initIframeEmbedHint() {
  const note = document.querySelector(".isl-embed-note");
  if (!note || !isEmbeddedFrame()) return;
  note.hidden = false;
  note.textContent =
    "Во фрейме у app.html нет прокрутки документа — нормально. Родительский index.html уже задаёт min-height и postMessage→scrollBy; при встраивании на другой сайт скопируйте оттуда CSS и скрипт.";
}

initIframeEmbedHint();
