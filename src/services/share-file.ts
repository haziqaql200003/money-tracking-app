import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import { t } from '@/i18n';
import { Alert } from '@/services/dialog';

/**
 * Hands a text file (a CSV export, the import template) to the person as a real file.
 * Web: the browser downloads it. Phone: a temporary file goes to the share sheet, so it can be saved to Files or
 * Drive or opened in Excel. If the phone cannot share files, the text itself is shared as before.
 * Returns false when nothing could be shared.
 */
export async function shareTextFile(name: string, content: string, mimeType = 'text/csv'): Promise<boolean> {
  // A byte-order mark makes Excel read the file as UTF-8, so names such as "Kuih & Kopi" or "Café" stay intact.
  const body = mimeType === 'text/csv' && !content.startsWith('﻿') ? `﻿${content}` : content;

  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([body], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(body);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : undefined });
      return true;
    }
  } catch {
    // fall through to sharing the text
  }
  try {
    await Share.share({ message: content, title: name });
    return true;
  } catch {
    return false;
  }
}

/** File name with today's date, e.g. wakira-transactions-2026-10-13.csv. */
export function datedName(base: string, todayKey: string, ext = 'csv') {
  return `${base}-${todayKey}.${ext}`;
}

/**
 * Shares a short text (a story line, the summary for an AI assistant). On the web, browsers without a share sheet
 * get the text copied instead, with a note saying so.
 */
export async function shareText(message: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message });
    } catch {
      // sheet dismissed
    }
    return;
  }
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (nav?.share) {
    try {
      await nav.share({ text: message });
      return;
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return; // closed by the person
    }
  }
  try {
    await nav?.clipboard?.writeText(message);
    Alert.alert(t('common.copiedTitle'), t('common.copiedBody'));
  } catch {
    Alert.alert(t('common.shareFailTitle'), message);
  }
}

/**
 * Lets the person choose a text file (a .wakira.json backup) and returns its name and text, or null when they close
 * the picker. Web: the browser's file picker. Phone: the system document picker.
 */
export async function pickTextFile(accept = '.json,application/json'): Promise<{ name: string; text: string } | null> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return null;
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        f.text().then((text) => resolve({ name: f.name, text }), () => resolve(null));
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled || !picked.result) return null;
  const bytes = await picked.result.bytes();
  return { name: picked.result.name, text: new TextDecoder('utf-8').decode(bytes) };
}
