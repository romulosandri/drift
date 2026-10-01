# Drift

Drift maps the luminance of an image or video onto a gradient, then moves that grade over time.

Shadows pick up one end of the gradient and highlights pick up the other. You can crossfade from one gradient into another, or travel from the gradient as you set it until shadows and highlights trade places. Shift speed and video playback speed are separate.

## Run locally

```bash
npm install
npm run dev
```

The dev server runs at [http://127.0.0.1:4731](http://127.0.0.1:4731).

```bash
npm run build
npm run preview
```

## Use it

- Drop an image or video onto the stage, or upload one.
- **Studio still** and **Demo reel** load built-in sources so you can try the grade before bringing your own file.
- **Between gradients** eases from the From grade to the To grade and back.
- **Across the gradient** keeps one grade and eases until its ends flip.
- **Shift speed** sets how long one full pass takes.
- **Playback** sets the video’s own speed, from 0.25× to 2×. Pitch can stay put or follow the speed.
- **Save frame** downloads the current graded picture. **Record** captures the moving grade as WebM.

The interface is black and white. Color lives in the grade.

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Motion. The map itself is a WebGL shader so video can play while the colors move.
