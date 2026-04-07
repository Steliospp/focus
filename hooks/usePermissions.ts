import { useState, useEffect, useCallback } from 'react';

export function usePermissions() {
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      const { Audio } = await import('expo-av');
      const { granted } = await Audio.getPermissionsAsync();
      setHasMicPermission(granted);
    } catch {
      // Native module not available (e.g. Expo Go without dev build)
      setHasMicPermission(null);
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { Audio } = await import('expo-av');
      const { granted } = await Audio.requestPermissionsAsync();
      setHasMicPermission(granted);
      return granted;
    } catch {
      setHasMicPermission(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    hasMicPermission,
    requestMicPermission,
  };
}
