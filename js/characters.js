// ============================================================
// characters.js — Animated character avatars with expressions
// ============================================================

// Expression constants
const EXPR = {
    NEUTRAL: 'neutral',
    THINKING: 'thinking',
    HAPPY: 'happy',
    ECSTATIC: 'ecstatic',
    SURPRISED: 'surprised',
    ANGRY: 'angry',
    SMIRK: 'smirk',
    WORRIED: 'worried'
};

// Map expression strings to spritesheet column indices
const EXPR_TO_INDEX = {
    'neutral': 0,
    'thinking': 1,
    'happy': 2,
    'ecstatic': 3,
    'surprised': 4,
    'angry': 5,
    'smirk': 6,
    'worried': 7
};

// Speech bubble text (Cantonese) per expression
const SPEECH_TEXT = {
    neutral: '',
    thinking: '嗯…',
    happy: '好嘢！',
    ecstatic: '食糊！！',
    surprised: '吓？！',
    angry: '唔好彩…',
    smirk: '嘿嘿~',
    worried: '大鑊…'
};

// Global cache for uploaded character images
const IMAGE_CACHE = {};

/**
 * Character class — draws a cartoon avatar with animated facial expressions.
 * Prioritizes high-quality image assets from img/avatars/ with procedural fallback.
 */
class Character {
    constructor(id, name, style) {
        this.id = id; // 0-3
        this.name = name;
        this.style = style;
        this.expression = EXPR.NEUTRAL;
        this.prevExpression = EXPR.NEUTRAL;
        this.transitionProgress = 1;
        this.transitionStart = 0;
        this.speechText = '';
        this.speechTimer = 0;

        // Start preloading images for this character
        this._preloadImages();
    }

    _preloadImages() {
        for (const [expr, idx] of Object.entries(EXPR_TO_INDEX)) {
            const key = `char_${this.id}_expr_${idx}`;
            if (!IMAGE_CACHE[key]) {
                const img = new Image();
                img.src = `img/avatars/${key}.png`;
                IMAGE_CACHE[key] = { img, loaded: false };
                img.onload = () => { IMAGE_CACHE[key].loaded = true; };
            }
        }
    }

    setExpression(expr) {
        if (expr === this.expression) return;
        this.prevExpression = this.expression;
        this.expression = expr;
        this.transitionProgress = 0;
        this.transitionStart = performance.now();

        const text = SPEECH_TEXT[expr];
        if (text) {
            this.speechText = text;
            this.speechTimer = performance.now();
        }
    }

    /**
     * Draw the character avatar.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx - centre X
     * @param {number} cy - centre Y
     * @param {number} size - avatar diameter
     */
    draw(ctx, cx, cy, size) {
        const now = performance.now();
        const elapsed = now - this.transitionStart;
        this.transitionProgress = Math.min(1, elapsed / 300);

        const exprIdx = EXPR_TO_INDEX[this.expression] ?? 0;
        const imgKey = `char_${this.id}_expr_${exprIdx}`;
        const cacheEntry = IMAGE_CACHE[imgKey];

        if (cacheEntry && cacheEntry.loaded) {
            this._drawImageAvatar(ctx, cx, cy, size, cacheEntry.img);
        } else {
            // Fallback to procedural drawing
            this._drawProceduralAvatar(ctx, cx, cy, size);
        }

        // === Speech Bubble ===
        if (this.speechText && (now - this.speechTimer) < 2500) {
            const s = size / 2;
            this._drawSpeechBubble(ctx, cx, cy - s - 10, this.speechText);
        }

        // === Name Label ===
        ctx.save();
        ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#EEDDAA';
        ctx.fillText(this.name, cx, cy + size / 2 + 5);
        ctx.restore();
    }

    _drawImageAvatar(ctx, cx, cy, size, img) {
        const s = size;
        ctx.save();

        // Circular clipping
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
        ctx.clip();

        // Draw image (maintaining aspect ratio, fitting to width/height)
        // Image is 344x384 (sliced). We'll cover the circle.
        const aspect = img.width / img.height;
        let drawW, drawH;
        if (aspect > 1) {
            drawH = s;
            drawW = s * aspect;
        } else {
            drawW = s;
            drawH = s / aspect;
        }

        ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

        // Border
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,215,0,0.4)';
        ctx.stroke();

        ctx.restore();
    }

    _drawProceduralAvatar(ctx, cx, cy, size) {
        const s = size / 2;
        const st = this.style;

        ctx.save();

        // === Background circle ===
        ctx.beginPath();
        ctx.arc(cx, cy, s, 0, Math.PI * 2);
        const bgGrad = ctx.createRadialGradient(cx - s * 0.2, cy - s * 0.2, 0, cx, cy, s);
        bgGrad.addColorStop(0, 'rgba(60,60,80,0.7)');
        bgGrad.addColorStop(1, 'rgba(30,30,50,0.85)');
        ctx.fillStyle = bgGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // === Face ===
        const faceW = s * (st.faceWidth || 0.72);
        const faceH = s * 0.82;
        const faceY = cy + s * 0.05;

        ctx.beginPath();
        ctx.ellipse(cx, faceY, faceW, faceH, 0, 0, Math.PI * 2);
        const skinGrad = ctx.createRadialGradient(cx - faceW * 0.15, faceY - faceH * 0.2, 0, cx, faceY, faceH);
        skinGrad.addColorStop(0, st.skinLight);
        skinGrad.addColorStop(1, st.skinBase);
        ctx.fillStyle = skinGrad;
        ctx.fill();

        // === Hair ===
        this._drawHair(ctx, cx, cy, s, faceW, faceH, faceY, st);

        // === Eyes ===
        const eyeParams = this._getExpressionEyes();
        const eyeSpacing = faceW * 0.48;
        const eyeY = faceY - faceH * 0.12;
        const eyeSize = s * (st.eyeSize || 0.16);

        this._drawEye(ctx, cx - eyeSpacing, eyeY, eyeSize, eyeParams, st);
        this._drawEye(ctx, cx + eyeSpacing, eyeY, eyeSize, eyeParams, st);

        // === Glasses ===
        if (st.hasGlasses) {
            this._drawGlasses(ctx, cx, eyeY, eyeSpacing, eyeSize);
        }

        // === Eyebrows ===
        this._drawEyebrows(ctx, cx, eyeY, eyeSpacing, eyeSize, eyeParams);

        // === Mouth ===
        const mouthY = faceY + faceH * 0.38;
        this._drawMouth(ctx, cx, mouthY, faceW, eyeParams);

        // === Cheeks (blush) ===
        if (eyeParams.blush) {
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing * 1.1, eyeY + eyeSize * 2.5, eyeSize * 0.8, eyeSize * 0.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,100,100,0.25)';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing * 1.1, eyeY + eyeSize * 2.5, eyeSize * 0.8, eyeSize * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // === Earrings ===
        if (st.hasEarrings) {
            ctx.beginPath();
            ctx.arc(cx - faceW - 2, faceY + faceH * 0.1, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + faceW + 2, faceY + faceH * 0.1, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // === Sweat drop (worried/surprised) ===
        if (this.expression === EXPR.WORRIED || this.expression === EXPR.SURPRISED) {
            ctx.beginPath();
            ctx.moveTo(cx + faceW * 0.9, eyeY - eyeSize);
            ctx.quadraticCurveTo(cx + faceW + 6, eyeY + eyeSize * 0.5, cx + faceW * 0.9, eyeY + eyeSize * 1.5);
            ctx.quadraticCurveTo(cx + faceW * 0.6, eyeY + eyeSize * 0.5, cx + faceW * 0.9, eyeY - eyeSize);
            ctx.fillStyle = 'rgba(100,180,255,0.7)';
            ctx.fill();
        }

        // === Anger veins ===
        if (this.expression === EXPR.ANGRY) {
            const vx = cx + faceW * 0.5;
            const vy = faceY - faceH * 0.7;
            ctx.strokeStyle = '#CC3333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(vx, vy); ctx.lineTo(vx + 6, vy - 3);
            ctx.moveTo(vx, vy); ctx.lineTo(vx + 6, vy + 3);
            ctx.moveTo(vx, vy); ctx.lineTo(vx - 3, vy - 5);
            ctx.moveTo(vx, vy); ctx.lineTo(vx - 3, vy + 5);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawHair(ctx, cx, cy, s, faceW, faceH, faceY, st) {
        const hairTop = faceY - faceH * 1.02;
        ctx.save();
        ctx.fillStyle = st.hairColor;

        switch (st.hairStyle) {
            case 'short': {
                ctx.beginPath();
                ctx.ellipse(cx, hairTop + faceH * 0.3, faceW * 1.1, faceH * 0.45, 0, Math.PI, 0);
                ctx.fill();
                for (let i = -3; i <= 3; i++) {
                    ctx.beginPath();
                    const sx = cx + i * faceW * 0.25;
                    ctx.moveTo(sx - 4, hairTop + faceH * 0.15);
                    ctx.lineTo(sx, hairTop - 4 - Math.abs(i) * 1);
                    ctx.lineTo(sx + 4, hairTop + faceH * 0.15);
                    ctx.fill();
                }
                break;
            }
            case 'wavy': {
                ctx.beginPath();
                ctx.ellipse(cx, hairTop + faceH * 0.35, faceW * 1.15, faceH * 0.55, 0, Math.PI, 0);
                ctx.fill();
                // Side waves
                ctx.beginPath();
                ctx.moveTo(cx - faceW * 1.1, faceY - faceH * 0.3);
                ctx.quadraticCurveTo(cx - faceW * 1.3, faceY + faceH * 0.4, cx - faceW * 0.9, faceY + faceH * 0.6);
                ctx.quadraticCurveTo(cx - faceW * 1.3, faceY + faceH * 0.8, cx - faceW * 0.8, faceY + faceH);
                ctx.lineTo(cx - faceW * 0.6, faceY + faceH * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + faceW * 1.1, faceY - faceH * 0.3);
                ctx.quadraticCurveTo(cx + faceW * 1.3, faceY + faceH * 0.4, cx + faceW * 0.9, faceY + faceH * 0.6);
                ctx.quadraticCurveTo(cx + faceW * 1.3, faceY + faceH * 0.8, cx + faceW * 0.8, faceY + faceH);
                ctx.lineTo(cx + faceW * 0.6, faceY + faceH * 0.5);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'bald': {
                ctx.beginPath();
                ctx.ellipse(cx, hairTop + faceH * 0.35, faceW * 1.05, faceH * 0.42, 0, Math.PI, 0);
                ctx.fillStyle = st.skinBase;
                ctx.fill();
                // Shine
                ctx.beginPath();
                ctx.ellipse(cx - faceW * 0.2, hairTop + faceH * 0.15, faceW * 0.25, faceH * 0.12, -0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fill();
                break;
            }
            case 'ponytail': {
                ctx.beginPath();
                ctx.ellipse(cx, hairTop + faceH * 0.3, faceW * 1.1, faceH * 0.48, 0, Math.PI, 0);
                ctx.fill();
                // Ponytail
                ctx.beginPath();
                ctx.moveTo(cx + faceW * 0.5, hairTop + faceH * 0.1);
                ctx.quadraticCurveTo(cx + faceW * 1.8, hairTop - faceH * 0.1, cx + faceW * 1.6, hairTop + faceH * 0.8);
                ctx.quadraticCurveTo(cx + faceW * 1.5, hairTop + faceH * 1.0, cx + faceW * 1.0, hairTop + faceH * 0.7);
                ctx.quadraticCurveTo(cx + faceW * 1.4, hairTop + faceH * 0.3, cx + faceW * 0.5, hairTop + faceH * 0.1);
                ctx.fill();
                // Hair tie
                ctx.beginPath();
                ctx.arc(cx + faceW * 0.7, hairTop + faceH * 0.15, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#FF6699';
                ctx.fill();
                break;
            }
        }
        ctx.restore();
    }

    _getExpressionEyes() {
        const curr = EXPRESSION_PARAMS[this.expression] || EXPRESSION_PARAMS.neutral;
        return {
            eyeOpenY: curr.eyeOpenY,
            eyeOpenX: curr.eyeOpenX,
            pupilSize: curr.pupilSize,
            pupilOffsetY: curr.pupilOffsetY || 0,
            browAngle: curr.browAngle,
            browOffsetY: curr.browOffsetY,
            mouthCurve: curr.mouthCurve,
            mouthOpen: curr.mouthOpen,
            mouthWidth: curr.mouthWidth,
            blush: curr.blush
        };
    }

    _drawEye(ctx, cx, cy, size, params) {
        const openY = size * params.eyeOpenY;
        const openX = size * params.eyeOpenX;

        ctx.beginPath();
        ctx.ellipse(cx, cy, openX, openY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (openY > size * 0.15) {
            const pupilR = size * params.pupilSize;
            const pupilY = cy + size * params.pupilOffsetY;
            ctx.beginPath();
            ctx.arc(cx, pupilY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx - pupilR * 0.3, pupilY - pupilR * 0.3, pupilR * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
        }
    }

    _drawGlasses(ctx, cx, eyeY, spacing, eyeSize) {
        ctx.strokeStyle = '#554433';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx - spacing, eyeY, eyeSize * 1.4, eyeSize * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + spacing, eyeY, eyeSize * 1.4, eyeSize * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - spacing + eyeSize * 1.3, eyeY);
        ctx.lineTo(cx + spacing - eyeSize * 1.3, eyeY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - spacing - eyeSize * 1.3, eyeY);
        ctx.lineTo(cx - spacing - eyeSize * 2.2, eyeY - eyeSize * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + spacing + eyeSize * 1.3, eyeY);
        ctx.lineTo(cx + spacing + eyeSize * 2.2, eyeY - eyeSize * 0.3);
        ctx.stroke();
    }

    _drawEyebrows(ctx, cx, eyeY, spacing, eyeSize, params) {
        const browY = eyeY - eyeSize * 1.6 + params.browOffsetY * eyeSize;
        const browLen = eyeSize * 1.3;
        const angle = params.browAngle;

        ctx.strokeStyle = this.style.hairColor === '#222222' ? '#333333' : this.style.hairColor;
        ctx.lineWidth = this.style.hairColor === '#bald' ? 3.5 : 2.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(cx - spacing - browLen * 0.5, browY + angle * browLen);
        ctx.lineTo(cx - spacing + browLen * 0.5, browY - angle * browLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + spacing - browLen * 0.5, browY - angle * browLen);
        ctx.lineTo(cx + spacing + browLen * 0.5, browY + angle * browLen);
        ctx.stroke();
    }

    _drawMouth(ctx, cx, my, faceW, params) {
        const mw = faceW * params.mouthWidth;

        ctx.strokeStyle = '#CC4444';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        if (params.mouthOpen > 0) {
            ctx.beginPath();
            ctx.ellipse(cx, my, mw, mw * params.mouthOpen, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#881111';
            ctx.fill();
            ctx.strokeStyle = '#CC4444';
            ctx.stroke();

            if (params.mouthCurve > 0.3 && params.mouthOpen > 0.4) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(cx - mw * 0.6, my - mw * params.mouthOpen * 0.1, mw * 1.2, mw * params.mouthOpen * 0.4);
            }
        } else {
            ctx.beginPath();
            ctx.moveTo(cx - mw, my);
            ctx.quadraticCurveTo(cx, my + mw * params.mouthCurve * 2, cx + mw, my);
            ctx.stroke();
        }
    }

    _drawSpeechBubble(ctx, cx, bubbleBottom, text) {
        ctx.save();
        ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
        const metrics = ctx.measureText(text);
        const bw = metrics.width + 16;
        const bh = 24;
        const bx = cx - bw / 2;
        const by = bubbleBottom - bh - 8;

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.moveTo(bx + 6, by);
        ctx.lineTo(bx + bw - 6, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 6);
        ctx.lineTo(bx + bw, by + bh - 6);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 6, by + bh);
        ctx.lineTo(cx + 6, by + bh);
        ctx.lineTo(cx, by + bh + 8);
        ctx.lineTo(cx - 4, by + bh);
        ctx.lineTo(bx + 6, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 6);
        ctx.lineTo(bx, by + 6);
        ctx.quadraticCurveTo(bx, by, bx + 6, by);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cx, by + bh / 2);
        ctx.restore();
    }
}

// Expression parameter definitions (retained for fallback)
const EXPRESSION_PARAMS = {
    neutral: {
        eyeOpenY: 1.0, eyeOpenX: 1.0, pupilSize: 0.5, pupilOffsetY: 0,
        browAngle: 0, browOffsetY: 0,
        mouthCurve: 0.1, mouthOpen: 0, mouthWidth: 0.35,
        blush: false
    },
    thinking: {
        eyeOpenY: 0.6, eyeOpenX: 0.9, pupilSize: 0.45, pupilOffsetY: -0.15,
        browAngle: 0.15, browOffsetY: -0.3,
        mouthCurve: -0.1, mouthOpen: 0, mouthWidth: 0.25,
        blush: false
    },
    happy: {
        eyeOpenY: 0.3, eyeOpenX: 1.1, pupilSize: 0.4, pupilOffsetY: 0,
        browAngle: -0.1, browOffsetY: -0.2,
        mouthCurve: 0.7, mouthOpen: 0.3, mouthWidth: 0.45,
        blush: true
    },
    ecstatic: {
        eyeOpenY: 0.15, eyeOpenX: 1.2, pupilSize: 0.35, pupilOffsetY: 0,
        browAngle: -0.2, browOffsetY: -0.5,
        mouthCurve: 1.0, mouthOpen: 0.6, mouthWidth: 0.55,
        blush: true
    },
    surprised: {
        eyeOpenY: 1.5, eyeOpenX: 1.3, pupilSize: 0.35, pupilOffsetY: 0,
        browAngle: -0.3, browOffsetY: -0.8,
        mouthCurve: 0, mouthOpen: 0.5, mouthWidth: 0.3,
        blush: false
    },
    angry: {
        eyeOpenY: 0.7, eyeOpenX: 0.85, pupilSize: 0.55, pupilOffsetY: 0.1,
        browAngle: 0.5, browOffsetY: 0.3,
        mouthCurve: -0.5, mouthOpen: 0, mouthWidth: 0.4,
        blush: false
    },
    smirk: {
        eyeOpenY: 0.5, eyeOpenX: 0.9, pupilSize: 0.5, pupilOffsetY: 0.1,
        browAngle: 0.2, browOffsetY: -0.2,
        mouthCurve: 0.4, mouthOpen: 0, mouthWidth: 0.35,
        blush: false
    },
    worried: {
        eyeOpenY: 1.2, eyeOpenX: 1.0, pupilSize: 0.4, pupilOffsetY: 0.15,
        browAngle: -0.35, browOffsetY: 0,
        mouthCurve: -0.4, mouthOpen: 0, mouthWidth: 0.3,
        blush: false
    }
};

/** Create the 4 game characters */
function createCharacters() {
    return [
        // Player (bottom) — 阿明
        new Character(0, '阿明 (你)', {
            skinBase: '#E8B887', skinLight: '#F5D4B3',
            hairColor: '#222222', hairStyle: 'short',
            hasGlasses: false, hasEarrings: false,
            eyeSize: 0.16, faceWidth: 0.70
        }),
        // Right — 陳太
        new Character(1, '陳太', {
            skinBase: '#F0C8A0', skinLight: '#FBE4CC',
            hairColor: '#4A2810', hairStyle: 'wavy',
            hasGlasses: true, hasEarrings: false,
            eyeSize: 0.14, faceWidth: 0.68
        }),
        // Top — 肥佬
        new Character(2, '肥佬', {
            skinBase: '#D4A06A', skinLight: '#E8C498',
            hairColor: '#333333', hairStyle: 'bald',
            hasGlasses: false, hasEarrings: false,
            eyeSize: 0.14, faceWidth: 0.80
        }),
        // Left — 小麗
        new Character(3, '小麗', {
            skinBase: '#FBD5B5', skinLight: '#FFE8D6',
            hairColor: '#1A0A00', hairStyle: 'ponytail',
            hasGlasses: false, hasEarrings: true,
            eyeSize: 0.17, faceWidth: 0.65
        })
    ];
}
