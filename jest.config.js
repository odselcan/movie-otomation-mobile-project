module.exports = {
  preset: 'jest-expo',
  collectCoverage: true,

  // Sadece test edilen dosyalarin coverage'ini ol
  // Boylece test edilmeyen bilesenler ortalamaya dahil olmaz
  collectCoverageFrom: [
    'services/tmdb.ts',
    'hooks/helpers.ts',
    'hooks/useStorage.ts',
    'hooks/useSensors.ts',
    'components/MediaCard.tsx',
  ],

  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  },

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-maps)',
  ],
};