/**
 * Sound Manager - Synthesizes cute animal and game sounds using Web Audio API.
 * Optimized for web apps: No external assets needed, zero latency.
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = false;

        // Initialize on first interaction to comply with browser policies
        document.addEventListener('mousedown', () => this.init(), { once: true });
        document.addEventListener('keydown', () => this.init(), { once: true });
        document.addEventListener('touchstart', () => this.init(), { once: true });
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    /**
     * Common method to play a synthesized sound
     */
    playSound(freq, type, duration, volume, slide = 0) {
        if (!this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(freq + slide, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- Specific Game Sounds ---

    /** Cute jump sound */
    playJump() {
        this.playSound(400, 'triangle', 0.15, 0.1, 400);
    }

    /** Powerful high jump sound (3rd jump only) */
    playHighJump() {
        this.playSound(300, 'sine', 0.1, 0.15, 500);
        setTimeout(() => {
            this.playSound(500, 'triangle', 0.2, 0.12, 400);
        }, 60);
    }

    /** Epic super jump activation sound */
    playSuperJump() {
        // Multi-stage celebratory sound
        this.playSound(200, 'sine', 0.1, 0.4, 800);
        setTimeout(() => this.playSound(400, 'triangle', 0.15, 0.3, 600), 100);
        setTimeout(() => this.playSound(600, 'sine', 0.2, 0.2, 400), 200);
        // Added some white noise for a spark effect
        const noise = this.ctx.createOscillator();
        const noiseGain = this.ctx.createGain();
        noise.type = 'sawtooth'; // Rough approximation
        noise.frequency.setValueAtTime(1000, this.ctx.currentTime);
        noiseGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();
        noise.stop(this.ctx.currentTime + 0.3);
    }

    /** Cute hit/bounce sound for animals */
    playHit() {
        // Double "boing" for cuteness
        this.playSound(300, 'sine', 0.1, 0.2, -100);
        setTimeout(() => {
            this.playSound(450, 'triangle', 0.15, 0.15, -150);
        }, 50);
    }

    /** Collect item sound */
    playCollect() {
        this.playSound(600, 'sine', 0.2, 0.1, 600);
        setTimeout(() => {
            this.playSound(900, 'sine', 0.25, 0.08, 300);
        }, 80);
    }

    /** Bubble pop sound */
    playPop() {
        this.playSound(800, 'square', 0.05, 0.05, -400);
    }

    /** Rocket explosion (softened for cuteness) */
    playExplosion() {
        this.playSound(100, 'sawtooth', 0.4, 0.2, -50);
    }

    /** Game over sound */
    playGameOver() {
        this.playSound(300, 'sine', 0.5, 0.2, -200);
        setTimeout(() => {
            this.playSound(200, 'sine', 0.8, 0.1, -100);
        }, 200);

        this.stopBGM();
    }

    // --- BGM System ---

    startBGM() {
        if (!this.enabled || this.bgmLoop) return;

        this.bpm = 110;
        this.stepTime = 60 / this.bpm / 4; // 16th note
        this.currentStep = 0;

        // Bass pattern (C-G-F-G)
        this.bassNotes = [
            65.41, 0, 65.41, 0,
            98.00, 0, 98.00, 0,
            87.31, 0, 87.31, 0,
            98.00, 0, 98.00, 0
        ];

        // Rhythmic "boing" melody (low frequency)
        this.melodyNotes = [
            130.81, 0, 164.81, 196.00,
            130.81, 0, 164.81, 0,
            146.83, 0, 174.61, 220.00,
            146.83, 0, 196.00, 0
        ];

        this.bgmLoop = setInterval(() => {
            this.playBGMStep();
        }, this.stepTime * 1000);
    }

    playBGMStep() {
        if (!this.enabled) return;

        const time = this.ctx.currentTime;
        const step = this.currentStep % 16;

        // Kick drum (Every 1st and 3rd beat)
        if (step % 4 === 0) {
            this.playKick(time);
        }

        // Snare (Every 2nd and 4th beat) - Soft tick
        if (step % 4 === 2) {
            this.playSnare(time);
        }

        // Bass
        const bassFreq = this.bassNotes[step];
        if (bassFreq > 0) {
            this.playInstrument(bassFreq, 'sine', 0.15, 0.08, time, -10);
        }

        // Melody (Cute rhythmic boing)
        const melFreq = this.melodyNotes[step];
        if (melFreq > 0) {
            this.playInstrument(melFreq, 'triangle', 0.1, 0.04, time, 20);
        }

        this.currentStep++;
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playSnare(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, time);
        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.05);
    }

    playInstrument(freq, type, duration, volume, time, slide = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(freq + slide, time + duration);
        }
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
    }

    stopBGM() {
        if (this.bgmLoop) {
            clearInterval(this.bgmLoop);
            this.bgmLoop = null;
        }
    }
}

// Global instance
const AudioSystem = new SoundManager();
