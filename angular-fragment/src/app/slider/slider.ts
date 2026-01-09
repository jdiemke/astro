import {afterEveryRender, Component, ElementRef, input, viewChild} from '@angular/core';
import {EventImage} from '../event-image/event-image';
import {SliderEvent} from '../interfaces/slider-event';

type SwipeDirection = 'left' | 'right';

interface SwipeControllerOptions {

  /** Optional: explicit step size in px (if provided, overrides auto-detection) */
  stepPx?: number;

  /** Optional: initial index */
  startIndex?: number;

  /** If true, wraps from end back to start (and vice versa) */
  loop?: boolean;
}

@Component({
  selector: 'app-slider',
  imports: [
    EventImage
  ],
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
})
export class Slider {
  slideLeftButton = viewChild<ElementRef<HTMLButtonElement>>('swipeLeft');
  slideRightButton = viewChild<ElementRef<HTMLButtonElement>>('swipeRight');
  swiperContainer = viewChild<ElementRef<HTMLDivElement>>('swiperContainer');
  events = input.required<SliderEvent[]>();

  constructor() {
    /** inits slider on client side lifecycle hook */
    afterEveryRender({
      read: () => this.initSwipeButtons()
    })
  }

  hasImageUrl(event: { imageUrl?: string | undefined }): event is { imageUrl: string } {
    return typeof event.imageUrl === `string` && event.imageUrl.length > 0;
  }

  // Small, dependency-free “swiper” (horizontal scrolling via translateX)
  //
  // Expected markup (see Slider.astro):
  // - container element for the cards with overflow hidden on the wrapper
  // - Buttons with viewchild: swipeLeft / swipeRight
  //
  // Notes:
  // - Step size: width of the first card + gap (fallback: 80% of the viewport width)

  /** Clamps a number to the range [min, max]. */
  clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  /** Reads the CSS gap (flex/grid) in pixels (fallback: 0). */
  getGapPx(container: Element): number {
    const style = window.getComputedStyle(container);
    // flex-gap kann als 'normal' kommen; parseFloat('normal') => NaN
    const gap = parseFloat(style.columnGap || style.gap || '0');
    return Number.isFinite(gap) ? gap : 0;
  }

  /** Detects the step size in px using the first slide width + gap (fallback: 80% of viewport width). */
  detectStepPx(container: HTMLElement, slideSelector: string): number {
    const first = container.querySelector<HTMLElement>(slideSelector);
    const gap = this.getGapPx(container);
    if (first) {
      const w = first.getBoundingClientRect().width;
      if (w > 0) return Math.round(w + gap);
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
    const leftRef = this.slideLeftButton();
    const rightRef = this.slideRightButton();
    const containerRef = this.swiperContainer();

    if (!leftRef || !rightRef || !containerRef) return;

    const slideLeft = leftRef.nativeElement
    const slideRight = rightRef.nativeElement
    const container = containerRef.nativeElement
    const slideSelector = '.inline-card' as const


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

      // Button-States
      slideLeft.disabled = !loop && currentX <= 0;
      slideRight.disabled = !loop && currentX >= maxX;
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

    slideLeft.addEventListener('click', onPrev);
    slideRight.addEventListener('click', onNext);

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

