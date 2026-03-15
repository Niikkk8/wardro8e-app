/**
 * EAS Build: force a single AGP version in the root android/build.gradle so that
 * all subprojects (including autolinked native modules) inherit the same classpath
 * and publish matching variants. Fixes "No variants exist" for releaseRuntimeClasspath.
 * Run in prebuildCommand after expo prebuild.
 */

const fs = require('fs');
const path = require('path');

const AGP_VERSION = '8.5.2';
const rootBuildGradlePath = path.join(__dirname, '..', 'android', 'build.gradle');

if (!fs.existsSync(rootBuildGradlePath)) {
  console.warn('[patch-root-build-gradle] android/build.gradle not found — skip');
  process.exit(0);
}

let content = fs.readFileSync(rootBuildGradlePath, 'utf8');

// Replace unversioned AGP classpath with pinned version so all subprojects use same AGP
const unversioned = "classpath('com.android.tools.build:gradle')";
const versioned = `classpath('com.android.tools.build:gradle:${AGP_VERSION}')`;

if (content.includes(unversioned) && !content.includes(versioned)) {
  content = content.replace(unversioned, versioned);
  console.log('[patch-root-build-gradle] Pinned AGP to', AGP_VERSION, 'in android/build.gradle');
} else if (content.includes(versioned)) {
  console.log('[patch-root-build-gradle] AGP already pinned to', AGP_VERSION);
} else {
  console.warn('[patch-root-build-gradle] Could not find expected classpath line — skip');
}

// Ensure every subproject (including autolinked libs) uses the same buildscript so they publish matching variants
const subprojectsBlock = `
// EAS Build: force same AGP/buildscript on all subprojects so "No variants exist" is avoided
subprojects { subproject ->
  subproject.buildscript {
    repositories {
      google()
      mavenCentral()
    }
    dependencies {
      classpath('com.android.tools.build:gradle:${AGP_VERSION}')
      classpath('com.facebook.react:react-native-gradle-plugin')
      classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
    }
  }
}
`;

if (!content.includes('subprojects { subproject ->')) {
  content = content.trimEnd() + subprojectsBlock;
  console.log('[patch-root-build-gradle] Added subprojects buildscript block');
}

fs.writeFileSync(rootBuildGradlePath, content);
console.log('[patch-root-build-gradle] Done');
