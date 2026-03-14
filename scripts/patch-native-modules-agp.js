/**
 * EAS Build: patch ALL native modules in node_modules to use AGP 8.7.2.
 * Fixes "No variants exist" when the app uses AGP 8.7.x and libraries pin older versions.
 * Run in eas-build-post-install (after npm install, before prebuild).
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const nodeModules = path.join(rootDir, 'node_modules');
const AGP_VERSION = '8.7.2';

// Match any classpath that pins a specific AGP version (captures full line variations)
const AGP_PATTERN = /classpath\s*\(\s*["']com\.android\.tools\.build:gradle:[^"']+["']\s*\)|classpath\s*["']com\.android\.tools\.build:gradle:[^"']+["']/g;
const AGP_REPLACEMENT = `classpath("com.android.tools.build:gradle:${AGP_VERSION}")`;

function findBuildGradleFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' && dir !== rootDir) continue; // don't recurse into nested node_modules
      findBuildGradleFiles(full, files);
    } else if (e.name === 'build.gradle' && full.includes('android')) {
      files.push(full);
    }
  }
  return files;
}

let patched = 0;
const buildGradleFiles = findBuildGradleFiles(nodeModules);

for (const file of buildGradleFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('com.android.tools.build:gradle:')) continue;

  const newContent = content.replace(AGP_PATTERN, AGP_REPLACEMENT);
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    patched++;
    const rel = path.relative(nodeModules, path.dirname(path.dirname(file)));
    console.log('[patch-native-modules-agp] Patched', rel);
  }
}

console.log('[patch-native-modules-agp] Done. Patched', patched, 'build.gradle file(s).');
if (patched === 0) {
  console.log('[patch-native-modules-agp] No files needed patching (AGP already aligned or not found).');
}
