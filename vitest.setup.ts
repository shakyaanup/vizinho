import "@testing-library/jest-dom/vitest";

// jsdom lacks the Pointer Capture API that Radix uses for swipe gestures.
// Real browsers all implement it; these no-op stand-ins exist only in tests.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
