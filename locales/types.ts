// locales/types.ts — Tip tanımı (as const olmadan, her iki dil implement eder)
export interface Translations {
  common: {
    search: string; loading: string; error: string; back: string;
    close: string; save: string; cancel: string; delete: string;
    share: string; yes: string; no: string; noResults: string;
    noInternet: string; retry: string; all: string; rating: string;
  };
  tabs: {
    films: string; series: string; explore: string; map: string;
    favorites: string; watchlist: string; notifications: string; sensors: string;
  };
  media: {
    topRated: string; nowPlaying: string; popular: string; upcoming: string;
    onTheAir: string; movie: string; series: string; shakeHint: string;
    randomSuggestion: string; watchNow: string; addFavorite: string;
    removeFavorite: string; addWatchlist: string;
  };
  detail: {
    cast: string; similar: string; trailer: string; noTrailer: string;
    overview: string; releaseDate: string; runtime: string; minutes: string;
    seasons: string; episodes: string;
  };
  favorites: {
    title: string; empty: string; emptyHint: string; sortBy: string;
    sortByDate: string; sortByRating: string; sortByTitle: string;
    shareList: string; shareMessage: string; rateThis: string;
    yourRating: string; note: string; addNote: string;
  };
  watchlist: {
    title: string; empty: string; emptyHint: string; watched: string;
    pending: string; markWatched: string; markPending: string;
    shareWatched: string; sharePending: string;
  };
  map: {
    title: string; nearest: string; findNearest: string; getDirections: string;
    addContact: string; sendSMS: string; filterByGenre: string;
    favoriteCinema: string; distance: string; km: string;
  };
  sensors: {
    title: string; accelerometer: string; location: string; battery: string;
    network: string; brightness: string; latitude: string; longitude: string;
    altitude: string; speed: string; heading: string; accuracy: string;
    charging: string; notCharging: string; wifi: string; cellular: string;
    noConnection: string; cinemaMode: string; normalMode: string;
    getLocation: string; meters: string; mps: string;
  };
  notifications: {
    title: string; scheduleNow: string; scheduleLater: string;
    dailyReminder: string; permissionDenied: string; sent: string; scheduled: string;
  };
  a11y: {
    posterImage: string; ratingBadge: string; favoriteButton: string;
    removeButton: string; searchInput: string; closeModal: string;
    playTrailer: string; cinemaMode: string; batteryLevel: string;
    networkStatus: string; mapMarker: string; sortButton: string;
    pageNumber: string; starRating: string;
  };
}