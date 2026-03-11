import { Howl } from 'howler';

// Using placeholder sound URLs from a free sound library (Mixkit/Pixabay)
// In a real production app, these would be local assets in the public folder
const SOUND_URLS = {
  attack: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Laser shot
  hit: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', // Impact
  minionSpawn: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Sci-fi spawn
  abilityQ: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Energy burst
  abilityW: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // Shield activate
  abilityE: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3', // Dash/Whoosh
  abilityR: 'https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3', // Ultimate explosion
  death: 'https://assets.mixkit.co/active_storage/sfx/2576/2576-preview.mp3', // Retro death
  respawn: 'https://assets.mixkit.co/active_storage/sfx/2577/2577-preview.mp3', // Power up
  victory: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // Win jingle
  defeat: 'https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3', // Lose jingle
  levelUp: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3', // Level up
  buy: 'https://assets.mixkit.co/active_storage/sfx/2581/2581-preview.mp3', // Coin
  sell: 'https://assets.mixkit.co/active_storage/sfx/2582/2582-preview.mp3', // Coin
};

class SoundManager {
  private sounds: { [key: string]: Howl } = {};
  private enabled: boolean = true;

  constructor() {
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    // Preload sounds
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      this.sounds[key] = new Howl({
        src: [url],
        volume: 0.5,
        preload: true,
        html5: true // Force HTML5 Audio to avoid CORS issues with some CDNs
      });
    });
  }

  play(sound: keyof typeof SOUND_URLS | string, volume: number = 0.5) {
    if (!this.enabled || typeof window === 'undefined') return;
    
    const s = this.sounds[sound];
    if (s) {
      s.volume(volume);
      s.play();
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    Howler.mute(!this.enabled);
  }
}

export const soundManager = new SoundManager();
