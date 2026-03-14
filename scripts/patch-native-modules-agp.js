/**
 * EAS Build: patch autolinked native modules to use root project's AGP version
 * instead of their pinned versions. Fixes "No variants exist" when app uses AGP 8.7.x
 * and libraries pin 7.x or 8.2.x.
 * Run after prebuild (in prebuildCommand) so node_modules is final.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const nodeModules = path.join(rootDir, 'node_modules');

const LIBRARIES = [
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-reanimated',
  'react-native-worklets',
  '@react-native-async-storage/async-storage',
  '@react-native-community/datetimepicker',
];

// Match classpath("...gradle:X.Y.Z") or classpath '...gradle:X.Y.Z' (with or without parens)
const AGP_CLASSPATH_REGEX = /classpath\s*(?:\(\s*)?["']com\.android\.tools\.build:gradle:[^"']+["']\s*(?:\))?/g;
const AGP_VERSION = '8.7.2'; // Must match root / version catalog so "No variants exist" is fixed
const AGP_CLASSPATH_REPLACEMENT = `classpath("com.android.tools.build:gradle:${AGP_VERSION}")`;

let patched = 0;

for (const lib of LIBRARIES) {
  const buildGradle = path.join(nodeModules, lib, 'android', 'build.gradle');
  if (!fs.existsSync(buildGradle)) {
    console.log('[patch-native-modules-agp] Skip (no android/build.gradle):', lib);
    continue;
  }

  let content = fs.readFileSync(buildGradle, 'utf8');
  const newContent = content.replace(AGP_CLASSPATH_REGEX, AGP_CLASSPATH_REPLACEMENT);

  if (newContent !== content) {
    fs.writeFileSync(buildGradle, newContent);
    patched++;
    console.log('[patch-native-modules-agp] Patched', lib);
  }
}

console.log('[patch-native-modules-agp] Done, patched', patched, 'libraries');
