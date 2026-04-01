export enum VideoGenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  POLLING = 'POLLING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface VideoGenerationResult {
  videoUrl: string;
  prompt: string;
}
