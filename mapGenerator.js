// ===================================
// Infinite Map Generator
// ===================================

class MapGenerator {
    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.highestPlatform = 0;
        this.platformSpacing = 3.5; // Vertical spacing between platforms (slightly increased)
        this.generationAhead = 30; // Generate this many units ahead

        // Generate initial platforms
        this.generateInitialPlatforms();
    }

    generateInitialPlatforms() {
        // Starting platform (large and safe)
        const startPlatform = VoxelModels.createPlatform(6, 6, 0.5);
        startPlatform.position.set(0, 0, 0);
        startPlatform.userData.width = 6;
        startPlatform.userData.depth = 6;
        startPlatform.userData.height = 0.5;
        this.scene.add(startPlatform);
        this.platforms.push(startPlatform);

        // Generate more platforms
        for (let i = 1; i < 20; i++) {
            this.generatePlatform(i * this.platformSpacing);
        }

        this.highestPlatform = 20 * this.platformSpacing;
    }

    generatePlatform(height) {
        // Random platform type
        const rand = Math.random();
        let platform;

        if (rand < 0.3) {
            // Stairs
            platform = VoxelModels.createStairs(3, Math.random() > 0.5 ? 1 : -1);
            platform.userData.width = 6;
            platform.userData.depth = 2;
            platform.userData.height = 0.3;
        } else if (rand < 0.6) {
            // Small platform
            const size = 2 + Math.random() * 2;
            platform = VoxelModels.createPlatform(size, size, 0.5);
            platform.userData.width = size;
            platform.userData.depth = size;
            platform.userData.height = 0.5;
        } else {
            // Medium/Large platform (more common, bigger sizes)
            const width = 3 + Math.random() * 3; // Increased from 2
            const depth = 3 + Math.random() * 3; // Increased from 2
            platform = VoxelModels.createPlatform(width, depth, 0.5);
            platform.userData.width = width;
            platform.userData.depth = depth;
            platform.userData.height = 0.5;
        }

        // Random horizontal position (wider distribution)
        const maxOffset = 8; // Increased from 4 for wider spread
        const xOffset = (Math.random() - 0.5) * maxOffset * 2;

        platform.position.set(xOffset, height, 0);

        this.scene.add(platform);
        this.platforms.push(platform);
    }

    update(playerY) {
        // Generate new platforms if player is climbing
        while (this.highestPlatform < playerY + this.generationAhead) {
            this.highestPlatform += this.platformSpacing;
            this.generatePlatform(this.highestPlatform);
        }

        // Remove platforms that are far below the player (increased retention)
        this.platforms = this.platforms.filter(platform => {
            if (platform.position.y < playerY - 40) { // Increased from 20 to 40
                this.scene.remove(platform);
                return false;
            }
            return true;
        });
    }

    getPlatforms() {
        return this.platforms;
    }

    reset() {
        // Remove all platforms
        this.platforms.forEach(platform => {
            this.scene.remove(platform);
        });
        this.platforms = [];
        this.highestPlatform = 0;

        // Regenerate
        this.generateInitialPlatforms();
    }
}
