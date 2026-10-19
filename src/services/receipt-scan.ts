/**
 * Scan a receipt: pick a photo / screenshot / PDF, shrink it, and ask the `scan-receipt` Edge Function
 * (AI vision, key kept on the server) to read it. Nothing is saved on the server except a usage log line.
 */
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';
import type { ScanResult } from '@/utils/receipt';

export type ScanSource = 'camera' | 'gallery' | 'pdf';

export type ScanErrorCode =
  | 'unavailable' // cloud (Supabase) is not set up, or the user is not signed in
  | 'permission' // camera / photo access refused
  | 'tooLarge'
  | 'limit' // daily limit reached (only when the server sets one)
  | 'unreadable' // the AI could not read a receipt in the file
  | 'network';

export class ScanError extends Error {
  constructor(public code: ScanErrorCode) {
    super(code);
  }
}

/** `null` = the person closed the picker without choosing anything. */
type Picked = { data: string; mediaType: string } | null;

const IMAGE_WIDTH = 1600;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  return new File(uri).base64();
}

async function shrink(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: IMAGE_WIDTH }).renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return out.base64 ?? '';
}

async function pick(source: ScanSource): Promise<Picked> {
  if (source === 'pdf') {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return null;
    const asset = res.assets[0];
    if (asset.size && asset.size > MAX_PDF_BYTES) throw new ScanError('tooLarge');
    return { data: await uriToBase64(asset.uri), mediaType: 'application/pdf' };
  }

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new ScanError('permission');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;
  return { data: await shrink(res.assets[0].uri), mediaType: 'image/jpeg' };
}

/**
 * Picks a file and reads it. Resolves to `null` when the person cancels the picker.
 * Throws ScanError for everything that can go wrong in a way the UI should explain.
 */
export async function scanReceipt(
  source: ScanSource,
  categories: { id: string; name: string; subs: string[] }[],
  lang: 'ms' | 'en',
): Promise<ScanResult | null> {
  if (!supabase) throw new ScanError('unavailable');

  let picked: Picked;
  try {
    picked = await pick(source);
  } catch (e) {
    if (e instanceof ScanError) throw e;
    throw new ScanError('unreadable');
  }
  if (!picked) return null;
  if (!picked.data) throw new ScanError('unreadable');

  const { data, error } = await supabase.functions.invoke('scan-receipt', {
    body: { data: picked.data, mediaType: picked.mediaType, categories, lang },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 401) throw new ScanError('unavailable');
    if (status === 413) throw new ScanError('tooLarge');
    if (status === 429) throw new ScanError('limit');
    if (status === 502) throw new ScanError('unreadable');
    throw new ScanError('network');
  }

  const result = data as ScanResult | null;
  if (!result || result.isReceipt === false) throw new ScanError('unreadable');
  return result;
}
