const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Add sharp to package.json first
const sizes = [48, 128];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../extension/src/icon.svg'));
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `../public/icon${size}.png`));
  }
}

generateIcons().catch(console.error); 