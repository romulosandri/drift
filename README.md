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
- **Between gradients** eases from the From grade to the To grade and back.
- **Across the gradient** keeps one grade and eases until its ends flip.
- **Shift speed** sets how long one full pass takes.
- **Playback** sets the video’s own speed, from 1/16× to 2×. Pitch can stay put or follow the speed. Below 1×, the picture eases from one frame in the file into the next. The file still only contains the frames it was shot with, so very slow motion softens the movement instead of inventing sharper in-between pictures.
- The picture sits in a centered frame. The button beside **Export** sets the aspect ratio, and whether the picture fills, stretches, or stays fully visible.
- A still can be given a length in seconds. **Export** writes a silent MP4 at the chosen frame, up to 1920 pixels on the long edge. A still runs for the length you set. A video is decoded from the file itself, so the export is not a recording of the preview, and its length is the clip divided by the playback speed.

The interface is black and white. Color lives in the grade.

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Motion. The map itself is a WebGL shader so video can play while the colors move.
