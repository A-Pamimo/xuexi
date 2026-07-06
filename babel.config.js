module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // reanimated v4 moved its babel plugin to react-native-worklets; must be last.
      'react-native-worklets/plugin',
    ],
  };
};
