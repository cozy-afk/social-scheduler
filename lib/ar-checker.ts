import { ARViolation, ARCheckResult } from '@/types/utils';

/** Supported aspect ratios for Instagram posts */
const SUPPORTED_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 1.0, label: '1:1' },
  { ratio: 0.8, label: '4:5' },
];

/** Tolerance for ratio comparison */
const TOLERANCE = 0.03;

/** Common aspect ratios for display formatting */
const COMMON_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 1.0, label: '1:1' },
  { ratio: 0.8, label: '4:5' },
  { ratio: 0.5625, label: '9:16' },
  { ratio: 1.7778, label: '16:9' },
  { ratio: 1.3333, label: '4:3' },
];

/**
 * Get image dimensions from a File object
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}

/**
 * Format a ratio value as a human-readable string
 */
function formatRatio(ratio: number): string {
  // Check against common ratios
  for (const { ratio: targetRatio, label } of COMMON_RATIOS) {
    if (Math.abs(ratio - targetRatio) < 0.02) {
      return label;
    }
  }

  // Format as decimal ratio
  return ratio > 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

/**
 * Check if a ratio matches any supported ratio within tolerance
 */
function isSupportedRatio(ratio: number): boolean {
  return SUPPORTED_RATIOS.some(({ ratio: targetRatio }) =>
    Math.abs(ratio - targetRatio) <= TOLERANCE
  );
}

/**
 * Check aspect ratios of image files and return violations
 */
export async function checkImageAspectRatios(files: File[]): Promise<ARCheckResult> {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    return { valid: true, violations: [] };
  }

  const violations: ARViolation[] = [];

  for (const file of imageFiles) {
    try {
      const { width, height } = await getImageDimensions(file);
      const ratio = width / height;

      if (!isSupportedRatio(ratio)) {
        violations.push({
          fileName: file.name,
          width,
          height,
          actualRatio: ratio,
          displayRatio: formatRatio(ratio),
        });
      }
    } catch {
      // Skip unreadable images
    }
  }

  return { valid: violations.length === 0, violations };
}
