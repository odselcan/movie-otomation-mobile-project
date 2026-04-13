import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { MapType, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

type Cinema = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  type: string;
  rating: string;
  desc: string;
};

type MapTypeOption = {
  label: string;
  emoji: string;
  value: MapType;
};

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [currentMapType, setCurrentMapType] = useState<MapType>('standard');
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [mapTypeMenuVisible, setMapTypeMenuVisible] = useState(false);
  const router = useRouter();

  
  const mapTypes: MapTypeOption[] = [
    { label: 'Normal',  emoji: '🗺️', value: 'standard'  },
    { label: 'Uydu',   emoji: '🛰️', value: 'satellite' },
    { label: 'Arazi',  emoji: '⛰️', value: 'terrain'   },
    { label: 'Hibrit', emoji: '🌍', value: 'hybrid'    },
  ];

  const cinemas: Cinema[] = [
    { id: '1', title: 'Pembe Sinema',    lat: 41.0082, lng: 28.9784, type: 'Modern Salon',   rating: '4.8', desc: 'Haftanın Filmi: Dune: Part Two' },
    { id: '2', title: 'Kadıköy Film Evi',lat: 40.9901, lng: 29.0284, type: 'Sanat Sineması', rating: '4.9', desc: 'Bağımsız film festivali devam ediyor.' },
    { id: '3', title: 'Beşiktaş Yıldız', lat: 41.0428, lng: 29.0075, type: 'Öğrenci Dostu', rating: '4.5', desc: 'Mısır menülerinde %20 indirim!' },
    { id: '4', title: 'Şişli Kristal',   lat: 41.0602, lng: 28.9876, type: 'IMAX Salon',    rating: '4.7', desc: 'Dev ekranda sinema keyfi.' },
    { id: '5', title: 'Üsküdar Gece',    lat: 41.0231, lng: 29.0151, type: 'Gece Sineması', rating: '4.6', desc: 'Gece yarısı özel gösterimleri her Cuma!' },
    { id: '6', title: 'Bakırköy Prens',  lat: 40.9812, lng: 28.8702, type: '4DX Salon',     rating: '4.7', desc: '4DX ile filmi hisset, sadece izleme!' },
    { id: '7', title: 'Sarıyer Platin',  lat: 41.1668, lng: 29.0580, type: 'VIP Salon',     rating: '4.9', desc: 'Koltukta yemek servisi, VIP deneyim.' },
    { id: '8', title: 'Ataşehir Park',   lat: 40.9823, lng: 29.1275, type: 'Aile Sineması', rating: '4.4', desc: 'Çocuk dostu salonlar ve oyun alanı.' },
    { id: '9', title: 'Taksim Rüya',     lat: 41.0369, lng: 28.9850, type: 'Klasik Salon',  rating: '4.6', desc: '1970\'lerden kalma nostaljik atmosfer.' },
  ];

  const currentMapTypeOption = mapTypes.find(m => m.value === currentMapType)!;

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#DB7093" />
          <Text style={styles.loaderText}>Sinemalar Hazırlanıyor...</Text>
        </View>
      )}

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={currentMapType}
        onMapReady={() => setLoading(false)}
        initialRegion={{
          latitude: 41.0250,
          longitude: 28.9850,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        }}
      >
        {cinemas.map((cinema) => (
          <Marker
            key={cinema.id}
            coordinate={{ latitude: cinema.lat, longitude: cinema.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => setSelectedCinema(cinema)}
          >
            <View style={[
              styles.pinkMarker,
              selectedCinema?.id === cinema.id && styles.pinkMarkerSelected,
            ]}>
              <Text style={styles.markerIcon}>🎬</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setMapTypeMenuVisible(true)}
      >
        <Text style={styles.fabIcon}>{currentMapTypeOption.emoji}</Text>
        <Text style={styles.fabLabel}>{currentMapTypeOption.label}</Text>
      </TouchableOpacity>

      <Modal
        visible={mapTypeMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMapTypeMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMapTypeMenuVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.menuTitle}>🗺️  Harita Türü Seç</Text>

            <ScrollView>
              {mapTypes.map((mt) => (
                <TouchableOpacity
                  key={mt.value}
                  style={[
                    styles.mapTypeRow,
                    currentMapType === mt.value && styles.mapTypeRowActive,
                  ]}
                  onPress={() => {
                    setCurrentMapType(mt.value);
                    setMapTypeMenuVisible(false);
                  }}
                >
                  <Text style={styles.mapTypeEmoji}>{mt.emoji}</Text>
                  <Text style={[
                    styles.mapTypeLabel,
                    currentMapType === mt.value && styles.mapTypeLabelActive,
                  ]}>
                    {mt.label}
                  </Text>
                  {currentMapType === mt.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sinema Detay Modalı */}
      <Modal
        visible={selectedCinema !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCinema(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCinema(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            {selectedCinema && (
              <>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{selectedCinema.title}</Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ {selectedCinema.rating}</Text>
                  </View>
                </View>
                <Text style={styles.sheetType}>{selectedCinema.type}</Text>
                <View style={styles.sheetDescBox}>
                  <Text style={styles.sheetDesc}>{selectedCinema.desc}</Text>
                </View>
                <TouchableOpacity
                  style={styles.ticketButton}
                  onPress={() => {
                    setSelectedCinema(null);
                    router.push('/(drawer)/(tabs)');
                  }}
                >
                  <Text style={styles.ticketButtonText}>🎟️  Bilet Al</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF5F7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderText: { marginTop: 10, color: '#DB7093', fontWeight: 'bold', fontSize: 14 },

  pinkMarker: {
    backgroundColor: '#DB7093',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinkMarkerSelected: {
    backgroundColor: '#C2185B',
    borderColor: '#FFD1DC',
    transform: [{ scale: 1.2 }],
  },
  markerIcon: { fontSize: 16 },

  // FAB — emoji + label
  fab: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fabIcon: { fontSize: 20 },
  fabLabel: { fontSize: 13, fontWeight: 'bold', color: '#DB7093' },

  // Ortak Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#FFD1DC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Harita Türü Menüsü
  menuTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#DB7093',
    marginBottom: 12,
  },
  mapTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  mapTypeRowActive: {
    backgroundColor: '#FFF0F4',
    borderWidth: 1.5,
    borderColor: '#FFD1DC',
  },
  mapTypeEmoji: { fontSize: 24 },
  mapTypeLabel: { fontSize: 16, color: '#555', flex: 1 },
  mapTypeLabelActive: { color: '#DB7093', fontWeight: 'bold' },
  checkmark: { fontSize: 18, color: '#DB7093', fontWeight: 'bold' },

  // Sinema Detay
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#DB7093', flex: 1, marginRight: 10 },
  ratingBadge: { backgroundColor: '#FFB84D', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ratingText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  sheetType: { fontSize: 13, color: '#999', fontStyle: 'italic', marginBottom: 12 },
  sheetDescBox: {
    backgroundColor: '#FFF5F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD1DC',
  },
  sheetDesc: { fontSize: 14, color: '#4A4A4A', lineHeight: 20 },
  ticketButton: {
    backgroundColor: '#DB7093',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ticketButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});