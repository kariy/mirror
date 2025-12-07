import {
  ImageSegmenter,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export class Segmenter {
  private segmenter: ImageSegmenter | null = null;
  private lastMask: Float32Array | null = null;
  private maskWidth = 0;
  private maskHeight = 0;

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this.segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  }

  processFrame(video: HTMLVideoElement, timestamp: number): void {
    if (!this.segmenter) return;

    const result = this.segmenter.segmentForVideo(video, timestamp);

    if (result.confidenceMasks && result.confidenceMasks.length > 0) {
      const mask = result.confidenceMasks[0];
      this.lastMask = mask.getAsFloat32Array();
      this.maskWidth = mask.width;
      this.maskHeight = mask.height;
    }

    result.close();
  }

  getMask(): Float32Array | null {
    return this.lastMask;
  }

  getMaskDimensions(): { width: number; height: number } {
    return { width: this.maskWidth, height: this.maskHeight };
  }

  getMaskValueAt(x: number, y: number): number {
    if (!this.lastMask || this.maskWidth === 0) return 0;

    const px = Math.floor(x * this.maskWidth);
    const py = Math.floor(y * this.maskHeight);
    const idx = py * this.maskWidth + px;

    return this.lastMask[idx] ?? 0;
  }

  destroy(): void {
    this.segmenter?.close();
    this.segmenter = null;
    this.lastMask = null;
  }
}
