/**
 * EAS Build: patch React Native's Gradle version catalog to use AGP 8.7.2
 * instead of 8.11.0 to avoid "No matching variant" for native modules.
 * Run as eas-build-post-install (after npm install and prebuild, before Gradle).
 */

const fs = require('fs');
const path = require('path');

const AGP_OLD = '8.11.0';
const AGP_NEW = '8.7.2';

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
  if (!content.includes(`agp = "${AGP_OLD}"`)) {
    console.warn('[patch-agp] No agp version to patch in:', file);
    continue;
  }
  content = content.replace(new RegExp(`agp = "${AGP_OLD}"`, 'g'), `agp = "${AGP_NEW}"`);
  fs.writeFileSync(file, content);
  console.log('[patch-agp] Patched AGP', AGP_OLD, '->', AGP_NEW, 'in', path.relative(process.cwd(), file));
}
