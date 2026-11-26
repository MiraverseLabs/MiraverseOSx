// Root runner shim: lets `node --test tests/design-assets.test.mjs` work from
// the repository root as well as from frontend/. The real assertions live in
// frontend/tests/design-assets.test.mjs and resolve paths relative to itself.
import '../frontend/tests/design-assets.test.mjs';