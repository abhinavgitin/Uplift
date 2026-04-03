/**
 * AlgoLens Icon Generator
 * Run with: node generate-icons.js
 * Requires: npm install sharp (optional, for PNG generation)
 * 
 * Or manually convert the SVGs in the icons/ folder to PNG using any online tool.
 */

const fs = require('fs');
const path = require('path');

// Simple placeholder PNG generation using data URLs
// These create valid 1-color placeholder PNGs

// Minimal PNG header + IHDR + IDAT + IEND for solid color squares
function createSolidPng(size, r, g, b) {
  // This is a simplified approach - for production, use sharp or canvas
  // For now, create a simple BMP-style representation
  
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.floor(size/6)}" fill="#7FBFB5"/>
      <rect x="${size*0.08}" y="${size*0.08}" width="${size*0.84}" height="${size*0.84}" rx="${Math.floor(size/8)}" fill="#F5F0E8" stroke="#2D2D2D" stroke-width="${Math.max(1, size/32)}"/>
      <text x="${size/2}" y="${size*0.65}" text-anchor="middle" fill="#2D2D2D" font-family="monospace" font-size="${size*0.4}" font-weight="bold">◈</text>
    </svg>
  `.trim();
  
  return canvas;
}

// Generate improved SVG icons
const icons = [
  { size: 16, file: 'icon16.svg' },
  { size: 48, file: 'icon48.svg' },
  { size: 128, file: 'icon128.svg' }
];

console.log('AlgoLens Icon Generator');
console.log('=======================\n');

icons.forEach(({ size, file }) => {
  const svg = createSolidPng(size, 127, 191, 181);
  const filePath = path.join(__dirname, 'icons', file);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ Generated ${file}`);
});

console.log('\n📌 To convert to PNG:');
console.log('   1. Visit https://cloudconvert.com/svg-to-png');
console.log('   2. Upload each SVG from the icons/ folder');
console.log('   3. Download and save as icon16.png, icon48.png, icon128.png');
console.log('\n   Or use ImageMagick:');
console.log('   magick convert icon16.svg icon16.png');
console.log('   magick convert icon48.svg icon48.png');
console.log('   magick convert icon128.svg icon128.png');
