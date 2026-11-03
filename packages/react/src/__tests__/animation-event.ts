/**
 * jsdom has no AnimationEvent, and React picks the vendor-prefixed
 * `webkitAnimationEnd` when the unprefixed one is missing — so a test's
 * `fireEvent.animationEnd` would reach nothing. Declared before react-dom
 * loads (setup.ts imports this first), React listens to `animationend`.
 */
if (!("AnimationEvent" in globalThis)) {
  Object.defineProperty(globalThis, "AnimationEvent", { value: class AnimationEvent extends Event {}, writable: true });
}
