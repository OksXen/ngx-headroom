import { DOCUMENT } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import shouldUpdate from './shouldUpdate';

@Component({
  selector: 'ngx-headroom',
  template: `
  <div [ngStyle]="wrapperStyle" class="headroom-wrapper {{ wrapperClassName }}"
    [style.height.px]="wrapperHeight">
    <div #ref
      [ngStyle]="innerStyle"
      [class]="innerClassName"
      [class.headroom]="true"
      [class.headroom--unfixed]="state === 'unfixed'"
      [class.headroom--unpinned]="state === 'unpinned'"
      [class.headroom--pinned]="state === 'pinned'"
      [class.headroom--unfixed]="state === 'unfixed'">
      <ng-content></ng-content>
    </div>
  </div>
  `,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadroomComponent implements OnInit, AfterContentInit {
  @Input() wrapperClassName = '';
  @Input() innerClassName = '';
  @Input() innerStyle: any = {
    top: '0',
    left: '0',
    right: '0',
    zIndex: '1',
    position: 'relative',
  };
  /**
   * pass styles for the wrapper div
   * (this maintains the components vertical space at the top of the page)
   */
  @Input() wrapperStyle: any = {};
  /** disable pinning and unpinning */
  @Input() disable = false;
  /** scroll tolerance in px when scrolling up before component is pinned */
  @Input() upTolerance = 5;
  /** scroll tolerance in px when scrolling down before component is pinned */
  @Input() downTolerance = 0;
  /**
   * height in px where the header should start and stop pinning.
   * Useful when you have another element above Headroom
   */
  @Input() pinStart = 0;
  @Input() calcHeightOnResize = true;
  /** Duration of animation in ms */
  @Input() duration = 200;
  /** Easing of animation */
  @Input() easing = 'ease-in-out';
  @Output() pin = new EventEmitter();
  @Output() unpin = new EventEmitter();
  @Output() unfix = new EventEmitter();
  @ViewChild('ref') inner: ElementRef;
  wrapperHeight = 0;
  currentScrollY = 0;
  lastKnownScrollY = 0;
  scrolled = false;
  resizeTicking = false;
  state = 'unfixed';
  translateY: number | string = 0;
  height: number;
  scrollTicking = false;
  animation = false;
  firstTick = true;
  /**
   * provide a custom 'parent' element for scroll events.
   * `parent` should be a function which resolves to the desired element.
   */
  @Input() parent: () => any;
  @Input() @HostListener('window:scroll')
  scroll() {
    this.handleScroll();
  }
  @Input()
  @HostListener('window:resize')
  resize() {
    this.handleResize();
  }

  constructor(@Inject(DOCUMENT) private document: any) {}

  ngOnInit() {
    // this.innerStyle.transform = `translate3D(0, ${this.translateY}, 0)`;

    if (this.disable === true) {
      this.handleUnfix();
    }
  }
  getParent() {
    if (this.parent) {
      return this.parent();
    }
    if (this.document.documentElement && this.document.documentElement.scrollTop) {
      return this.document.documentElement;
    }
    if (this.document.body && this.document.body.scrollTop) {
      return this.document.body;
    }
    if (this.document.body && this.document.body.parentNode.scrollTop) {
      return this.document.body.parentNode;
    }
    return this.document;
  }
  ngAfterContentInit() {
    this.setHeightOffset();
    this.wrapperHeight = this.height ? this.height : null;
  }
  setHeightOffset() {
    this.height = null;
    setTimeout(() => {
      this.height = this.inner.nativeElement.offsetHeight;
      this.resizeTicking = false;
    }, 0);
  }
  getScrollY() {
    if (this.getParent().pageYOffset !== undefined) {
      return this.getParent().pageYOffset;
    }
    return this.getParent().scrollTop || 0;
  }
  getViewportHeight() {
    return (
      this.getParent().innerHeight ||
      this.document.documentElement.clientHeight ||
      this.document.body.clientHeight
    );
  }
  getDocumentHeight() {
    const body = this.document.body;
    const documentElement = this.document.documentElement;

    return Math.max(
      body.scrollHeight,
      documentElement.scrollHeight,
      body.offsetHeight,
      documentElement.offsetHeight,
      body.clientHeight,
      documentElement.clientHeight,
    );
  }
  getElementPhysicalHeight(elm: any) {
    return Math.max(elm.offsetHeight, elm.clientHeight);
  }
  getElementHeight(elm: any) {
    return Math.max(elm.scrollHeight, elm.offsetHeight, elm.clientHeight);
  }
  getScrollerPhysicalHeight() {
    const parent = this.getParent();

    return parent === this.getParent() || parent === this.document.body
      ? this.getViewportHeight()
      : this.getElementPhysicalHeight(parent);
  }
  getScrollerHeight() {
    const parent = this.getParent();

    return parent === this.getParent() || parent === this.document.body
      ? this.getDocumentHeight()
      : this.getElementHeight(parent);
  }
  isOutOfBound(currentScrollY) {
    const pastTop = currentScrollY < 0;

    const scrollerPhysicalHeight = this.getScrollerPhysicalHeight();
    const scrollerHeight = this.getScrollerHeight();

    const pastBottom = currentScrollY + scrollerPhysicalHeight > scrollerHeight;

    return pastTop || pastBottom;
  }
  handleScroll() {
    if (this.disable) {
      return;
    }
    if (!this.scrollTicking) {
      this.scrollTicking = true;
      this.update();
    }
  }
  handleResize() {
    if (this.disable || !this.calcHeightOnResize) {
      return;
    }
    if (!this.resizeTicking) {
      this.resizeTicking = true;
      this.setHeightOffset();
    }
  }
  handleUnpin() {
    this.unpin.emit();
    this.state = 'unpinned';
    this.animation = true;
    this.translateY = '-100%';
  }
  handlePin() {
    this.pin.emit();
    this.state = 'pinned';
    this.animation = true;
    this.translateY = 0;
  }
  handleUnfix() {
    this.unfix.emit();
    this.state = 'unfixed';
    this.animation = false;
    this.translateY = 0;
  }
  handleUnpinSnap() {
    this.unpin.emit();

    // this.className = 'headroom headroom--unpinned headroom-disable-animation';
    this.animation = false;
    this.state = 'unpinned';
    this.translateY = '-100%';
    console.log('snap')
  }
  update() {
    this.currentScrollY = this.getScrollY();

    if (!this.isOutOfBound(this.currentScrollY)) {
      const { action } = shouldUpdate(
        this.lastKnownScrollY,
        this.currentScrollY,
        this.disable,
        this.pinStart,
        this.downTolerance,
        this.upTolerance,
        this.state,
        this.height,
      );

      if (action === 'pin') {
        this.handlePin();
      } else if (action === 'unpin') {
        this.handleUnpin();
      } else if (action === 'unpin-snap') {
        this.handleUnpinSnap();
      } else if (action === 'unfix') {
        this.handleUnfix();
      }
      this.innerStyle = {
        ...this.innerStyle,
        WebkitTransform: `translate3D(0, ${this.translateY}, 0)`,
        MsTransform: `translate3D(0, ${this.translateY}, 0)`,
        transform: `translate3D(0, ${this.translateY}, 0)`,
        position: this.disable || this.state === 'unfixed' ? 'relative' : 'fixed',
      };
    }

    // Don't add css transitions until after we've done the initial
    // negative transform when transitioning from 'unfixed' to 'unpinned'.
    // If we don't do this, the header will flash into view temporarily
    // while it transitions from 0 — -100%.
    if (this.animation && !this.firstTick) {
      this.innerStyle = {
        ...this.innerStyle,
        WebkitTransition: 'all .2s ease-in-out',
        MozTransition: 'all .2s ease-in-out',
        OTransition: 'all .2s ease-in-out',
        transition: 'all .2s ease-in-out',
      };
    } else {
      console.log('NO ANIMATION')
      this.innerStyle = {
        ...this.innerStyle,
        WebkitTransition: 'none',
        MozTransition: 'none',
        OTransition: 'none',
        transition: 'none',
      };
    }

    this.lastKnownScrollY = this.currentScrollY;
    this.scrollTicking = false;
    this.firstTick = false;
  }
}
