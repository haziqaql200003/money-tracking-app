import type { enScan } from '../en/scan';

// Malay wording: every key in en/scan.ts must exist here (TypeScript enforces it).
export const msScan: Record<keyof typeof enScan, string> = {
  'scan.button': 'Imbas resit',
  'scan.buttonSub': 'Isi borang daripada gambar atau PDF',
  'scan.chooseTitle': 'Imbas resit',
  'scan.chooseMsg': 'Di mana resit itu?',
  'scan.camera': 'Ambil gambar',
  'scan.gallery': 'Gambar atau tangkap skrin',
  'scan.pdf': 'Fail PDF',
  'scan.consentTitle': 'Hantar resit ini untuk dibaca?',
  'scan.consentBody': 'Gambar dihantar kepada Google Gemini (melalui pelayan kami) untuk membaca kedai, tarikh dan jumlah. Kami tidak menyimpannya. Pada pelan percuma Google, Google mungkin menggunakan apa yang dihantar untuk menambah baik produknya, jadi elakkan resit yang ada maklumat peribadi. Anda menyemak semuanya sebelum menyimpan.',
  'scan.consentOk': 'Teruskan',
  'scan.reading': 'Membaca resit...',
  'scan.review': 'Diisi daripada resit anda. Sila semak sebelum menyimpan.',
  'scan.noteNoTotal': 'Jumlah tidak dapat dibaca. Sila taip jumlahnya.',
  'scan.noteNoDate': 'Tarikh tidak dapat dibaca, jadi tarikh hari ini digunakan.',
  'scan.noteForeign': 'Resit ini bukan dalam ringgit. Semak jumlahnya.',
  'scan.noteItems': 'Senarai item tidak sama dengan jumlah, jadi ia ditinggalkan.',
  'scan.errTitle': 'Imbasan gagal',
  'scan.errUnavailable': 'Imbasan memerlukan anda log masuk dan ada sambungan internet.',
  'scan.errPermission': 'Benarkan akses kamera dalam tetapan telefon untuk mengambil gambar.',
  'scan.errTooLarge': 'Fail itu terlalu besar. Cuba gambar atau PDF yang lebih kecil.',
  'scan.errLimit': 'Anda sudah mencapai had imbasan hari ini. Cuba lagi esok.',
  'scan.errUnreadable': 'Tiada resit dapat dibaca dalam fail itu. Cuba gambar yang lebih jelas.',
  'scan.errNetwork': 'Tidak dapat menghubungi pengimbas. Semak sambungan anda dan cuba lagi.',
};
