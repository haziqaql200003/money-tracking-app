import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// DRAF sahaja. Sila semak dengan penasihat undang-undang sebelum dilancarkan (PDPA 2010, dipinda 2024).
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Data yang kami kumpul',
    body: 'Email, nama paparan, warna avatar, bahasa, matlamat kewangan (pilihan), serta akaun, kategori, bajet dan transaksi yang anda masukkan sendiri. Kami tidak meminta no. IC, alamat atau nombor kad penuh (hanya 4 digit terakhir jika anda pilih).',
  },
  {
    title: 'Tujuan',
    body: 'Untuk menjalankan fungsi aplikasi: log masuk, menyimpan rekod kewangan anda dan memaparkan laporan. Data tidak dijual atau digunakan untuk iklan.',
  },
  {
    title: 'Di mana data disimpan',
    body: 'Dalam mod simulasi ini, data disimpan pada peranti anda sahaja. Apabila pelayan awan digunakan, kami akan menyatakan lokasi pelayan dan pemproses data di sini.',
  },
  {
    title: 'Tempoh simpanan',
    body: 'Selagi akaun anda aktif. Bila anda padam akaun, semua data anda dipadam.',
  },
  {
    title: 'Hak anda',
    body: 'Anda boleh mengakses, membetulkan, mengeksport (CSV) dan memadam data anda melalui menu More > Settings.',
  },
  {
    title: 'Hubungi kami',
    body: '[Masukkan email pegawai perlindungan data / hubungan anda di sini]',
  },
];

export default function PrivacyScreen() {
  const colors = useTheme();
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader title="Notis Privasi" />
          {SECTIONS.map((s) => (
            <ThemedText key={s.title} type="small" style={styles.block}>
              <ThemedText type="smallBold">{s.title + '\n'}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {s.body}
              </ThemedText>
            </ThemedText>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  block: { marginBottom: Spacing.four, lineHeight: 22 },
});
