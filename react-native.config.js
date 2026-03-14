module.exports = {
  dependencies: {
    // react-native-worklets-core is a transitive dep of react-native-reanimated@3.x
    // but is NOT needed for reanimated@4.x which uses react-native-worklets instead.
    // Excluding it prevents autolinking conflicts.
    'react-native-worklets-core': {
      platforms: { android: null, ios: null },
    },
  },
};
