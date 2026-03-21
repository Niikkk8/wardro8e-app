/**
 * EAS Build: patch react-native-css-interop/babel.js to make
 * react-native-worklets/plugin optional instead of required.
 *
 * NativeWind v4 uses react-native-css-interop which unconditionally
 * loads react-native-worklets/plugin. That plugin requires New Architecture,
 * which breaks the build when newArchEnabled=false. Since this project
 * doesn't use CSS transitions/animations (the only feature worklets enables
 * in NativeWind), it's safe to skip loading the plugin when the package
 * isn't installed.
 *
 * Run as part of eas-build-post-install.
 */

const fs = require('fs');
const path = require('path');

const babelFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'babel.js'
);

if (!fs.existsSync(babelFile)) {
  console.log('[patch-css-interop-babel] babel.js not found — skip');
  process.exit(0);
}

let content = fs.readFileSync(babelFile, 'utf8');

const hardcoded = '"react-native-worklets/plugin",';
const optional = `(() => {
        try { return require.resolve("react-native-worklets/plugin") && "react-native-worklets/plugin"; }
        catch (e) { return null; }
      })(),`;

if (content.includes(hardcoded) && !content.includes('try { return require.resolve')) {
  content = content.replace(hardcoded, optional);
  fs.writeFileSync(babelFile, content);
  console.log('[patch-css-interop-babel] Patched react-native-worklets/plugin to be optional');
} else if (content.includes('try { return require.resolve')) {
  console.log('[patch-css-interop-babel] Already patched');
} else {
  console.log('[patch-css-interop-babel] react-native-worklets/plugin line not found — nothing to patch');
}
