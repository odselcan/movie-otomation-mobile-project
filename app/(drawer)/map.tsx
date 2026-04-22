// app/(drawer)/map.tsx
// Ara    → expo-linking ile tel: URL (Linking.openURL)
// Rehbere Ekle → expo-contacts ile kişi kaydet
// SMS Gönder  → expo-sms ile hazır mesaj

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Callout,
  Circle,
  MapType,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

// ─── Tipler ───────────────────────────────────────────────────────────────────
type CinemaType =
  | 'Modern Salon'
  | 'Sanat Sineması'
  | 'IMAX Salon'
  | '4DX Salon'
  | 'VIP Salon'
  | 'Aile Sineması'
  | 'Öğrenci Dostu'
  | 'Gece Sineması'
  | 'Klasik Salon';

interface Cinema {
  id: string;
  title: string;
  lat: number;
  lng: number;
  type: CinemaType;
  rating: string;
  desc: string;
  address: string;
  phone: string;
  price: string;
  nowPlaying: string[];
}

interface MapTypeOption {
  label: string;
  emoji: string;
  value: MapType;
}

// ─── Renk haritası ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  'IMAX Salon':     '#6C3483',
  '4DX Salon':      '#1A5276',
  'VIP Salon':      '#B7950B',
  'Sanat Sineması': '#1E8449',
  'Gece Sineması':  '#2E4057',
  'Klasik Salon':   '#784212',
  'Aile Sineması':  '#1F618D',
  'Öğrenci Dostu':  '#117A65',
  'Modern Salon':   '#DB7093',
};

// ─── Sinema verisi ─────────────────────────────────────────────────────────────
const CINEMAS: Cinema[] = [
  {
    id: '1', title: 'Pembe Sinema', lat: 41.0082, lng: 28.9784,
    type: 'Modern Salon', rating: '4.8',
    desc: 'İstanbul\'un kalbinde modern sinema deneyimi.',
    address: 'Sultanahmet, İstanbul', phone: '02125550101',
    price: '80₺', nowPlaying: ['Dune: Part Two', 'Oppenheimer'],
  },
  {
    id: '2', title: 'Kadıköy Film Evi', lat: 40.9901, lng: 29.0284,
    type: 'Sanat Sineması', rating: '4.9',
    desc: 'Bağımsız film festivali devam ediyor.',
    address: 'Kadıköy, İstanbul', phone: '02165550202',
    price: '65₺', nowPlaying: ['Past Lives', 'Anatomy of a Fall'],
  },
  {
    id: '3', title: 'Beşiktaş Yıldız', lat: 41.0428, lng: 29.0075,
    type: 'Öğrenci Dostu', rating: '4.5',
    desc: 'Öğrenci kimliğiyle %30 indirim!',
    address: 'Beşiktaş, İstanbul', phone: '02125550303',
    price: '55₺', nowPlaying: ['Poor Things', 'The Zone of Interest'],
  },
  {
    id: '4', title: 'Şişli Kristal', lat: 41.0602, lng: 28.9876,
    type: 'IMAX Salon', rating: '4.7',
    desc: 'Dev ekranda Dolby Atmos deneyimi.',
    address: 'Şişli, İstanbul', phone: '02125550404',
    price: '140₺', nowPlaying: ['Killers of the Flower Moon', 'Napoleon'],
  },
  {
    id: '5', title: 'Üsküdar Gece', lat: 41.0231, lng: 29.0151,
    type: 'Gece Sineması', rating: '4.6',
    desc: 'Gece yarısı özel gösterimleri her Cuma!',
    address: 'Üsküdar, İstanbul', phone: '02165550505',
    price: '70₺', nowPlaying: ['Saltburn', 'May December'],
  },
  {
    id: '6', title: 'Bakırköy Prens', lat: 40.9812, lng: 28.8702,
    type: '4DX Salon', rating: '4.7',
    desc: '4DX ile filmi hisset, sadece izleme!',
    address: 'Bakırköy, İstanbul', phone: '02125550606',
    price: '160₺', nowPlaying: ['Mission Impossible 8', 'Fast X'],
  },
  {
    id: '7', title: 'Sarıyer Platin', lat: 41.1668, lng: 29.0580,
    type: 'VIP Salon', rating: '4.9',
    desc: 'Koltukta yemek servisi, VIP deneyim.',
    address: 'Sarıyer, İstanbul', phone: '02125550707',
    price: '250₺', nowPlaying: ['The Holdovers', 'Ferrari'],
  },
  {
    id: '8', title: 'Ataşehir Park', lat: 40.9823, lng: 29.1275,
    type: 'Aile Sineması', rating: '4.4',
    desc: 'Çocuk dostu salonlar ve oyun alanı.',
    address: 'Ataşehir, İstanbul', phone: '02165550808',
    price: '60₺', nowPlaying: ['Wish', 'The Marvels'],
  },
  {
    id: '9', title: 'Taksim Rüya', lat: 41.0369, lng: 28.9850,
    type: 'Klasik Salon', rating: '4.6',
    desc: '1970\'lerden kalma nostaljik atmosfer.',
    address: 'Taksim, İstanbul', phone: '02125550909',
    price: '50₺', nowPlaying: ['Casablanca (Klasik)', 'The Godfather (Klasik)'],
  },
];

const MAP_TYPES: MapTypeOption[] = [
  { label: 'Normal',  emoji: '🗺️', value: 'standard'  },
  { label: 'Uydu',   emoji: '🛰️', value: 'satellite' },
  { label: 'Arazi',  emoji: '⛰️', value: 'terrain'   },
  { label: 'Hibrit', emoji: '🌍', value: 'hybrid'    },
];

const ISTANBUL_REGION: Region = {
  latitude: 41.0250, longitude: 28.9850,
  latitudeDelta: 0.18, longitudeDelta: 0.18,
};

const FAV_KEY = 'favorite_cinemas';

// ─── Pure helper — component dışında ─────────────────────────────────────────
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [mapLoading, setMapLoading]           = useState(true);
  const [mapType, setMapType]                 = useState<MapType>('standard');
  const [mapTypeModal, setMapTypeModal]       = useState(false);
  const [selectedCinema, setSelectedCinema]   = useState<Cinema | null>(null);
  const [favIds, setFavIds]                   = useState<string[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeTypes, setActiveTypes]         = useState<string[]>([]);
  const [showFilters, setShowFilters]         = useState(false);
  const [userLocation, setUserLocation]       = useState<{ lat: number; lng: number } | null>(null);
  const [showTip, setShowTip]                 = useState(true);
  const [locationLoading, setLocationLoading] = useState(false); // ✅ YENİ

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(FAV_KEY).then((raw) => {
        if (raw) setFavIds(JSON.parse(raw));
      });
    }, [])
  );

  useEffect(() => {
    const t = setTimeout(() => setShowTip(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const filteredCinemas = CINEMAS.filter((c) => {
    const matchSearch =
      searchQuery === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = activeTypes.length === 0 || activeTypes.includes(c.type);
    return matchSearch && matchType;
  });

  const toggleType = (type: string) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetMap = () => {
    setSearchQuery('');
    setActiveTypes([]);
    setSelectedCinema(null);
    mapRef.current?.animateToRegion(ISTANBUL_REGION, 600);
  };

  const toggleFav = async (id: string) => {
    const next = favIds.includes(id)
      ? favIds.filter((f) => f !== id)
      : [...favIds, id];
    setFavIds(next);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
  };

  const handleMarkerPress = (cinema: Cinema) => {
    setSelectedCinema(cinema);
    mapRef.current?.animateToRegion(
      { latitude: cinema.lat, longitude: cinema.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      500
    );
  };

  const handleCall = (cinema: Cinema) => {
    const url = `tel:${cinema.phone}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'Bu cihazda arama yapılamıyor.');
      }
    });
  };

  const handleAddContact = async (cinema: Cinema) => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Rehbere eklemek için izin vermeniz gerekiyor.');
      return;
    }
    try {
      const contact: Contacts.Contact = {
        contactType: Contacts.ContactTypes.Company,
        name: cinema.title,
        company: cinema.title,
        phoneNumbers: [{ number: cinema.phone, label: 'work' }],
        addresses: [{ street: cinema.address, label: 'work' }],
        note: `${cinema.type} | ${cinema.price} | Puan: ${cinema.rating}`,
      };
      await Contacts.addContactAsync(contact);
      Alert.alert('✅ Başarılı', `"${cinema.title}" rehbere eklendi!`);
    } catch (e) {
      Alert.alert('Hata', 'Rehbere eklenemedi.');
    }
  };

  const handleSMS = async (cinema: Cinema) => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Hata', 'Bu cihazda SMS gönderilemiyor.');
      return;
    }
    const message =
      `🎬 ${cinema.title} sinemasına gidiyorum!\n` +
      `📍 ${cinema.address}\n` +
      `🎟️ Bilet fiyatı: ${cinema.price}\n` +
      `⭐ Puan: ${cinema.rating}\n` +
      `🎞️ Gösterimde: ${cinema.nowPlaying[0]}\n` +
      `📞 İletişim: ${cinema.phone}`;
    await SMS.sendSMSAsync([], message);
  };

  // ✅ YENİ — En Yakın Sinema (component içinde, tüm state'lere erişebilir)
  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum izni verilmedi.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;

      // Circle + Polyline için state güncelle
      setUserLocation({ lat: latitude, lng: longitude });

      // En yakın sinemayı bul (yerel değişkenle — state güncellenmesini bekleme)
      let minDist = Infinity;
      let nearest = CINEMAS[0];
      for (const cinema of CINEMAS) {
        const dist = getDistance(latitude, longitude, cinema.lat, cinema.lng);
        if (dist < minDist) {
          minDist = dist;
          nearest = cinema;
        }
      }

      // Seç ve haritayı oraya animasyonla götür
      setSelectedCinema(nearest);
      mapRef.current?.animateToRegion(
        {
          latitude: nearest.lat,
          longitude: nearest.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        800
      );

      Alert.alert(
        '📍 En Yakın Sinema',
        `${nearest.title}\n(${minDist.toFixed(1)} km uzakta)`,
        [{ text: 'Tamam' }]
      );
    } catch (e) {
      Alert.alert('Hata', 'Konum alınamadı.');
    } finally {
      setLocationLoading(false);
    }
  };

  const currentMapTypeOption = MAP_TYPES.find((m) => m.value === mapType)!;
  const uniqueTypes = Array.from(new Set(CINEMAS.map((c) => c.type)));

  return (
    <View style={styles.container}>

      {mapLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#DB7093" />
          <Text style={styles.loaderText}>Sinemalar Yükleniyor...</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        showsUserLocation={userLocation !== null}
        showsMyLocationButton={false}
        onMapReady={() => setMapLoading(false)}
        initialRegion={ISTANBUL_REGION}
      >
        {userLocation && (
          <Circle
            center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            radius={800}
            strokeColor="#DB7093"
            fillColor="rgba(219,112,147,0.12)"
            strokeWidth={1.5}
          />
        )}

        {userLocation && selectedCinema && (
          <Polyline
            coordinates={[
              { latitude: userLocation.lat, longitude: userLocation.lng },
              { latitude: selectedCinema.lat, longitude: selectedCinema.lng },
            ]}
            strokeColor="#DB7093"
            strokeWidth={2.5}
            lineDashPattern={[8, 6]}
          />
        )}

        {filteredCinemas.map((cinema) => {
          const isSelected = selectedCinema?.id === cinema.id;
          const isFav      = favIds.includes(cinema.id);
          const color      = TYPE_COLORS[cinema.type] ?? '#DB7093';
          const dist       = userLocation
            ? getDistance(userLocation.lat, userLocation.lng, cinema.lat, cinema.lng)
            : null;

          return (
            <Marker
              key={cinema.id}
              coordinate={{ latitude: cinema.lat, longitude: cinema.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerPress(cinema)}
            >
              <View style={[
                styles.marker,
                { backgroundColor: color },
                isSelected && styles.markerSelected,
              ]}>
                <Text style={styles.markerIcon}>🎬</Text>
                {isFav && <View style={styles.favDot} />}
              </View>

              <Callout tooltip onPress={() => setSelectedCinema(cinema)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{cinema.title}</Text>
                  <Text style={styles.calloutType}>{cinema.type}</Text>
                  <View style={styles.calloutRow}>
                    <Text style={styles.calloutRating}>⭐ {cinema.rating}</Text>
                    <Text style={styles.calloutPrice}>{cinema.price}</Text>
                  </View>
                  {dist !== null && (
                    <Text style={styles.calloutDist}>📍 {dist.toFixed(1)} km uzakta</Text>
                  )}
                  <Text style={styles.calloutTap}>Detay için dokun →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Üst Arama + Filtre */}
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#DB7093" />
          <TextInput
            style={styles.searchInput}
            placeholder="Sinema veya tür ara..."
            placeholderTextColor="#c0a0b0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#DB7093" />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Ionicons name="options-outline" size={18} color={showFilters ? 'white' : '#DB7093'} />
          {activeTypes.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeTypes.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {uniqueTypes.map((type) => {
            const active = activeTypes.includes(type);
            const color  = TYPE_COLORS[type] ?? '#DB7093';
            return (
              <Pressable
                key={type}
                style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => toggleType(type)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
              </Pressable>
            );
          })}
          {activeTypes.length > 0 && (
            <Pressable style={[styles.chip, styles.chipClear]} onPress={() => setActiveTypes([])}>
              <Text style={styles.chipClearText}>✕ Temizle</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <View style={styles.counterBadge}>
        <Ionicons name="film-outline" size={13} color="#DB7093" />
        <Text style={styles.counterText}>{filteredCinemas.length}/{CINEMAS.length} sinema</Text>
      </View>

      {showTip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            💡 Marker'lara basarak detay görün, Callout ile hızlı bilgi alın
          </Text>
        </View>
      )}

      {/* FAB Grubu */}
      <View style={styles.fabGroup}>
        {/* Harita türü */}
        <TouchableOpacity style={styles.fab} onPress={() => setMapTypeModal(true)}>
          <Text style={styles.fabEmoji}>{currentMapTypeOption.emoji}</Text>
          <Text style={styles.fabLabel}>{currentMapTypeOption.label}</Text>
        </TouchableOpacity>

        {/* Sıfırla */}
        <TouchableOpacity style={styles.fabIcon} onPress={resetMap}>
          <Ionicons name="refresh-outline" size={22} color="#DB7093" />
        </TouchableOpacity>

        {/* ✅ YENİ — En Yakın Sinema */}
        <TouchableOpacity
          style={[styles.fabIcon, locationLoading && { opacity: 0.5 }]}
          onPress={handleGetLocation}
          disabled={locationLoading}
        >
          {locationLoading
            ? <ActivityIndicator size="small" color="#DB7093" />
            : <Ionicons name="navigate-outline" size={22} color="#DB7093" />
          }
        </TouchableOpacity>
      </View>

      {/* Renk Legend */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.legendScroll}
        contentContainerStyle={styles.legendContent}
      >
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{type}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Harita Türü Modal */}
      <Modal visible={mapTypeModal} transparent animationType="slide" onRequestClose={() => setMapTypeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMapTypeModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.menuTitle}>🗺️  Harita Türü Seç</Text>
            {MAP_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt.value}
                style={[styles.mapTypeRow, mapType === mt.value && styles.mapTypeRowActive]}
                onPress={() => { setMapType(mt.value); setMapTypeModal(false); }}
              >
                <Text style={styles.mapTypeEmoji}>{mt.emoji}</Text>
                <Text style={[styles.mapTypeLabel, mapType === mt.value && styles.mapTypeLabelActive]}>{mt.label}</Text>
                {mapType === mt.value && <Ionicons name="checkmark-circle" size={20} color="#DB7093" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sinema Detay Modal */}
      <Modal visible={selectedCinema !== null} transparent animationType="slide" onRequestClose={() => setSelectedCinema(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedCinema(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            {selectedCinema && (() => {
              const isFav = favIds.includes(selectedCinema.id);
              const color = TYPE_COLORS[selectedCinema.type] ?? '#DB7093';

              return (
                <>
                  <View style={styles.dragHandle} />

                  <View style={styles.sheetHeader}>
                    <View style={[styles.sheetColorBar, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetTitle}>{selectedCinema.title}</Text>
                      <Text style={styles.sheetType}>{selectedCinema.type}</Text>
                    </View>
                    <Pressable style={styles.favBtn} onPress={() => toggleFav(selectedCinema.id)}>
                      <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={24} color={isFav ? '#DB7093' : '#ccc'} />
                    </Pressable>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaIcon}>⭐</Text>
                      <Text style={styles.metaVal}>{selectedCinema.rating}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaIcon}>🎟️</Text>
                      <Text style={styles.metaVal}>{selectedCinema.price}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaIcon}>📞</Text>
                      <Text style={styles.metaVal}>{selectedCinema.phone.slice(-10)}</Text>
                    </View>
                  </View>

                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color="#DB7093" />
                    <Text style={styles.addressText}>{selectedCinema.address}</Text>
                  </View>

                  <View style={styles.descBox}>
                    <Text style={styles.descText}>{selectedCinema.desc}</Text>
                  </View>

                  <Text style={styles.nowPlayingLabel}>🎬 Şu an gösterimde:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.nowPlayingRow}>
                      {selectedCinema.nowPlaying.map((film) => (
                        <View key={film} style={styles.filmChip}>
                          <Text style={styles.filmChipText}>{film}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {/* ── 3 Aksiyon Butonu ── */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2ecc71' }]}
                      onPress={() => handleCall(selectedCinema)}
                    >
                      <Ionicons name="call-outline" size={18} color="white" />
                      <Text style={styles.actionBtnText}>Ara</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#3498db' }]}
                      onPress={() => handleAddContact(selectedCinema)}
                    >
                      <Ionicons name="person-add-outline" size={18} color="white" />
                      <Text style={styles.actionBtnText}>Rehber</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#9b59b6' }]}
                      onPress={() => handleSMS(selectedCinema)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="white" />
                      <Text style={styles.actionBtnText}>SMS</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Bilet Al / Kapat */}
                  <View style={styles.sheetButtons}>
                    <TouchableOpacity
                      style={[styles.sheetBtn, styles.sheetBtnSecondary]}
                      onPress={() => setSelectedCinema(null)}
                    >
                      <Ionicons name="close-outline" size={16} color="#DB7093" />
                      <Text style={styles.sheetBtnSecText}>Kapat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sheetBtn, styles.sheetBtnPrimary]}
                      onPress={() => { setSelectedCinema(null); router.push('/(drawer)/(tabs)'); }}
                    >
                      <Ionicons name="ticket-outline" size={16} color="white" />
                      <Text style={styles.sheetBtnText}>Bilet Al</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF5F7',
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  loaderText: { marginTop: 10, color: '#DB7093', fontWeight: 'bold', fontSize: 14 },
  marker: {
    padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white',
    elevation: 4, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  markerSelected: { borderColor: '#FFD1DC', transform: [{ scale: 1.25 }], elevation: 8 },
  markerIcon: { fontSize: 16 },
  favDot: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#FF4081', borderWidth: 1.5, borderColor: 'white',
  },
  callout: {
    backgroundColor: 'white', borderRadius: 14, padding: 12,
    minWidth: 160, maxWidth: 200, elevation: 6,
    borderWidth: 1.5, borderColor: '#FFD1DC',
  },
  calloutTitle: { fontSize: 13, fontWeight: 'bold', color: '#DB7093', marginBottom: 2 },
  calloutType:  { fontSize: 11, color: '#aaa', marginBottom: 4 },
  calloutRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  calloutRating:{ fontSize: 12, color: '#f39c12', fontWeight: '600' },
  calloutPrice: { fontSize: 12, color: '#4A4A4A', fontWeight: '600' },
  calloutDist:  { fontSize: 11, color: '#888', marginBottom: 3 },
  calloutTap:   { fontSize: 10, color: '#DB7093', textAlign: 'right', fontStyle: 'italic' },
  topBar: {
    position: 'absolute', top: 10, left: 12, right: 12,
    flexDirection: 'row', gap: 8,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 9,
    elevation: 5, borderWidth: 1, borderColor: '#FFD1DC',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#4A4A4A', padding: 0 },
  filterToggle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'white', elevation: 5,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFD1DC',
  },
  filterToggleActive: { backgroundColor: '#DB7093', borderColor: '#DB7093' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#e74c3c', borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  chipsScroll: { position: 'absolute', top: 64, left: 0, right: 0 },
  chipsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#FFD1DC', elevation: 2,
  },
  chipText: { fontSize: 11, color: '#DB7093', fontWeight: '600' },
  chipTextActive: { color: 'white' },
  chipClear: { backgroundColor: '#fff0f4', borderColor: '#e74c3c' },
  chipClearText: { fontSize: 11, color: '#e74c3c', fontWeight: '600' },
  counterBadge: {
    position: 'absolute', top: 118, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, elevation: 3, borderWidth: 1, borderColor: '#FFD1DC',
  },
  counterText: { fontSize: 12, color: '#DB7093', fontWeight: '600' },
  tooltip: {
    position: 'absolute', top: 148, left: 12, right: 70,
    backgroundColor: 'rgba(219,112,147,0.92)',
    borderRadius: 12, padding: 10,
  },
  tooltipText: { color: 'white', fontSize: 12, lineHeight: 17 },
  fabGroup: { position: 'absolute', top: 50, right: 12, gap: 8, alignItems: 'flex-end' },
  fab: {
    backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 30, elevation: 5,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#FFD1DC',
  },
  fabEmoji: { fontSize: 18 },
  fabLabel:  { fontSize: 12, fontWeight: 'bold', color: '#DB7093' },
  fabIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'white', elevation: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFD1DC',
  },
  legendScroll: { position: 'absolute', bottom: 16, left: 0, right: 0 },
  legendContent: { paddingHorizontal: 12, gap: 6 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.93)',
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 20, elevation: 2,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: '#555', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, elevation: 20,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#FFD1DC',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  menuTitle: { fontSize: 17, fontWeight: 'bold', color: '#DB7093', marginBottom: 12 },
  mapTypeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: '#FAFAFA', gap: 12,
  },
  mapTypeRowActive: { backgroundColor: '#FFF0F4', borderWidth: 1.5, borderColor: '#FFD1DC' },
  mapTypeEmoji: { fontSize: 22 },
  mapTypeLabel: { fontSize: 15, color: '#555', flex: 1 },
  mapTypeLabelActive: { color: '#DB7093', fontWeight: 'bold' },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  sheetColorBar: { width: 4, height: 48, borderRadius: 2, marginTop: 2 },
  sheetTitle: { fontSize: 19, fontWeight: 'bold', color: '#2C2C2C' },
  sheetType:  { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 2 },
  favBtn: { padding: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF5F7', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#FFD1DC',
  },
  metaIcon: { fontSize: 12 },
  metaVal:  { fontSize: 12, fontWeight: '600', color: '#4A4A4A' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  addressText: { fontSize: 12, color: '#888' },
  descBox: {
    backgroundColor: '#FFF5F7', padding: 12,
    borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FFD1DC',
  },
  descText: { fontSize: 13, color: '#4A4A4A', lineHeight: 19 },
  nowPlayingLabel: { fontSize: 13, fontWeight: '600', color: '#DB7093', marginBottom: 6 },
  nowPlayingRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filmChip: {
    backgroundColor: '#DB7093', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  filmChipText: { color: 'white', fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
  },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  sheetButtons: { flexDirection: 'row', gap: 10 },
  sheetBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  sheetBtnPrimary:   { backgroundColor: '#DB7093' },
  sheetBtnSecondary: { backgroundColor: '#FFF0F4', borderWidth: 1, borderColor: '#FFD1DC' },
  sheetBtnText:    { color: 'white',  fontWeight: 'bold', fontSize: 14 },
  sheetBtnSecText: { color: '#DB7093', fontWeight: 'bold', fontSize: 14 },
});