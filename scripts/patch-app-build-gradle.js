/**
 * EAS Build: after expo prebuild, patch android/app/build.gradle to avoid
 * "No variants exist" when :app:lintVitalReportRelease resolves releaseCompileClasspath.
 * Run in prebuildCommand after expo prebuild.
 */

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(buildGradlePath)) {
  console.warn('[patch-app-build-gradle] android/app/build.gradle not found — skip');
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');

const taskBlock = `
// EAS Build: prevent "No variants exist" — do not resolve release classpath for this task
tasks.configureEach { task ->
    if (task.name == 'lintVitalReportRelease') {
        task.enabled = false
    }
}
`;

if (!content.includes('lintVitalReportRelease')) {
  content = content.trimEnd() + taskBlock;
  console.log('[patch-app-build-gradle] Disabled task lintVitalReportRelease');
} else {
  console.log('[patch-app-build-gradle] Patch already applied');
}

fs.writeFileSync(buildGradlePath, content);
console.log('[patch-app-build-gradle] Done');
