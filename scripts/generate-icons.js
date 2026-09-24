import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRC32 implementation
function makeCrcTable() {
  const cTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    cTable[n] = c;
  }
  return cTable;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generateIcon(width, height, isTray = false) {
  // RGBA buffer: width * height * 4
  const scanlines = [];
  const radius = Math.floor(width * 0.22);

  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;

      // Rounded rectangle test
      const dx = Math.max(0, Math.max(radius - x, x - (width - 1 - radius)));
      const dy = Math.max(0, Math.max(radius - y, y - (height - 1 - radius)));
      const distSq = dx * dx + dy * dy;
      const isInside = distSq <= radius * radius;

      if (!isInside) {
        // Transparent
        line[idx] = 0;
        line[idx + 1] = 0;
        line[idx + 2] = 0;
        line[idx + 3] = 0;
        continue;
      }

      // Gradient from Indigo (#6366f1) to Purple/Violet (#9333ea)
      const t = (x + y) / (width + height);
      let r = Math.round(99 * (1 - t) + 147 * t);
      let g = Math.round(102 * (1 - t) + 51 * t);
      let b = Math.round(241 * (1 - t) + 234 * t);

      // Draw letter "G"
      // Normalized coords (0 to 1)
      const nx = x / width;
      const ny = y / height;

      // Render bold "G" glyph in white
      let isG = false;

      // Center (0.5, 0.5)
      const cx = 0.5;
      const cy = 0.5;
      const gDx = (nx - cx);
      const gDy = (ny - cy);
      const gDist = Math.sqrt(gDx * gDx + gDy * gDy);

      // Outer circle radius ~0.3, inner radius ~0.16
      const inRing = gDist >= 0.16 && gDist <= 0.31;

      // "G" opening on the right: angle between -45 deg and +15 deg (in upper-right / mid-right)
      const angle = Math.atan2(gDy, gDx); // radians: -PI to +PI
      // Opening: roughly between -0.4 and 0.2 rad (pointing right)
      const inOpening = (angle > -0.65 && angle < 0.1) && nx > 0.48;

      if (inRing && !inOpening) {
        isG = true;
      }

      // Horizontal bar of the G: from center towards right (cx to cx+0.22), around cy to cy+0.07
      if (nx >= 0.48 && nx <= 0.72 && ny >= 0.46 && ny <= 0.56) {
        isG = true;
      }
      // Vertical spur going down from the bar
      if (nx >= 0.64 && nx <= 0.72 && ny >= 0.46 && ny <= 0.70) {
        isG = true;
      }

      if (isG) {
        line[idx] = 255;
        line[idx + 1] = 255;
        line[idx + 2] = 255;
        line[idx + 3] = 255;
      } else {
        line[idx] = r;
        line[idx + 1] = g;
        line[idx + 2] = b;
        line[idx + 3] = 255;
      }
    }
    scanlines.push(line);
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width (4), height (4), bit depth (1), color type (1), compression (1), filter (1), interlace (1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace

  const ihdrChunk = createPngChunk('IHDR', ihdrData);
  const idatChunk = createPngChunk('IDAT', compressed);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files
const outDir = path.resolve(__dirname, '../public');
fs.mkdirSync(outDir, { recursive: true });

const electronResDir = path.resolve(__dirname, '../electron/resources');
fs.mkdirSync(electronResDir, { recursive: true });

const icon32 = generateIcon(32, 32, true);
const icon16 = generateIcon(16, 16, true);
const icon256 = generateIcon(256, 256, false);

fs.writeFileSync(path.join(outDir, 'tray-icon.png'), icon32);
fs.writeFileSync(path.join(outDir, 'tray-icon-16.png'), icon16);
fs.writeFileSync(path.join(outDir, 'icon.png'), icon256);

fs.writeFileSync(path.join(electronResDir, 'tray-icon.png'), icon32);
fs.writeFileSync(path.join(electronResDir, 'icon.png'), icon256);

console.log('Icons generated successfully!');
