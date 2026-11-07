# UNC Wheel Utility presentation

The wheel UI uses the site's Inter / Barlow Condensed typography, UNC navy panels, red primary actions, consistent borders/radii, visible focus states, and mobile touch targets. The additive wheel-app/unc-theme.css loads after the existing base/theme bridge styles. Existing classic/dark/vintage tokens are respected; direct wheel entry reads the same existing theme preference using theme-init.js. Optional White Elephant holiday decoration stays an explicit user setting.

The wheel.js runtime bundle, draw algorithms, player/team colors, presets, captain/fantasy draft rules, drag/drop, undo/reset, saved-event payloads, storage keys, and publication/auth endpoints are unchanged. Presentation files only, plus versioned parent iframe/app references. Aggregate BYOT and FUNC retain their existing embedded app behavior and source.

Verify Cup Night draw/undo in an isolated preview, both position presets, Captain Draft, Fantasy Value Draft, Competitions and Live Drawings. Check desktop/mobile overflow and classic/dark/vintage contrast. Do not overwrite the canonical GitHub wheel runtime with an unrelated local src/App.tsx checkout. The local workshop files in UncWheelUnited are not the source for this update.
