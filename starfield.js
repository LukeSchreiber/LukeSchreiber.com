class OptimizedStarfield {
    constructor() {
        this.canvas = document.getElementById('starfield-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Performance settings
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        this.targetFrameTime = 14; // ~60fps minimum
        this.lastFrameTime = 0;
        
        // Star configuration - 2 depth layers, ~160-220 total
        this.layer1Count = 80; // Background layer
        this.layer2Count = 110; // Foreground layer
        this.totalStars = this.layer1Count + this.layer2Count;
        
        // Preallocated typed arrays (x, y, vx, vy, size, alpha, twinklePhase)
        this.starData = new Float32Array(this.totalStars * 7);
        
        // Single pooled comet object
        this.comet = {
            active: false,
            t: 0,
            duration: 0,
            p0: { x: 0, y: 0 },    // Start point
            p1: { x: 0, y: 0 },    // End point
            c: { x: 0, y: 0 },     // Control point for bezier curve
            trailBuffer: new Float32Array(24 * 2), // Ring buffer for trail positions (x,y pairs)
            trailIndex: 0,
            lastSpawn: 0
        };
        
        // Resize handling with throttling
        this.resizeTimeout = null;
        this.width = 0;
        this.height = 0;
        
        // Respect reduced motion preference
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.init();
        
        // Throttled resize handler
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.handleResize(), 150);
        });
    }
    
    init() {
        this.updateCanvasSize();
        this.initStars();
        
        if (!this.prefersReducedMotion) {
            this.animate();
        } else {
            this.renderStaticFrame();
        }
    }
    
    updateCanvasSize() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        if (this.width !== newWidth || this.height !== newHeight) {
            this.width = newWidth;
            this.height = newHeight;
            
            this.canvas.width = this.width * this.pixelRatio;
            this.canvas.height = this.height * this.pixelRatio;
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';
            
            this.ctx.scale(this.pixelRatio, this.pixelRatio);
            return true; // Dimensions changed
        }
        return false; // No change
    }
    
    initStars() {
        // Initialize stars across 2 layers with top-left concentration
        for (let i = 0; i < this.totalStars; i++) {
            const isLayer1 = i < this.layer1Count;
            const baseIndex = i * 7;
            
            // Position with 30% concentration in top-left
            let x, y;
            if (Math.random() < 0.3) {
                x = Math.random() * (this.width * 0.4);
                y = Math.random() * (this.height * 0.4);
            } else {
                x = Math.random() * this.width;
                y = Math.random() * this.height;
            }
            
            this.starData[baseIndex] = x;     // x
            this.starData[baseIndex + 1] = y; // y
            this.starData[baseIndex + 2] = (Math.random() * 0.3 + 0.05) * (isLayer1 ? 0.6 : 1.0); // vx (layer speed)
            this.starData[baseIndex + 3] = (Math.random() * 0.3 + 0.05) * (isLayer1 ? 0.6 : 1.0); // vy
            this.starData[baseIndex + 4] = Math.random() * 1.5 + 0.3; // size
            this.starData[baseIndex + 5] = Math.random() * 0.4 + 0.2; // base alpha (0.2-0.6)
            this.starData[baseIndex + 6] = Math.random() * Math.PI * 2; // twinkle phase
        }
    }
    
    handleResize() {
        const dimensionsChanged = this.updateCanvasSize();
        
        if (dimensionsChanged) {
            // Wrap star positions to new dimensions, don't recreate arrays
            for (let i = 0; i < this.totalStars; i++) {
                const baseIndex = i * 7;
                this.starData[baseIndex] = this.starData[baseIndex] % this.width;     // wrap x
                this.starData[baseIndex + 1] = this.starData[baseIndex + 1] % this.height; // wrap y
            }
        }
    }
    
    updateStars(dt, time) {
        // Update star positions and twinkling
        for (let i = 0; i < this.totalStars; i++) {
            const baseIndex = i * 7;
            const isLayer1 = i < this.layer1Count;
            
            // Move stars
            this.starData[baseIndex + 1] += this.starData[baseIndex + 3] * dt * 60; // y movement
            
            // Wrap around edges
            if (this.starData[baseIndex + 1] > this.height + 5) {
                this.starData[baseIndex + 1] = -5;
                // Maintain concentration on wrap
                if (Math.random() < 0.3) {
                    this.starData[baseIndex] = Math.random() * (this.width * 0.4);
                } else {
                    this.starData[baseIndex] = Math.random() * this.width;
                }
            }
            
            // Update twinkle phase and calculate alpha
            const twinkleSpeed = isLayer1 ? 0.6 : 1.0;
            this.starData[baseIndex + 6] += dt * twinkleSpeed;
            
            const baseAlpha = this.starData[baseIndex + 5];
            const twinklePhase = this.starData[baseIndex + 6];
            const twinkleAmp = 0.15;
            
            // Store computed alpha for rendering
            this.starData[baseIndex + 5] = Math.max(0.05, 
                Math.min(0.75, baseAlpha + Math.sin(twinklePhase) * twinkleAmp));
        }
    }
    
    updateComet(dt, time) {
        // Spawn new comet every 8-12 seconds
        if (!this.comet.active && time - this.comet.lastSpawn > (8000 + Math.random() * 4000)) {
            this.spawnComet();
            this.comet.lastSpawn = time;
        }
        
        if (this.comet.active) {
            this.comet.t += dt / this.comet.duration;
            
            if (this.comet.t >= 1) {
                this.comet.active = false;
                return;
            }
            
            // Smooth easing: t*t*(3-2*t)
            const easedT = this.comet.t * this.comet.t * (3 - 2 * this.comet.t);
            
            // Quadratic bezier curve: B(t) = (1-t)²P0 + 2(1-t)tC + t²P1
            const invT = 1 - easedT;
            const invT2 = invT * invT;
            const t2 = easedT * easedT;
            const mixT = 2 * invT * easedT;
            
            const x = invT2 * this.comet.p0.x + mixT * this.comet.c.x + t2 * this.comet.p1.x;
            const y = invT2 * this.comet.p0.y + mixT * this.comet.c.y + t2 * this.comet.p1.y;
            
            // Update trail ring buffer
            const trailIdx = this.comet.trailIndex % 24;
            this.comet.trailBuffer[trailIdx * 2] = x;
            this.comet.trailBuffer[trailIdx * 2 + 1] = y;
            this.comet.trailIndex++;
        }
    }
    
    spawnComet() {
        // Random edge spawn with arc across 60-80% of screen
        const side = Math.floor(Math.random() * 4);
        const coverage = 0.6 + Math.random() * 0.2; // 60-80%
        
        switch (side) {
            case 0: // Top
                this.comet.p0.x = Math.random() * this.width;
                this.comet.p0.y = -50;
                this.comet.p1.x = Math.random() * this.width;
                this.comet.p1.y = this.height * coverage;
                break;
            case 1: // Right
                this.comet.p0.x = this.width + 50;
                this.comet.p0.y = Math.random() * this.height;
                this.comet.p1.x = this.width * (1 - coverage);
                this.comet.p1.y = Math.random() * this.height;
                break;
            case 2: // Bottom
                this.comet.p0.x = Math.random() * this.width;
                this.comet.p0.y = this.height + 50;
                this.comet.p1.x = Math.random() * this.width;
                this.comet.p1.y = this.height * (1 - coverage);
                break;
            case 3: // Left
                this.comet.p0.x = -50;
                this.comet.p0.y = Math.random() * this.height;
                this.comet.p1.x = this.width * coverage;
                this.comet.p1.y = Math.random() * this.height;
                break;
        }
        
        // Control point for gentle arc
        this.comet.c.x = (this.comet.p0.x + this.comet.p1.x) / 2 + (Math.random() - 0.5) * 200;
        this.comet.c.y = (this.comet.p0.y + this.comet.p1.y) / 2 + (Math.random() - 0.5) * 200;
        
        this.comet.active = true;
        this.comet.t = 0;
        this.comet.duration = 1.6 + Math.random() * 0.8; // 1.6-2.4s
        this.comet.trailIndex = 0;
        
        // Clear trail buffer
        this.comet.trailBuffer.fill(0);
    }
    
    render() {
        // Single clear - no global shadow effects
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw stars - small 1-2px circles, no blur/shadow
        this.ctx.fillStyle = '#e8e8e8';
        for (let i = 0; i < this.totalStars; i++) {
            const baseIndex = i * 7;
            const x = this.starData[baseIndex];
            const y = this.starData[baseIndex + 1];
            const size = this.starData[baseIndex + 4];
            const alpha = this.starData[baseIndex + 5];
            
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(x, y, Math.min(size, 2), 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw comet if active
        if (this.comet.active) {
            this.renderComet();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    renderComet() {
        const trailLength = Math.min(this.comet.trailIndex, 24);
        if (trailLength < 2) return;
        
        // Comet opacity based on progress
        const progress = this.comet.t;
        let opacity;
        if (progress < 0.2) {
            opacity = progress / 0.2;
        } else if (progress > 0.7) {
            opacity = (1 - progress) / 0.3;
        } else {
            opacity = 1;
        }
        
        // Draw trail as a simple polyline with fading alpha
        for (let i = 1; i < trailLength; i++) {
            const idx = (this.comet.trailIndex - i) % 24;
            const prevIdx = (this.comet.trailIndex - i + 1) % 24;
            
            const x1 = this.comet.trailBuffer[prevIdx * 2];
            const y1 = this.comet.trailBuffer[prevIdx * 2 + 1];
            const x2 = this.comet.trailBuffer[idx * 2];
            const y2 = this.comet.trailBuffer[idx * 2 + 1];
            
            const trailAlpha = opacity * (i / trailLength) * 0.6;
            
            this.ctx.globalAlpha = trailAlpha;
            this.ctx.strokeStyle = '#a8c8ff';
            this.ctx.lineWidth = 1.5 * (i / trailLength);
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Draw comet head
        const headIdx = (this.comet.trailIndex - 1) % 24;
        const headX = this.comet.trailBuffer[headIdx * 2];
        const headY = this.comet.trailBuffer[headIdx * 2 + 1];
        
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = '#ddeeff';
        this.ctx.beginPath();
        this.ctx.arc(headX, headY, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    renderStaticFrame() {
        // Show static stars for reduced motion
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#e8e8e8';
        this.ctx.globalAlpha = 0.5;
        
        for (let i = 0; i < this.totalStars; i++) {
            const baseIndex = i * 7;
            const x = this.starData[baseIndex];
            const y = this.starData[baseIndex + 1];
            const size = this.starData[baseIndex + 4];
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, Math.min(size, 2), 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    animate() {
        const currentTime = performance.now();
        const dt = (currentTime - this.lastFrameTime) / 1000;
        
        // Cap frame rate to ~60fps (skip if dt < 14ms)
        if (dt < this.targetFrameTime / 1000) {
            requestAnimationFrame(() => this.animate());
            return;
        }
        
        this.lastFrameTime = currentTime;
        
        // Update simulation
        this.updateStars(dt, currentTime);
        this.updateComet(dt, currentTime);
        
        // Render frame
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize optimized starfield when page loads
document.addEventListener('DOMContentLoaded', () => {
    new OptimizedStarfield();
});
