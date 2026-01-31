// ===================================
// Scoring System
// ===================================

class ScoringSystem {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.maxAltitude = 0;

        this.scoreElement = document.getElementById('score');
        this.altitudeElement = document.getElementById('altitude');
        this.highScoreElement = document.getElementById('highScore');

        this.updateDisplay();
    }

    update(altitude) {
        // Update altitude
        if (altitude > this.maxAltitude) {
            const gained = altitude - this.maxAltitude;
            this.maxAltitude = altitude;
            this.score += gained * 10; // 10 points per meter
        }

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        this.updateDisplay();
    }

    updateDisplay() {
        this.scoreElement.textContent = this.score.toLocaleString();
        this.altitudeElement.textContent = `${this.maxAltitude}m`;
        this.highScoreElement.textContent = `${this.highScore.toLocaleString()}`;
    }

    loadHighScore() {
        const saved = localStorage.getItem('voxelDogHighScore');
        return saved ? parseInt(saved) : 0;
    }

    saveHighScore() {
        localStorage.setItem('voxelDogHighScore', this.highScore.toString());
    }

    getFinalStats() {
        return {
            score: this.score,
            altitude: this.maxAltitude,
            highScore: this.highScore
        };
    }

    reset() {
        this.score = 0;
        this.maxAltitude = 0;
        this.updateDisplay();
    }
}
