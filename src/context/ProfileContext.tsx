import { createContext, ReactNode, useContext, useMemo } from 'react';

import { CARD_COLORS } from '@/constants/card-styles';
import { useAuth } from '@/context/AuthContext';

type ProfileContextValue = {
  displayName: string;
  setDisplayName: (name: string) => void;
  avatarColor: string;
  setAvatarColor: (color: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

// Profil kini datang dari akaun yang sedang login (bukan hardcoded "Aqil").
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();

  const value = useMemo<ProfileContextValue>(
    () => ({
      displayName: user?.displayName ?? '',
      setDisplayName: (displayName) => updateProfile({ displayName }),
      avatarColor: user?.avatarColor ?? CARD_COLORS[0],
      setAvatarColor: (avatarColor) => updateProfile({ avatarColor }),
    }),
    [user, updateProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
