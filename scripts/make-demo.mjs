import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const width = 854;
const height = 480;
const fps = 30;
const frames = fps * 8;

await mkdir(new URL("../public/", import.meta.url), { recursive: true });

const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-s",
    `${width}x${height}`,
    "-r",
    String(fps),
    "-i",
    "-",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=196:sample_rate=44100:duration=8",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-shortest",
    "-movflags",
    "+faststart",
    "public/demo.mp4",
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const frame = Buffer.alloc(width * height * 3);

function writeFrame(time) {
  const orbX = width * (0.18 + 0.64 * (0.5 + 0.5 * Math.sin(time * 0.9)));
  const orbY = height * (0.42 + 0.08 * Math.sin(time * 1.7));
  const sweep = ((time * 0.35) % 1) * width;

  for (let y = 0; y < height; y += 1) {
    const ny = y / height;
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      let shade = 18 + ny * 28;

      const windowGlow = Math.exp(-((nx - 0.74) ** 2) / 0.03 - ((ny - 0.28) ** 2) / 0.05);
      shade += windowGlow * 210;

      const dx = x - orbX;
      const dy = y - orbY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 78) {
        shade = Math.max(shade, 250 - dist * 2.1);
      }

      const band = Math.abs(((x - sweep + width) % width) - 40);
      if (band < 36) shade += (1 - band / 36) * 70;

      if (nx > 0.62 && nx < 0.9 && ny > 0.08 && ny < 0.52) {
        const blind = Math.floor((x - width * 0.62) / 16);
        shade *= blind % 2 === 0 ? 1 : 0.55;
      }

      if (ny > 0.72) {
        shade *= 0.35 + (1 - ny) * 0.4;
      }

      const figure = (nx - 0.34) ** 2 / 0.012 + (ny - 0.58) ** 2 / 0.09;
      if (figure < 1) shade *= 0.12;

      const value = Math.max(0, Math.min(255, shade));
      const index = (y * width + x) * 3;
      frame[index] = value;
      frame[index + 1] = value;
      frame[index + 2] = value;
    }
  }
}

for (let index = 0; index < frames; index += 1) {
  writeFrame(index / fps);
  if (!ffmpeg.stdin.write(frame)) {
    await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
  }
}

ffmpeg.stdin.end();

await new Promise((resolve, reject) => {
  ffmpeg.on("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`ffmpeg exited with ${code}`));
  });
});
