function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

export function createStudioStill(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 900;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not draw the studio still.");

  context.fillStyle = "#070707";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const wash = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  wash.addColorStop(0, "#242424");
  wash.addColorStop(0.45, "#090909");
  wash.addColorStop(1, "#303030");
  context.fillStyle = wash;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const light = context.createRadialGradient(1040, 240, 20, 1040, 300, 680);
  light.addColorStop(0, "#ffffff");
  light.addColorStop(0.22, "#d0d0d0");
  light.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = light;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#050505";
  context.beginPath();
  context.moveTo(0, 690);
  context.lineTo(1440, 540);
  context.lineTo(1440, 900);
  context.lineTo(0, 900);
  context.closePath();
  context.fill();

  context.fillStyle = "#101010";
  context.beginPath();
  context.ellipse(520, 430, 96, 118, 0, 0, Math.PI * 2);
  context.fill();
  context.fillRect(458, 510, 140, 300);

  const sphere = context.createRadialGradient(1188, 640, 8, 1188, 650, 160);
  sphere.addColorStop(0, "#ffffff");
  sphere.addColorStop(0.45, "#b5b5b5");
  sphere.addColorStop(1, "#141414");
  context.fillStyle = sphere;
  context.beginPath();
  context.arc(1188, 650, 150, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < 9; index += 1) {
    context.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.55)";
    context.fillRect(900 + index * 26, 70, 12, 340);
  }

  context.fillStyle = "#e8e8e8";
  context.fillRect(150, 160, 180, 12);
  context.fillStyle = "#3a3a3a";
  context.fillRect(150, 190, 260, 8);
  context.fillRect(150, 214, 120, 8);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let index = 0; index < data.length; index += 4) {
    const grain = (Math.random() - 0.5) * 22;
    data[index] = clampChannel((data[index] ?? 0) + grain);
    data[index + 1] = clampChannel((data[index + 1] ?? 0) + grain);
    data[index + 2] = clampChannel((data[index + 2] ?? 0) + grain);
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
