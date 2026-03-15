/**
 * EAS Build: patch @react-native/gradle-plugin so autolinking projectDir paths from the config
 * (which are relative to project root) are resolved against the project root, not android/.
 * Fixes "No variants exist" when Gradle would otherwise look for libs under android/node_modules/...
 * Run in eas-build-post-install (after npm install).
 */

const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings-plugin',
  'src',
  'main',
  'kotlin',
  'com',
  'facebook',
  'react',
  'ReactSettingsExtension.kt'
);

if (!fs.existsSync(targetFile)) {
  console.warn('[patch-react-native-autolinking-paths] File not found:', targetFile);
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

const oldBlock = `  private fun linkLibraries(input: Map<String, File>) {
    input.forEach { (path, projectDir) ->
      settings.include(path)
      settings.project(path).projectDir = projectDir
    }
  }`;

const newBlock = `  private fun linkLibraries(input: Map<String, File>) {
    val projectRoot = settings.layout.rootDirectory.dir("../").asFile
    input.forEach { (path, projectDir) ->
      settings.include(path)
      val resolvedDir = if (projectDir.isAbsolute) projectDir else File(projectRoot, projectDir.path)
      settings.project(path).projectDir = resolvedDir
    }
  }`;

if (content.includes(oldBlock) && !content.includes('val projectRoot = settings.layout.rootDirectory.dir("../").asFile')) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(targetFile, content);
  console.log('[patch-react-native-autolinking-paths] Patched linkLibraries to resolve relative projectDir against project root');
} else if (content.includes('val projectRoot = settings.layout.rootDirectory.dir("../").asFile')) {
  console.log('[patch-react-native-autolinking-paths] Patch already applied');
} else {
  console.warn('[patch-react-native-autolinking-paths] Could not find expected linkLibraries block — skip');
}

console.log('[patch-react-native-autolinking-paths] Done');
