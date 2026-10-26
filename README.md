# Web Runtime Lab

A neutral GitHub Pages playground for testing a compatible, threaded Godot 3 WebAssembly export.

**Repository contents:** HTML loader, a service worker for cross-origin isolation, and deployment instructions. No game packs, WASM game binaries, engine exports, artwork, titles or game-specific URLs are committed.

## Deploy with Termux

Unzip this package and run `bash deploy-termux.sh` in its directory after logging in with `gh auth login`.

The script creates a **public** repository named `runtime-html-lab` without any game-specific repository title or description. It attempts to enable Pages from `main` at the root. If Pages setup fails, open repository Settings > Pages > Build and deployment > Deploy from a branch, then select `main` and `/ (root)`.

## Configure an export

Open the published page directly in Chrome. Fill in three **HTTPS URLs**, sizes in bytes, and optionally a display title. The browser places these values in the URL query when you submit the form. Sharing that configured link will automatically start the export on future visits.

The loader downloads the configured JavaScript glue, WASM and PCK **at runtime**. It never uploads the game files into your repository. External servers must permit CORS; the browser needs enough memory to run the export. Threaded WebAssembly requires cross-origin isolation, which this page enables using its same-origin service worker on GitHub Pages. Embedded usage is subject to the *parent page's* cross-origin isolation policy.

Only use assets you are authorized to host, fetch, and publicly display. Naming a repository neutrally does not change the copyright status of files loaded into a browser. The loader has **not** been validated with any complete commercial game.

## Licenses

The embedded Emscripten worker helper includes its upstream MIT attribution. This general-purpose test harness provides no third-party games.
