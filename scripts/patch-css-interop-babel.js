/**
 * EAS Build: patch react-native-css-interop/babel.js to make
 * react-native-worklets/plugin optional instead of required.
 *
 * NativeWind v4 uses react-native-css-interop which unconditionally
 * loads react-native-worklets/plugin. That plugin requires New Architecture,
 * which breaks builds when newArchEnabled=false. This rewrites the file
 * to only include the plugin when the package is actually installed.
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

const patched = `module.exports = function () {
  var plugins = [
    require("./dist/babel-plugin").default,
    [
      "@babel/plugin-transform-react-jsx",
      {
        runtime: "automatic",
        importSource: "react-native-css-interop",
      },
    ],
  ];
  // Only load worklets plugin if the package is installed (requires New Architecture).
  // Skipping it disables CSS transition/animation utilities but leaves all other
  // Tailwind classes working normally.
  try {
    require.resolve("react-native-worklets/plugin");
    plugins.push("react-native-worklets/plugin");
  } catch (e) {
    // react-native-worklets not installed — skip
  }
  return { plugins: plugins };
};
`;

const current = fs.readFileSync(babelFile, 'utf8');

if (current.trim() === patched.trim()) {
  console.log('[patch-css-interop-babel] Already patched');
} else {
  fs.writeFileSync(babelFile, patched);
  console.log('[patch-css-interop-babel] Patched react-native-worklets/plugin to be optional');
}
