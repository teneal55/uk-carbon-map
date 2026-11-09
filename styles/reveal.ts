/**
 * Classes for parts of the page hidden while the map loads, then faded in with
 * it. `invisible` also keeps them out of reach of the keyboard and mouse.
 */
export function reveal(ready: boolean) {
  return ready ? 'transition-opacity duration-500' : 'invisible opacity-0';
}
