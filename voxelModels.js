// ===================================
// Voxel Model Definitions
// ===================================

const VoxelModels = {
    // Create a single voxel cube
    createVoxel(color, size = 1) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({
            color: color,
            flatShading: true
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Add edge lines for voxel aesthetic
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
        );
        mesh.add(line);

        return mesh;
    },

    // Create the dog character
    createDog(customColor = 0x8B5E3C) {
        const dog = new THREE.Group();

        // Body (main torso)
        const body = this.createVoxel(customColor, 1.5);
        body.position.y = 0;
        dog.add(body);

        // Head
        const head = this.createVoxel(customColor, 1.2);
        head.position.set(0, 0.5, 0.8);
        dog.add(head);

        // Snout - Darker Tan
        const snout = this.createVoxel(0xA0785D, 0.6);
        snout.position.set(0, 0.3, 1.3);
        dog.add(snout);

        // Ears (floppy) - Richer Dark Brown
        const leftEar = this.createVoxel(0x5D4037, 0.5);
        leftEar.position.set(-0.4, 0.8, 0.8);
        leftEar.rotation.z = -0.3;
        dog.add(leftEar);

        const rightEar = this.createVoxel(0x5D4037, 0.5);
        rightEar.position.set(0.4, 0.8, 0.8);
        rightEar.rotation.z = 0.3;
        dog.add(rightEar);

        // Eyes
        const leftEye = this.createVoxel(0x000000, 0.2);
        leftEye.position.set(-0.3, 0.6, 1.35);
        dog.add(leftEye);

        const rightEye = this.createVoxel(0x000000, 0.2);
        rightEye.position.set(0.3, 0.6, 1.35);
        dog.add(rightEye);

        // Nose
        const nose = this.createVoxel(0x000000, 0.3);
        nose.position.set(0, 0.2, 1.5);
        dog.add(nose);

        // Legs
        const legPositions = [
            [-0.5, -0.8, 0.4],  // Front left
            [0.5, -0.8, 0.4],   // Front right
            [-0.5, -0.8, -0.4], // Back left
            [0.5, -0.8, -0.4]   // Back right
        ];

        legPositions.forEach(pos => {
            const leg = this.createVoxel(0x8B5E3C, 0.4);
            leg.scale.y = 1.5;
            leg.position.set(pos[0], pos[1], pos[2]);
            dog.add(leg);
        });

        // Tail
        const tail = this.createVoxel(0x8B5E3C, 0.5);
        tail.scale.y = 1.2;
        tail.position.set(0, 0.2, -1);
        tail.rotation.x = 0.5;
        dog.add(tail);

        // Store tail reference for animation
        dog.userData.tail = tail;

        return dog;
    },

    // Create a platform
    createPlatform(width = 3, depth = 3, height = 0.5) {
        const platform = new THREE.Group();

        // Randomize platform color from earthy palette
        const colors = [0x7C3F00, 0x8B4513, 0x654321, 0x5C4033, 0x6B4423];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const block = this.createVoxel(color, 1);
        block.scale.set(width, height, depth);
        platform.add(block);

        // Add some decorative voxels on top occasionally
        if (Math.random() > 0.7) {
            const decorColor = Math.random() > 0.5 ? 0x228B22 : 0x90EE90;
            const decor = this.createVoxel(decorColor, 0.3);
            decor.position.set(
                (Math.random() - 0.5) * width * 0.8,
                height * 0.5 + 0.15,
                (Math.random() - 0.5) * depth * 0.8
            );
            platform.add(decor);
        }

        return platform;
    },

    // Create stairs (series of platforms)
    createStairs(steps = 3, direction = 1) {
        const stairs = new THREE.Group();

        for (let i = 0; i < steps; i++) {
            const step = this.createPlatform(2, 2, 0.3);
            step.position.set(
                direction * i * 1.5,
                i * 0.5,
                0
            );
            stairs.add(step);
        }

        return stairs;
    },

    // Create dog bone item
    createBone() {
        const bone = new THREE.Group();

        // Main shaft
        const shaft = this.createVoxel(0xFFFACD, 0.3);
        shaft.scale.set(1, 0.3, 0.3);
        bone.add(shaft);

        // End knobs
        const leftKnob = this.createVoxel(0xFFFACD, 0.5);
        leftKnob.position.x = -0.5;
        bone.add(leftKnob);

        const rightKnob = this.createVoxel(0xFFFACD, 0.5);
        rightKnob.position.x = 0.5;
        bone.add(rightKnob);

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bone.add(glow);

        bone.userData.glow = glow;

        return bone;
    },

    // Create dog food bowl item
    createFoodBowl() {
        const bowl = new THREE.Group();

        // Bowl base
        const base = this.createVoxel(0xFF1493, 0.8);
        base.scale.y = 0.4;
        base.position.y = -0.2;
        bowl.add(base);

        // Food inside
        const food = this.createVoxel(0x8B4513, 0.6);
        food.scale.y = 0.3;
        food.position.y = 0.1;
        bowl.add(food);

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bowl.add(glow);

        bowl.userData.glow = glow;

        return bowl;
    },

    // Create particle for effects
    createParticle(color) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: color });
        return new THREE.Mesh(geometry, material);
    },

    // Create a "Blob Shadow" (Fake shadow for mobile optimization)
    createBlobShadow() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        // Use a simple circle shape for the plane
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -0.5; // Slightly below the owner

        // Create a circular appearance (simplest way without texture)
        // Or if we can't use complex shaders, just a small square/circle mesh works well in voxel style
        return mesh;
    }
};
