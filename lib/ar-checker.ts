export interface ARViolation {
  fileName: string;
  width: number;
  height: number;
  actualRatio: number;
  displayRatio: string;
}

export interface ARCheckResult {
  valid: boolean;
  violations: ARViolation[];
}

const RATIO_1_1 = 1.0;
const RATIO_4_5 = 0.8; // 4÷5
const TOLERANCE = 0.03;

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

function formatRatio(ratio: number): string {
  // Common ratios
  if (Math.abs(ratio - 1.0) < 0.02) return '1:1';
  if (Math.abs(ratio - 0.8) < 0.02) return '4:5';
  if (Math.abs(ratio - 0.5625) < 0.02) return '9:16';
  if (Math.abs(ratio - 1.7778) < 0.02) return '16:9';
  if (Math.abs(ratio - 1.3333) < 0.02) return '4:3';
  if (ratio > 1) return `${ratio.toFixed(2)}:1`;
  return `1:${(1 / ratio).toFixed(2)}`;
}

export async function checkImageAspectRatios(files: File[]): Promise<ARCheckResult> {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return { valid: true, violations: [] };

  const violations: ARViolation[] = [];

  for (const file of imageFiles) {
    try {
      const { width, height } = await getImageDimensions(file);
      const ratio = width / height;
      const is1x1 = Math.abs(ratio - RATIO_1_1) <= TOLERANCE;
      const is4x5 = Math.abs(ratio - RATIO_4_5) <= TOLERANCE;

      if (!is1x1 && !is4x5) {
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
