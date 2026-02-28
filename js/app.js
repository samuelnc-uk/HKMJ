// ============================================================
// app.js — Entry point, input handling, game loop
// ============================================================

(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const game = new Game();
    const renderer = new Renderer(canvas);
    const ui = new UI(renderer, game);

    let aiTimer = null;
    let showingMenu = true;
    let showingRoundEnd = false;
    let showingGameEnd = false;
    let showingChowSelect = false;
    let pendingChowCombos = [];

    // Start intro music on load
    audioManager.playIntro();

    // Flag to prevent double-clicks during discard
    let discardProcessed = false;

    // ===================== Callbacks =====================
    game.onStateChange = function (state) {
        if (state === GAME_STATE.PLAYER_DISCARD) {
            discardProcessed = false; // Reset lock when player turn starts
        }

        if (state === GAME_STATE.ROUND_END) {
            showingRoundEnd = true;
            ui.showingScorePanel = false; // Reveal hands first, hide score panel
            audioManager.playSummary();

            // Trigger fireworks if someone won
            if (game.winner >= 0) {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        renderer.createFirework(
                            Math.random() * renderer.W,
                            Math.random() * (renderer.H * 0.6)
                        );
                    }, i * 400);
                }
            }

            // After 3 seconds, show the score panel
            setTimeout(() => {
                ui.showingScorePanel = true;
                requestDraw();
            }, 3000);

        } else if (state === GAME_STATE.GAME_END) {
            showingGameEnd = true;
            showingRoundEnd = false;
        }
        requestDraw();
    };

    game.onUpdate = function () {
        requestDraw();
        // Auto-process AI turns with delay (longer to allow voice to finish)
        if (game.state === GAME_STATE.AI_TURN) {
            if (aiTimer) clearTimeout(aiTimer);
            aiTimer = setTimeout(() => {
                game.processAITurn();
                requestDraw();
            }, 1500);
        }
    };

    // ===================== Drawing =====================
    let drawQueued = false;
    let animating = false;

    function requestDraw() {
        if (!drawQueued) {
            drawQueued = true;
            requestAnimationFrame(draw);
        }
    }

    /** Start continuous animation loop (for character avatar animations) */
    function startAnimLoop() {
        if (animating) return;
        animating = true;
        function animFrame() {
            if (!animating) return;
            draw();
            requestAnimationFrame(animFrame);
        }
        requestAnimationFrame(animFrame);
    }

    function stopAnimLoop() {
        animating = false;
    }

    function draw() {
        drawQueued = false;
        renderer.tileThemeIndex = game.tileTheme;

        if (showingMenu) {
            stopAnimLoop();
            ui.drawMenu();
            return;
        }

        // During gameplay, keep animation loop running for character avatars
        if (!animating) startAnimLoop();

        if (showingGameEnd) {
            renderer.drawGame(game);
            ui.drawGameEnd(game);
            return;
        }

        if (showingRoundEnd) {
            renderer.drawGame(game);
            ui.drawRoundEnd(game);
            return;
        }

        if (showingChowSelect) {
            renderer.drawGame(game);
            const discardTile = game.lastDiscard;
            ui.drawChowSelect(pendingChowCombos, discardTile);
            return;
        }

        renderer.drawGame(game);
        ui.drawActionButtons(game);
    }

    // ===================== Input =====================
    let isDraggingSlider = false;
    let activeSlider = null;

    canvas.addEventListener('mousedown', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check UI buttons first
        const btn = ui.handleClick(mx, my);
        if (btn) {
            if (btn.isSlider) {
                isDraggingSlider = true;
                activeSlider = btn;
                handleSliderDrag(my, btn);
            } else {
                handleButton(btn);
            }
            return;
        }

        // Close panels if clicked outside
        if (ui.showAudioPanel) { ui.showAudioPanel = false; requestDraw(); }
        if (ui.showVoicePanel) { ui.showVoicePanel = false; requestDraw(); }

        // Check tile clicks for discard
        if (game.state === GAME_STATE.PLAYER_DISCARD && !showingMenu && !showingRoundEnd && !showingChowSelect) {
            if (discardProcessed) return; // Ignore multiple clicks until next draw

            const tileIdx = renderer.hitTestPlayerTile(mx, my);
            if (tileIdx >= 0) {
                discardProcessed = true; // Set lock
                const tile = game.hands[0].concealed[tileIdx];
                game.playerDiscard(tile);
                renderer.setSelectedTile(-1);
                requestDraw();
            }
        }

        if (showingMenu) {
            // Start button panel check (menu already handles its buttons via ui.handleClick above, 
            // but we might have other loose elements)
        }
    });

    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (isDraggingSlider && activeSlider) {
            handleSliderDrag(my, activeSlider);
            return;
        }

        if (game.state === GAME_STATE.PLAYER_DISCARD && !showingMenu && !showingRoundEnd) {
            const tileIdx = renderer.hitTestPlayerTile(mx, my);
            renderer.setSelectedTile(tileIdx);
            requestDraw();
        }

        // Cursor style
        const overBtn = ui.handleClick(mx, my);
        canvas.style.cursor = (overBtn || (game.state === GAME_STATE.PLAYER_DISCARD && renderer.hitTestPlayerTile(mx, my) >= 0)) ? 'pointer' : 'default';
    });

    window.addEventListener('mouseup', function () {
        isDraggingSlider = false;
        activeSlider = null;
    });

    function handleSliderDrag(my, btn) {
        const progress = 1 - Math.max(0, Math.min(1, (my - btn.sliderY) / btn.sliderH));
        if (btn.action === 'adjustAudio') {
            audioManager.setVolume(progress);
        } else if (btn.action === 'adjustVoice') {
            voiceManager.volume = progress;
        }
        requestDraw();
    }

    function handleButton(btn) {
        switch (btn.action) {
            case 'difficulty':
                game.difficulty = btn.value;
                requestDraw();
                break;
            case 'minFan':
                game.minFan = btn.value;
                requestDraw();
                break;
            case 'theme':
                game.tileTheme = btn.value;
                renderer.tileThemeIndex = btn.value;
                requestDraw();
                break;
            case 'selectCharacter':
                game.playerCharIndex = btn.value;
                requestDraw();
                break;
            case 'start':
                showingMenu = false;
                audioManager.playBgm();
                game.startGame();
                requestDraw();
                break;
            case 'draw':
                game.playerDraw();
                requestDraw();
                break;
            case 'dice_roll':
                game.rollDice();
                requestDraw();
                break;
            case 'dice_confirm':
                game.confirmDice();
                requestDraw();
                break;
            case 'selfWin':
                game.playerSelfWin();
                requestDraw();
                break;
            case 'kong_concealed':
                game.playerKong('kong_concealed', btn.value);
                requestDraw();
                break;
            case 'kong_added':
                game.playerKong('kong_added', btn.value);
                requestDraw();
                break;
            case 'claim_win':
                game.playerClaim('win');
                requestDraw();
                break;
            case 'claim_kong':
                game.playerClaim('kong');
                requestDraw();
                break;
            case 'claim_pung':
                game.playerClaim('pung');
                requestDraw();
                break;
            case 'claim_chow':
                // Need to select which chow combination
                pendingChowCombos = game.hands[0].canChow(game.lastDiscard);
                if (pendingChowCombos.length === 1) {
                    game.playerClaim('chow', pendingChowCombos[0]);
                } else {
                    showingChowSelect = true;
                }
                requestDraw();
                break;
            case 'chow_select':
                showingChowSelect = false;
                game.playerClaim('chow', pendingChowCombos[btn.value]);
                requestDraw();
                break;
            case 'claim_pass':
                game.playerPass();
                requestDraw();
                break;
            case 'nextRound':
                showingRoundEnd = false;
                audioManager.playBgm();
                game.nextRound();
                requestDraw();
                break;
            case 'backToMenu':
                showingGameEnd = false;
                showingRoundEnd = false;
                showingMenu = true;
                stopAnimLoop();
                audioManager.playIntro();
                requestDraw();
                break;
            case 'toggleAudioPanel':
                ui.showAudioPanel = !ui.showAudioPanel;
                if (ui.showAudioPanel) ui.showVoicePanel = false;
                requestDraw();
                break;
            case 'toggleVoicePanel':
                ui.showVoicePanel = !ui.showVoicePanel;
                if (ui.showVoicePanel) ui.showAudioPanel = false;
                requestDraw();
                break;
            case 'toggleMute':
                audioManager.toggleMute();
                requestDraw();
                break;
            case 'toggleVoice':
                voiceManager.toggleVoice();
                requestDraw();
                break;
        }
    }

    // ===================== Resize =====================
    window.addEventListener('resize', function () {
        renderer.resize();
        requestDraw();
    });

    // ===================== Init =====================
    canvas.addEventListener('menuBgLoaded', () => requestDraw());
    requestDraw();

})();
