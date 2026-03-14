module.exports = {
  dependencies: {
    // These packages are not used in this project and have caused
    // Gradle configuration-phase failures that break ALL native module builds.
    // Exclude them from autolinking even if installed as transitive deps.
    'react-native-worklets': {
      platforms: { android: null, ios: null },
    },
    'react-native-worklets-core': {
      platforms: { android: null, ios: null },
    },
  },
};
