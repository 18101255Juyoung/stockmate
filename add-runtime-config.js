/**
 * Add additional runtime configuration to all API route files
 * Adds: export const runtime = 'nodejs'
 */

const fs = require('fs');
const path = require('path');

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

function addRuntimeConfig(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if runtime export already exists
    if (content.includes("export const runtime = 'nodejs'")) {
      console.log(`⏭️  Skip: ${path.relative(__dirname, filePath)} (already has runtime export)`);
      return false;
    }

    // Find the line with "export const dynamic"
    const lines = content.split('\n');
    let dynamicLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("export const dynamic = 'force-dynamic'")) {
        dynamicLineIndex = i;
        break;
      }
    }

    if (dynamicLineIndex === -1) {
      console.log(`⚠️  Warning: ${path.relative(__dirname, filePath)} - No dynamic export found`);
      return false;
    }

    // Add runtime config right after dynamic
    lines.splice(dynamicLineIndex + 1, 0, "export const runtime = 'nodejs'");

    // Write back
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

console.log('📝 Adding runtime config to files...\n');

let updated = 0;
let skipped = 0;
let errors = 0;

routeFiles.forEach(file => {
  const result = addRuntimeConfig(file);
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
