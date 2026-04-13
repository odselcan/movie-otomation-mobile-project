import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* Name kısmında klasör yolu DEĞİL, sadece dosya adı olmalı */}
      <Tabs.Screen name="index" options={{ title: 'Filmler' }} />
      <Tabs.Screen name="series" options={{ title: 'Diziler' }} />
    </Tabs>
  );
}