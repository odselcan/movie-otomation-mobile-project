// app/(drawer)/map.tsx — Netflix dark tema

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import MapView, {
  Callout, Circle, MapType, Marker, Polyline,
  PROVIDER_GOOGLE, Region,
} from 'react-native-maps';
import { useI18n } from '../../hooks/useI18n';
import { C, Radius } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type CinemaType =
  | 'Modern Salon' | 'Sanat Sineması' | 'IMAX Salon' | '4DX Salon'
  | 'VIP Salon' | 'Aile Sineması' | 'Öğrenci Dostu' | 'Gece Sineması' | 'Klasik Salon';

interface Cinema {
  id: string; title: string; lat: number; lng: number;
  type: CinemaType; rating: string; desc: string; descEn: string;
  address: string; phone: string; price: string; nowPlaying: string[];
}
interface MapTypeOption { emoji: string; value: MapType; }

// ─── Data ─────────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  'IMAX Salon':     '#6C3483', '4DX Salon':      '#1A5276',
  'VIP Salon':      '#B7950B', 'Sanat Sineması': '#1E8449',
  'Gece Sineması':  '#2E4057', 'Klasik Salon':   '#784212',
  'Aile Sineması':  '#1F618D', 'Öğrenci Dostu':  '#117A65',
  'Modern Salon':   C.accent,
};

const CINEMAS: Cinema[] = [
  { id:'1', title:'Pembe Sinema',     lat:41.0082, lng:28.9784, type:'Modern Salon',   rating:'4.8', desc:'İstanbul\'un kalbinde modern sinema deneyimi.', descEn:'Modern cinema experience in the heart of Istanbul.', address:'Sultanahmet, İstanbul', phone:'02125550101', price:'80₺',  nowPlaying:['Dune: Part Two','Oppenheimer'] },
  { id:'2', title:'Kadıköy Film Evi', lat:40.9901, lng:29.0284, type:'Sanat Sineması', rating:'4.9', desc:'Bağımsız film festivali devam ediyor.',            descEn:'Independent film festival ongoing.',               address:'Kadıköy, İstanbul',      phone:'02165550202', price:'65₺',  nowPlaying:['Past Lives','Anatomy of a Fall'] },
  { id:'3', title:'Beşiktaş Yıldız', lat:41.0428, lng:29.0075, type:'Öğrenci Dostu',  rating:'4.5', desc:'Öğrenci kimliğiyle %30 indirim!',                  descEn:'30% discount with student ID!',                   address:'Beşiktaş, İstanbul',     phone:'02125550303', price:'55₺',  nowPlaying:['Poor Things','The Zone of Interest'] },
  { id:'4', title:'Şişli Kristal',   lat:41.0602, lng:28.9876, type:'IMAX Salon',     rating:'4.7', desc:'Dev ekranda Dolby Atmos deneyimi.',                descEn:'Dolby Atmos experience on a giant screen.',       address:'Şişli, İstanbul',        phone:'02125550404', price:'140₺', nowPlaying:['Killers of the Flower Moon','Napoleon'] },
  { id:'5', title:'Üsküdar Gece',    lat:41.0231, lng:29.0151, type:'Gece Sineması',  rating:'4.6', desc:'Gece yarısı özel gösterimleri her Cuma!',          descEn:'Midnight special screenings every Friday!',       address:'Üsküdar, İstanbul',      phone:'02165550505', price:'70₺',  nowPlaying:['Saltburn','May December'] },
  { id:'6', title:'Bakırköy Prens',  lat:40.9812, lng:28.8702, type:'4DX Salon',      rating:'4.7', desc:'4DX ile filmi hisset, sadece izleme!',             descEn:'Feel the movie with 4DX, not just watch!',        address:'Bakırköy, İstanbul',     phone:'02125550606', price:'160₺', nowPlaying:['Mission Impossible 8','Fast X'] },
  { id:'7', title:'Sarıyer Platin',  lat:41.1668, lng:29.0580, type:'VIP Salon',      rating:'4.9', desc:'Koltukta yemek servisi, VIP deneyim.',             descEn:'In-seat dining service, VIP experience.',         address:'Sarıyer, İstanbul',      phone:'02125550707', price:'250₺', nowPlaying:['The Holdovers','Ferrari'] },
  { id:'8', title:'Ataşehir Park',   lat:40.9823, lng:29.1275, type:'Aile Sineması',  rating:'4.4', desc:'Çocuk dostu salonlar ve oyun alanı.',              descEn:'Child-friendly halls and play areas.',            address:'Ataşehir, İstanbul',     phone:'02165550808', price:'60₺',  nowPlaying:['Wish','The Marvels'] },
  { id:'9', title:'Taksim Rüya',     lat:41.0369, lng:28.9850, type:'Klasik Salon',   rating:'4.6', desc:'1970\'lerden kalma nostaljik atmosfer.',            descEn:'Nostalgic atmosphere from the 1970s.',            address:'Taksim, İstanbul',       phone:'02125550909', price:'50₺',  nowPlaying:['Casablanca (Klasik)','The Godfather (Klasik)'] },
];

const MAP_TYPES: MapTypeOption[] = [
  { emoji:'🗺️', value:'standard'  },
  { emoji:'🛰️', value:'satellite' },
  { emoji:'⛰️', value:'terrain'   },
  { emoji:'🌍', value:'hybrid'    },
];

const ISTANBUL_REGION: Region = {
  latitude:41.0250, longitude:28.9850, latitudeDelta:0.18, longitudeDelta:0.18,
};

// Google Maps koyu tema stili
const DARK_MAP_STYLE = [
  { elementType:'geometry',        stylers:[{ color:'#212121' }] },
  { elementType:'labels.text.fill',stylers:[{ color:'#757575' }] },
  { elementType:'labels.text.stroke',stylers:[{ color:'#212121' }] },
  { featureType:'road', elementType:'geometry', stylers:[{ color:'#2c2c2c' }] },
  { featureType:'road', elementType:'labels.text.fill', stylers:[{ color:'#8a8a8a' }] },
  { featureType:'water', elementType:'geometry', stylers:[{ color:'#000000' }] },
  { featureType:'water', elementType:'labels.text.fill', stylers:[{ color:'#3d3d3d' }] },
  { featureType:'poi', stylers:[{ visibility:'off' }] },
  { featureType:'transit', stylers:[{ visibility:'off' }] },
];

const FAV_KEY = 'favorite_cinemas';

function getDistance(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6371,dLat=((lat2-lat1)*Math.PI)/180,dLng=((lng2-lng1)*Math.PI)/180;
  const a=Math.sin(dLat/2)**2+Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const { t, isTurkish } = useI18n();
  const mapRef = useRef<MapView>(null);

  const CINEMA_TYPE_TR = React.useMemo(() => ({
    'Modern Salon':   t('map.type_modern'),   'Sanat Sineması': t('map.type_art'),
    'IMAX Salon':     t('map.type_imax'),     '4DX Salon':      t('map.type_4dx'),
    'VIP Salon':      t('map.type_vip'),      'Aile Sineması':  t('map.type_family'),
    'Öğrenci Dostu':  t('map.type_student'),  'Gece Sineması':  t('map.type_night'),
    'Klasik Salon':   t('map.type_classic'),
  }), [t]);

  const [mapLoading,       setMapLoading]       = useState(true);
  const [mapType,          setMapType]           = useState<MapType>('standard');
  const [mapTypeModal,     setMapTypeModal]      = useState(false);
  const [selectedCinema,   setSelectedCinema]    = useState<Cinema|null>(null);
  const [favIds,           setFavIds]            = useState<string[]>([]);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [activeTypes,      setActiveTypes]       = useState<string[]>([]);
  const [showFilters,      setShowFilters]       = useState(false);
  const [userLocation,     setUserLocation]      = useState<{lat:number;lng:number}|null>(null);
  const [showTip,          setShowTip]           = useState(true);
  const [locationLoading,  setLocationLoading]   = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(FAV_KEY).then(raw => { if (raw) setFavIds(JSON.parse(raw)); });
  }, []));

  useEffect(() => {
    const timer = setTimeout(() => setShowTip(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const filteredCinemas = CINEMAS.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = q==='' || c.title.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
    const matchType   = activeTypes.length===0 || activeTypes.includes(c.type);
    return matchSearch && matchType;
  });

  const toggleType = (type:string) =>
    setActiveTypes(prev => prev.includes(type) ? prev.filter(t=>t!==type) : [...prev,type]);

  const resetMap = () => {
    setSearchQuery(''); setActiveTypes([]); setSelectedCinema(null);
    mapRef.current?.animateToRegion(ISTANBUL_REGION, 600);
  };

  const toggleFav = async (id:string) => {
    const next = favIds.includes(id) ? favIds.filter(f=>f!==id) : [...favIds,id];
    setFavIds(next);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
  };

  const handleMarkerPress = (cinema:Cinema) => {
    setSelectedCinema(cinema);
    mapRef.current?.animateToRegion(
      { latitude:cinema.lat, longitude:cinema.lng, latitudeDelta:0.04, longitudeDelta:0.04 }, 500
    );
  };

  const handleCall = (cinema:Cinema) => {
    const url=`tel:${cinema.phone}`;
    Linking.canOpenURL(url).then(ok => ok ? Linking.openURL(url)
      : Alert.alert(t('common.error'), t('map.callNotSupported')));
  };

  const handleAddContact = async (cinema:Cinema) => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status!=='granted') { Alert.alert(t('common.warning'), t('map.contactPermission')); return; }
    try {
      await Contacts.addContactAsync({
        contactType: Contacts.ContactTypes.Company,
        name: cinema.title, company: cinema.title,
        phoneNumbers: [{ number:cinema.phone, label:'work' }],
        addresses:    [{ street:cinema.address, label:'work' }],
        note: `${cinema.type} | ${cinema.price} | Puan: ${cinema.rating}`,
      });
      Alert.alert('✅', `"${cinema.title}" ${t('map.contactAdded')}`);
    } catch { Alert.alert(t('common.error'), t('map.contactFailed')); }
  };

  const handleSMS = async (cinema:Cinema) => {
    if (!await SMS.isAvailableAsync()) { Alert.alert(t('common.error'), t('map.smsNotSupported')); return; }
    await SMS.sendSMSAsync([], [
      `🎬 ${cinema.title} sinemasına gidiyorum!`,
      `📍 ${cinema.address}`, `🎟️ ${cinema.price}`,
      `⭐ ${cinema.rating}`, `🎞️ ${cinema.nowPlaying[0]}`,
      `📞 ${cinema.phone}`,
    ].join('\n'));
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status!=='granted') { Alert.alert(t('common.warning'), t('map.locationPermission')); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setUserLocation({ lat:latitude, lng:longitude });
      let minDist=Infinity, nearest=CINEMAS[0];
      for (const c of CINEMAS) {
        const d = getDistance(latitude, longitude, c.lat, c.lng);
        if (d<minDist) { minDist=d; nearest=c; }
      }
      setSelectedCinema(nearest);
      mapRef.current?.animateToRegion(
        { latitude:nearest.lat, longitude:nearest.lng, latitudeDelta:0.04, longitudeDelta:0.04 }, 800
      );
      Alert.alert(t('map.nearestCinema'), `${nearest.title}\n(${minDist.toFixed(1)} ${t('map.kmAway')})`,
        [{ text:t('map.ok') }]);
    } catch { Alert.alert(t('common.error'), t('map.locationFailed')); }
    finally { setLocationLoading(false); }
  };

  const currentMT  = MAP_TYPES.find(m=>m.value===mapType)!;
  const uniqueTypes = Array.from(new Set(CINEMAS.map(c=>c.type)));

  return (
    <View style={styles.container}>
      {mapLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loaderText}>{t('map.loading')}</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        customMapStyle={mapType==='standard' ? DARK_MAP_STYLE : undefined}
        showsUserLocation={userLocation!==null}
        showsMyLocationButton={false}
        onMapReady={() => setMapLoading(false)}
        initialRegion={ISTANBUL_REGION}
      >
        {userLocation && (
          <Circle center={{ latitude:userLocation.lat, longitude:userLocation.lng }}
            radius={800} strokeColor={C.accent} fillColor="rgba(229,9,20,0.10)" strokeWidth={1.5} />
        )}
        {userLocation && selectedCinema && (
          <Polyline
            coordinates={[
              { latitude:userLocation.lat, longitude:userLocation.lng },
              { latitude:selectedCinema.lat, longitude:selectedCinema.lng },
            ]}
            strokeColor={C.accent} strokeWidth={2.5} lineDashPattern={[8,6]}
          />
        )}
        {filteredCinemas.map(cinema => {
          const isSelected = selectedCinema?.id===cinema.id;
          const isFav      = favIds.includes(cinema.id);
          const color      = TYPE_COLORS[cinema.type] ?? C.accent;
          const dist       = userLocation
            ? getDistance(userLocation.lat, userLocation.lng, cinema.lat, cinema.lng) : null;
          return (
            <Marker key={cinema.id}
              coordinate={{ latitude:cinema.lat, longitude:cinema.lng }}
              anchor={{ x:0.5, y:0.5 }}
              onPress={() => handleMarkerPress(cinema)}
            >
              <View style={[styles.marker, { backgroundColor:color }, isSelected && styles.markerSelected]}>
                <Text style={styles.markerIcon}>🎬</Text>
                {isFav && <View style={styles.favDot} />}
              </View>
              <Callout tooltip onPress={() => setSelectedCinema(cinema)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{cinema.title}</Text>
                  <Text style={styles.calloutType}>{CINEMA_TYPE_TR[cinema.type] ?? cinema.type}</Text>
                  <View style={styles.calloutRow}>
                    <Text style={styles.calloutRating}>⭐ {cinema.rating}</Text>
                    <Text style={styles.calloutPrice}>{cinema.price}</Text>
                  </View>
                  {dist!==null && <Text style={styles.calloutDist}>📍 {dist.toFixed(1)} {t('map.kmAway')}</Text>}
                  <Text style={styles.calloutTap}>{t('map.tapForDetail')}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Arama + filtre ───────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('map.searchPlaceholder')}
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery!=='' && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(v=>!v)}>
          <Ionicons name="options-outline" size={18} color={showFilters ? 'white' : C.textMuted} />
          {activeTypes.length>0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeTypes.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
          {uniqueTypes.map(type => {
            const active = activeTypes.includes(type);
            const color  = TYPE_COLORS[type] ?? C.accent;
            return (
              <Pressable key={type}
                style={[styles.chip, active && { backgroundColor:color, borderColor:color }]}
                onPress={() => toggleType(type)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {CINEMA_TYPE_TR[type] ?? type}
                </Text>
              </Pressable>
            );
          })}
          {activeTypes.length>0 && (
            <Pressable style={[styles.chip, styles.chipClear]} onPress={() => setActiveTypes([])}>
              <Text style={styles.chipClearText}>✕ {t('map.clearFilter')}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Sayaç */}
      <View style={styles.counterBadge}>
        <Ionicons name="film-outline" size={13} color={C.accent} />
        <Text style={styles.counterText}>{filteredCinemas.length}/{CINEMAS.length} {t('map.cinemaCount')}</Text>
      </View>

      {showTip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{t('map.tooltip')}</Text>
        </View>
      )}

      {/* FAB grubu */}
      <View style={styles.fabGroup}>
        <TouchableOpacity style={styles.fab} onPress={() => setMapTypeModal(true)}>
          <Text style={styles.fabEmoji}>{currentMT.emoji}</Text>
          <Text style={styles.fabLabel}>{t(`map.mapType_${currentMT.value}`)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabIcon} onPress={resetMap}>
          <Ionicons name="refresh-outline" size={22} color={C.textSub} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabIcon, locationLoading && {opacity:0.5}]}
          onPress={handleGetLocation} disabled={locationLoading}>
          {locationLoading
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Ionicons name="navigate-outline" size={22} color={C.textSub} />}
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.legendScroll} contentContainerStyle={styles.legendContent}>
        {Object.entries(TYPE_COLORS).map(([type,color]) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor:color }]} />
            <Text style={styles.legendText}>{type}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Harita türü modal ─────────────────────────────────────────────── */}
      <Modal visible={mapTypeModal} transparent animationType="slide"
        onRequestClose={() => setMapTypeModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMapTypeModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetMenuTitle}>{t('map.mapTypeTitle')}</Text>
            {MAP_TYPES.map(mt => (
              <TouchableOpacity key={mt.value}
                style={[styles.mapTypeRow, mapType===mt.value && styles.mapTypeRowActive]}
                onPress={() => { setMapType(mt.value); setMapTypeModal(false); }}>
                <Text style={styles.mapTypeEmoji}>{mt.emoji}</Text>
                <Text style={[styles.mapTypeLabel, mapType===mt.value && styles.mapTypeLabelActive]}>
                  {t(`map.mapType_${mt.value}`)}
                </Text>
                {mapType===mt.value && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Sinema detay modal ────────────────────────────────────────────── */}
      <Modal visible={selectedCinema!==null} transparent animationType="slide"
        onRequestClose={() => setSelectedCinema(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedCinema(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {selectedCinema && (() => {
              const isFav = favIds.includes(selectedCinema.id);
              const color = TYPE_COLORS[selectedCinema.type] ?? C.accent;
              return (
                <>
                  <View style={styles.sheetHandle} />
                  <View style={styles.sheetHeader}>
                    <View style={[styles.sheetColorBar, { backgroundColor:color }]} />
                    <View style={{ flex:1 }}>
                      <Text style={styles.sheetTitle}>{selectedCinema.title}</Text>
                      <Text style={styles.sheetType}>{CINEMA_TYPE_TR[selectedCinema.type] ?? selectedCinema.type}</Text>
                    </View>
                    <Pressable onPress={() => toggleFav(selectedCinema.id)} style={{ padding:4 }}>
                      <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={24}
                        color={isFav ? C.accent : C.textMuted} />
                    </Pressable>
                  </View>

                  <View style={styles.metaRow}>
                    {[`⭐ ${selectedCinema.rating}`, `🎟️ ${selectedCinema.price}`, `📞 ${selectedCinema.phone.slice(-10)}`]
                      .map(label => (
                        <View key={label} style={styles.metaBadge}>
                          <Text style={styles.metaText}>{label}</Text>
                        </View>
                      ))}
                  </View>

                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color={C.accent} />
                    <Text style={styles.addressText}>{selectedCinema.address}</Text>
                  </View>

                  <View style={styles.descBox}>
                    <Text style={styles.descText}>
                      {isTurkish ? selectedCinema.desc : selectedCinema.descEn}
                    </Text>
                  </View>

                  <Text style={styles.nowLabel}>{t('map.nowPlaying')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.nowRow}>
                      {selectedCinema.nowPlaying.map(film => (
                        <View key={film} style={styles.filmChip}>
                          <Text style={styles.filmChipText}>{film}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor:'#27ae60' }]}
                      onPress={() => handleCall(selectedCinema)}>
                      <Ionicons name="call-outline" size={18} color="white" />
                      <Text style={styles.actionBtnText}>{t('map.call')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor:'#2980b9' }]}
                      onPress={() => handleAddContact(selectedCinema)}>
                      <Ionicons name="person-add-outline" size={18} color="white" />
                      <Text style={styles.actionBtnText}>{t('map.contacts')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor:'#8e44ad' }]}
                      onPress={() => handleSMS(selectedCinema)}>
                      <Ionicons name="chatbubble-outline" size={18} color="white" />
                      <Text style={styles.actionBtnText}>{t('map.sms')}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity style={styles.sheetBtnSec} onPress={() => setSelectedCinema(null)}>
                      <Ionicons name="close-outline" size={16} color={C.textSub} />
                      <Text style={styles.sheetBtnSecText}>{t('map.close')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sheetBtnPrimary}
                      onPress={() => { setSelectedCinema(null); Linking.openURL('https://biletinial.com/tr-tr/sinema'); }}>
                      <Ionicons name="ticket-outline" size={16} color="white" />
                      <Text style={styles.sheetBtnText}>{t('map.buyTicket')}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:C.bg },
  map:       { width:'100%', height:'100%' },
  loader:    { ...StyleSheet.absoluteFillObject, backgroundColor:C.bg, justifyContent:'center', alignItems:'center', zIndex:10 },
  loaderText:{ marginTop:10, color:C.accent, fontWeight:'bold', fontSize:14 },

  marker:         { padding:8, borderRadius:20, borderWidth:2, borderColor:'rgba(255,255,255,0.3)', elevation:4, alignItems:'center', justifyContent:'center' },
  markerSelected: { borderColor:'white', transform:[{scale:1.25}], elevation:8 },
  markerIcon:     { fontSize:16 },
  favDot:         { position:'absolute', top:-2, right:-2, width:10, height:10, borderRadius:5, backgroundColor:C.accent, borderWidth:1.5, borderColor:'white' },

  callout:       { backgroundColor:C.surface, borderRadius:14, padding:12, minWidth:160, maxWidth:200, elevation:6, borderWidth:1, borderColor:C.border },
  calloutTitle:  { fontSize:13, fontWeight:'bold', color:C.text, marginBottom:2 },
  calloutType:   { fontSize:11, color:C.textMuted, marginBottom:4 },
  calloutRow:    { flexDirection:'row', justifyContent:'space-between', marginBottom:3 },
  calloutRating: { fontSize:12, color:'#f39c12', fontWeight:'600' },
  calloutPrice:  { fontSize:12, color:C.textSub, fontWeight:'600' },
  calloutDist:   { fontSize:11, color:C.textMuted, marginBottom:3 },
  calloutTap:    { fontSize:10, color:C.accent, textAlign:'right', fontStyle:'italic' },

  topBar:      { position:'absolute', top:10, left:12, right:12, flexDirection:'row', gap:8 },
  searchWrap:  { flex:1, flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.surface, borderRadius:Radius.md, paddingHorizontal:12, paddingVertical:9, elevation:5, borderWidth:1, borderColor:C.border },
  searchInput: { flex:1, fontSize:13, color:C.text, padding:0 },
  filterToggle:       { width:44, height:44, borderRadius:Radius.md, backgroundColor:C.surface, elevation:5, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
  filterToggleActive: { backgroundColor:C.accent, borderColor:C.accent },
  filterBadge:     { position:'absolute', top:-4, right:-4, backgroundColor:'#c0392b', borderRadius:8, width:16, height:16, alignItems:'center', justifyContent:'center' },
  filterBadgeText: { color:'white', fontSize:9, fontWeight:'bold' },

  chipsScroll:   { position:'absolute', top:64, left:0, right:0 },
  chipsContent:  { paddingHorizontal:12, paddingVertical:6, gap:6 },
  chip:          { paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor:C.surface, borderWidth:1.5, borderColor:C.border, elevation:2 },
  chipText:      { fontSize:11, color:C.textSub, fontWeight:'600' },
  chipTextActive:{ color:'white' },
  chipClear:     { borderColor:C.accent },
  chipClearText: { fontSize:11, color:C.accent, fontWeight:'600' },

  counterBadge: { position:'absolute', top:118, left:12, flexDirection:'row', alignItems:'center', gap:5, backgroundColor:C.surface, paddingHorizontal:10, paddingVertical:5, borderRadius:20, elevation:3, borderWidth:1, borderColor:C.border },
  counterText:  { fontSize:12, color:C.accent, fontWeight:'600' },

  tooltip:     { position:'absolute', top:148, left:12, right:70, backgroundColor:'rgba(229,9,20,0.88)', borderRadius:12, padding:10 },
  tooltipText: { color:'white', fontSize:12, lineHeight:17 },

  fabGroup: { position:'absolute', top:50, right:12, gap:8, alignItems:'flex-end' },
  fab:      { backgroundColor:C.surface, paddingHorizontal:14, paddingVertical:10, borderRadius:30, elevation:5, flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderColor:C.border },
  fabEmoji: { fontSize:18 },
  fabLabel: { fontSize:12, fontWeight:'bold', color:C.textSub },
  fabIcon:  { width:44, height:44, borderRadius:22, backgroundColor:C.surface, elevation:4, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },

  legendScroll:  { position:'absolute', bottom:16, left:0, right:0 },
  legendContent: { paddingHorizontal:12, gap:6 },
  legendItem:    { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(30,30,30,0.92)', paddingHorizontal:9, paddingVertical:5, borderRadius:20, elevation:2 },
  legendDot:     { width:10, height:10, borderRadius:5 },
  legendText:    { fontSize:10, color:C.textSub, fontWeight:'600' },

  overlay: { flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.55)' },
  sheet:   { backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom:36, elevation:20, borderTopWidth:1, borderColor:C.border },
  sheetHandle:    { width:40, height:4, backgroundColor:C.border, borderRadius:2, alignSelf:'center', marginBottom:16 },
  sheetMenuTitle: { fontSize:17, fontWeight:'bold', color:C.text, marginBottom:12 },

  mapTypeRow:        { flexDirection:'row', alignItems:'center', paddingVertical:13, paddingHorizontal:12, borderRadius:12, marginBottom:6, backgroundColor:C.surfaceHigh, gap:12 },
  mapTypeRowActive:  { backgroundColor:C.accentSoft, borderWidth:1, borderColor:C.accent },
  mapTypeEmoji:      { fontSize:22 },
  mapTypeLabel:      { fontSize:15, color:C.textSub, flex:1 },
  mapTypeLabelActive:{ color:C.accent, fontWeight:'bold' },

  sheetHeader:   { flexDirection:'row', alignItems:'flex-start', marginBottom:10, gap:10 },
  sheetColorBar: { width:4, height:48, borderRadius:2, marginTop:2 },
  sheetTitle:    { fontSize:19, fontWeight:'bold', color:C.text },
  sheetType:     { fontSize:12, color:C.textMuted, fontStyle:'italic', marginTop:2 },

  metaRow:   { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:10 },
  metaBadge: { backgroundColor:C.surfaceHigh, paddingHorizontal:10, paddingVertical:5, borderRadius:20, borderWidth:1, borderColor:C.border },
  metaText:  { fontSize:12, fontWeight:'600', color:C.textSub },

  addressRow:  { flexDirection:'row', alignItems:'center', gap:5, marginBottom:10 },
  addressText: { fontSize:12, color:C.textMuted },

  descBox:  { backgroundColor:C.surfaceHigh, padding:12, borderRadius:12, marginBottom:12, borderWidth:1, borderColor:C.border },
  descText: { fontSize:13, color:C.textSub, lineHeight:19 },

  nowLabel: { fontSize:13, fontWeight:'600', color:C.accent, marginBottom:6 },
  nowRow:   { flexDirection:'row', gap:8, marginBottom:14 },
  filmChip: { backgroundColor:C.accent, paddingHorizontal:12, paddingVertical:5, borderRadius:20 },
  filmChipText: { color:'white', fontSize:11, fontWeight:'600' },

  actionRow:    { flexDirection:'row', gap:8, marginBottom:12 },
  actionBtn:    { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:10, borderRadius:12 },
  actionBtnText:{ color:'white', fontWeight:'bold', fontSize:13 },

  sheetBtns:       { flexDirection:'row', gap:10 },
  sheetBtnPrimary: { flex:1, paddingVertical:13, borderRadius:14, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.accent },
  sheetBtnSec:     { flex:1, paddingVertical:13, borderRadius:14, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.surfaceHigh, borderWidth:1, borderColor:C.border },
  sheetBtnText:    { color:'white', fontWeight:'bold', fontSize:14 },
  sheetBtnSecText: { color:C.textSub, fontWeight:'bold', fontSize:14 },
});