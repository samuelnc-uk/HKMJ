// ============================================================
// renderer.js — Canvas rendering: realistic ivory tiles, green felt table
// ============================================================

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileThemeIndex = 0;

        // Tile dimensions
        this.TILE_W = 44;
        this.TILE_H = 60;
        this.TILE_R = 5; // corner radius
        this.TILE_GAP = 3;

        // Cached patterns
        this._feltPattern = null;

        // Tile image sprites
        this._tileImages = {};
        this._imagesLoaded = false;
        this._loadTileImages();

        this.resize();

        // Particle system for fireworks
        this.particles = [];
    }

    /** Preload all tile sprite images */
    _loadTileImages() {
        const basePath = 'img/tiles/';
        const files = [];

        // Number suits: tung, sok, wan (1-9)
        for (const suit of ['tung', 'sok', 'wan']) {
            for (let v = 1; v <= 9; v++) {
                files.push({ key: `${suit}_${v}`, file: `${suit}_${v}.png` });
            }
        }
        // Winds (1=East, 2=South, 3=West, 4=North)
        for (let v = 1; v <= 4; v++) {
            files.push({ key: `wind_${v}`, file: `wind_${v}.png` });
        }
        // Dragons (1=Red, 2=Green, 3=White)
        for (let v = 1; v <= 3; v++) {
            files.push({ key: `dragon_${v}`, file: `dragon_${v}.png` });
        }
        // Flowers (1=梅, 2=蘭, 3=竹, 4=菊)
        for (let v = 1; v <= 4; v++) {
            files.push({ key: `flower_${v}`, file: `flower_${v}.png` });
        }
        // Seasons (1=春, 2=夏, 3=秋, 4=冬)
        for (let v = 1; v <= 4; v++) {
            files.push({ key: `season_${v}`, file: `season_${v}.png` });
        }
        // Tile backs
        files.push({ key: 'back_1', file: 'back_1.png' });
        files.push({ key: 'back_2', file: 'back_2.png' });

        let loaded = 0;
        const total = files.length;

        for (const { key, file } of files) {
            const img = new Image();
            img.onload = () => {
                this._tileImages[key] = img;
                loaded++;
                if (loaded >= total) {
                    this._imagesLoaded = true;
                    console.log(`All ${total} tile images loaded.`);
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load tile image: ${file}`);
                loaded++;
                if (loaded >= total) {
                    this._imagesLoaded = true;
                }
            };
            img.src = basePath + file;
        }
    }

    /** Get the image key for a tile */
    _getTileImageKey(tile) {
        if (tile.suit === SUITS.WIND) return `wind_${tile.value}`;
        if (tile.suit === SUITS.DRAGON) return `dragon_${tile.value}`;
        if (tile.suit === SUITS.FLOWER) return `flower_${tile.value}`;
        if (tile.suit === SUITS.SEASON) return `season_${tile.value}`;
        return `${tile.suit}_${tile.value}`;
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.isPortrait = this.H > this.W;

        this.canvas.width = this.W * dpr;
        this.canvas.height = this.H * dpr;
        this.canvas.style.width = this.W + 'px';
        this.canvas.style.height = this.H + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Responsive tile size - adjusted for portrait
        const baseWidth = this.isPortrait ? 800 : 1400;
        const baseHeight = this.isPortrait ? 1200 : 900;
        const scaleFactor = Math.min(this.W / baseWidth, this.H / baseHeight, 1.2);

        this.TILE_W = Math.floor(44 * scaleFactor);
        this.TILE_H = Math.floor(60 * scaleFactor);
        this.TILE_R = Math.floor(5 * scaleFactor);
        this.TILE_GAP = Math.floor(3 * scaleFactor);
    }

    // ===================== Table Background =====================

    drawTable() {
        const ctx = this.ctx;

        // Green felt gradient
        const grd = ctx.createRadialGradient(this.W / 2, this.H / 2, 50, this.W / 2, this.H / 2, this.W * 0.7);
        grd.addColorStop(0, '#1a6b3c');
        grd.addColorStop(0.5, '#145a30');
        grd.addColorStop(1, '#0d3d20');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, this.W, this.H);

        // Felt texture noise
        this._drawFeltTexture();

        // Table border
        const bw = 12;
        ctx.strokeStyle = '#5c3a1e';
        ctx.lineWidth = bw;
        ctx.strokeRect(bw / 2, bw / 2, this.W - bw, this.H - bw);
        // Inner gold trim
        ctx.strokeStyle = '#c4973a';
        ctx.lineWidth = 2;
        ctx.strokeRect(bw + 4, bw + 4, this.W - (bw + 4) * 2, this.H - (bw + 4) * 2);
    }

    _drawFeltTexture() {
        const ctx = this.ctx;
        // Subtle noise for felt texture
        ctx.save();
        ctx.globalAlpha = 0.04;
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * this.W;
            const y = Math.random() * this.H;
            const r = Math.random() * 2 + 0.5;
            ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
            ctx.fillRect(x, y, r, r);
        }
        ctx.restore();
    }

    // ===================== Tile Drawing =====================

    /**
     * Draw a single tile face-up.
     * @param {number} x - left
     * @param {number} y - top
     * @param {Tile} tile
     * @param {boolean} highlight - draw selection highlight
     * @param {boolean} small - smaller tile (for melds/opponents)
     */
    drawTile(x, y, tile, highlight = false, small = false) {
        const ctx = this.ctx;
        const w = small ? this.TILE_W * 0.7 : this.TILE_W;
        const h = small ? this.TILE_H * 0.7 : this.TILE_H;
        const r = small ? this.TILE_R * 0.7 : this.TILE_R;

        ctx.save();

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = small ? 3 : 6;
        ctx.shadowOffsetX = small ? 1 : 2;
        ctx.shadowOffsetY = small ? 2 : 3;

        // Tile body — ivory gradient
        const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
        bodyGrad.addColorStop(0, '#FFFFF0');
        bodyGrad.addColorStop(0.3, '#F5F0DC');
        bodyGrad.addColorStop(0.7, '#EDE5CC');
        bodyGrad.addColorStop(1, '#E0D8B8');

        this._roundRect(x, y, w, h, r);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // 3D edge effect — top/left lighter, bottom/right darker
        ctx.shadowColor = 'transparent';

        // Top edge highlight
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bottom edge shadow
        ctx.beginPath();
        ctx.moveTo(x + r, y + h);
        ctx.lineTo(x + w - r, y + h);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Border
        this._roundRect(x, y, w, h, r);
        ctx.strokeStyle = '#BDB39C';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw tile face content
        this._drawTileFace(x, y, w, h, tile, small);

        // Selection highlight
        if (highlight) {
            this._roundRect(x - 1, y - 1, w + 2, h + 2, r + 1);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
            ctx.shadowBlur = 10;
            this._roundRect(x - 1, y - 1, w + 2, h + 2, r + 1);
            ctx.stroke();
        }

        ctx.restore();
    }

    /** Draw a face-down tile — follows selected theme */
    drawTileBack(x, y, small = false, vertical = false) {
        const ctx = this.ctx;
        let w = small ? this.TILE_W * 0.7 : this.TILE_W;
        let h = small ? this.TILE_H * 0.7 : this.TILE_H;
        const r = small ? this.TILE_R * 0.7 : this.TILE_R;

        if (vertical) {
            [w, h] = [h, w];
        }

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        const theme = TILE_THEMES[this.tileThemeIndex] || TILE_THEMES[0];

        // Use image if Classic theme and image is loaded
        if (this.tileThemeIndex === 0 && this._tileImages['back_1']) {
            ctx.drawImage(this._tileImages['back_1'], x, y, w, h);
        } else {
            // Themed dynamic back
            const hbase = theme.hue;
            const sbase = theme.sat;
            const lbase = theme.lightBase;

            const backGrad = ctx.createLinearGradient(x, y, x + w, y + h);
            backGrad.addColorStop(0, `hsl(${hbase}, ${sbase}%, ${lbase + 5}%)`);
            backGrad.addColorStop(0.5, `hsl(${hbase}, ${sbase}%, ${lbase}%)`);
            backGrad.addColorStop(1, `hsl(${hbase}, ${sbase}%, ${lbase - 10}%)`);

            this._roundRect(x, y, w, h, r);
            ctx.fillStyle = backGrad;
            ctx.fill();

            ctx.shadowColor = 'transparent';

            // Bamboo/Linen pattern on back (subtle)
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 0.8;
            const step = small ? 5 : 7;
            for (let i = 0; i < w; i += step) {
                ctx.beginPath();
                ctx.moveTo(x + i, y);
                ctx.lineTo(x + i, y + h);
                ctx.stroke();
            }
            for (let j = 0; j < h; j += step) {
                ctx.beginPath();
                ctx.moveTo(x, y + j);
                ctx.lineTo(x + w, y + j);
                ctx.stroke();
            }

            // Border
            this._roundRect(x, y, w, h, r);
            ctx.strokeStyle = `hsl(${hbase}, ${sbase}%, ${Math.max(0, lbase - 20)}%)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    /** Draw tile face — use image sprite if available, else fall back to procedural */
    _drawTileFace(x, y, w, h, tile, small) {
        const ctx = this.ctx;
        const key = this._getTileImageKey(tile);
        const img = this._tileImages[key];

        if (img) {
            // Draw the sprite image inside the tile, with padding
            const pad = w * 0.08;
            const dx = x + pad;
            const dy = y + pad;
            const dw = w - pad * 2;
            const dh = h - pad * 2;
            ctx.drawImage(img, dx, dy, dw, dh);
            return;
        }

        // Fallback: procedural drawing
        const theme = TILE_THEMES[this.tileThemeIndex];
        const fontSize = small ? Math.floor(w * 0.55) : Math.floor(w * 0.55);
        const smallFont = small ? Math.floor(w * 0.35) : Math.floor(w * 0.35);

        if (tile.isDragon) {
            this._drawDragon(x, y, w, h, tile, fontSize);
        } else if (tile.isWind) {
            this._drawWind(x, y, w, h, tile, fontSize, theme);
        } else {
            this._drawNumberTile(x, y, w, h, tile, fontSize, smallFont, theme);
        }
    }

    _drawDragon(x, y, w, h, tile, fontSize) {
        const ctx = this.ctx;
        const cx = x + w / 2;
        const cy = y + h / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (tile.value === DRAGONS.RED) {
            // 中 — red
            ctx.font = `bold ${fontSize * 1.2}px "Noto Sans TC", "Noto Serif TC", serif`;
            ctx.fillStyle = '#CC2222';
            ctx.strokeStyle = '#991111';
            ctx.lineWidth = 0.5;
            ctx.fillText('中', cx, cy);
            ctx.strokeText('中', cx, cy);
        } else if (tile.value === DRAGONS.GREEN) {
            // 發 — green
            ctx.font = `bold ${fontSize * 1.1}px "Noto Sans TC", "Noto Serif TC", serif`;
            ctx.fillStyle = '#228B22';
            ctx.strokeStyle = '#145a14';
            ctx.lineWidth = 0.5;
            ctx.fillText('發', cx, cy);
            ctx.strokeText('發', cx, cy);
        } else {
            // 白板 — white dragon, just a blue rectangle border
            const bx = cx - w * 0.25;
            const by = cy - h * 0.2;
            const bw = w * 0.5;
            const bh = h * 0.4;
            ctx.strokeStyle = '#4488CC';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);
        }
    }

    _drawWind(x, y, w, h, tile, fontSize, theme) {
        const ctx = this.ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hsl = `hsl(${theme.hue}, ${theme.sat}%, ${theme.lightBase}%)`;
        ctx.font = `bold ${fontSize * 1.2}px "Noto Sans TC", "Noto Serif TC", serif`;
        ctx.fillStyle = hsl;
        ctx.fillText(WIND_NAMES[tile.value], x + w / 2, y + h / 2);
    }

    _drawNumberTile(x, y, w, h, tile, fontSize, smallFont, theme) {
        const ctx = this.ctx;

        if (tile.suit === SUITS.WAN) {
            this._drawWanTile(x, y, w, h, tile, fontSize, smallFont);
        } else if (tile.suit === SUITS.TUNG) {
            this._drawTungTile(x, y, w, h, tile, theme);
        } else if (tile.suit === SUITS.SOK) {
            this._drawSokTile(x, y, w, h, tile, theme);
        }
    }

    // ===================== 萬子 (Characters) =====================
    _drawWanTile(x, y, w, h, tile, fontSize, smallFont) {
        const ctx = this.ctx;
        const cx = x + w / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Number in red
        ctx.font = `bold ${fontSize}px "Noto Sans TC", "Noto Serif TC", serif`;
        ctx.fillStyle = '#CC2222';
        ctx.fillText(NUMBER_NAMES[tile.value], cx, y + h * 0.33);
        // 萬 in black
        ctx.font = `bold ${smallFont}px "Noto Sans TC", "Noto Serif TC", serif`;
        ctx.fillStyle = '#222222';
        ctx.fillText('萬', cx, y + h * 0.70);
    }

    // ===================== 筒子 (Circles / Dots) =====================
    /**
     * Draw authentic 筒子 patterns — concentric coloured circles
     * arranged in the traditional layout for values 1-9.
     */
    _drawTungTile(x, y, w, h, tile, theme) {
        const ctx = this.ctx;
        // Usable drawing area (with padding)
        const pad = w * 0.12;
        const ax = x + pad;
        const ay = y + pad;
        const aw = w - pad * 2;
        const ah = h - pad * 2;

        const val = tile.value;
        // Determine circle positions based on value
        const positions = this._getTungPositions(val, ax, ay, aw, ah);
        const maxR = this._getTungRadius(val, aw, ah);

        for (let i = 0; i < positions.length; i++) {
            this._drawCircleDot(positions[i].x, positions[i].y, maxR, i, val, theme);
        }
    }

    /** Get circle centre positions for each 筒子 value */
    _getTungPositions(val, ax, ay, aw, ah) {
        const cx = ax + aw / 2;
        const cy = ay + ah / 2;
        const positions = [];

        switch (val) {
            case 1:
                positions.push({ x: cx, y: cy });
                break;
            case 2:
                positions.push({ x: cx, y: ay + ah * 0.28 });
                positions.push({ x: cx, y: ay + ah * 0.72 });
                break;
            case 3:
                positions.push({ x: cx, y: ay + ah * 0.18 });
                positions.push({ x: cx, y: cy });
                positions.push({ x: cx, y: ay + ah * 0.82 });
                break;
            case 4:
                positions.push({ x: ax + aw * 0.3, y: ay + ah * 0.3 });
                positions.push({ x: ax + aw * 0.7, y: ay + ah * 0.3 });
                positions.push({ x: ax + aw * 0.3, y: ay + ah * 0.7 });
                positions.push({ x: ax + aw * 0.7, y: ay + ah * 0.7 });
                break;
            case 5:
                positions.push({ x: ax + aw * 0.25, y: ay + ah * 0.25 });
                positions.push({ x: ax + aw * 0.75, y: ay + ah * 0.25 });
                positions.push({ x: cx, y: cy });
                positions.push({ x: ax + aw * 0.25, y: ay + ah * 0.75 });
                positions.push({ x: ax + aw * 0.75, y: ay + ah * 0.75 });
                break;
            case 6:
                for (let r = 0; r < 3; r++) {
                    positions.push({ x: ax + aw * 0.3, y: ay + ah * (0.2 + r * 0.3) });
                    positions.push({ x: ax + aw * 0.7, y: ay + ah * (0.2 + r * 0.3) });
                }
                break;
            case 7:
                for (let r = 0; r < 3; r++) {
                    positions.push({ x: ax + aw * 0.3, y: ay + ah * (0.2 + r * 0.3) });
                    positions.push({ x: ax + aw * 0.7, y: ay + ah * (0.2 + r * 0.3) });
                }
                positions.push({ x: cx, y: ay + ah * 0.08 });
                break;
            case 8:
                for (let r = 0; r < 4; r++) {
                    positions.push({ x: ax + aw * 0.3, y: ay + ah * (0.15 + r * 0.233) });
                    positions.push({ x: ax + aw * 0.7, y: ay + ah * (0.15 + r * 0.233) });
                }
                break;
            case 9:
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        positions.push({
                            x: ax + aw * (0.22 + c * 0.28),
                            y: ay + ah * (0.2 + r * 0.3)
                        });
                    }
                }
                break;
        }
        return positions;
    }

    /** Appropriate radius for circles based on how many need to fit */
    _getTungRadius(val, aw, ah) {
        const minDim = Math.min(aw, ah);
        if (val === 1) return minDim * 0.32;
        if (val <= 3) return minDim * 0.20;
        if (val <= 5) return minDim * 0.16;
        if (val <= 7) return minDim * 0.13;
        return minDim * 0.11;
    }

    /** Draw a single concentric circle dot (筒) with traditional colours */
    _drawCircleDot(cx, cy, r, index, val, theme) {
        const ctx = this.ctx;

        // Traditional colours: alternate between blue-green and red-orange
        // 1筒 is special — multi-ringed
        if (val === 1) {
            // Large ornate circle for 1筒
            // Outer ring — green
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = '#1a7a42';
            ctx.fill();
            // Middle ring — white
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
            ctx.fillStyle = '#F5F0DC';
            ctx.fill();
            // Inner ring — red
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
            ctx.fillStyle = '#CC3333';
            ctx.fill();
            // Centre — blue
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#2255AA';
            ctx.fill();
            // Core dot
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = '#F5F0DC';
            ctx.fill();
            return;
        }

        // Multi-circle tiles: alternate colours
        const isGreen = (index % 2 === 0);
        const outerColor = isGreen ? '#1a7a42' : '#CC3333';
        const innerColor = isGreen ? '#F5F0DC' : '#F5F0DC';
        const coreColor = isGreen ? '#2255AA' : '#CC3333';

        // Outer circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = outerColor;
        ctx.fill();

        // Inner circle (ivory gap)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = innerColor;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.fill();
    }

    // ===================== 索子 (Bamboo) =====================
    /**
     * Draw authentic 索子 patterns — bamboo sticks with node segments.
     * 1索 draws a bird (traditional sparrow/peacock).
     */
    _drawSokTile(x, y, w, h, tile, theme) {
        const ctx = this.ctx;
        const pad = w * 0.1;
        const ax = x + pad;
        const ay = y + pad;
        const aw = w - pad * 2;
        const ah = h - pad * 2;
        const val = tile.value;

        if (val === 1) {
            this._drawSokBird(ax, ay, aw, ah);
            return;
        }

        const stickPositions = this._getSokPositions(val, ax, ay, aw, ah);
        for (let i = 0; i < stickPositions.length; i++) {
            const s = stickPositions[i];
            const isGreen = (i % 2 === 0);
            this._drawBambooStick(s.x, s.y, s.stickW, s.stickH, isGreen);
        }
    }

    /** Get bamboo stick positions for each 索子 value */
    _getSokPositions(val, ax, ay, aw, ah) {
        const positions = [];
        const stickW = Math.min(aw * 0.22, 10);
        const stickH = ah * 0.42;

        switch (val) {
            case 2:
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.27, stickW, stickH });
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.73, stickW, stickH });
                break;
            case 3:
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.18, stickW, stickH: stickH * 0.8 });
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.50, stickW, stickH: stickH * 0.8 });
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.82, stickW, stickH: stickH * 0.8 });
                break;
            case 4: {
                const sh = stickH * 0.9;
                positions.push({ x: ax + aw * 0.33, y: ay + ah * 0.27, stickW, stickH: sh });
                positions.push({ x: ax + aw * 0.67, y: ay + ah * 0.27, stickW, stickH: sh });
                positions.push({ x: ax + aw * 0.33, y: ay + ah * 0.73, stickW, stickH: sh });
                positions.push({ x: ax + aw * 0.67, y: ay + ah * 0.73, stickW, stickH: sh });
                break;
            }
            case 5: {
                const sh = stickH * 0.8;
                positions.push({ x: ax + aw * 0.33, y: ay + ah * 0.22, stickW, stickH: sh });
                positions.push({ x: ax + aw * 0.67, y: ay + ah * 0.22, stickW, stickH: sh });
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.50, stickW, stickH: sh });
                positions.push({ x: ax + aw * 0.33, y: ay + ah * 0.78, stickW, stickH: sh });
                positions.push({ x: ax + aw * 0.67, y: ay + ah * 0.78, stickW, stickH: sh });
                break;
            }
            case 6: {
                const sh = stickH * 0.8;
                for (let r = 0; r < 3; r++) {
                    positions.push({ x: ax + aw * 0.33, y: ay + ah * (0.18 + r * 0.32), stickW, stickH: sh });
                    positions.push({ x: ax + aw * 0.67, y: ay + ah * (0.18 + r * 0.32), stickW, stickH: sh });
                }
                break;
            }
            case 7: {
                const sh = stickH * 0.65;
                positions.push({ x: ax + aw / 2, y: ay + ah * 0.10, stickW, stickH: sh });
                for (let r = 0; r < 3; r++) {
                    positions.push({ x: ax + aw * 0.33, y: ay + ah * (0.30 + r * 0.24), stickW, stickH: sh });
                    positions.push({ x: ax + aw * 0.67, y: ay + ah * (0.30 + r * 0.24), stickW, stickH: sh });
                }
                break;
            }
            case 8: {
                const sh = stickH * 0.55;
                for (let r = 0; r < 4; r++) {
                    positions.push({ x: ax + aw * 0.33, y: ay + ah * (0.14 + r * 0.24), stickW, stickH: sh });
                    positions.push({ x: ax + aw * 0.67, y: ay + ah * (0.14 + r * 0.24), stickW, stickH: sh });
                }
                break;
            }
            case 9: {
                const sh = stickH * 0.55;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        positions.push({
                            x: ax + aw * (0.22 + c * 0.28),
                            y: ay + ah * (0.18 + r * 0.32),
                            stickW, stickH: sh
                        });
                    }
                }
                break;
            }
        }
        return positions;
    }

    /** Draw a single bamboo stick with segmented nodes */
    _drawBambooStick(cx, cy, sw, sh, isGreen) {
        const ctx = this.ctx;
        const halfH = sh / 2;
        const halfW = sw / 2;

        // Stick body
        const bodyColor = isGreen ? '#1a7a42' : '#2255AA';
        const lightColor = isGreen ? '#2aaa62' : '#4488CC';
        const darkColor = isGreen ? '#0d5028' : '#113366';

        // Draw main stick body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(cx - halfW, cy - halfH, sw, sh);

        // Gradient shading for 3D effect
        const grad = ctx.createLinearGradient(cx - halfW, cy, cx + halfW, cy);
        grad.addColorStop(0, darkColor);
        grad.addColorStop(0.3, lightColor);
        grad.addColorStop(0.7, bodyColor);
        grad.addColorStop(1, darkColor);
        ctx.fillStyle = grad;
        ctx.fillRect(cx - halfW, cy - halfH, sw, sh);

        // Bamboo nodes (horizontal segments)
        const nodeCount = 3;
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1;
        for (let n = 0; n <= nodeCount; n++) {
            const ny = cy - halfH + (sh / nodeCount) * n;
            // Node band (slightly wider)
            const bandH = sh * 0.06;
            ctx.fillStyle = isGreen ? '#0d5028' : '#113366';
            ctx.fillRect(cx - halfW - 1, ny - bandH / 2, sw + 2, bandH);
            // Highlight on node
            ctx.fillStyle = isGreen ? 'rgba(100,220,150,0.4)' : 'rgba(100,160,255,0.4)';
            ctx.fillRect(cx - halfW, ny - bandH / 2 + 1, sw, 1);
        }

        // Top and bottom caps (rounded)
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.ellipse(cx, cy - halfH, halfW, halfW * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, cy + halfH, halfW, halfW * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /** Draw the 1索 bird (simplified peacock/sparrow) */
    _drawSokBird(ax, ay, aw, ah) {
        const ctx = this.ctx;
        const cx = ax + aw / 2;
        const cy = ay + ah / 2;
        const s = Math.min(aw, ah) * 0.45;

        ctx.save();

        // Body (green oval)
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.15, s * 0.4, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a7a42';
        ctx.fill();

        // Body highlight
        ctx.beginPath();
        ctx.ellipse(cx - s * 0.08, cy + s * 0.05, s * 0.2, s * 0.35, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#2aaa62';
        ctx.fill();

        // Head (red circle)
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.45, s * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#CC3333';
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(cx + s * 0.05, cy - s * 0.48, s * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + s * 0.06, cy - s * 0.48, s * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Beak
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.22, cy - s * 0.48);
        ctx.lineTo(cx + s * 0.38, cy - s * 0.43);
        ctx.lineTo(cx + s * 0.22, cy - s * 0.38);
        ctx.closePath();
        ctx.fillStyle = '#CC8800';
        ctx.fill();

        // Tail feathers (blue/green)
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.1, cy + s * 0.6);
        ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 1.0, cx - s * 0.35, cy + s * 0.65);
        ctx.strokeStyle = '#2255AA';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.65);
        ctx.quadraticCurveTo(cx, cy + s * 1.1, cx + s * 0.05, cy + s * 0.7);
        ctx.strokeStyle = '#1a7a42';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.1, cy + s * 0.6);
        ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 1.0, cx + s * 0.35, cy + s * 0.65);
        ctx.strokeStyle = '#CC3333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wing detail
        ctx.beginPath();
        ctx.ellipse(cx + s * 0.15, cy + s * 0.1, s * 0.15, s * 0.3, 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = '#0d5028';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // ===================== Game Board Layout =====================

    /**
     * Draw the complete game state.
     * @param {Game} game
     */
    drawGame(game) {
        // Clear and draw table
        this.ctx.clearRect(0, 0, this.W, this.H);
        this.drawTable();

        // Centre info
        this._drawCentreInfo(game);

        // Player hand (bottom)
        this._drawPlayerHand(game);

        // Opponent hands
        this._drawOpponentHands(game);

        // All discard piles
        this._drawDiscardPiles(game);

        // Exposed Area (Melds + Flowers)
        this._drawExposedArea(game);

        // Dice (If in dice roll state)
        if (game.state === GAME_STATE.DICE_ROLL) {
            this._drawDice(game);
        }

        // Character avatars
        this._drawCharacters(game);

        // HUD / Info
        this._drawCentreInfo(game);

        // Fireworks/Particles
        if (this.particles.length > 0) {
            this._updateParticles();
            this._drawParticles();
        }
    }

    _drawDice(game) {
        const ctx = this.ctx;
        const cx = this.W / 2;
        const cy = this.H / 2;
        const results = game.diceResults;
        if (!results || results[0] === 0) return;

        const diceW = 34;
        const spacing = 10;
        const startX = cx - (diceW * 3 + spacing * 2) / 2;

        ctx.save();
        for (let i = 0; i < 3; i++) {
            const dx = startX + i * (diceW + spacing);
            const dy = cy + 140; // Shifted down from center to avoid discards

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this._roundRect(dx + 3, dy + 3, diceW, diceW, 6);
            ctx.fill();

            // Dice body
            ctx.fillStyle = '#fdfdfd';
            this._roundRect(dx, dy, diceW, diceW, 6);
            ctx.fill();
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Dots
            this._drawDiceDots(dx, dy, diceW, results[i]);
        }

        // Show sum and dealer pointer
        const sum = results.reduce((a, b) => a + b, 0);
        ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText(`點數: ${sum}`, cx, cy + 140 + diceW + 15);

        // Draw an arrow pointing to the selected dealer
        if (game.diceRolled) {
            const dealerIdx = (sum - 1) % 4;
            const angles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI]; // Bottom, Right, Top, Left
            const angle = angles[dealerIdx];
            const dist = 60;
            const ax = cx + Math.cos(angle) * (dist + 40); // Offset from the new cluster center
            const ay = (cy + 140 + diceW / 2) + Math.sin(angle) * dist;

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - Math.cos(angle - 0.4) * 20, ay - Math.sin(angle - 0.4) * 20);
            ctx.lineTo(ax - Math.cos(angle + 0.4) * 20, ay - Math.sin(angle + 0.4) * 20);
            ctx.closePath();
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.fillText('莊家在此', ax, ay + (dealerIdx === 2 ? -25 : 30));
        }
        ctx.restore();
    }

    _drawDiceDots(x, y, size, val) {
        const ctx = this.ctx;
        const pad = size / 4;
        const r = size / 10;
        ctx.fillStyle = (val === 1 || val === 4) ? '#cc0000' : '#222';

        const dot = (px, py) => {
            ctx.beginPath();
            ctx.arc(x + px, y + py, r, 0, Math.PI * 2);
            ctx.fill();
        };

        if (val === 1) {
            dot(size / 2, size / 2);
        } else if (val === 2) {
            dot(pad, pad);
            dot(size - pad, size - pad);
        } else if (val === 3) {
            dot(pad, pad);
            dot(size / 2, size / 2);
            dot(size - pad, size - pad);
        } else if (val === 4) {
            dot(pad, pad);
            dot(size - pad, pad);
            dot(pad, size - pad);
            dot(size - pad, size - pad);
        } else if (val === 5) {
            dot(pad, pad);
            dot(size - pad, pad);
            dot(size / 2, size / 2);
            dot(pad, size - pad);
            dot(size - pad, size - pad);
        } else if (val === 6) {
            dot(pad, pad);
            dot(size - pad, pad);
            dot(pad, size / 2);
            dot(size - pad, size / 2);
            dot(pad, size - pad);
            dot(size - pad, size - pad);
        }
    }

    /** Draw character avatars at each player position */
    _drawCharacters(game) {
        if (!game.characters || game.characters.length < 4) return;
        const ctx = this.ctx;
        // Increased avatar size by 1.5x (80 -> 120 base)
        const avatarSize = Math.floor(Math.min(120, this.W * 0.08, this.H * 0.12));
        const playerNames = ['你', '下家', '對家', '上家'];

        // Avatars moved to extreme corners
        const positions = [
            { x: 70, y: this.H - 80 },            // Player 0 (bottom-left)
            { x: this.W - 70, y: this.H - 160 },   // Player 1 (right)
            { x: this.W - 70, y: 80 },             // Player 2 (top-right)
            { x: 70, y: 80 }                       // Player 3 (left)
        ];

        for (let i = 0; i < 4; i++) {
            const pos = positions[i];
            const char = game.characters[i];

            // Current player highlight
            if (game.currentPlayer === i) {
                const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);
                ctx.save();
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, avatarSize / 2 + 8, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + pulse * 0.5})`;
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.restore();
            }

            char.draw(ctx, pos.x, pos.y, avatarSize);

            // Score display beneath avatar
            if (game.scores) {
                const score = game.scores[i];
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Score value with color coding
                ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
                if (score <= 2000) {
                    ctx.fillStyle = '#FF4444'; // danger
                } else if (score >= 15000) {
                    ctx.fillStyle = '#44FF88'; // winning big
                } else {
                    ctx.fillStyle = '#FFD700'; // normal gold
                }
                // Increased offset to account for larger avatar radius
                ctx.fillText(`$${score.toLocaleString()}`, pos.x, pos.y + avatarSize / 2 + 25);
                ctx.restore();
            }
        }
    }

    _drawCentreInfo(game) {
        const ctx = this.ctx;
        const cx = this.W / 2;
        const cy = this.H / 2;

        // Central area background
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        const infoW = 170;
        const infoH = 120;
        this._roundRect(cx - infoW / 2, cy - infoH / 2, infoW, infoH, 10);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Round wind
        ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${WIND_NAMES[game.roundWind]}風圈`, cx, cy - 35);

        // Round counter
        ctx.font = '12px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#AADDAA';
        ctx.fillText(`第 ${game.totalRounds + 1} / ${game.maxRounds} 局`, cx, cy - 15);

        // Remaining tiles
        ctx.font = '14px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#CCDDCC';
        ctx.fillText(`餘牌: ${game.wall.remaining}`, cx, cy + 10);

        // Current player wind
        if (game.seatWinds && game.seatWinds.length > 0) {
            ctx.font = '14px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#AADDAA';
            ctx.fillText(`你: ${WIND_NAMES[game.seatWinds[0]]}風`, cx, cy + 35);
        }

        ctx.restore();
    }

    /** Draw all players' hands around the table */
    drawHands(game) {
        if (!game.hands) return;
        const isReveal = (game.state === GAME_STATE.ROUND_END || game.state === GAME_STATE.GAME_END);

        if (this.isPortrait) {
            this._drawHandsPortrait(game, isReveal);
        } else {
            this._drawHandsLandscape(game, isReveal);
        }
    }

    _drawHandsLandscape(game, isReveal) {
        this._drawPlayerHand(game);
        this._drawOpponentHands(game);
    }

    _drawPlayerHand(game) {
        const hand = game.hands[0];
        if (!hand) return;
        const tiles = hand.concealed;
        const totalW = tiles.length * (this.TILE_W + this.TILE_GAP);
        let startX = (this.W - totalW) / 2;
        const y = this.H - this.TILE_H - 15;
        this._playerTilePositions = [];
        for (let i = 0; i < tiles.length; i++) {
            const x = startX + i * (this.TILE_W + this.TILE_GAP);
            const isHighlighted = (this._selectedTileIndex === i);
            const isDrawn = game._drawnTile && tiles[i].id === game._drawnTile.id;
            const drawY = isDrawn ? y - 8 : y;
            this.drawTile(x, drawY, tiles[i], isHighlighted);
            this._playerTilePositions.push({ x, y: drawY, w: this.TILE_W, h: this.TILE_H, index: i });
        }
    }

    _drawOpponentHands(game) {
        const isReveal = (game.state === GAME_STATE.ROUND_END || game.state === GAME_STATE.GAME_END);
        // Top player (index 2)
        if (game.hands[2]) {
            const count = game.hands[2].concealed.length;
            const totalW = count * (this.TILE_W * 0.7 + 2);
            const startX = (this.W - totalW) / 2;
            const ty = 25;
            for (let i = 0; i < count; i++) {
                const tx = startX + i * (this.TILE_W * 0.7 + 2);
                if (isReveal) this.drawTile(tx, ty, game.hands[2].concealed[i], false, true);
                else this.drawTileBack(tx, ty, true);
            }
            this.ctx.fillStyle = '#AADDAA';
            this.ctx.font = '13px "Noto Sans TC", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`對家 (${WIND_NAMES[game.seatWinds[2]]})`, this.W / 2, 18);
        }
        // Right player (index 1)
        if (game.hands[1]) {
            const count = game.hands[1].concealed.length;
            const totalH = count * (this.TILE_W * 0.7 + 2);
            const startY = (this.H - totalH) / 2;
            const tx = this.W - this.TILE_H * 0.7 - 25;
            for (let i = 0; i < count; i++) {
                const ty = startY + i * (this.TILE_W * 0.7 + 2);
                if (isReveal) {
                    this.ctx.save();
                    this.ctx.translate(tx + (this.TILE_H * 0.7) / 2, ty + (this.TILE_W * 0.7) / 2);
                    this.ctx.rotate(-Math.PI / 2);
                    this.drawTile(-(this.TILE_W * 0.7) / 2, -(this.TILE_H * 0.7) / 2, game.hands[1].concealed[i], false, true);
                    this.ctx.restore();
                } else this.drawTileBack(tx, ty, true, true);
            }
            this.ctx.save();
            this.ctx.translate(this.W - 14, this.H / 2);
            this.ctx.rotate(-Math.PI / 2);
            this.ctx.fillStyle = '#AADDAA';
            this.ctx.font = '13px "Noto Sans TC", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`下家 (${WIND_NAMES[game.seatWinds[1]]})`, 0, 0);
            this.ctx.restore();
        }
        // Left player (index 3)
        if (game.hands[3]) {
            const count = game.hands[3].concealed.length;
            const totalH = count * (this.TILE_W * 0.7 + 2);
            const startY = (this.H - totalH) / 2;
            const tx = 25;
            for (let i = 0; i < count; i++) {
                const ty = startY + i * (this.TILE_W * 0.7 + 2);
                if (isReveal) {
                    this.ctx.save();
                    this.ctx.translate(tx + (this.TILE_H * 0.7) / 2, ty + (this.TILE_W * 0.7) / 2);
                    this.ctx.rotate(Math.PI / 2);
                    this.drawTile(-(this.TILE_W * 0.7) / 2, -(this.TILE_H * 0.7) / 2, game.hands[3].concealed[i], false, true);
                    this.ctx.restore();
                } else this.drawTileBack(tx, ty, true, true);
            }
            this.ctx.save();
            this.ctx.translate(14, this.H / 2);
            this.ctx.rotate(Math.PI / 2);
            this.ctx.fillStyle = '#AADDAA';
            this.ctx.font = '13px "Noto Sans TC", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`上家 (${WIND_NAMES[game.seatWinds[3]]})`, 0, 0);
            this.ctx.restore();
        }
    }

    _drawHandsPortrait(game, isReveal) {
        // Player (bottom) - more space and higher for thumbs
        const hand = game.hands[0];
        if (hand) {
            const tiles = hand.concealed;
            const totalW = tiles.length * (this.TILE_W + this.TILE_GAP);
            let startX = (this.W - totalW) / 2;
            const y = this.H - this.TILE_H - 60;

            this._playerTilePositions = [];
            for (let i = 0; i < tiles.length; i++) {
                const x = startX + i * (this.TILE_W + this.TILE_GAP);
                const isHighlighted = (this._selectedTileIndex === i);
                const isDrawn = game._drawnTile && tiles[i].id === game._drawnTile.id;
                const drawY = isDrawn ? y - 10 : (isHighlighted ? y - 20 : y);

                this.drawTile(x, drawY, tiles[i], isHighlighted);
                this._playerTilePositions.push({ x, y: drawY, w: this.TILE_W, h: this.TILE_H, index: i });
            }
            // Label
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`你 (${WIND_NAMES[game.seatWinds[0]]})`, this.W / 2, this.H - 25);
        }

        // Group opponents at the top in portrait
        const opponents = [
            { idx: 3, label: '上家', x: 20, align: 'left' },
            { idx: 2, label: '對家', x: this.W / 2, align: 'center' },
            { idx: 1, label: '下家', x: this.W - 20, align: 'right' }
        ];

        opponents.forEach(p => {
            const h = game.hands[p.idx];
            if (!h) return;
            const count = h.concealed.length;
            const tw = this.TILE_W * 0.45;
            const th = this.TILE_H * 0.45;
            const totalW = count * (tw + 1);

            let sx = p.x;
            if (p.align === 'right') sx -= totalW;
            else if (p.align === 'center') sx -= totalW / 2;

            // Name
            this.ctx.fillStyle = '#AADDAA';
            this.ctx.font = '12px "Noto Sans TC", sans-serif';
            this.ctx.textAlign = p.align;
            this.ctx.fillText(`${p.label} (${WIND_NAMES[game.seatWinds[p.idx]]})`, p.x, 20);

            for (let i = 0; i < count; i++) {
                if (isReveal) {
                    this.drawTile(sx + i * (tw + 1), 28, h.concealed[i], false, true);
                } else {
                    this.drawTileBack(sx + i * (tw + 1), 28, false, true);
                }
            }
        });
    }

    /** Draw discard piles in the centre area */
    _drawDiscardPiles(game) {
        if (!game.hands || !game.hands[0]) return;
        const ctx = this.ctx;
        const cx = this.W / 2;
        const cy = this.H / 2;
        const smallW = this.TILE_W * 0.55;
        const smallH = this.TILE_H * 0.55;
        const gap = 2;
        const cols = 6;

        // Bottom player discards (going up from centre)
        this._drawDiscardGrid(game.hands[0].discards, cx, cy + 65, smallW, smallH, gap, cols, 'up');
        // Top player discards (going down from centre)
        this._drawDiscardGrid(game.hands[2].discards, cx, cy - 65, smallW, smallH, gap, cols, 'down');
        // Right player discards (grow right)
        this._drawDiscardGrid(game.hands[1].discards, cx + 100, cy, smallW, smallH, gap, cols, 'right');
        // Left player discards (grow left)
        this._drawDiscardGrid(game.hands[3].discards, cx - 100, cy, smallW, smallH, gap, cols, 'left');
    }

    _drawDiscardGrid(discards, cx, cy, tw, th, gap, cols, direction) {
        if (!discards || discards.length === 0) return;

        for (let i = 0; i < discards.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            let x, y;

            if (direction === 'up') {
                x = cx - (cols * (tw + gap)) / 2 + col * (tw + gap);
                y = cy + row * (th + gap);
            } else if (direction === 'down') {
                x = cx - (cols * (tw + gap)) / 2 + col * (tw + gap);
                y = cy - (row + 1) * (th + gap);
            } else if (direction === 'left') {
                x = cx - (row + 1) * (tw + gap);
                y = cy - (cols * (th + gap)) / 2 + col * (th + gap);
            } else { // right
                x = cx + row * (tw + gap);
                y = cy - (cols * (th + gap)) / 2 + col * (th + gap);
            }

            this.drawTile(x, y, discards[i], false, true);
        }
    }

    /** Draw exposed melds and flowers together beside each player */
    _drawExposedArea(game) {
        for (let p = 0; p < 4; p++) {
            const hand = game.hands ? game.hands[p] : null;
            if (!hand) continue;
            const melds = hand.melds;
            const flowers = hand.flowers;
            if (melds.length === 0 && flowers.length === 0) continue;

            const smallW = this.TILE_W * 0.6;
            const smallH = this.TILE_H * 0.6;
            let startX, startY;

            const flowerRowsCount = Math.ceil(flowers.length / 4);

            // 1. Calculate positions and dimensions
            if (this.isPortrait) {
                // Portrait positions
                if (p === 0) { // Bottom (You) - Above hand
                    startX = 20;
                    startY = this.H - this.TILE_H - 140;
                } else if (p === 2) { // Top (Opposite) - Below hand
                    startX = this.W / 2 - 40;
                    startY = 60;
                } else if (p === 3) { // Left - Below top label
                    startX = 20;
                    startY = 60;
                } else { // Right - Below top label
                    startX = this.W - 120;
                    startY = 60;
                }
            } else {
                if (p === 0 || p === 2) { // Horizontal row (Bottom / Top)
                    const totalMeldTiles = melds.reduce((acc, m) => acc + m.tiles.length, 0);
                    const totalMeldGaps = (melds.length > 1 ? melds.length - 1 : 0);

                    const flowerTileCount = flowers.length;
                    const flowerW = flowerTileCount * (smallW + 1);
                    const meldW = totalMeldTiles * (smallW + 1) + totalMeldGaps * 6;
                    const gap = (flowers.length > 0 && melds.length > 0) ? 6 : 0;

                    startX = (this.W - (flowerW + gap + meldW)) / 2;
                    startY = (p === 0)
                        ? this.H - this.TILE_H - smallH - 35  // Bottom
                        : 25 + this.TILE_H * 0.7 + 15;        // Top
                } else { // Vertical stack (Right / Left)
                    const totalItems = flowerRowsCount + melds.length;
                    const totalH = totalItems * (smallH + 4) - 4;

                    startX = (p === 1)
                        ? this.W - this.TILE_H * 0.7 - smallW * 4 - 50 // Right
                        : this.TILE_H * 0.7 + 50;                      // Left
                    startY = (this.H - totalH) / 2;
                }
            }

            // 2. Draw Flowers first
            let flowerOffsetX = 0;
            let currentExposedY = startY;

            for (let i = 0; i < flowers.length; i++) {
                const col = i % 4;
                const row = Math.floor(i / 4);

                const tx = (p === 1 || p === 3) ? startX + col * (smallW + 1) : startX + flowerOffsetX;
                const ty = (p === 1 || p === 3) ? startY + row * (smallH + 4) : startY;

                this.drawTile(tx, ty, flowers[i], false, true);

                if (p === 0 || p === 2) {
                    flowerOffsetX += smallW + 1;
                }
            }

            // Update positions for Melds
            let meldBaseX = startX;
            let meldBaseY = startY;

            if (p === 0 || p === 2) {
                meldBaseX = startX + flowerOffsetX + (flowers.length > 0 ? 6 : 0);
            } else {
                meldBaseY = startY + flowerRowsCount * (smallH + 4);
            }

            // 3. Draw Melds
            for (const meld of melds) {
                let meldOffsetX = 0;

                for (let t = 0; t < meld.tiles.length; t++) {
                    const tx = meldBaseX + meldOffsetX;
                    const ty = meldBaseY;

                    const isReveal = (game.state === GAME_STATE.ROUND_END || game.state === GAME_STATE.GAME_END);
                    if (meld.type === MELD_TYPE.KONG_CONCEALED && t > 0 && t < 3 && !isReveal) {
                        this.drawTileBack(tx, ty, true);
                    } else {
                        this.drawTile(tx, ty, meld.tiles[t], false, true);
                    }
                    meldOffsetX += smallW + 1;
                }

                if (p === 1 || p === 3) {
                    meldBaseY += smallH + 4;
                } else {
                    meldBaseX += meldOffsetX + 6; // Gap between melds
                }
            }
        }
    }

    // ===================== Utility =====================

    _roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /** Hit-test: which player tile was clicked? Returns index or -1 */
    hitTestPlayerTile(mx, my) {
        if (!this._playerTilePositions) return -1;
        for (const pos of this._playerTilePositions) {
            if (mx >= pos.x && mx <= pos.x + pos.w && my >= pos.y && my <= pos.y + pos.h) {
                return pos.index;
            }
        }
        return -1;
    }

    // Selected tile tracking
    _selectedTileIndex = -1;
    setSelectedTile(idx) {
        this._selectedTileIndex = idx;
    }

    /** Create a firework explosion at (x, y) */
    createFirework(x, y, color = null) {
        const count = 60 + Math.random() * 40;
        const colors = color ? [color] : ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const force = 2 + Math.random() * 6;
            const c = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * force,
                vy: Math.sin(angle) * force,
                color: c,
                radius: 1 + Math.random() * 2,
                alpha: 1,
                decay: 0.01 + Math.random() * 0.02
            });
        }
    }

    _updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.vx *= 0.98; // air resistance
            p.vy *= 0.98;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    _drawParticles() {
        const ctx = this.ctx;
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
