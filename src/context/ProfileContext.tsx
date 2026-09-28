import { createContext, useContext, useState, ReactNode } from 'react';

type ProfileContextValue = {
  displayName: string;
  setDisplayName: (name: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayName] = useState('Aqil');
  return (
    <ProfileContext.Provider value={{ displayName, setDisplayName }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}