export default function(
  lastKnownScrollY = 0,
  currentScrollY = 0,
  disable?: boolean,
  pinStart?: number,
  downTolerance?: number,
  upTolerance?: number,
  state?: string,
  height?: number,
) {
  const scrollDirection = currentScrollY >= lastKnownScrollY ? 'down' : 'up';
  const distanceScrolled = Math.abs(currentScrollY - lastKnownScrollY);

  // We're disabled
  if (disable) {
    return {
      action: 'none',
      scrollDirection,
      distanceScrolled,
    };
    // We're at the top and not fixed yet.
  } else if (currentScrollY <= parseInt(pinStart.toString()) && state !== 'unfixed') {
    return {
      action: 'unfix',
      scrollDirection,
      distanceScrolled,
    };
    // We're unfixed and headed down. Carry on.
  } else if (
    currentScrollY <= parseInt(height) &&
    scrollDirection === 'down' &&
    state === 'unfixed'
  ) {
    return {
      action: 'none',
      scrollDirection,
      distanceScrolled,
    };
    // We're past the header and scrolling down.
    // We transition to "unpinned" if necessary.
  } else if (
    scrollDirection === 'down' &&
    ['pinned', 'unfixed'].indexOf(state) >= 0 &&
    currentScrollY > parseInt(height.toString()) + parseInt(pinStart.toString()) &&
    distanceScrolled > downTolerance
  ) {
    return {
      action: 'unpin',
      scrollDirection,
      distanceScrolled,
    };
    // We're scrolling up, we transition to "pinned"
  } else if (
    scrollDirection === 'up' &&
    distanceScrolled > upTolerance &&
    ['pinned', 'unfixed'].indexOf(state) < 0
  ) {
    return {
      action: 'pin',
      scrollDirection,
      distanceScrolled,
    };
    // We're scrolling up, and inside the header.
    // We transition to pin regardless of upTolerance
  } else if (
    scrollDirection === 'up' &&
    currentScrollY <= parseInt(height.toString()) &&
    ['pinned', 'unfixed'].indexOf(state) < 0
  ) {
    return {
      action: 'pin',
      scrollDirection,
      distanceScrolled,
    };
  } else {
    return {
      action: 'none',
      scrollDirection,
      distanceScrolled,
    };
  }
}
