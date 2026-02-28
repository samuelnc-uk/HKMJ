// ============================================================
// audio.js — Background music management
// ============================================================

class AudioManager {
    constructor() {
        this.intro = null;
        this.bgmTracks = [];
        this.currentBgm = null;
        this.currentBgmIndex = -1;
        this.summary = null;
        this.volume = 0.2;
        this.muted = false;
        this._userInteracted = false;
        this._pendingPlay = null; // 'intro', 'bgm', or 'summary'

        this._init();
    }

    _init() {
        // Preload intro
        this.intro = new Audio('audio/intro.mp3');
        this.intro.loop = true;
        this.intro.volume = this.volume;

        // Preload BGM tracks
        for (let i = 0; i <= 4; i++) {
            const track = new Audio(`audio/bgm${i}.mp3`);
            track.volume = this.volume;
            // When a BGM track ends, crossfade to the next one
            track.addEventListener('ended', () => this._playNextBgm());
            this.bgmTracks.push(track);
        }

        // Preload summary track
        this.summary = new Audio('audio/summary.mp3');
        this.summary.loop = true;
        this.summary.volume = this.volume;

        // Listen for first user interaction to unlock audio
        const unlock = () => {
            this._userInteracted = true;
            if (this._pendingPlay === 'intro') {
                this._doPlayIntro();
            } else if (this._pendingPlay === 'bgm') {
                this._doPlayBgm();
            } else if (this._pendingPlay === 'summary') {
                this._doPlaySummary();
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
    }

    // ===================== Public API =====================

    /** Play intro music (main menu) */
    playIntro() {
        this._stopAll();
        if (this._userInteracted) {
            this._doPlayIntro();
        } else {
            this._pendingPlay = 'intro';
        }
    }

    /** Play random BGM (gameplay) */
    playBgm() {
        this._stopAll();
        if (this._userInteracted) {
            this._doPlayBgm();
        } else {
            this._pendingPlay = 'bgm';
        }
    }

    /** Play summary music (round end / scoring screen) */
    playSummary() {
        this._stopAll();
        if (this._userInteracted) {
            this._doPlaySummary();
        } else {
            this._pendingPlay = 'summary';
        }
    }

    /** Stop all music */
    stopAll() {
        this._stopAll();
        this._pendingPlay = null;
    }

    /** Toggle mute on/off */
    toggleMute() {
        this.muted = !this.muted;
        this._applyVolume();
        return this.muted;
    }

    /** Set volume (0.0 - 1.0) */
    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        this._applyVolume();
    }

    /** Check if music is muted */
    isMuted() {
        return this.muted;
    }

    // ===================== Internal =====================

    _doPlayIntro() {
        this.intro.currentTime = 0;
        this.intro.volume = this.muted ? 0 : this.volume;
        this.intro.play().catch(() => { }); // Suppress autoplay errors
    }

    _doPlayBgm() {
        // Pick a random track that isn't the same as the last one
        let idx;
        do {
            idx = Math.floor(Math.random() * this.bgmTracks.length);
        } while (idx === this.currentBgmIndex && this.bgmTracks.length > 1);

        this.currentBgmIndex = idx;
        this.currentBgm = this.bgmTracks[idx];
        this.currentBgm.currentTime = 0;
        this.currentBgm.volume = this.muted ? 0 : this.volume;
        this.currentBgm.play().catch(() => { }); // Suppress autoplay errors
    }

    _playNextBgm() {
        this._doPlayBgm();
    }

    _doPlaySummary() {
        this.summary.currentTime = 0;
        this.summary.volume = this.muted ? 0 : this.volume;
        this.summary.play().catch(() => { });
    }

    _stopAll() {
        // Stop intro
        if (this.intro) {
            this.intro.pause();
            this.intro.currentTime = 0;
        }
        // Stop all BGM tracks
        for (const track of this.bgmTracks) {
            track.pause();
            track.currentTime = 0;
        }
        this.currentBgm = null;
        // Stop summary
        if (this.summary) {
            this.summary.pause();
            this.summary.currentTime = 0;
        }
    }

    _applyVolume() {
        const vol = this.muted ? 0 : this.volume;
        this.intro.volume = vol;
        for (const track of this.bgmTracks) {
            track.volume = vol;
        }
        if (this.summary) this.summary.volume = vol;
    }
}

// Global instance
const audioManager = new AudioManager();
