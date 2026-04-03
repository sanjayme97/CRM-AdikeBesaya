/**
 * GPS Location Utilities
 *
 * GPS locations are captured for verification/proof only.
 * Workers manually enter km traveled.
 *
 * Location can come from:
 * 1. Photo EXIF data (preferred — harder to fake)
 * 2. Browser geolocation (fallback — can be faked with mock locations)
 */

/**
 * Format coordinates for display (e.g., "12.9716° N, 77.5946° E")
 */
export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return 'No location';

  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Generate a Google Maps URL for a GPS coordinate
 */
export function getGoogleMapsUrl(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Extract GPS coordinates from a photo file's EXIF data.
 * Returns null if no GPS data found in the image.
 *
 * Uses the browser's built-in capabilities to read EXIF.
 * Falls back to null if EXIF parsing fails.
 */
export async function extractGpsFromPhoto(file: File): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);

    // Check for JPEG magic bytes
    if (dataView.getUint16(0) !== 0xFFD8) {
      return null; // Not a JPEG
    }

    // Find EXIF data (APP1 marker)
    let offset = 2;
    while (offset < dataView.byteLength - 1) {
      const marker = dataView.getUint16(offset);
      if (marker === 0xFFE1) {
        // APP1 — EXIF data
        const exifData = parseExifGps(dataView, offset + 4);
        if (exifData) return exifData;
        break;
      }
      // Skip to next marker
      const size = dataView.getUint16(offset + 2);
      offset += 2 + size;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse GPS coordinates from EXIF APP1 segment.
 * Handles both big-endian and little-endian TIFF headers.
 */
function parseExifGps(
  dataView: DataView,
  start: number
): { latitude: number; longitude: number } | null {
  try {
    // Check for "Exif\0\0" header
    const exifHeader =
      String.fromCharCode(dataView.getUint8(start)) +
      String.fromCharCode(dataView.getUint8(start + 1)) +
      String.fromCharCode(dataView.getUint8(start + 2)) +
      String.fromCharCode(dataView.getUint8(start + 3));

    if (exifHeader !== 'Exif') return null;

    const tiffStart = start + 6;
    const byteOrder = dataView.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949; // "II"

    const ifd0Offset = dataView.getUint32(tiffStart + 4, littleEndian);
    const ifd0Start = tiffStart + ifd0Offset;

    // Find GPS IFD pointer in IFD0
    const ifd0Count = dataView.getUint16(ifd0Start, littleEndian);
    let gpsIfdOffset: number | null = null;

    for (let i = 0; i < ifd0Count; i++) {
      const entryOffset = ifd0Start + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, littleEndian);
      if (tag === 0x8825) {
        // GPS IFD pointer
        gpsIfdOffset = dataView.getUint32(entryOffset + 8, littleEndian);
        break;
      }
    }

    if (gpsIfdOffset === null) return null;

    // Parse GPS IFD
    const gpsStart = tiffStart + gpsIfdOffset;
    const gpsCount = dataView.getUint16(gpsStart, littleEndian);

    let latRef = '';
    let lngRef = '';
    let latValues: number[] | null = null;
    let lngValues: number[] | null = null;

    for (let i = 0; i < gpsCount; i++) {
      const entryOffset = gpsStart + 2 + i * 12;
      const tag = dataView.getUint16(entryOffset, littleEndian);

      switch (tag) {
        case 1: // GPSLatitudeRef
          latRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
          break;
        case 2: // GPSLatitude
          latValues = readGpsRationals(dataView, tiffStart, entryOffset, littleEndian);
          break;
        case 3: // GPSLongitudeRef
          lngRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
          break;
        case 4: // GPSLongitude
          lngValues = readGpsRationals(dataView, tiffStart, entryOffset, littleEndian);
          break;
      }
    }

    if (!latValues || !lngValues) return null;

    let latitude = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
    let longitude = lngValues[0] + lngValues[1] / 60 + lngValues[2] / 3600;

    if (latRef === 'S') latitude = -latitude;
    if (lngRef === 'W') longitude = -longitude;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

/**
 * Read 3 RATIONAL values (degrees, minutes, seconds) from EXIF GPS entry
 */
function readGpsRationals(
  dataView: DataView,
  tiffStart: number,
  entryOffset: number,
  littleEndian: boolean
): number[] {
  const valueOffset = dataView.getUint32(entryOffset + 8, littleEndian);
  const absOffset = tiffStart + valueOffset;

  const values: number[] = [];
  for (let i = 0; i < 3; i++) {
    const numerator = dataView.getUint32(absOffset + i * 8, littleEndian);
    const denominator = dataView.getUint32(absOffset + i * 8 + 4, littleEndian);
    values.push(denominator !== 0 ? numerator / denominator : 0);
  }

  return values;
}
