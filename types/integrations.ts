// ─── Integration Configuration Types ─────────────────────────────────────────────────────────

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface MetaConfig {
  accountId: string;
  accessToken: string;
  igUserId: string;
}

export interface FanvueConfig {
  accessToken: string;
  userHandle?: string;
}
