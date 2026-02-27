// ============================================================
// ui.js — Menu, Settings, HUD, Action Buttons (all in Cantonese Chinese)
// ============================================================

class UI {
    constructor(renderer, game) {
        this.renderer = renderer;
        this.game = game;
        this.showMenu = true;
        this.showSettings = false;
        this.showRoundEnd = false;
        this.showClaimActions = false;
        this.claimActions = [];
        this.chowCombos = [];
        this.showChowSelect = false;
        this.showingScorePanel = true;

        // Volume panel states
        this.showAudioPanel = false;
        this.showVoicePanel = false;

        // Button positions for click handling
        this.buttons = [];

        // Preload main menu background image
        this._menuBg = new Image();
        this._menuBgLoaded = false;
        this._menuBg.onload = () => {
            this._menuBgLoaded = true;
            // Trigger a redraw so the background appears
            if (this.renderer && this.renderer.ctx) {
                this.renderer.ctx.canvas.dispatchEvent(new Event('menuBgLoaded'));
            }
        };
        this._menuBg.src = 'img/main/mainbkgd.jpg';

        // Preload round outcome images
        this._winImg = new Image();
        this._winImg.src = 'img/outcome/win.png';
        this._drawImg = new Image();
        this._drawImg.src = 'img/outcome/drawgame.png';

        // Preload character selection strip
        this._charStrip = new Image();
        this._charStrip.src = 'img/main/character.png';
    }

    // ===================== Main Menu =====================

    drawMenu() {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;

        // Draw background image or fallback to table
        if (this._menuBgLoaded) {
            // Cover the entire canvas, maintaining aspect ratio
            const imgAspect = this._menuBg.width / this._menuBg.height;
            const canvasAspect = W / H;
            let drawW, drawH, drawX, drawY;
            if (canvasAspect > imgAspect) {
                drawW = W;
                drawH = W / imgAspect;
                drawX = 0;
                drawY = (H - drawH) / 2;
            } else {
                drawH = H;
                drawW = H * imgAspect;
                drawX = (W - drawW) / 2;
                drawY = 0;
            }
            ctx.drawImage(this._menuBg, drawX, drawY, drawW, drawH);
        } else {
            this.renderer.drawTable();
        }

        // Dark overlay (lighter to show background)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, W, H);

        // Title panel
        const panelW = 500;
        const panelH = 520;
        const px = (W - panelW) / 2;
        const py = (H - panelH) / 2 - 20;

        ctx.save();
        // Panel background (semi-transparent)
        const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
        panelGrad.addColorStop(0, 'rgba(20,60,30,0.65)');
        panelGrad.addColorStop(1, 'rgba(10,40,20,0.7)');
        ctx.fillStyle = panelGrad;
        this.renderer._roundRect(px, py, panelW, panelH, 18);
        ctx.fill();
        // Panel border
        ctx.strokeStyle = '#c4973a';
        ctx.lineWidth = 2;
        this.renderer._roundRect(px, py, panelW, panelH, 18);
        ctx.stroke();

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 42px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('香港麻雀', W / 2, py + 55);

        ctx.font = '16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#AADDAA';
        ctx.fillText('單人對戰電腦', W / 2, py + 95);

        // Decorative line
        ctx.strokeStyle = '#c4973a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 40, py + 120);
        ctx.lineTo(px + panelW - 40, py + 120);
        ctx.stroke();

        this.buttons = [];
        let optY = py + 145;

        // ----- Difficulty -----
        ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#E8D8A0';
        ctx.textAlign = 'left';
        ctx.fillText('難度:', px + 40, optY);

        const diffNames = ['簡單', '普通', '困難'];
        for (let i = 0; i < 3; i++) {
            const bx = px + 130 + i * 110;
            const bw = 95;
            const bh = 34;
            const selected = this.game.difficulty === i;
            this._drawMenuButton(bx, optY - 17, bw, bh, diffNames[i], selected);
            this.buttons.push({ x: bx, y: optY - 17, w: bw, h: bh, action: 'difficulty', value: i });
        }

        optY += 55;

        // ----- Min Fan -----
        ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#E8D8A0';
        ctx.textAlign = 'left';
        ctx.fillText('起糊番數:', px + 40, optY);

        const fanOptions = [1, 3];
        const fanNames = ['1番起糊', '3番起糊'];
        for (let i = 0; i < 2; i++) {
            const bx = px + 180 + i * 130;
            const bw = 110;
            const bh = 34;
            const selected = this.game.minFan === fanOptions[i];
            this._drawMenuButton(bx, optY - 17, bw, bh, fanNames[i], selected);
            this.buttons.push({ x: bx, y: optY - 17, w: bw, h: bh, action: 'minFan', value: fanOptions[i] });
        }

        optY += 55;

        // ----- Tile Color Theme -----
        ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#E8D8A0';
        ctx.textAlign = 'left';
        ctx.fillText('牌面顏色:', px + 40, optY);

        optY += 15;
        for (let i = 0; i < 10; i++) {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const bx = px + 40 + col * 86;
            const by = optY + row * 42;
            const bw = 78;
            const bh = 34;
            const theme = TILE_THEMES[i];
            const selected = this.game.tileTheme === i;

            // Color swatch + name
            ctx.save();
            const swatchColor = `hsl(${theme.hue}, ${theme.sat}%, ${theme.lightBase + 20}%)`;
            const bgColor = selected ? 'rgba(196,151,58,0.3)' : 'rgba(255,255,255,0.06)';
            ctx.fillStyle = bgColor;
            this.renderer._roundRect(bx, by, bw, bh, 6);
            ctx.fill();
            if (selected) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
            }
            this.renderer._roundRect(bx, by, bw, bh, 6);
            ctx.stroke();

            // Color dot
            ctx.beginPath();
            ctx.arc(bx + 14, by + bh / 2, 7, 0, Math.PI * 2);
            ctx.fillStyle = swatchColor;
            ctx.fill();

            // Theme name
            ctx.font = '11px "Noto Sans TC", sans-serif';
            ctx.fillStyle = selected ? '#FFD700' : '#CCDDCC';
            ctx.textAlign = 'left';
            ctx.fillText(theme.name.split(' ')[0], bx + 26, by + bh / 2 + 4);
            ctx.restore();

            this.buttons.push({ x: bx, y: by, w: bw, h: bh, action: 'theme', value: i });
        }

        optY += 85;

        // ----- Character Selection -----
        ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#E8D8A0';
        ctx.textAlign = 'left';
        ctx.fillText('選擇角色:', px + 40, optY);

        const charNames = ['阿明', '陳太', '肥佬', '小麗'];
        const charW = 100;
        const charH = 100;
        const charGap = 15;
        const charStartX = px + (panelW - (4 * charW + 3 * charGap)) / 2;
        const charY = optY + 15;

        for (let i = 0; i < 4; i++) {
            const bx = charStartX + i * (charW + charGap);
            const by = charY;
            const selected = this.game.playerCharIndex === i;

            ctx.save();
            // Background & Border
            if (selected) {
                ctx.fillStyle = 'rgba(196,151,58,0.4)';
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
            }
            this.renderer._roundRect(bx, by, charW, charH, 12);
            ctx.fill();
            ctx.stroke();

            // Draw character portrait from character.png (assuming 4 slots horizontal)
            // Draw character portrait from character.png (assuming 4 slots horizontal)
            if (this._charStrip.complete && this._charStrip.naturalWidth > 0) {
                const nw = this._charStrip.naturalWidth;
                const nh = this._charStrip.naturalHeight;
                const sw = nw / 4;
                const sh = nh;

                // Square crop from top (face focus)
                const cropSize = Math.min(sw, sh);
                const sx = i * sw + (sw - cropSize) / 2;
                const sy = 0;

                const portraitSize = 72;
                const dx = bx + (charW - portraitSize) / 2;
                const dy = by + (charH - portraitSize) / 2 - 5;

                ctx.save();
                ctx.beginPath();
                ctx.arc(bx + charW / 2, by + charH / 2 - 5, 35, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(this._charStrip, sx, sy, cropSize, cropSize, dx, dy, portraitSize, portraitSize);
                ctx.restore();
            }

            // Radio Button indicator
            const rx = bx + charW / 2;
            const ry = by + charH - 18;
            ctx.beginPath();
            ctx.arc(rx, ry, 6, 0, Math.PI * 2);
            ctx.fillStyle = selected ? '#FFD700' : 'rgba(255,255,255,0.2)';
            ctx.fill();
            if (selected) {
                ctx.beginPath();
                ctx.arc(rx, ry, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#143c1e';
                ctx.fill();
            }

            // Name
            ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
            ctx.fillStyle = selected ? '#FFD700' : '#AADDAA';
            ctx.textAlign = 'center';
            ctx.fillText(charNames[i], bx + charW / 2, by + charH + 15);
            ctx.restore();

            this.buttons.push({ x: bx, y: by, w: charW, h: charH + 20, action: 'selectCharacter', value: i });
        }

        optY += 140;

        // ----- Start Game Button -----
        const startW = 200;
        const startH = 50;
        const startX = (W - startW) / 2;
        const startY = optY + 15;

        ctx.save();
        const startGrad = ctx.createLinearGradient(startX, startY, startX, startY + startH);
        startGrad.addColorStop(0, '#c4973a');
        startGrad.addColorStop(1, '#8b6914');
        ctx.fillStyle = startGrad;
        this.renderer._roundRect(startX, startY, startW, startH, 12);
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        this.renderer._roundRect(startX, startY, startW, startH, 12);
        ctx.stroke();

        ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('開始遊戲', W / 2, startY + startH / 2);
        ctx.restore();

        this.buttons.push({ x: startX, y: startY, w: startW, h: startH, action: 'start' });

        // Draw decorative tiles
        this._drawDecoTiles(px, py, panelW, panelH);
    }

    _drawMenuButton(x, y, w, h, text, selected) {
        const ctx = this.renderer.ctx;
        ctx.save();
        if (selected) {
            ctx.fillStyle = 'rgba(196,151,58,0.3)';
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
        }
        this.renderer._roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = selected ? '#FFD700' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = selected ? 2 : 1;
        this.renderer._roundRect(x, y, w, h, 8);
        ctx.stroke();
        ctx.font = selected ? 'bold 14px "Noto Sans TC", sans-serif' : '14px "Noto Sans TC", sans-serif';
        ctx.fillStyle = selected ? '#FFD700' : '#CCDDCC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
        ctx.restore();
    }

    _drawDecoTiles(px, py, panelW, panelH) {
        // Draw two decorative tiles beside the title
        const demoTile1 = new Tile(SUITS.DRAGON, DRAGONS.RED, -1);
        const demoTile2 = new Tile(SUITS.DRAGON, DRAGONS.GREEN, -2);
        this.renderer.drawTile(px + 30, py + 30, demoTile1, false, true);
        this.renderer.drawTile(px + panelW - 30 - this.renderer.TILE_W * 0.7, py + 30, demoTile2, false, true);
    }

    // ===================== In-Game Action Buttons =====================

    drawActionButtons(game) {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;
        this.buttons = [];

        // Mute toggle button (always visible during gameplay) - MOVED TO BOTTOM RIGHT
        const muteSize = 36;
        const muteX = W - muteSize - 12;
        const muteY = H - muteSize - 12;
        const isMuted = typeof audioManager !== 'undefined' && audioManager.isMuted();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(muteX + muteSize / 2, muteY + muteSize / 2, muteSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${muteSize * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(isMuted ? '🔇' : '🔊', muteX + muteSize / 2, muteY + muteSize / 2);
        ctx.restore();
        this.buttons.push({ x: muteX, y: muteY, w: muteSize, h: muteSize, action: 'toggleAudioPanel' });

        // Voice toggle button - MOVED TO BOTTOM RIGHT
        const voiceX = muteX - muteSize - 8;
        const voiceY = muteY;
        const voiceEnabled = typeof voiceManager !== 'undefined' && voiceManager.isEnabled();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(voiceX + muteSize / 2, voiceY + muteSize / 2, muteSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${muteSize * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(voiceEnabled ? '🗣️' : '🤐', voiceX + muteSize / 2, voiceY + muteSize / 2);
        ctx.restore();
        this.buttons.push({ x: voiceX, y: voiceY, w: muteSize, h: muteSize, action: 'toggleVoicePanel' });

        // Draw Volume Panels if open (Drawing ABOVE the icon)
        if (this.showAudioPanel) {
            this._drawVolumePanel(muteX + muteSize / 2, muteY - 10, 'audio', audioManager.volume, audioManager.isMuted());
        }
        if (this.showVoicePanel) {
            this._drawVolumePanel(voiceX + muteSize / 2, voiceY - 10, 'voice', voiceManager.volume, !voiceManager.isEnabled());
        }

        const btnH = 42;
        const btnGap = 10;

        if (game.state === GAME_STATE.PLAYER_TURN) {
            // Draw button
            const bw = 100;
            const bx = W / 2 - bw / 2;
            const by = H - this.renderer.TILE_H - 110; // Positioned in safe zone between melds and discards
            this._drawActionBtn(bx, by, bw, btnH, '摸牌', '#2d8b57');
            this.buttons.push({ x: bx, y: by, w: bw, h: btnH, action: 'draw' });
        }

        if (game.state === GAME_STATE.PLAYER_DISCARD) {
            const acts = [];

            // Self-win check
            if (game.canPlayerSelfWin()) {
                acts.push({ label: '自摸!', action: 'selfWin', color: '#CC2222' });
            }

            // Concealed Kong check
            const cKongs = game.hands[0].getConcealedKongs();
            for (const key of cKongs) {
                acts.push({ label: '暗槓', action: 'kong_concealed', value: key, color: '#886600' });
            }

            // Added Kong check
            const aKongs = game.hands[0].getAddedKongs();
            for (const key of aKongs) {
                acts.push({ label: '加槓', action: 'kong_added', value: key, color: '#886600' });
            }

            const totalW = acts.length * (100 + btnGap);
            let startX = W / 2 - totalW / 2;
            const by = H - this.renderer.TILE_H - 110; // Positioned in safe zone between melds and discards

            for (const act of acts) {
                this._drawActionBtn(startX, by, 100, btnH, act.label, act.color);
                this.buttons.push({ x: startX, y: by, w: 100, h: btnH, action: act.action, value: act.value });
                startX += 100 + btnGap;
            }

            // Instruction
            ctx.save();
            ctx.font = '13px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#CCDDCC';
            ctx.textAlign = 'center';
            // Repositioned to safe zone, slightly above buttons
            ctx.fillText('按一下牌嚟打出', W / 2, H - this.renderer.TILE_H - 120 - (acts.length > 0 ? 50 : 0));
            ctx.restore();
        }

        if (game.state === GAME_STATE.CLAIMING) {
            this._drawClaimButtons(game);
        }

        if (game.state === GAME_STATE.DICE_ROLL) {
            this.drawDiceRollOverlay(game);
        }
    }

    drawDiceRollOverlay(game) {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;
        this.buttons = [];

        ctx.save();
        ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('擲骰子決定莊家', W / 2, H / 2 - 100);

        ctx.font = '16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.fillText('東位玩家 (你) 擲骰', W / 2, H / 2 - 70);

        const btnW = 140;
        const btnH = 50;
        if (!game.diceRolled) {
            const bx = W / 2 - btnW / 2;
            const by = H / 2 + 210; // Shifted down to be below new dice position
            this._drawActionBtn(bx, by, btnW, btnH, '擲骰子', '#2d8b57');
            this.buttons.push({ x: bx, y: by, w: btnW, h: btnH, action: 'dice_roll' });
        } else {
            const bx = W / 2 - btnW / 2;
            const by = H / 2 + 230; // Shifted down
            this._drawActionBtn(bx, by, btnW, btnH, '確定', '#c4973a');
            this.buttons.push({ x: bx, y: by, w: btnW, h: btnH, action: 'dice_confirm' });
        }
        ctx.restore();
    }

    _drawClaimButtons(game) {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;
        const btnH = 42;
        const btnGap = 10;

        const actions = game.pendingClaims;
        const labels = { win: '食糊!', kong: '槓', pung: '碰', chow: '吃' };
        const colors = { win: '#CC2222', kong: '#886600', pung: '#2222CC', chow: '#228B22' };

        // "Pass" always available
        const allActs = [...actions, 'pass'];
        const allLabels = { ...labels, pass: '過' };
        const allColors = { ...colors, pass: '#666666' };

        const totalW = allActs.length * (90 + btnGap);
        let startX = W / 2 - totalW / 2;
        const by = H - this.renderer.TILE_H - 115; // Positioned in safe zone

        // Show what tile is being claimed
        if (game.lastDiscard) {
            ctx.save();
            ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText(`${WIND_NAMES[game.seatWinds[game.lastDiscardPlayer]]}家打出 ${game.lastDiscard.displayName}`, W / 2, by - 20);
            ctx.restore();
        }

        for (const act of allActs) {
            this._drawActionBtn(startX, by, 90, btnH, allLabels[act], allColors[act]);
            this.buttons.push({ x: startX, y: by, w: 90, h: btnH, action: 'claim_' + act });
            startX += 90 + btnGap;
        }
    }

    _drawActionBtn(x, y, w, h, text, bgColor) {
        const ctx = this.renderer.ctx;
        ctx.save();

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, bgColor);
        grad.addColorStop(1, this._darkenColor(bgColor, 30));
        ctx.fillStyle = grad;
        this.renderer._roundRect(x, y, w, h, 10);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        this.renderer._roundRect(x, y, w, h, 10);
        ctx.stroke();

        ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);

        ctx.restore();
    }

    _darkenColor(hex, amount) {
        // Simple hex darkening
        if (hex.startsWith('#')) {
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);
            r = Math.max(0, r - amount);
            g = Math.max(0, g - amount);
            b = Math.max(0, b - amount);
            return `rgb(${r},${g},${b})`;
        }
        return hex;
    }

    // ===================== Round End Screen =====================

    drawRoundEnd(game) {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;
        this.buttons = [];

        const playerNames = ['你', '下家', '對家', '上家'];

        if (this.showingScorePanel) {
            // Overlay
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);

            // Calculate panel height based on content
            let contentH = 110; // base padding
            if (game.winner >= 0 && game.winInfo?.scoring?.breakdown) {
                contentH += 30 + game.winInfo.scoring.breakdown.length * 24 + 40; // fan breakdown
                contentH += 30; // total fan
            }
            contentH += 30; // payment details header
            if (game.paymentInfo?.details) contentH += game.paymentInfo.details.length * 22;
            contentH += 135; // score table + button

            const panelW = 480;
            const panelH = Math.min(contentH, H - 40);
            const px = (W - panelW) / 2;
            const py = (H - panelH) / 2;

            // Panel
            ctx.save();
            const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
            panelGrad.addColorStop(0, 'rgba(20,60,30,0.95)');
            panelGrad.addColorStop(1, 'rgba(10,40,20,0.98)');
            ctx.fillStyle = panelGrad;
            this.renderer._roundRect(px, py, panelW, panelH, 15);
            ctx.fill();
            ctx.strokeStyle = '#c4973a';
            ctx.lineWidth = 2;
            this.renderer._roundRect(px, py, panelW, panelH, 15);
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let curY = py + 35;

            if (game.winner >= 0) {
                const winnerName = playerNames[game.winner];
                const info = game.winInfo;

                // Title
                ctx.font = 'bold 28px "Noto Sans TC", sans-serif';
                ctx.fillStyle = '#FFD700';
                ctx.fillText(game.winner === 0 ? '恭喜你！食糊！🎉' : `${winnerName}食糊！`, W / 2, curY);
                curY += 30;

                // Win method
                ctx.font = '15px "Noto Sans TC", sans-serif';
                ctx.fillStyle = '#AADDAA';
                ctx.fillText(info.selfDrawn ? '自摸' : `執${playerNames[info.fromPlayer]}嘅牌`, W / 2, curY);
                curY += 30;

                // Fan breakdown
                if (info.scoring && info.scoring.breakdown.length > 0) {
                    ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
                    ctx.fillStyle = '#E8D8A0';
                    ctx.fillText('番數明細', W / 2, curY);
                    curY += 22;

                    for (const b of info.scoring.breakdown) {
                        ctx.font = '13px "Noto Sans TC", sans-serif';
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#CCDDCC';
                        ctx.fillText(b.name, px + 60, curY);
                        ctx.textAlign = 'right';
                        ctx.fillStyle = '#FFD700';
                        ctx.fillText(`${b.fan} 番`, px + panelW - 60, curY);
                        curY += 22;
                    }

                    // Total fan line
                    curY += 5;
                    ctx.beginPath();
                    ctx.moveTo(px + 60, curY - 3);
                    ctx.lineTo(px + panelW - 60, curY - 3);
                    ctx.strokeStyle = '#c4973a';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#E8D8A0';
                    ctx.fillText('合計', px + 60, curY + 10);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#FFD700';
                    const points = Scoring.fanToPoints(info.scoring.totalFan);
                    ctx.fillText(`${info.scoring.totalFan} 番 = ${points} 分`, px + panelW - 60, curY + 10);
                    curY += 30;
                }
            } else {
                ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
                ctx.fillStyle = '#CCDDCC';
                ctx.fillText('荒莊 — 流局', W / 2, curY);
                curY += 25;

                ctx.font = '14px "Noto Sans TC", sans-serif';
                ctx.fillStyle = '#999999';
                ctx.fillText('冇人食糊，重新開局', W / 2, curY);
                curY += 30;
            }

            // Payment details
            if (game.paymentInfo && game.paymentInfo.details.length > 0) {
                curY += 5;
                ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
                ctx.fillStyle = '#E8D8A0';
                ctx.textAlign = 'center';
                ctx.fillText('─── 計分 ───', W / 2, curY);
                curY += 20;

                for (const detail of game.paymentInfo.details) {
                    ctx.font = '12px "Noto Sans TC", sans-serif';
                    ctx.fillStyle = '#CCDDCC';
                    ctx.textAlign = 'center';
                    ctx.fillText(detail, W / 2, curY);
                    curY += 20;
                }
            }

            // Score table
            curY += 10;
            ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#E8D8A0';
            ctx.textAlign = 'center';
            ctx.fillText('─── 各家分數 ───', W / 2, curY);
            curY += 22;

            const colW = (panelW - 40) / 4;
            for (let i = 0; i < 4; i++) {
                const colX = px + 20 + colW * i + colW / 2;

                // Player name
                ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
                ctx.fillStyle = i === 0 ? '#FFD700' : '#CCDDCC';
                ctx.textAlign = 'center';
                ctx.fillText(playerNames[i], colX, curY);

                // Score delta
                if (game.paymentInfo) {
                    const delta = game.paymentInfo.deltas[i];
                    ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
                    if (delta > 0) {
                        ctx.fillStyle = '#44FF88';
                        ctx.fillText(`▲${delta}`, colX, curY + 18);
                    } else if (delta < 0) {
                        ctx.fillStyle = '#FF4444';
                        ctx.fillText(`▼${Math.abs(delta)}`, colX, curY + 18);
                    } else {
                        ctx.fillStyle = '#888888';
                        ctx.fillText('—', colX, curY + 18);
                    }
                }

                // Current score
                const score = game.scores[i];
                ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
                if (score <= 0) {
                    ctx.fillStyle = '#FF4444';
                } else if (score <= 2000) {
                    ctx.fillStyle = '#FF8844';
                } else {
                    ctx.fillStyle = '#FFD700';
                }
                ctx.fillText(`$${score.toLocaleString()}`, colX, curY + 38);
            }
            curY += 55;

            // Next round button
            const btnW = 160;
            const btnH = 42;
            const btnX = (W - btnW) / 2;
            const btnY = Math.min(curY + 5, py + panelH - 55);

            // Check if game should end
            const gameOver = game.scores.some(s => s <= 0) || game.totalRounds >= game.maxRounds;
            if (gameOver) {
                this._drawActionBtn(btnX, btnY, btnW, btnH, '查看結果', '#886600');
                this.buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'nextRound' });
            } else {
                this._drawActionBtn(btnX, btnY, btnW, btnH, '下一局', '#2d8b57');
                this.buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'nextRound' });
            }
        }

        // --- ROUND OUTCOME IMAGE (Bottom Right Splash) ---
        // Original slice size: 1376x768 -> Display size: 688x384
        const targetW = 688;
        const targetH = 384;
        // Scale to fit screen height if needed, but keep aspect ratio
        const splashScale = Math.min(1.0, (H * 0.8) / targetH);
        const drawW = targetW * splashScale;
        const drawH = targetH * splashScale;
        const ox = W - drawW;
        const oy = H - drawH;

        if (game.winner >= 0) {
            // Display winner slice from win.png (2x2 grid, each 1373 x 765 approx)
            // Use the original Character ID to pick the right quadrant
            const charId = game.characters[game.winner].id;
            // Quadrants: 0: TL, 1: TR, 2: BL, 3: BR
            const sw = 1376;
            const sh = 768;
            const sx = (charId % 2) * sw;
            const sy = Math.floor(charId / 2) * sh;

            if (this._winImg.complete) {
                ctx.save();
                ctx.globalAlpha = 0.9; // Slight transparency for splash effect
                ctx.drawImage(this._winImg, sx, sy, sw, sh, ox, oy, drawW, drawH);
                ctx.restore();
            }
        } else {
            // Display draw image
            if (this._drawImg.complete) {
                ctx.save();
                ctx.globalAlpha = 0.8;
                // Scale draw image to a reasonable size in the corner
                const drawImgScale = Math.min(1.0, (H * 0.5) / this._drawImg.height);
                const dw = this._drawImg.width * drawImgScale;
                const dh = this._drawImg.height * drawImgScale;
                ctx.drawImage(this._drawImg, W - dw - 20, H - dh - 20, dw, dh);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // ===================== Game Over Screen =====================

    drawGameEnd(game) {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;
        this.buttons = [];

        const playerNames = ['你', '下家', '對家', '上家'];

        // Overlay
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        const panelW = 480;
        const panelH = 380;
        const px = (W - panelW) / 2;
        const py = (H - panelH) / 2;

        // Panel
        ctx.save();
        const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
        panelGrad.addColorStop(0, 'rgba(30,20,60,0.95)');
        panelGrad.addColorStop(1, 'rgba(15,10,40,0.98)');
        ctx.fillStyle = panelGrad;
        this.renderer._roundRect(px, py, panelW, panelH, 18);
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        this.renderer._roundRect(px, py, panelW, panelH, 18);
        ctx.stroke();

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 32px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('遊戲結束', W / 2, py + 45);

        // Subtitle
        ctx.font = '14px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#AADDAA';
        const reason = game.scores.some(s => s <= 0) ? '有玩家破產！' : `已完成 ${game.totalRounds} 局`;
        ctx.fillText(reason, W / 2, py + 75);

        // Rankings — sort players by score descending
        const rankings = [0, 1, 2, 3].sort((a, b) => game.scores[b] - game.scores[a]);
        const medals = ['🥇', '🥈', '🥉', ''];

        let fy = py + 115;
        ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#E8D8A0';
        ctx.textAlign = 'center';
        ctx.fillText('─── 最終排名 ───', W / 2, fy);
        fy += 35;

        for (let rank = 0; rank < 4; rank++) {
            const pidx = rankings[rank];
            const score = game.scores[pidx];
            const name = playerNames[pidx];

            // Row background
            ctx.fillStyle = rank === 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)';
            this.renderer._roundRect(px + 30, fy - 15, panelW - 60, 35, 6);
            ctx.fill();

            // Medal + Name
            ctx.font = rank === 0 ? 'bold 18px "Noto Sans TC", sans-serif' : '16px "Noto Sans TC", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = rank === 0 ? '#FFD700' : (pidx === 0 ? '#88CCFF' : '#CCDDCC');
            ctx.fillText(`${medals[rank]} ${rank + 1}. ${name}`, px + 50, fy);

            // Score
            ctx.textAlign = 'right';
            ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
            ctx.fillStyle = score > 10000 ? '#44FF88' : (score <= 0 ? '#FF4444' : '#FFD700');
            ctx.fillText(`$${score.toLocaleString()}`, px + panelW - 50, fy);

            fy += 42;
        }

        // Return to menu button
        const btnW = 200;
        const btnH = 48;
        const btnX = (W - btnW) / 2;
        const btnY = py + panelH - 70;

        const startGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        startGrad.addColorStop(0, '#c4973a');
        startGrad.addColorStop(1, '#8b6914');
        ctx.fillStyle = startGrad;
        this.renderer._roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        this.renderer._roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.stroke();

        ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('返回主選單', W / 2, btnY + btnH / 2);
        this.buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'backToMenu' });

        ctx.restore();
    }

    // ===================== Chow Selection =====================

    drawChowSelect(combos, discardTile) {
        const ctx = this.renderer.ctx;
        const W = this.renderer.W;
        const H = this.renderer.H;
        this.buttons = [];

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);

        const panelW = 440; // Wider for tiles
        const btnH = 56;
        const panelH = 70 + combos.length * (btnH + 10);
        const px = (W - panelW) / 2;
        const py = (H - panelH) / 2;

        ctx.fillStyle = 'rgba(20,60,30,0.95)';
        this.renderer._roundRect(px, py, panelW, panelH, 15);
        ctx.fill();
        ctx.strokeStyle = '#c4973a';
        ctx.lineWidth = 2;
        this.renderer._roundRect(px, py, panelW, panelH, 15);
        ctx.stroke();

        ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('揀邊個吃法:', W / 2, py + 35);

        const smallW = this.renderer.TILE_W * 0.6;
        const smallH = this.renderer.TILE_H * 0.6;

        for (let i = 0; i < combos.length; i++) {
            const combo = combos[i];
            const bx = px + 25;
            const bw = panelW - 50;
            const by = py + 60 + i * (btnH + 10);

            // Button background
            this._drawActionBtn(bx, by, bw, btnH, '', '#228B22');

            // Draw sequence tiles
            const tileKeys = [discardTile.key, ...combo];
            tileKeys.sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

            let tx = bx + 15;
            const ty = by + (btnH - smallH) / 2;

            for (const key of tileKeys) {
                const parts = key.split('_');
                const suit = parts[0];
                const val = parseInt(parts[1]);
                const tempTile = new Tile(suit, val, -99);
                this.renderer.drawTile(tx, ty, tempTile, false, true);
                tx += smallW + 4;
            }

            // Text label
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#FFFFFF';
            const labelText = tileKeys.map(k => NUMBER_NAMES[parseInt(k.split('_')[1])]).join('') + SUIT_NAMES[discardTile.suit];
            ctx.fillText(labelText, tx + 15, by + btnH / 2);
            ctx.restore();

            this.buttons.push({ x: bx, y: by, w: bw, h: btnH, action: 'chow_select', value: i });
        }

        ctx.restore();
    }

    // ===================== Click Handling =====================

    handleClick(mx, my) {
        for (const btn of this.buttons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                return btn;
            }
        }
        return null;
    }

    /** Draw a floating volume slider panel (Drawing upwards from y) */
    _drawVolumePanel(cx, bottomY, type, currentVol, isMuted) {
        const ctx = this.renderer.ctx;
        const panelW = 40;
        const panelH = 140;
        const x = cx - panelW / 2;
        const y = bottomY - panelH;

        ctx.save();
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        this.renderer._roundRect(x, y, panelW, panelH, 8);
        ctx.fill();
        ctx.strokeStyle = '#c4973a';
        ctx.lineWidth = 1;
        this.renderer._roundRect(x, y, panelW, panelH, 8);
        ctx.stroke();

        // Mute button in panel
        const muteY = bottomY - 34; // Near the bottom of the panel
        const muteSize = 24;
        const mx = cx - muteSize / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.fillText(isMuted ? (type === 'audio' ? '🔇' : '🤐') : (type === 'audio' ? '🔊' : '🗣️'), cx, muteY + muteSize / 2);
        this.buttons.push({ x: mx, y: muteY, w: muteSize, h: muteSize, action: type === 'audio' ? 'toggleMute' : 'toggleVoice' });

        // Slider track
        const sliderX = cx - 4;
        const sliderY = y + 10;
        const sliderW = 8;
        const sliderH = 80;
        ctx.fillStyle = '#333';
        this.renderer._roundRect(sliderX, sliderY, sliderW, sliderH, 4);
        ctx.fill();

        // Slider fill
        const fillH = sliderH * currentVol;
        ctx.fillStyle = '#c4973a';
        this.renderer._roundRect(sliderX, sliderY + (sliderH - fillH), sliderW, fillH, 4);
        ctx.fill();

        // Hit area for the whole slider
        this.buttons.push({
            x: x + 5, y: sliderY, w: panelW - 10, h: sliderH,
            action: type === 'audio' ? 'adjustAudio' : 'adjustVoice',
            isSlider: true,
            sliderY: sliderY,
            sliderH: sliderH
        });

        ctx.restore();
    }
}

