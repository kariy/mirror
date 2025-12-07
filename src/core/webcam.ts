export interface WebcamConfig {
  width: number;
  height: number;
}

export class WebcamCapture {
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
  }

  async start(config: WebcamConfig = { width: 640, height: 480 }): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: config.width },
          height: { ideal: config.height },
          facingMode: "user",
        },
        audio: false,
      });

      this.video.srcObject = this.stream;
      await this.video.play();
    } catch (error) {
      throw new Error(`Failed to access webcam: ${error}`);
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
  }

  getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  isActive(): boolean {
    return this.stream !== null && this.video.readyState >= 2;
  }

  getWidth(): number {
    return this.video.videoWidth || 640;
  }

  getHeight(): number {
    return this.video.videoHeight || 480;
  }
}
