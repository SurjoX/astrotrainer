const IAU_IMAGE_BASE_PATH = "/iau-constellations/processed";

const imageLoads = new Map<string, Promise<boolean>>();

export function getIauImageUrl(constellationId: string): string {
  return `${IAU_IMAGE_BASE_PATH}/${constellationId}_processed.webp`;
}

export function preloadIauImage(url: string): Promise<boolean> {
  const existingLoad = imageLoads.get(url);
  if (existingLoad) return existingLoad;

  const load = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => {
      imageLoads.delete(url);
      resolve(false);
    };
    image.src = url;
  });

  imageLoads.set(url, load);
  return load;
}
