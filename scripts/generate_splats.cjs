/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const numParticles = 600;
const splats = [];
const radius = 100;
const centerX = 160; 
const centerY = 160;

for (let i = 0; i < numParticles; i++) {
  const r = radius * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;

  const ox = centerX + r * Math.cos(theta);
  const oy = centerY + r * Math.sin(theta);

  // Random color in indigo/violet theme 
  const hue = 250 + Math.random() * 40; // 250-290
  const lightness = 40 + Math.random() * 30; // 40-70%
  const color = `hsl(${Math.round(hue)}, 80%, ${Math.round(lightness)}%)`;
  
  // Random mass between 0.5 and 2.0
  const mass = 0.5 + Math.random() * 1.5;

  splats.push({ ox, oy, color, mass });
}

// Make sure public/data exists
const outDir = path.join(__dirname, '../public/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'splats.json'), JSON.stringify(splats, null, 2));
console.log('Generated splats.json: ' + numParticles + ' particles');
