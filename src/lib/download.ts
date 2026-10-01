export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isMediaFile(file: File): boolean {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif|mp4|webm|mov|m4v)$/i.test(file.name);
}
