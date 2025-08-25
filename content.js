(() => {
  const TOGGLE_ATTR = "data-image-red-toggle";
  const ORIGINAL_SRC_ATTR = "data-original-src";
  const ORIGINAL_SRCSET_ATTR = "data-original-srcset";
  const PLACEHOLDER_CACHE_ATTR = "data-placeholder-url";

  let hoverButton;
  let currentTargetImg = null;

  function createHoverButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "image-red-toggle-button";
    btn.textContent = "Red";
    btn.addEventListener("click", onToggleClick, { capture: true });
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    return btn;
  }

  function ensureButton() {
    if (!hoverButton) {
      hoverButton = createHoverButton();
      document.documentElement.appendChild(hoverButton);
    }
  }

  function onToggleClick(e) {
    e.stopPropagation();
    e.preventDefault();
    const img = currentTargetImg;
    if (!img || !document.contains(img)) return;
    toggleImage(img);
  }

  function getRenderedSize(el) {
    const rect = el.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    return { width, height };
  }

  function generateRedPlaceholder(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/png");
  }

  function getOrCreatePlaceholder(img) {
    const { width, height } = getRenderedSize(img);
    const cacheKey = `${width}x${height}`;
    const cached = img.getAttribute(PLACEHOLDER_CACHE_ATTR);
    if (cached && cached.startsWith(cacheKey + ":")) {
      return cached.slice(cacheKey.length + 1);
    }
    const url = generateRedPlaceholder(width, height);
    img.setAttribute(PLACEHOLDER_CACHE_ATTR, `${cacheKey}:${url}`);
    return url;
  }

  function isToggled(img) {
    return img.getAttribute(TOGGLE_ATTR) === "on";
  }

  function toggleImage(img) {
    if (!isToggled(img)) {
      // Store original sources
      if (img.hasAttribute("src")) {
        img.setAttribute(ORIGINAL_SRC_ATTR, img.getAttribute("src") || "");
      }
      if (img.hasAttribute("srcset")) {
        img.setAttribute(ORIGINAL_SRCSET_ATTR, img.getAttribute("srcset") || "");
      }

      const placeholder = getOrCreatePlaceholder(img);
      // Clear srcset so browser does not override src
      if (img.hasAttribute("srcset")) img.removeAttribute("srcset");
      img.setAttribute("src", placeholder);
      img.setAttribute(TOGGLE_ATTR, "on");
    } else {
      const originalSrc = img.getAttribute(ORIGINAL_SRC_ATTR);
      const originalSrcset = img.getAttribute(ORIGINAL_SRCSET_ATTR);

      if (originalSrc !== null) {
        img.setAttribute("src", originalSrc);
        img.removeAttribute(ORIGINAL_SRC_ATTR);
      }
      if (originalSrcset !== null) {
        if (originalSrcset) {
          img.setAttribute("srcset", originalSrcset);
        } else {
          img.removeAttribute("srcset");
        }
        img.removeAttribute(ORIGINAL_SRCSET_ATTR);
      }
      img.removeAttribute(TOGGLE_ATTR);
    }
  }

  function positionButton(img) {
    ensureButton();
    if (!hoverButton) return;
    const rect = img.getBoundingClientRect();
    hoverButton.style.display = "block";
    hoverButton.style.position = "fixed";
    const offset = 4;
    hoverButton.style.left = `${Math.round(rect.right - hoverButton.offsetWidth - offset)}px`;
    hoverButton.style.top = `${Math.round(rect.top + offset)}px`;
    currentTargetImg = img;
  }

  function hideButton() {
    if (!hoverButton) return;
    hoverButton.style.display = "none";
    currentTargetImg = null;
  }

  function isValidImage(img) {
    if (!(img instanceof HTMLImageElement)) return false;
    const { width, height } = getRenderedSize(img);
    return width >= 24 && height >= 24; // avoid tiny icons
  }

  function onPointerOver(e) {
    const target = e.target;
    if (target && target instanceof HTMLImageElement && isValidImage(target)) {
      positionButton(target);
    } else if (hoverButton && target === hoverButton) {
      // keep visible
    } else {
      hideButton();
    }
  }

  function onScrollOrResize() {
    if (currentTargetImg && document.contains(currentTargetImg)) {
      positionButton(currentTargetImg);
    } else {
      hideButton();
    }
  }

  function init() {
    ensureButton();
    hideButton();
    window.addEventListener("mouseover", onPointerOver, { passive: true, capture: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    document.addEventListener("mouseleave", hideButton, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

