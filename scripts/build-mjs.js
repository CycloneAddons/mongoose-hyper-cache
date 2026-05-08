/**
 * Build script to generate ES Module version
 */

const fs = require('fs');
const path = require('path');

// Get all JS files from dist
const distDir = path.join(__dirname, '../dist');
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(distDir, file);
  const mjsPath = filePath.replace(/\.js$/, '.mjs');

  // Read CommonJS file
  let content = fs.readFileSync(filePath, 'utf-8');

  // Convert to ESM
  // Replace module.exports with export
  content = content.replace(/module\.exports\s*=\s*/, 'export default ');
  content = content.replace(/const\s+(\w+)\s*=\s*require\(/g, 'import $1 from "');
  content = content.replace(/"\);/g, '";');
  content = content.replace(/Object\.defineProperty\(exports,\s*"__esModule",\s*\{\s*value:\s*true\s*\}\);/g, '');

  // Write ESM file
  fs.writeFileSync(mjsPath, content);
  console.log(`✓ Created ${mjsPath}`);
}

console.log(`✓ Generated ${files.length} ESM files`);
