/**
 * Область обрезки в пикселях (левый верхний угол + размер).
 * Совместимо с Area из react-easy-crop.
 */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Загружает изображение по URL и возвращает Promise с HTMLImageElement.
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    if (url.startsWith("http")) {
      image.crossOrigin = "anonymous";
    }
    image.src = url;
  });
}

/**
 * Возвращает обрезанное изображение как Blob (JPEG).
 * @param imageSrc — URL изображения (например, object URL от выбранного файла)
 * @param pixelCrop — область обрезки в пикселях исходного изображения
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const x = Math.round(pixelCrop.x);
  const y = Math.round(pixelCrop.y);
  const w = Math.round(pixelCrop.width);
  const h = Math.round(pixelCrop.height);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2d context not available");
  }
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9
    );
  });
}
