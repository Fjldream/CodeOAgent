// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';

export function useAssistantWindow(props, owner, emit) {
  const surface = ref(null);
  const handle = ref(null);
  const dock = ref(null);
  const frame = props.embedded ? window.frameElement : null;
  const host = frame ? window.parent : window;
  const opener = document.activeElement;
  const viewport = ref({ width: host.innerWidth, height: host.innerHeight });
  // modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
  const placement = ref(null);
  const maximized = ref(false);
  let gesture = null;
  let animation = null;
  const storageKey = () => 'kf.assistant.position.' + (frame ? 'editor.' : 'center.') + owner.value;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const bounds = computed(() => {
    const { width, height } = viewport.value;
    const margin = width < 560 || height < 450 ? 6 : 20;
    const maxW = Math.max(1, width - 2 * margin);
    const maxH = Math.max(1, height - 2 * margin);
    return { margin, maxW, maxH, minW: Math.min(360, maxW), minH: Math.min(340, maxH) };
  });
  const windowRect = computed(() => {
    const { width, height } = viewport.value;
    const { margin, minW, maxW, minH, maxH } = bounds.value;
    if (maximized.value) return { x: margin, y: margin, w: maxW, h: maxH };
    const saved = placement.value;
    const w = clamp(saved?.w ?? clamp(Math.round(width * 0.66), 760, 1280), minW, maxW);
    const h = clamp(saved?.h ?? clamp(Math.round(height * 0.66), 500, 760), minH, maxH);
    const right = width - margin - w;
    const bottom = height - margin - h;
    return { x: clamp(saved?.x ?? right, margin, right), y: clamp(saved?.y ?? bottom, margin, bottom), w, h };
  });
  const dockRect = computed(() => {
    const { width, height } = viewport.value;
    const gap = bounds.value.margin;
    return { x: width - 134 - gap, y: height - 42 - gap, w: 134, h: 42 };
  });
  const geometry = computed(() => {
    const { x, y, w, h } = props.minimized ? dockRect.value : windowRect.value;
    return { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' };
  });
  watchEffect(() => {
    if (frame)
      Object.assign(frame.style, geometry.value, { borderRadius: props.minimized ? '24px' : '12px' });
  });
  watch(owner, (account) => {
    placement.value = null;
    maximized.value = false;
    if (!account) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey()));
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
        const restored = { x: saved.x, y: saved.y };
        if (Number.isFinite(saved.w) && Number.isFinite(saved.h))
          Object.assign(restored, { w: saved.w, h: saved.h });
        placement.value = restored;
        maximized.value = saved.maximized === true;
      }
    } catch {
      /* Ignore invalid or unavailable preferences. */
    }
  });
  function remember() {
    if (!owner.value) return;
    try {
      sessionStorage.setItem(
        storageKey(),
        JSON.stringify({ ...placement.value, maximized: maximized.value }),
      );
    } catch {
      /* Storage may be unavailable. */
    }
  }
  function toggleMaximized() {
    if (!maximized.value) placement.value = { ...windowRect.value };
    maximized.value = !maximized.value;
    remember();
  }
  function pointerPosition(event) {
    const box = frame?.getBoundingClientRect();
    return { x: event.clientX + (box?.left || 0), y: event.clientY + (box?.top || 0) };
  }
  function startDrag(event, edge = '') {
    if (event.button !== 0 || !event.isPrimary || props.minimized || maximized.value) return;
    animation?.cancel();
    gesture = { id: event.pointerId, edge, start: pointerPosition(event), rect: windowRect.value };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    if (gesture?.id !== event.pointerId) return;
    const { start, rect, edge } = gesture;
    const { margin, maxW, maxH, minW, minH } = bounds.value;
    const point = pointerPosition(event);
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    if (!edge) {
      placement.value = {
        ...rect,
        x: clamp(rect.x + dx, margin, margin + maxW - rect.w),
        y: clamp(rect.y + dy, margin, margin + maxH - rect.h),
      };
      return;
    }
    let { x, y, w, h } = rect;
    const right = x + w;
    const bottom = y + h;
    if (edge.includes('w')) {
      x = clamp(x + dx, margin, right - minW);
      w = right - x;
    }
    if (edge.includes('e')) w = clamp(w + dx, minW, margin + maxW - x);
    if (edge.includes('n')) {
      y = clamp(y + dy, margin, bottom - minH);
      h = bottom - y;
    }
    if (edge.includes('s')) h = clamp(h + dy, minH, margin + maxH - y);
    placement.value = { x, y, w, h };
  }
  function endDrag(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    remember();
  }
  function moveByKey(event) {
    if (maximized.value) return;
    const offset = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!offset) return;
    event.preventDefault();
    event.stopPropagation();
    const { margin, maxW, maxH, minW, minH } = bounds.value;
    let { x, y, w, h } = windowRect.value;
    if (event.shiftKey) {
      w = clamp(w + offset[0] * 24, minW, maxW);
      h = clamp(h + offset[1] * 24, minH, maxH);
    } else {
      x += offset[0] * 24;
      y += offset[1] * 24;
    }
    placement.value = {
      x: clamp(x, margin, margin + maxW - w),
      y: clamp(y, margin, margin + maxH - h),
      w,
      h,
    };
    remember();
  }
  // end
  function animateWindow(minimizing) {
    const element = frame || surface.value;
    if (!element?.animate || host.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = windowRect.value,
      to = dockRect.value;
    const transform =
      'translate(' +
      (to.x - from.x) +
      'px,' +
      (to.y - from.y) +
      'px) scale(' +
      to.w / from.w +
      ',' +
      to.h / from.h +
      ')';
    const open = { transform: 'none', opacity: 1 },
      closed = { transform, opacity: 0.14 };
    animation?.cancel();
    animation = element.animate(minimizing ? [open, closed] : [closed, open], {
      duration: minimizing ? 145 : 175,
      easing: 'cubic-bezier(.22,.72,.2,1)',
    });
    return animation;
  }
  function minimize() {
    if (props.minimized) return;
    const motion = animateWindow(true);
    if (motion) motion.onfinish = () => emit('minimize');
    else emit('minimize');
  }
  watch(
    () => props.minimized,
    async (minimized) => {
      animation?.cancel();
      await nextTick();
      if (minimized) dock.value?.focus({ preventScroll: true });
      else {
        animateWindow(false);
        handle.value?.focus({ preventScroll: true });
      }
    },
  );
  function updateViewport() {
    viewport.value = { width: host.innerWidth, height: host.innerHeight };
  }
  onMounted(() => {
    host.addEventListener('resize', updateViewport);
    handle.value?.focus({ preventScroll: true });
  });
  onBeforeUnmount(() => {
    animation?.cancel();
    host.removeEventListener('resize', updateViewport);
    if (!frame && opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
  });
  // modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
  return {
    surface,
    handle,
    dock,
    geometry,
    windowRect,
    maximized,
    toggleMaximized,
    startDrag,
    moveDrag,
    endDrag,
    moveByKey,
    minimize,
  };
  // end
}
// end
