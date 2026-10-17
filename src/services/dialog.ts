import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * Alert.alert for every platform. React Native Web leaves Alert.alert empty, so on the web nothing appeared and
 * a button such as Delete did nothing. On a phone this is the normal system alert; on the web the same title,
 * message and buttons open in an in-app dialog drawn by <DialogHost /> (mounted once in the root layout).
 * Import { Alert } from here instead of from react-native.
 */
export type DialogButton = AlertButton;
export type DialogRequest = { id: number; title: string; message?: string; buttons: DialogButton[] };

type Listener = (queue: DialogRequest[]) => void;

let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(queue);
}

export function subscribeDialogs(listener: Listener) {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
}

/** Closes a web dialog and runs the pressed button's action (after the dialog is gone, like the system alert). */
export function resolveDialog(id: number, button?: DialogButton) {
  queue = queue.filter((d) => d.id !== id);
  emit();
  if (button?.onPress) setTimeout(() => button.onPress?.(), 0);
}

function show(title: string, message?: string, buttons?: DialogButton[]) {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }
  queue = [...queue, { id: nextId++, title, message, buttons: buttons && buttons.length > 0 ? buttons : [] }];
  emit();
}

export const Alert = { alert: show };
