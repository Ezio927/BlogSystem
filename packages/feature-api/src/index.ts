export type FeatureSlot =
  | "aside"
  | "player"
  | "global-effect"
  | "comments"
  | "footer";

export interface ValidationResult {
  ok: boolean;
  messages: string[];
}

export interface UploadedImage {
  id: string;
  url: string;
  width?: number;
  height?: number;
}

export interface ImageStorageProvider {
  readonly id: string;
  upload(file: File): Promise<UploadedImage>;
  remove?(id: string): Promise<void>;
}

export interface CommentProvider {
  readonly id: string;
  readonly slot: "comments";
  validateConfig(config: unknown): ValidationResult;
}

export interface AnalyticsProvider {
  readonly id: string;
  trackPageView(path: string): void | Promise<void>;
}

export interface DeployResult {
  ok: boolean;
  deploymentUrl?: string;
  messages: string[];
}

export interface DeployProvider {
  readonly id: string;
  validate(): Promise<ValidationResult>;
  deploy(): Promise<DeployResult>;
}
