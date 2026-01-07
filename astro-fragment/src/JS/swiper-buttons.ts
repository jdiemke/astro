// Small, dependency-free “swiper” (horizontal scrolling via translateX)
//
// Expected markup (see Slider.astro):
// - container element for the cards with overflow hidden on the wrapper
// - Buttons with IDs: siwpe-left / siwpe-right
//
// Notes:
// - Step size: width of the first card + gap (fallback: 80% of the viewport width)

export type SwipeDirection = 'left' | 'right';

export interface SwipeControllerOptions {

  /** Optional: explicit step size in px (if provided, overrides auto-detection) */
  stepPx?: number;

  /** Optional: initial index */
  startIndex?: number;

  /** If true, wraps from end back to start (and vice versa) */
  loop?: boolean;
}

export class Slider extends HTMLElement {
  /** Creates the slider instance (custom element). */
  constructor() {
      super();
    }

  /** Lifecycle hook: initializes the button/swipe logic once the element is connected to the DOM. */
  connectedCallback() {
      this.initSwipeButtons();
    }

  /** Clamps a number to the range [min, max]. */
  clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  /** Reads the CSS gap (flex/grid) in pixels (fallback: 0). */
  getGapPx(container: Element): number {
    const style = window.getComputedStyle(container);
    // flex-gap can be 'normal'; parseFloat('normal') => NaN
    const gap = parseFloat(style.columnGap || style.gap || '0');
    return Number.isFinite(gap) ? gap : 0;
  }

  /** Detects the step size in px using the first slide width + gap (fallback: 80% of viewport width). */
  detectStepPx(container: HTMLElement, slideSelector: string): number {
    const first = container.querySelector<HTMLElement>(slideSelector);
    const gap = this.getGapPx(container);
    if (first) {
      const cardWidth = first.getBoundingClientRect().width;
      if (cardWidth > 0) return Math.round(cardWidth + gap);
    }

    // Fallback: approximate “viewport” width in a responsive way
    // Prefer the parent (container viewport), then the browser viewport.
    const parentWidth = container.parentElement?.getBoundingClientRect().width;
    const vw = (parentWidth && parentWidth > 0) ? parentWidth : window.innerWidth;
    return Math.round(vw * 0.8);
  }

   /** Calculates the maximum possible translateX distance (content width minus viewport width). */
   maxTranslateX(container: HTMLElement): number {
    const parent = container.parentElement;
    if (!parent) return 0;
    const viewport = parent.getBoundingClientRect().width;
    const total = container.scrollWidth;
    return Math.max(0, total - viewport);
  }

   /** Applies the CSS transform on the container (positive x moves content to the left). */
   applyTranslate(container: HTMLElement, x: number) {
    container.style.transform = `translateX(${-x}px)`;
  }

   /**
    * Wires up buttons/listeners and keeps the translateX position in sync.
    * @param options Control parameters (step size, start index, loop)
    */
   initSwipeButtons(options: SwipeControllerOptions = {}) {
    const {
      stepPx,
      startIndex = 0,
      loop = false,
    } = options;
    const leftButtonId = '.swipe-left' as const
    const rightButtonId = '.swipe-right' as const
    const containerSelector = '.flex' as const
    const slideSelector = '.inline-card' as const

    const leftBtn = this.querySelector(leftButtonId) as HTMLButtonElement | null;
    const rightBtn = this.querySelector(rightButtonId) as HTMLButtonElement | null;
    const container = this.querySelector<HTMLElement>(containerSelector);

    if (!container) return;

    let currentIndex = Math.max(0, startIndex);
    let currentX = 0;

    /** Returns a fresh list of all slides (cards) in the container. */
    const slides = () => Array.from(container.querySelectorAll<HTMLElement>(slideSelector));

    /** Recomputes maxX/step, clamps index/x, and updates transform + disabled states. */
    const computeAndSync = () => {
      const s = slides();
      const maxX = this.maxTranslateX(container);
      const step = stepPx ?? this.detectStepPx(container, slideSelector);

      const maxIndex = Math.max(0, s.length - 1);
      currentIndex = this.clamp(currentIndex, 0, maxIndex);

      currentX = this.clamp(currentIndex * step, 0, maxX);
      this.applyTranslate(container, currentX);

      // Button states (optional, only if buttons exist)
      if (leftBtn) leftBtn.disabled = !loop && currentX <= 0;
      if (rightBtn) rightBtn.disabled = !loop && currentX >= maxX;
    };

    /** Jumps to a specific slide index (with wrap-around if loop=true). */
    const goTo = (index: number) => {
      const s = slides();
      if (s.length === 0) return;

      if (loop) {
        const len = s.length;
        currentIndex = ((index % len) + len) % len;
      } else {
        currentIndex = this.clamp(index, 0, s.length - 1);
      }
      computeAndSync();
    };

    /** Moves exactly one slide to the left or right. */
    const move = (dir: SwipeDirection) => {
      const delta = dir === 'left' ? -1 : 1;
      goTo(currentIndex + delta);
    };

    /** Click handler for “previous” (prevents default and moves left). */
    const onPrev = (e: Event) => {
      e.preventDefault();
      move('left');
    };

    /** Click handler for “next” (prevents default and moves right). */
    const onNext = (e: Event) => {
      e.preventDefault();
      move('right');
    };

    leftBtn?.addEventListener('click', onPrev);
    rightBtn?.addEventListener('click', onNext);

    // Initial: prepare CSS
    container.style.willChange = 'transform';
    container.style.transition = container.style.transition || 'transform 250ms ease';

    /** Resize handler: re-syncs step/maxX and position after layout changes. */
    const onResize = () => computeAndSync();
    window.addEventListener('resize', onResize, { passive: true });

    /** Load handler (once): re-syncs after the page fully loads (e.g., images affect widths). */
    const onLoad = () => computeAndSync();
    window.addEventListener('load', onLoad, { once: true });

    // Initial position
    computeAndSync();
  }
}
