import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ─── R2 Client (singleton per process) ───────────────────────────────────────

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }

  _r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _r2Client;
}

export const r2Bucket = () => process.env.R2_BUCKET ?? 'social-scheduler';

// ─── List top-level folders ("model folders") ─────────────────────────────────

export interface R2Folder {
  prefix: string;   // e.g. "apex-media/luna/"
  name: string;     // last path segment, e.g. "luna"
}

export async function listTopLevelFolders(): Promise<R2Folder[]> {
  const client = getR2Client();
  const bucket = r2Bucket();

  const res = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Delimiter: '/',
  }));

  return (res.CommonPrefixes ?? []).map((p) => ({
    prefix: p.Prefix ?? '',
    name: (p.Prefix ?? '').replace(/\/$/, '').split('/').pop() ?? '',
  }));
}

// ─── List objects under a prefix ─────────────────────────────────────────────

export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
}

export async function listObjects(prefix: string, delimiter?: string): Promise<{
  folders: R2Folder[];
  objects: R2Object[];
}> {
  const client = getR2Client();
  const bucket = r2Bucket();

  const folders: R2Folder[] = [];
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      Delimiter: delimiter,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));

    for (const p of res.CommonPrefixes ?? []) {
      folders.push({
        prefix: p.Prefix ?? '',
        name: (p.Prefix ?? '').replace(/\/$/, '').split('/').pop() ?? '',
      });
    }

    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Key === prefix) continue;
      objects.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
      });
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return { folders, objects };
}

// ─── Presigned URL (for private buckets) ─────────────────────────────────────

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: r2Bucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

// ─── Public URL helper (for public buckets with custom domain) ────────────────

export function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  // Fall back to presigned — caller should use getPresignedUrl instead
  return key;
}
