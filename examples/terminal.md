<!-- CLI examples using the repository logo. Run from the repository root. -->
# Terminal examples

Use Node 20 or later. SVG input also needs `rsvg-convert` from `librsvg2-bin`.
Run these commands from the repository root, with no build step or package install.

```sh
# A blue, spinning solid logo. Stop animations with Ctrl+C.
node src/cli.js docs/logo.svg --effect spin3d --width 60 --color '#0071bc'

# A slower wave across the logo at 30 frames per second.
node src/cli.js docs/logo.svg --effect wave --speed 0.8 --fps 30

# One uncolored, static frame suitable for logs or copying.
NO_COLOR=1 node src/cli.js docs/logo.svg --width 60

# Save a plain-text logo. Redirected output is always static.
node src/cli.js docs/logo.svg --width 60 > logo.txt
```

Animations require an interactive terminal. `NO_COLOR`, `TERM=dumb`, or redirected
output produces a static plain-text frame regardless of the requested effect.

![Static terminal logo](screenshots/terminal.png)
