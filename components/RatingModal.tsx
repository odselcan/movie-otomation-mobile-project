// components/RatingModal.tsx
// Nielsen #2  Gerçek Dünya Dili: "Puanla", "İptal", "Kaydet" — anlaşılır
// Nielsen #5  Hata Önleme: 0-10 arası validasyon, hatalı giriş engellenir
// Nielsen #9  Hata Mesajları: geçersiz puan için açık uyarı
// Nielsen #10 Yardım & Dokümantasyon: hızlı seçim butonları rehber görevi görür
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  initialRating: number;
  initialNote: string;
  onSave: (rating: number, note: string) => void;
  onClose: () => void;
}

export default function RatingModal({
  visible,
  title,
  initialRating,
  initialNote,
  onSave,
  onClose,
}: Props) {
  const [ratingInput, setRatingInput] = useState('');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState(''); // Nielsen #9

  useEffect(() => {
    if (visible) {
      setRatingInput(initialRating > 0 ? String(initialRating) : '');
      setNote(initialNote || '');
      setValidationError('');
    }
  }, [visible, initialRating, initialNote]);

  const handleSave = () => {
    const val = parseFloat(ratingInput);
    // Nielsen #9: Kullanıcı dostu hata mesajı
    if (ratingInput === '') {
      setValidationError('Lütfen 0 ile 10 arasında bir puan girin.');
      return;
    }
    if (isNaN(val) || val < 0 || val > 10) {
      setValidationError('Geçersiz puan. 0 ile 10 arasında olmalıdır.');
      return;
    }
    setValidationError('');
    onSave(val, note);
  };

  const getRatingColor = (r: number) => {
    if (r >= 8) return '#2ecc71';
    if (r >= 5) return '#f39c12';
    return '#e74c3c';
  };

  const previewRating = parseFloat(ratingInput);
  const hasPreview = !isNaN(previewRating) && previewRating >= 0 && previewRating <= 10;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.modalTitle}>⭐ Puanla & Not Ekle</Text>
          <Text style={styles.modalSubtitle} numberOfLines={2}>
            {title}
          </Text>

          {/* Puan önizleme — Nielsen #1 Sistem Durumu */}
          {hasPreview && (
            <View style={[styles.previewBadge, { backgroundColor: getRatingColor(previewRating) }]}>
              <Ionicons name="star" size={14} color="white" />
              <Text style={styles.previewText}>{previewRating}/10</Text>
            </View>
          )}

          {/* Puan girişi */}
          <View style={styles.ratingInputWrap}>
            <TextInput
              style={styles.ratingInput}
              placeholder="0 - 10"
              value={ratingInput}
              onChangeText={(t) => {
                setValidationError('');
                // Nielsen #5: Sadece geçerli format kabul edilir
                if (t === '' || t === '10' || /^[0-9](\.[0-9])?$/.test(t)) {
                  setRatingInput(t);
                }
              }}
              keyboardType="decimal-pad"
              maxLength={4}
              placeholderTextColor="#ccc"
            />
            <Text style={styles.ratingMax}>/10</Text>
          </View>

          {/* Hata mesajı — Nielsen #9 */}
          {validationError !== '' && (
            <Text style={styles.errorText}>⚠️ {validationError}</Text>
          )}

          {/* Hızlı seçim — Nielsen #10 Yardım */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            <View style={styles.quickRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <Pressable
                  key={n}
                  style={[
                    styles.quickBtn,
                    ratingInput === String(n) && styles.quickBtnActive,
                    { borderColor: getRatingColor(n) },
                  ]}
                  onPress={() => { setRatingInput(String(n)); setValidationError(''); }}
                >
                  <Text
                    style={[
                      styles.quickBtnText,
                      ratingInput === String(n) && { color: 'white' },
                      { color: ratingInput === String(n) ? 'white' : getRatingColor(n) },
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Not alanı — CRUD: Update için */}
          <View style={styles.noteWrap}>
            <Text style={styles.noteLabel}>📝 Notunuz</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Bu içerik hakkında düşünceleriniz..."
              placeholderTextColor="#c0a0b0"
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{note.length}/200</Text>
          </View>

          {/* Butonlar — Nielsen #3 Kullanıcı Kontrolü */}
          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.btn, { backgroundColor: '#FFD1DC' }]}
              onPress={onClose}
            >
              <Text style={{ color: '#DB7093', fontWeight: 'bold' }}>İptal</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: '#DB7093' }]}
              onPress={handleSave}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Kaydet</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF5F7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 2,
    borderColor: '#FFD1DC',
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD1DC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#DB7093', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#a07088', marginBottom: 12 },

  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  previewText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  ratingInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD1DC',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  ratingInput: {
    flex: 1, fontSize: 28, fontWeight: 'bold',
    color: '#DB7093', padding: 12, textAlign: 'center',
  },
  ratingMax: { fontSize: 18, color: '#ccc', fontWeight: 'bold' },

  errorText: { color: '#e74c3c', fontSize: 12, marginBottom: 8, textAlign: 'center' },

  quickScroll: { marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  quickBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
  },
  quickBtnActive: { },
  quickBtnText: { fontWeight: 'bold', fontSize: 13 },

  noteWrap: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD1DC',
    padding: 12,
    marginBottom: 16,
  },
  noteLabel: { fontSize: 12, color: '#a07088', marginBottom: 6, fontWeight: '600' },
  noteInput: {
    fontSize: 14,
    color: '#4A4A4A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: 4 },

  modalButtons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
});