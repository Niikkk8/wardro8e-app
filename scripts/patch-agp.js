/**
 * EAS Build: patch React Native's Gradle version catalog to use AGP 8.7.2
 * to avoid "No matching variant" / "No variants exist" for native modules.
 * Run as eas-build-post-install (after npm install and prebuild, before Gradle).
 */

const fs = require('fs');
const path = require('path');

const AGP_TARGET = '8.7.2';

const files = [
  path.join(__dirname, '..', 'node_modules', 'react-native', 'gradle', 'libs.versions.toml'),
  path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin', 'gradle', 'libs.versions.toml'),
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.warn('[patch-agp] Skip (not found):', file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');

  // Match any agp = "x.y.z" version line
  const match = content.match(/agp = "(\d+\.\d+\.\d+)"/);
  if (!match) {
    console.warn('[patch-agp] No agp version found in:', file);
    continue;
  }

  const currentVersion = match[1];
  if (currentVersion === AGP_TARGET) {
    console.log('[patch-agp] AGP already at target version', AGP_TARGET, 'in', path.relative(process.cwd(), file));
    continue;
  }

  content = content.replace(`agp = "${currentVersion}"`, `agp = "${AGP_TARGET}"`);
  fs.writeFileSync(file, content);
  console.log('[patch-agp] Patched AGP', currentVersion, '->', AGP_TARGET, 'in', path.relative(process.cwd(), file));
}
