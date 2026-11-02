export async function compressImageFile(
  file: File,
  maxDimension = 900,
  quality = 0.82
): Promise<{ dataUrl: string; contentType: string }> {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error("Only JPEG, PNG, or WebP images are supported.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Please select an image smaller than 8MB.");
  }

  // Read original data URL first as fallback for ultra-small images
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

  if (file.size <= 150 * 1024 && /^data:image\/(jpeg|png|webp);base64,/.test(rawDataUrl)) {
    return { dataUrl: rawDataUrl, contentType: file.type };
  }

  try {
    const compressed = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = rawDataUrl;
    });

    return { dataUrl: compressed, contentType: "image/jpeg" };
  } catch {
    return { dataUrl: rawDataUrl, contentType: file.type };
  }
}
