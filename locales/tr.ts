// locales/tr.ts
import { Translations } from './types';

const tr: Translations = {
  common: {
    search: 'Ara...', loading: 'Yükleniyor...', error: 'Bir hata oluştu',
    back: 'Geri', close: 'Kapat', save: 'Kaydet', cancel: 'İptal',
    delete: 'Sil', share: 'Paylaş', yes: 'Evet', no: 'Hayır',
    noResults: 'Sonuç bulunamadı', noInternet: 'İnternet bağlantısı yok',
    retry: 'Tekrar Dene', all: 'Tümü', rating: 'Puan',
  },
  tabs: {
    films: 'Filmler', series: 'Diziler', explore: 'Keşfet', map: 'Harita',
    favorites: 'Favoriler', watchlist: 'İzleme Listesi',
    notifications: 'Bildirimler', sensors: 'Sensörler',
  },
  media: {
    topRated: 'En Yüksek Puanlı', nowPlaying: 'Vizyonda', popular: 'Popüler',
    upcoming: 'Yakında', onTheAir: 'Yayında', movie: 'Film', series: 'Dizi',
    shakeHint: 'Film önerisi için telefonu salla!',
    randomSuggestion: 'Rastgele Öneri', watchNow: 'Şimdi İzle',
    addFavorite: 'Favorilere Ekle', removeFavorite: 'Favorilerden Çıkar',
    addWatchlist: 'İzleme Listesine Ekle',
  },
  detail: {
    cast: 'Oyuncular', similar: 'Benzer İçerikler', trailer: 'Fragman',
    noTrailer: 'Fragman bulunamadı', overview: 'Özet',
    releaseDate: 'Çıkış Tarihi', runtime: 'Süre', minutes: 'dakika',
    seasons: 'Sezon', episodes: 'Bölüm',
  },
  favorites: {
    title: 'Favorilerim', empty: 'Henüz favori eklemediniz',
    emptyHint: 'Film veya dizileri favorilere ekleyebilirsiniz',
    sortBy: 'Sırala', sortByDate: 'Tarihe Göre', sortByRating: 'Puana Göre',
    sortByTitle: 'Ada Göre', shareList: 'Listeyi Paylaş',
    shareMessage: 'Favori filmlerim:', rateThis: 'Puan Ver',
    yourRating: 'Puanınız', note: 'Not', addNote: 'Not ekle...',
  },
  watchlist: {
    title: 'İzleme Listem', empty: 'İzleme listesi boş',
    emptyHint: 'Daha sonra izlemek istediğiniz içerikleri ekleyin',
    watched: 'İzlendi', pending: 'Bekleyen',
    markWatched: 'İzlendi Olarak İşaretle',
    markPending: 'Bekleyen Olarak İşaretle',
    shareWatched: 'İzlenenleri Paylaş', sharePending: 'Bekleyenleri Paylaş',
  },
  map: {
    title: 'Sinema Haritası', nearest: 'En Yakın Sinema',
    findNearest: 'En Yakın Sinemayı Bul', getDirections: 'Yol Tarifi Al',
    addContact: 'Rehbere Ekle', sendSMS: 'SMS Gönder',
    filterByGenre: 'Türe Göre Filtrele', favoriteCinema: 'Favori Sinema',
    distance: 'Mesafe', km: 'km',
  },
  sensors: {
    title: 'Sensörler', accelerometer: 'İvmeölçer', location: 'Konum',
    battery: 'Batarya', network: 'Ağ Durumu', brightness: 'Parlaklık',
    latitude: 'Enlem', longitude: 'Boylam', altitude: 'İrtifa',
    speed: 'Hız', heading: 'Yön', accuracy: 'Doğruluk',
    charging: 'Şarj Oluyor', notCharging: 'Şarj Olmuyor',
    wifi: 'Wi-Fi', cellular: 'Mobil Veri', noConnection: 'Bağlantı Yok',
    cinemaMode: 'Sinema Modu', normalMode: 'Normal Mod',
    getLocation: 'Konumu Al', meters: 'metre', mps: 'm/s',
  },
  notifications: {
    title: 'Bildirimler', scheduleNow: 'Hemen Bildirim Gönder',
    scheduleLater: 'Sonra Hatırlat', dailyReminder: 'Günlük Hatırlatıcı',
    permissionDenied: 'Bildirim izni reddedildi',
    sent: 'Bildirim gönderildi!', scheduled: 'Bildirim planlandı',
  },
  a11y: {
    posterImage: 'Film posteri', ratingBadge: 'Puan rozeti',
    favoriteButton: 'Favorilere ekle butonu', removeButton: 'Kaldır butonu',
    searchInput: 'Arama kutusu', closeModal: 'Modalı kapat',
    playTrailer: 'Fragmanı oynat', cinemaMode: 'Sinema modunu aç/kapat',
    batteryLevel: 'Batarya seviyesi', networkStatus: 'Ağ bağlantı durumu',
    mapMarker: 'Sinema konumu', sortButton: 'Sıralama seçenekleri',
    pageNumber: 'Sayfa numarası', starRating: 'Yıldız puanı',
  },
};

export default tr;