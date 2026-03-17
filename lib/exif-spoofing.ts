'use client';

/**
 * EXIF Spoofing Utility
 * Strips original metadata and applies iPhone 15 Pro EXIF data for VA downloads
 */

import { EXIFPreset } from '@/types/utils';

// iPhone 15 Pro EXIF preset
export const IPHONE_15_PRO_PRESET: EXIFPreset = {
  device: 'iPhone 15 Pro',
  model: 'iPhone16,1',
  lens: 'iPhone 15 Pro back triple camera 6.86mm f/1.78',
  software: 'iOS 17.0.1',
  gpsLatitude: 34.0522,  // Default: Los Angeles
  gpsLongitude: -118.2437,
  isoVariance: [100, 200, 400, 800],
  focalLengthVariance: [6.86, 9.0, 24.0],
};

/**
 * Generates a random value within a range
 */
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Picks a random element from an array
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates realistic iPhone 15 Pro EXIF metadata
 */
export function generateIPhone15ProEXIF(preset: EXIFPreset = IPHONE_15_PRO_PRESET): Record<string, unknown> {
  const iso = randomPick(preset.isoVariance);
  const focalLength = randomPick(preset.focalLengthVariance);
  
  // Add small random variance to GPS
  const latVariance = randomInRange(-0.001, 0.001);
  const lonVariance = randomInRange(-0.001, 0.001);
  
  return {
    // Camera make and model
    Make: 'Apple',
    Model: preset.model,
    Software: preset.software,
    
    // Camera settings
    ISO: iso,
    FocalLength: focalLength,
    FocalLengthIn35mmFormat: focalLength * 4.5, // Approximate crop factor
    ApertureValue: 1.78,
    FNumber: 1.78,
    ExposureTime: `1/${Math.floor(randomInRange(60, 500))}`,
    ExposureBiasValue: 0,
    MeteringMode: 5, // Pattern
    WhiteBalance: 0, // Auto
    Flash: 16, // No flash, auto
    
    // Lens info
    LensModel: preset.lens,
    LensMake: 'Apple',
    
    // GPS coordinates (with small random variance for realism)
    GPSLatitude: preset.gpsLatitude + latVariance,
    GPSLongitude: preset.gpsLongitude + lonVariance,
    GPSLatitudeRef: preset.gpsLatitude >= 0 ? 'N' : 'S',
    GPSLongitudeRef: preset.gpsLongitude >= 0 ? 'E' : 'W',
    GPSAltitude: randomInRange(50, 200),
    
    // Image dimensions will be set based on actual image
    XResolution: 72,
    YResolution: 72,
    ResolutionUnit: 2, // Inches
    
    // Orientation (1 = normal)
    Orientation: 1,
    
    // Color space
    ColorSpace: 65535, // sRGB
    
    // Datetime (will be set to current time)
    DateTimeOriginal: new Date().toISOString().replace(/[-:T]/g, ':').split('.')[0],
    CreateDate: new Date().toISOString().replace(/[-:T]/g, ':').split('.')[0],
    ModifyDate: new Date().toISOString().replace(/[-:T]/g, ':').split('.')[0],
  };
}

/**
 * Downloads an image with spoofed EXIF metadata
 * Note: Browser-based EXIF writing is limited. For full EXIF control,
 * this should be done server-side with proper EXIF libraries.
 * 
 * This client-side version:
 * 1. Fetches the original image
 * 2. Creates a new canvas with the image
 * 3. Exports as blob (original EXIF is stripped in the process)
 * 4. Downloads the clean image
 * 
 * For production, implement server-side EXIF writing
 */
export async function downloadWithSpoofedEXIF(
  imageUrl: string,
  fileName: string,
  _preset: EXIFPreset = IPHONE_15_PRO_PRESET
): Promise<void> {
  try {
    // Fetch the original image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Create an image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
    
    // Create canvas and draw image (this strips EXIF)
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Draw image to canvas (EXIF is stripped)
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob and download
    return new Promise((resolve, reject) => {
      canvas.toBlob((newBlob) => {
        if (!newBlob) {
          reject(new Error('Failed to create blob'));
          return;
        }

        // Create download link
        const url = URL.createObjectURL(newBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Clean up
        URL.revokeObjectURL(img.src);
        resolve();
      }, 'image/jpeg', 0.95);
    });
    
  } catch (error) {
    console.error('Error downloading image with spoofed EXIF:', error);
    throw error;
  }
}

/**
 * Server-side EXIF writing function (placeholder)
 * In production, implement this with proper EXIF libraries like:
 * - exif-js (client)
 * - exiftool-vendored (server)
 * - sharp (server - limited EXIF support)
 * 
 * For now, client-side stripping is implemented above.
 * To add proper iPhone 15 Pro metadata, implement server-side processing.
 */
export async function processImageWithEXIFServerSide(
  imageBuffer: ArrayBuffer,
  preset: EXIFPreset = IPHONE_15_PRO_PRESET
): Promise<Buffer> {
  // This is a placeholder for server-side implementation
  // In production, use a library like sharp or exiftool-vendored
  
  const exifData = generateIPhone15ProEXIF(preset);
  console.log('Generated EXIF data:', exifData);
  
  // Return original buffer for now
  // In production, this would embed the EXIF data
  return Buffer.from(imageBuffer);
}

/**
 * Helper to get a safe filename for VA download
 */
export function generateVAFilename(modelName: string, originalFileName: string): string {
  const timestamp = Date.now();
  const ext = originalFileName.split('.').pop() ?? 'jpg';
  const sanitizedName = modelName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${sanitizedName}_${timestamp}.${ext}`;
}