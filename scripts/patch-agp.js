/**
 * EAS Build: align AGP to React Native's default (8.11.0) so app and native modules
 * use the same version and variant matching succeeds. Run as eas-build-post-install.
 */

const fs = require('fs');
const path = require('path');

const AGP_TARGET = '8.11.0';

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
