import 'dotenv/config';

export default {
  expo: {
    extra: {
      tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
    },
  },
};