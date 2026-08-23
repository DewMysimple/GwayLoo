import * as THREE from 'three';

/**
 * The source full-paint scene receives two authored 1920×1080 videos:
 * a pale base and a pigment-rich over layer. WLOP supplies only one image,
 * so this function creates the missing neutral base asset once at load time.
 * It is not part of the interaction shader and never touches the over RGB.
 */
export function createWhiteGrayBaseTexture(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Unable to create the white-gray base texture.');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      data[index] * 0.2126
      + data[index + 1] * 0.7152
      + data[index + 2] * 0.0722;
    const whiteGray = Math.round(218 + luminance * 0.14);
    data[index] = whiteGray;
    data[index + 1] = whiteGray;
    data[index + 2] = whiteGray;
    data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'wlop-nap-white-gray-base';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
