/**
 * Minimal QR Code SVG generator — zero external dependencies.
 * Supports byte mode encoding with medium error correction.
 * Produces clean, small SVG strings suitable for embedding.
 */

// GF(256) with primitive polynomial 0x11D
const GF256_EXP: number[] = new Array(256);
const GF256_LOG: number[] = new Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) GF256_EXP[i] = GF256_EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

// Reed-Solomon generator polynomial
function rsGenPoly(nsym: number): number[] {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gfMul(g[j], GF256_EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsEncode(data: number[], nsym: number): number[] {
  const gen = rsGenPoly(nsym);
  const res = new Array(data.length + nsym).fill(0);
  for (let i = 0; i < data.length; i++) res[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

// QR Code capacity table: [totalCodewords, ecPerBlock, numBlocks1, dataCW1, numBlocks2, dataCW2]
// Version 1-10, byte mode, Medium error correction
const CAPACITIES: Record<number, [number, number, number, number, number, number]> = {
  1:  [26, 10, 1, 16, 0, 0],
  2:  [44, 16, 1, 28, 0, 0],
  3:  [70, 26, 1, 44, 0, 0],
  4:  [100, 18, 2, 32, 0, 0],
  5:  [134, 24, 2, 43, 0, 0],
  6:  [172, 16, 4, 27, 0, 0],
  7:  [196, 18, 4, 31, 0, 0],
  8:  [242, 22, 2, 38, 2, 39],
  9:  [292, 22, 3, 36, 2, 37],
  10: [346, 26, 4, 43, 1, 44],
};

// Format info bits for Medium EC, mask patterns 0-7
const FORMAT_INFO = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b,
  0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function bestVersion(dataLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const cap = CAPACITIES[v];
    const totalData = cap[2] * cap[3] + cap[4] * cap[5];
    if (dataLen <= totalData - 3) return v; // 3 overhead for byte mode header
  }
  throw new Error("Data too long for QR code (max ~120 bytes for v10-M)");
}

function encodeData(data: Uint8Array, version: number): number[] {
  const cap = CAPACITIES[version];
  const totalData = cap[2] * cap[3] + cap[4] * cap[5];

  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  // Byte mode indicator (0100)
  push(4, 4);
  // Character count (8 bits for version 1-9)
  push(data.length, version <= 9 ? 8 : 16);
  // Data bytes
  for (const b of data) push(b, 8);

  // Terminator (up to 4 zeros)
  const terminatorLen = Math.min(4, totalData * 8 - bits.length);
  push(0, terminatorLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes (alternating 0xEC, 0x11)
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalData * 8) {
    push(padBytes[pi], 8);
    pi = (pi + 1) % 2;
  }

  // Convert bits to codewords
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] ?? 0);
    codewords.push(byte);
  }

  // Split into blocks and compute RS EC
  const [totalCW, ecPerBlock, n1, d1, n2, d2] = cap;
  const ecTotal = (n1 + n2) * ecPerBlock;
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];

  let offset = 0;
  for (let i = 0; i < n1; i++) {
    const block = codewords.slice(offset, offset + d1);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += d1;
  }
  for (let i = 0; i < n2; i++) {
    const block = codewords.slice(offset, offset + d2);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += d2;
  }

  // Interleave data blocks
  const result: number[] = [];
  const maxD1 = d1;
  for (let i = 0; i < maxD1; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) result.push(ec[i]);
    }
  }

  return result;
}

function generateMatrix(version: number, dataCW: number[]): boolean[][] {
  const size = version * 4 + 17;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // Finder patterns
  const drawFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        matrix[rr][cc] = inInner || (inOuter && onBorder);
        reserved[rr][cc] = true;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  // Dark module
  matrix[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Reserve format info areas
  for (let i = 0; i < 15; i++) {
    // Near top-left
    if (i < 6) { reserved[8][i] = true; }
    else if (i < 8) { reserved[8][i + 1] = true; }
    else { reserved[14 - i][8] = true; }

    // Second copies
    if (i < 8) { reserved[size - 1 - i][8] = true; }
    else { reserved[8][size - 15 + i] = true; }
  }

  // Version info (v >= 7) — skip for v <= 10 if not needed
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }
  }

  // Place data
  let bitIndex = 0;
  const totalBits = dataCW.length * 8;
  let col = size - 1;

  while (col >= 0) {
    if (col === 6) col--; // Skip timing column
    const upward = ((size - 1 - col) % 4) < 2;

    for (let k = 0; k < size; k++) {
      const row = upward ? size - 1 - k : k;
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (c < 0 || reserved[row][c]) continue;
        if (bitIndex < totalBits) {
          const cwIdx = bitIndex >> 3;
          const bitPos = 7 - (bitIndex & 7);
          matrix[row][c] = ((dataCW[cwIdx] >> bitPos) & 1) === 1;
          bitIndex++;
        }
      }
    }

    col -= 2;
  }

  // Apply mask pattern 0 (checkerboard)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && (r + c) % 2 === 0) {
        matrix[r][c] = !matrix[r][c];
      }
    }
  }

  // Write format info (mask pattern 0, EC level M)
  const fmt = FORMAT_INFO[0];
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >> i) & 1) === 1;
    // Horizontal strip near top-left
    if (i < 6) matrix[8][i] = bit;
    else if (i < 8) matrix[8][i + 1] = bit;
    else matrix[14 - i][8] = bit;

    // Vertical strip
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

/**
 * Generate a QR code SVG string.
 * @param text - The text to encode
 * @param size - SVG size in pixels (default 200)
 * @param fg - Foreground color (default "#000")
 * @param bg - Background color (default "#fff")
 */
export function qrCodeSvg(text: string, size = 200, fg = "#000", bg = "#fff"): string {
  const data = new TextEncoder().encode(text);
  const version = bestVersion(data.length);
  const cw = encodeData(data, version);
  const matrix = generateMatrix(version, cw);
  const n = matrix.length;
  const cellSize = size / (n + 8); // 4-cell quiet zone on each side
  const offset = cellSize * 4;

  let paths = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = offset + c * cellSize;
        const y = offset + r * cellSize;
        paths += `M${x},${y}h${cellSize}v${cellSize}h${-cellSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    `<path d="${paths}" fill="${fg}"/>` +
    `</svg>`;
}

/**
 * Generate a CKB transfer URI for QR encoding.
 */
export function ckbTransferUri(address: string, amountCkb?: number, message?: string): string {
  const params = new URLSearchParams();
  params.set("address", address);
  if (amountCkb && amountCkb > 0) params.set("amount", String(amountCkb));
  if (message) params.set("message", message.slice(0, 100));
  return `web+ckb:transfer?${params.toString()}`;
}
