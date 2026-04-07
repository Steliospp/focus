// Stub for expo-av when native module is not available (Expo Go)
// Audio recording won't work — requires a development build.

const Audio = {
  getPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  setAudioModeAsync: async () => {},
  Recording: class Recording {
    _uri = null;
    async prepareToRecordAsync() {}
    async startAsync() {
      console.warn('[expo-av shim] Recording not available in Expo Go');
    }
    async stopAndUnloadAsync() {}
    setOnRecordingStatusUpdate() {}
    setProgressUpdateInterval() {}
    getURI() { return this._uri; }
  },
  Sound: {
    createAsync: async (_source, _initialStatus, onPlaybackStatusUpdate) => {
      const sound = {
        unloadAsync: async () => {},
        playAsync: async () => {
          console.warn('[expo-av shim] Playback not available in Expo Go');
        },
        pauseAsync: async () => {},
        setPositionAsync: async () => {},
      };
      return { sound };
    },
  },
};

module.exports = { Audio };
module.exports.Audio = Audio;
