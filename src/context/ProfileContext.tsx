import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

import { CARD_COLORS } from '@/constants/card-styles';

type ProfileContextValue = {
  displayName: string;
  setDisplayName: (name: string) => void;
  avatarColor: string;
  setAvatarColor: (color: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayName] = useState('Aqil');
  const [avatarColor, setAvatarColor] = useState(CARD_COLORS[0]);

  const setName = useCallback((name: string) => setDisplayName(name), []);
  const setColor = useCallback((color: string) => setAvatarColor(color), []);

  const value = useMemo(
    () => ({ displayName, setDisplayName: setName, avatarColor, setAvatarColor: setColor }),
    [displayName, avatarColor, setName, setColor],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}