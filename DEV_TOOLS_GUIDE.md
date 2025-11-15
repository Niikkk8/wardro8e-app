# Development Tools Guide

## Quick Storage Reset (No UI Required)

### Method 1: Console Commands (Easiest)

1. **Open React Native Debugger** or **Metro Console**
2. Type any of these commands:

```javascript
// Reset all storage (onboarding + auth)
window.resetStorage()

// Reset only onboarding (keeps auth session)
window.resetOnboarding()

// Check current storage status
window.showStorage()
```

3. **Reload the app** (shake device → Reload, or press `r` in Metro)

### Method 2: Shake Device → Dev Menu

1. Shake your device (or press `Cmd+D` on iOS / `Cmd+M` on Android)
2. Open Dev Menu
3. Look for "Reset Storage" option (if you add it)

### Method 3: Metro Console Shortcut

While Metro bundler is running:
- Press `r` to reload
- Type commands directly in the Metro console

## Setup Instructions

The dev tools are **automatically loaded** when you run the app in development mode.

No setup needed! Just use the commands above.

## Available Commands

### `window.resetStorage()`
- Clears ALL app storage
- Resets onboarding status
- Clears auth tokens
- **Use this for complete reset**

### `window.resetOnboarding()`
- Only resets onboarding status
- Keeps auth session intact
- **Use this to test onboarding flow without re-authenticating**

### `window.showStorage()`
- Shows all current storage keys and values
- **Use this to debug storage issues**

## Example Usage

```javascript
// In React Native Debugger or Metro console:

// 1. Check what's stored
window.showStorage()

// 2. Reset everything
window.resetStorage()

// 3. Reload app (shake device → Reload)
// Now you'll see onboarding screens
```

## Production Safety

These tools are **automatically disabled** in production builds (`__DEV__` check).

You don't need to remove anything before deploying!

## Troubleshooting

**Commands not working?**
- Make sure you're in development mode (`__DEV__ === true`)
- Check Metro console for the "Dev tools loaded!" message
- Try reloading the app

**Storage not resetting?**
- Make sure you reload the app after resetting
- Check `window.showStorage()` to verify keys are cleared
- Try uninstalling/reinstalling the app as a last resort

