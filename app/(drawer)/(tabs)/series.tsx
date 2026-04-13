import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

interface Series {
  id: string;
  title: string;
  img: string;
  imdb: string;
  year: string;
  type: string;
  trailer: string;
}

const extractYoutubeId = (input: string): string => {
  const match = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : input;
};

export default function SeriesScreen() {

  const router = useRouter();
  const [series, setSeries] = useState<Series[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Series | null>(null);

  const [form, setForm] = useState<Omit<Series, 'id'>>({
    title: '', img: '', trailer: '', imdb: '', type: '', year: ''
  });

  useEffect(() => { loadSeries(); }, []);

  const loadSeries = async () => {
    try {
      const saved = await AsyncStorage.getItem('series_data');
      if (saved === null) {
        const defaultSeries: Series[] = [
          {
            id: 's1',
            title: 'Friends',
            img: 'https://m.media-amazon.com/images/M/MV5BOTU2YmM5ZjctOGVlMC00YTczLTljM2MtYjhlNGI5YWMyZjFkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
            imdb: '8.8', type: 'Drama', year: '1994', trailer: '9f6pD7T6v9c'
          },
          {
            id: 's2',
            title: 'Wednesday',
            img: 'https://m.media-amazon.com/images/M/MV5BNzgkOTQxZDEtOGM2Yy00ZjZlLTk0ZDMtOTg4ZjE0OGI3NzllXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
            imdb: '8.1', type: 'Gizem', year: '2022', trailer: 'Di310WS8zLk'
          }
        ];
        await AsyncStorage.setItem('series_data', JSON.stringify(defaultSeries));
        setSeries(defaultSeries);
      } else {
        setSeries(JSON.parse(saved));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async () => {
    if (!form.title) {
      Alert.alert("Uyarı", "Başlık zorunludur!");
      return;
    }
    const cleanedForm = { ...form, trailer: extractYoutubeId(form.trailer) };
    const updatedList: Series[] = editingItem
      ? series.map((item: Series) =>
          item.id === editingItem.id ? { ...cleanedForm, id: item.id } as Series : item
        )
      : [{ ...cleanedForm, id: Date.now().toString() } as Series, ...series];

    setSeries(updatedList);
    await AsyncStorage.setItem('series_data', JSON.stringify(updatedList));
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    setForm({ title: '', img: '', trailer: '', imdb: '', type: '', year: '' });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={series}
        numColumns={2}
        keyExtractor={(item: Series) => item.id}
        renderItem={({ item }: { item: Series }) => (
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/details/[id]",
                  params: {
                    id: item.id,
                    title: item.title,
                    trailer: item.trailer,
                    year: item.year,
                    type: item.type,
                    img: item.img        // ✅ eklendi
                  }
                })
              }
            >
              <Image
                source={{ uri: item.img || 'https://via.placeholder.com/150' }}
                style={styles.poster}
              />
              <View style={styles.imdbBadge}>
                <Text style={styles.imdbText}>⭐ {item.imdb}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            </Pressable>

            <Pressable
              style={styles.editBtn}
              onPress={() => { setEditingItem(item); setForm(item); setModalVisible(true); }}
            >
              <Ionicons name="pencil" size={14} color="white" />
            </Pressable>
          </View>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="tv-outline" size={30} color="white" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.modalHeader}>{editingItem ? 'Düzenle' : 'Yeni Ekle'}</Text>
              <TextInput style={styles.input} placeholder="Dizi Adı" value={form.title}
                onChangeText={(t: string) => setForm({ ...form, title: t })} />
              <TextInput style={styles.input} placeholder="Resim URL" value={form.img}
                onChangeText={(t: string) => setForm({ ...form, img: t })} />
              <TextInput style={styles.input} placeholder="Youtube ID veya Link" value={form.trailer}
                onChangeText={(t: string) => setForm({ ...form, trailer: t })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="IMDb" value={form.imdb}
                  onChangeText={(t: string) => setForm({ ...form, imdb: t })} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Yıl" value={form.year}
                  onChangeText={(t: string) => setForm({ ...form, year: t })} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder="Tür" value={form.type}
                onChangeText={(t: string) => setForm({ ...form, type: t })} />
              <View style={styles.modalButtons}>
                <Pressable style={[styles.btn, { backgroundColor: '#FFD1DC' }]} onPress={closeModal}>
                  <Text style={{ color: '#DB7093', fontWeight: 'bold' }}>İptal</Text>
                </Pressable>
                <Pressable style={[styles.btn, { backgroundColor: '#DB7093' }]} onPress={handleSave}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Kaydet</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7', padding: 10 },
  card: { flex: 1, margin: 8, backgroundColor: 'white', borderRadius: 20, elevation: 5, overflow: 'hidden' },
  poster: { width: '100%', height: 210, resizeMode: 'cover', backgroundColor: '#FFE0EB' },
  cardTitle: { padding: 10, textAlign: 'center', fontWeight: 'bold', color: '#4A4A4A' },
  imdbBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  imdbText: { color: '#DB7093', fontWeight: 'bold', fontSize: 12 },
  editBtn: { position: 'absolute', bottom: 45, right: 10, backgroundColor: '#DB7093', padding: 6, borderRadius: 15 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#DB7093', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalContent: { margin: 20, backgroundColor: '#FFF5F7', borderRadius: 30, padding: 25, alignItems: 'center', maxHeight: '80%', borderWidth: 2, borderColor: '#FFD1DC' },
  modalHeader: { fontSize: 22, fontWeight: 'bold', color: '#DB7093', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFD1DC' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' }
});