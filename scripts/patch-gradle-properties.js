/**
 * EAS Build: patch android/gradle.properties after expo prebuild --clean
 * to ensure newArchEnabled=false and suppress compileSdk=36 warning.
 * Run as part of prebuildCommand, after expo prebuild.
 */

const fs = require('fs');
const path = require('path');

const gradlePropertiesPath = path.join(__dirname, '..', 'android', 'gradle.properties');

if (!fs.existsSync(gradlePropertiesPath)) {
  console.error('[patch-gradle-properties] android/gradle.properties not found — run expo prebuild first');
  process.exit(1);
}

let content = fs.readFileSync(gradlePropertiesPath, 'utf8');

// Force Old Architecture to avoid variant configuration failures with native modules
if (content.includes('newArchEnabled=true')) {
  content = content.replace('newArchEnabled=true', 'newArchEnabled=false');
  console.log('[patch-gradle-properties] Set newArchEnabled=false');
} else if (!content.includes('newArchEnabled=')) {
  content += '\nnewArchEnabled=false\n';
  console.log('[patch-gradle-properties] Added newArchEnabled=false');
} else {
  console.log('[patch-gradle-properties] newArchEnabled already set correctly');
}

// Suppress AGP 8.7.2 + compileSdk=36 warning
if (!content.includes('android.suppressUnsupportedCompileSdk=36')) {
  content += '\nandroid.suppressUnsupportedCompileSdk=36\n';
  console.log('[patch-gradle-properties] Added android.suppressUnsupportedCompileSdk=36');
}

fs.writeFileSync(gradlePropertiesPath, content);
console.log('[patch-gradle-properties] Done');
