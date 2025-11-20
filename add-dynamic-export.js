/**
 * Add "export const dynamic = 'force-dynamic'" to all API route files
 * This prevents Next.js from attempting to pre-render API routes at build time
 */

const fs = require('fs');
const path = require('path');

// Get all route.ts files from the glob result
const apiDir = path.join(__dirname, 'src', 'app', 'api');

function getAllRouteFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item === 'route.ts') {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function addDynamicExport(filePath) {
  try {
    // Read file with UTF-8 encoding
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if export const dynamic already exists
    if (content.includes('export const dynamic')) {
      console.log(`⏭️  Skip: ${path.relative(__dirname, filePath)} (already has dynamic export)`);
      return false;
    }

    // Split into lines
    const lines = content.split('\n');

    // Find the last import statement
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
        lastImportIndex = i;
      }
    }

    const exportStatement = "export const dynamic = 'force-dynamic'";

    if (lastImportIndex >= 0) {
      // Insert after last import
      // Check if there's already an empty line after imports
      const nextLine = lines[lastImportIndex + 1];

      if (nextLine !== undefined && nextLine.trim() === '') {
        // Empty line exists, insert after it
        lines.splice(lastImportIndex + 2, 0, exportStatement, '');
      } else {
        // No empty line, add one before and after
        lines.splice(lastImportIndex + 1, 0, '', exportStatement, '');
      }
    } else {
      // No imports found, add at the beginning
      lines.unshift(exportStatement, '');
    }

    // Write back with UTF-8 encoding
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.log(`✅ Updated: ${path.relative(__dirname, filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔍 Finding all API route files...\n');

const routeFiles = getAllRouteFiles(apiDir);
console.log(`Found ${routeFiles.length} route files\n`);

console.log('📝 Adding dynamic export to files...\n');

let updated = 0;
let skipped = 0;
let errors = 0;

routeFiles.forEach(file => {
  const result = addDynamicExport(file);
  if (result === true) {
    updated++;
  } else if (result === false) {
    skipped++;
  } else {
    errors++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   Total files: ${routeFiles.length}`);
console.log(`   ✅ Updated: ${updated}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);
console.log('='.repeat(60));

if (updated > 0) {
  console.log('\n⚠️  Please run "npm run build" to verify all changes work correctly!');
}
