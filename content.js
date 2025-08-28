(() => {
  const TOGGLE_ATTR = "data-image-red-toggle";
  const ORIGINAL_SRC_ATTR = "data-original-src"; // no longer used for overlay approach
  const ORIGINAL_SRCSET_ATTR = "data-original-srcset"; // kept for potential future fallbacks
  const PLACEHOLDER_CACHE_ATTR = "data-placeholder-url"; // legacy from src-swap approach

  let hoverButton;
  let currentTargetImg = null;
  const toggledImages = new Set();
  const imageToOverlay = new WeakMap();

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

  // Compute the rectangle of the actual drawn image content within the <img> element,
  // taking into account object-fit and object-position. Returns viewport coordinates.
  function computeImageContentRect(img) {
    const rect = img.getBoundingClientRect();
    const style = getComputedStyle(img);
    const fit = style.objectFit || "fill";
    const pos = style.objectPosition || "50% 50%";
    const naturalWidth = img.naturalWidth || rect.width;
    const naturalHeight = img.naturalHeight || rect.height;
    const elemWidth = rect.width;
    const elemHeight = rect.height;

    function parseObjectPosition(positionValue, extraWidth, extraHeight) {
      // Returns [xPercent, yPercent] where 0 = start, 1 = end
      // Only handles keywords and percentages; lengths default to percentages 0-1 based on available extra space.
      let xToken = "50%";
      let yToken = "50%";
      const parts = positionValue.trim().split(/\s+/);
      if (parts.length === 1) {
        xToken = parts[0];
        yToken = "50%";
      } else if (parts.length >= 2) {
        xToken = parts[0];
        yToken = parts[1];
      }
      function tokenToPercent(token, isX) {
        const lower = token.toLowerCase();
        if (lower === "left" || lower === "top") return 0;
        if (lower === "center") return 0.5;
        if (lower === "right" || lower === "bottom") return 1;
        if (lower.endsWith("%")) {
          const val = parseFloat(lower);
          return isFinite(val) ? val / 100 : 0.5;
        }
        // px lengths: approximate by clamping to 0..1 of extra space
        if (lower.endsWith("px")) {
          const px = parseFloat(lower);
          const extra = isX ? extraWidth : extraHeight;
          if (extra <= 0) return 0.5;
          return Math.min(1, Math.max(0, px / extra));
        }
        return 0.5;
      }
      const x = tokenToPercent(xToken, true);
      const y = tokenToPercent(yToken, false);
      return [x, y];
    }

    if (fit === "contain" || fit === "scale-down") {
      const scaleContain = Math.min(elemWidth / naturalWidth, elemHeight / naturalHeight) || 1;
      const drawWidth = naturalWidth * scaleContain;
      const drawHeight = naturalHeight * scaleContain;
      const extraX = Math.max(0, elemWidth - drawWidth);
      const extraY = Math.max(0, elemHeight - drawHeight);
      const [posX, posY] = parseObjectPosition(pos, extraX, extraY);
      const left = rect.left + extraX * posX;
      const top = rect.top + extraY * posY;
      return new DOMRect(left, top, drawWidth, drawHeight);
    }

    if (fit === "none") {
      // Approximate: place natural size anchored by object-position inside the element, but clip to element rect.
      const drawWidth = naturalWidth;
      const drawHeight = naturalHeight;
      const extraX = Math.max(0, elemWidth - drawWidth);
      const extraY = Math.max(0, elemHeight - drawHeight);
      const [posX, posY] = parseObjectPosition(pos, extraX, extraY);
      const left = rect.left + extraX * posX;
      const top = rect.top + extraY * posY;
      // Clip to element bounds
      const visibleLeft = Math.max(left, rect.left);
      const visibleTop = Math.max(top, rect.top);
      const visibleRight = Math.min(left + drawWidth, rect.right);
      const visibleBottom = Math.min(top + drawHeight, rect.bottom);
      return new DOMRect(
        visibleLeft,
        visibleTop,
        Math.max(0, visibleRight - visibleLeft),
        Math.max(0, visibleBottom - visibleTop)
      );
    }

    // cover, fill or others -> visible area is the element box
    return new DOMRect(rect.left, rect.top, rect.width, rect.height);
  }

  function isToggled(img) {
    return img.getAttribute(TOGGLE_ATTR) === "on";
  }

  function toggleImage(img) {
    if (!isToggled(img)) {
      const overlay = document.createElement("div");
      overlay.className = "image-red-overlay";
      overlay.setAttribute("aria-hidden", "true");
      const rect = computeImageContentRect(img);
      overlay.style.position = "fixed";
      overlay.style.left = `${Math.round(rect.left)}px`;
      overlay.style.top = `${Math.round(rect.top)}px`;
      overlay.style.width = `${Math.max(1, Math.round(rect.width))}px`;
      overlay.style.height = `${Math.max(1, Math.round(rect.height))}px`;
      // Copy border radius to better match rounded images
      try {
        const cs = getComputedStyle(img);
        overlay.style.borderRadius = cs.borderRadius;
      } catch (_) {}
      document.documentElement.appendChild(overlay);
      imageToOverlay.set(img, overlay);
      toggledImages.add(img);
      img.setAttribute(TOGGLE_ATTR, "on");
    } else {
      const overlay = imageToOverlay.get(img);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      imageToOverlay.delete(img);
      toggledImages.delete(img);
      img.removeAttribute(TOGGLE_ATTR);
    }
  }

  function positionButton(img) {
    ensureButton();
    if (!hoverButton) return;
    const rect = computeImageContentRect(img);
    hoverButton.style.display = "block";
    hoverButton.style.position = "fixed";
    const offset = 4;
    hoverButton.style.left = `${Math.round(rect.left + rect.width - hoverButton.offsetWidth - offset)}px`;
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
    // Reposition overlays for all toggled images
    for (const img of Array.from(toggledImages)) {
      if (!document.contains(img)) {
        const overlay = imageToOverlay.get(img);
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        imageToOverlay.delete(img);
        toggledImages.delete(img);
        continue;
      }
      const overlay = imageToOverlay.get(img);
      if (!overlay) continue;
      const rect = computeImageContentRect(img);
      overlay.style.left = `${Math.round(rect.left)}px`;
      overlay.style.top = `${Math.round(rect.top)}px`;
      overlay.style.width = `${Math.max(1, Math.round(rect.width))}px`;
      overlay.style.height = `${Math.max(1, Math.round(rect.height))}px`;
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

