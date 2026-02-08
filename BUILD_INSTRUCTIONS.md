# Building APK for Wardro8e App

## Problem
Windows has a 260-character path length limitation that causes build failures with React Native projects in deep directory structures.

## ✅ CURRENT STATUS

**Junction Created:** A junction has been created at `C:\W8E` that points to your project directory. This shortens the build paths significantly.

**Available APKs:**
- ✅ **Debug APK:** `C:\W8E\android\app\build\outputs\apk\debug\app-debug.apk` (58.24 MB)
- ⏳ **Release APK:** Build in progress or pending

## Solutions

### Option 1: Use Junction Path (Already Set Up) ⭐ RECOMMENDED

Build from the shorter junction path:

```powershell
cd C:\W8E\android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK will be at: `C:\W8E\android\app\build\outputs\apk\release\app-release.apk`

(Also accessible via original path: `C:\Users\Admin\Desktop\CodebaseDirectory\wardro8e-app\android\app\build\outputs\apk\release\app-release.apk`)

### Option 2: Enable Windows Long Path Support

1. **Enable via Group Policy (Requires Admin):**
   - Press `Win + R`, type `gpedit.msc` and press Enter
   - Navigate to: Computer Configuration → Administrative Templates → System → Filesystem
   - Find "Enable Win32 long paths"
   - Set it to "Enabled"
   - Restart your computer

2. **Or enable via Registry (Requires Admin):**
   - Press `Win + R`, type `regedit` and press Enter
   - Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
   - Find `LongPathsEnabled` (create DWORD if it doesn't exist)
   - Set value to `1`
   - Restart your computer

3. **After enabling, build the APK:**
   ```powershell
   cd android
   .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
   ```

4. **Find your APK:**
   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```

### Option 2: Use EAS Build (Cloud Build - Easiest)

1. **Install EAS CLI:**
   ```powershell
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```powershell
   eas login
   ```

3. **Configure EAS Build:**
   ```powershell
   eas build:configure
   ```

4. **Build APK:**
   ```powershell
   eas build --platform android --profile preview
   ```

5. **Download the APK** from the provided link when build completes.

### Option 3: Move Project to Shorter Path

Move your project to a shorter path like `C:\Projects\wardro8e-app` and rebuild.

### Option 4: Build Debug APK (Shorter Paths)

Debug builds sometimes have shorter paths:
```powershell
cd android
.\gradlew.bat assembleDebug
```

APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

## Building for Specific Architectures

To reduce build time and path length, build for specific architectures:

- **arm64-v8a only** (most modern devices):
  ```powershell
  .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
  ```

- **x86_64 only** (for emulators):
  ```powershell
  .\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64
  ```

## Signing the APK (For Production)

For production releases, you need to sign your APK:

1. Generate a keystore:
   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Update `android/app/build.gradle` to use your keystore for release builds.

See: https://reactnative.dev/docs/signed-apk-android