# EAS Build Fix - Module Resolution Error

## Problem
EAS Build is failing with:
```
No matching variant of project :react-native-async-storage_async-storage was found
No variants exist
```

This happens because React Native modules aren't being built before the app tries to use them.

## Solution Options

### Option 1: Let EAS Regenerate Android Folder (Recommended)

Since you have a prebuild project, EAS might be having issues with the existing `android` folder. Try letting EAS regenerate it:

1. **Backup your Android customizations** (if any):
   ```powershell
   # If you've customized Android files, back them up first
   ```

2. **Remove the android folder temporarily**:
   ```powershell
   # Rename it instead of deleting
   Rename-Item android android.backup
   ```

3. **Run EAS Build** - it will regenerate the android folder:
   ```powershell
   eas build --platform android --profile preview
   ```

4. **If build succeeds**, you can restore any customizations from `android.backup`

### Option 2: Clean Build with Prebuild

Force EAS to run prebuild:

1. **Update eas.json** to include prebuild step:
   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         },
         "prebuildCommand": "npx expo prebuild --clean"
       }
     }
   }
   ```

### Option 3: Fix Build Configuration

The issue might be with the Android Gradle Plugin version. Check your `android/build.gradle`:

1. **Ensure proper version resolution** - The build.gradle should let Expo manage versions
2. **Check gradle wrapper version** in `android/gradle/wrapper/gradle-wrapper.properties`

### Option 4: Use Managed Workflow (No Prebuild)

If you don't need custom native code, you can use Expo's managed workflow:

1. **Remove the android folder**:
   ```powershell
   Remove-Item -Recurse android
   ```

2. **Remove android from .gitignore** (if present)

3. **Build with EAS** - it will generate everything automatically:
   ```powershell
   eas build --platform android --profile preview
   ```

## Why am I getting a .tar.gz instead of an APK?

If EAS gives you a **tar.gz** (or .tar) instead of a direct APK, it’s usually because:

1. **Both debug and release APKs are built** – When the build produces multiple artifacts (e.g. `debug/` and `release/` under `android/app/build/outputs/apk/`), EAS packages them into one archive. Your APKs are inside the tar (e.g. in `release/app-release.apk`).
2. **You have an existing `android` folder** – EAS reuses it and may run or collect both variants. The APK you need is inside the tar; you can extract it and use the APK.

**What we did in `eas.json`:**
- Set **`gradleCommand`: `:app:assembleRelease`** so only the release APK is built (no debug). One artifact → no tar.
- Set **`applicationArchivePath`** to the exact release APK path so EAS uploads that single file.

**If you still get a tar:** remove or rename your local `android` folder, then run the build so EAS does a fresh prebuild and only builds release.

## Current Configuration

Your `eas.json` has been updated with:
- Build type set to "apk" for all profiles
- `applicationArchivePath` set so the artifact is the release APK (reduces tar packaging)
- EXPO_USE_COMMUNITY_AUTOLINKING set to "0" to use Expo's autolinking

## Next Steps

1. Try Option 1 first (let EAS regenerate android folder)
2. If that doesn't work, try Option 2 (add prebuild command)
3. If still failing, check the EAS Build logs for more specific errors

## Additional Debugging

If the issue persists, check:
- EAS Build logs for the exact error
- Ensure all dependencies in `package.json` are compatible with Expo SDK 54
- Verify `react-native` version is compatible (currently 0.81.5)
