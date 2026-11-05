import { useState } from 'react';

/**
 * A number that goes up every time `visible` turns true. Use it as the `key` of the form inside a modal:
 * the form then remounts with fresh state on each open (initial values come from `useState` initialisers),
 * so no effect has to call setState to "reset" it. The form stays mounted while the sheet slides away.
 */
export function useOpenEpoch(visible: boolean) {
  const [epoch, setEpoch] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) setEpoch((e) => e + 1);
  }
  return epoch;
}
