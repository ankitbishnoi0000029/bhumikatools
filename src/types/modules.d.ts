declare module "heic2any" {
  type HeicToAnyOptions = {
    blob: Blob;
    toType: string;
    quality?: number;
  };

  const heic2any: (options: HeicToAnyOptions) => Promise<Blob | Blob[]>;
  export default heic2any;
}

declare module "html-to-image" {
  export function toPng(node: HTMLElement, options?: Record<string, unknown>): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Record<string, unknown>): Promise<string>;
}

declare module "gifenc" {
  export function GIFEncoder(): {
    writeFrame(data: Uint8ClampedArray | Uint8Array, width: number, height: number, options?: Record<string, unknown>): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  export function quantize(data: Uint8ClampedArray | Uint8Array, colors: number, options?: { format?: string }): number[];
  export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: number[], format?: string): Uint8ClampedArray;
}

declare module "imagetracerjs" {
  const ImageTracer: {
    imagedataToSVG(imageData: ImageData, options?: Record<string, unknown>): string;
    svgToImageData?(svg: string): ImageData;
  };
  export default ImageTracer;
}
