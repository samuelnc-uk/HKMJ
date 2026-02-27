// ============================================================
// game.js — Game state machine & turn logic
// ============================================================

class Game {
    constructor() {
        this.wall = new Wall();
        this.hands = [null, null, null, null];
        this.ai = [null, null, null]; // 3 AI players
        this.state = GAME_STATE.MENU;
        this.currentPlayer = 0;
        this.dealerIndex = 0;
        this.roundWind = WINDS.EAST;
        this.roundNumber = 0;
        this.seatWinds = [WINDS.EAST, WINDS.SOUTH, WINDS.WEST, WINDS.NORTH];
        this.lastDiscard = null;
        this.lastDiscardPlayer = -1;
        this.turnCount = 0;
        this.winner = -1;
        this.winInfo = null;

        // Settings
        this.difficulty = DIFFICULTY.MEDIUM;
        this.tileTheme = 0;
        this.minFan = 1;

        // Callbacks
        this.onStateChange = null;
        this.onUpdate = null;

        // Claim state
        this.pendingClaims = [];

        // Animation / flow control
        this.actionQueue = [];
        this.isProcessing = false;

        // Self-drawn flag
        this._selfDrawn = false;
        this._isKongDraw = false;
        this._drawnTile = null;

        // Character avatars
        this.characters = createCharacters();

        // Scoring system
        this.scores = [10000, 10000, 10000, 10000];
        this.totalRounds = 0;
        this.maxRounds = 24; // 廿四圈
        this.paymentInfo = null; // { deltas, details, responsible }

        // Dice
        this.diceResults = [0, 0, 0];
        this.diceRolled = false;
    }

    /** Start a new game with current settings */
    startGame() {
        this.roundWind = WINDS.EAST;
        this.dealerIndex = 0;
        this.roundNumber = 0;
        this.totalRounds = 0;
        this.scores = [10000, 10000, 10000, 10000];
        this.diceResults = [0, 0, 0];
        this.diceRolled = false;
        this.state = GAME_STATE.DICE_ROLL;
        if (this.onStateChange) this.onStateChange(this.state);
    }

    /** Roll dice to decide dealer */
    rollDice() {
        if (this.diceRolled) return;
        this.diceResults = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        ];
        this.diceRolled = true;
        if (this.onUpdate) this.onUpdate();
    }

    /** Confirm dice result and set initial dealer */
    confirmDice() {
        const sum = this.diceResults.reduce((a, b) => a + b, 0);
        // Index mapping: 0=Self, 1=Right, 2=Top, 3=Left
        this.dealerIndex = (sum - 1) % 4;
        this.startRound();
    }

    /** Start a new round */
    startRound() {
        this.wall = new Wall();
        this.wall.build();
        this.hands = [];
        for (let i = 0; i < 4; i++) {
            this.hands.push(new Hand(i));
        }
        // Create AI instances
        this.ai = [];
        for (let i = 0; i < 3; i++) {
            this.ai.push(new AI(this.difficulty));
        }

        this.seatWinds = [];
        for (let i = 0; i < 4; i++) {
            this.seatWinds.push(((i - this.dealerIndex + 4) % 4) + 1);
        }

        // Deal
        const dealt = this.wall.deal(this.dealerIndex);
        for (let i = 0; i < 4; i++) {
            this.hands[i].setInitial(dealt[i]);
        }

        // Initial Flower Bloom
        for (let i = 0; i < 4; i++) {
            const pIdx = (this.dealerIndex + i) % 4;
            this._handleFlowerBloom(pIdx);
        }

        // Validate hand sizes
        for (let i = 0; i < 4; i++) {
            const expectedSize = (i === this.dealerIndex) ? 14 : 13;
            const phase = (i === this.dealerIndex) ? 'before_discard' : 'after_discard';
            this._validateHandSize(i, phase);
        }

        this.currentPlayer = this.dealerIndex;
        this.lastDiscard = null;
        this.lastDiscardPlayer = -1;
        this.turnCount = 0;
        this.winner = -1;
        this.winInfo = null;
        this._selfDrawn = false;
        this._isKongDraw = false;
        this._drawnTile = null;

        // Dealer starts with 14
        this._selfDrawn = true;
        this._drawnTile = null;

        if (this.currentPlayer === 0) {
            this.state = GAME_STATE.PLAYER_DISCARD;
            this._setExpression(0, EXPR.THINKING);
        } else {
            this.state = GAME_STATE.AI_TURN;
            this._setExpression(this.currentPlayer, EXPR.THINKING);
        }

        // Reset expressions
        for (let i = 0; i < 4; i++) {
            this.characters[i].setExpression(EXPR.NEUTRAL);
        }

        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
    }

    _handleFlowerBloom(playerIndex) {
        const hand = this.hands[playerIndex];
        let foundBonus = true;
        const startFlowerCount = hand.flowers.length;

        while (foundBonus) {
            foundBonus = false;
            for (let i = hand.concealed.length - 1; i >= 0; i--) {
                const tile = hand.concealed[i];
                if (tile.isBonus) {
                    let replacement = this.wall.drawFromDeadWall();
                    if (!replacement) {
                        replacement = this.wall.draw();
                    }
                    if (!replacement) continue;
                    hand.concealed.splice(i, 1);
                    hand.addFlower(tile);
                    hand.concealed.push(replacement);
                    foundBonus = true;
                }
            }
        }
        hand.sort();

        if (hand.flowers.length > startFlowerCount) {
            if (typeof voiceManager !== 'undefined') voiceManager.announceFlower(playerIndex);
        }
    }

    _validateHandSize(playerIndex, phase) {
        const hand = this.hands[playerIndex];
        const actual = hand.concealed.length;
        const expectedMod = (phase === 'before_discard') ? 2 : 1;

        if (actual % 3 !== expectedMod) {
            let target = actual;
            while (target % 3 !== expectedMod && target > 0) {
                target--;
            }
            if (target <= 0) target = expectedMod;

            if (actual < target) {
                while (hand.concealed.length < target) {
                    const extra = this.wall.draw();
                    if (!extra) break;
                    hand.addTile(extra);
                    this._handleFlowerBloom(playerIndex);
                }
                hand.sort();
            } else if (actual > target) {
                while (hand.concealed.length > target) {
                    const excess = hand.concealed.pop();
                    hand.discards.push(excess);
                }
            }
        }
    }

    getAllDiscards() {
        const all = [];
        for (const h of this.hands) {
            all.push(...h.discards);
        }
        return all;
    }

    getContext(playerIndex) {
        return {
            seatWind: this.seatWinds[playerIndex],
            roundWind: this.roundWind,
            selfDrawn: this._selfDrawn,
            isLastTile: this.wall.remaining <= 0,
            isKongDraw: this._isKongDraw,
            minFan: this.minFan,
            allDiscards: this.getAllDiscards(),
            players: this.hands.map((h, i) => ({
                index: i,
                melds: h.melds,
                flowers: h.flowers,
                discardCount: h.discards.length
            }))
        };
    }

    playerDraw() {
        if (this.state !== GAME_STATE.PLAYER_TURN) return false;
        const tile = this.wall.draw();
        if (!tile) {
            this._handleDraw();
            return false;
        }
        this.hands[0].addTile(tile);
        this._handleFlowerBloom(0);

        this._drawnTile = tile.isBonus ? null : tile;
        this._selfDrawn = true;
        this._isKongDraw = false;

        this._validateHandSize(0, 'before_discard');
        this._setExpression(0, EXPR.THINKING);
        if (this.wall.remaining < 15) this._setExpression(0, EXPR.WORRIED);

        this.state = GAME_STATE.PLAYER_DISCARD;
        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
        return true;
    }

    canPlayerSelfWin() {
        if (this.hands[0].canWin()) {
            const ctx = this.getContext(0);
            ctx.selfDrawn = true;
            const scoring = Scoring.calculate(this.hands[0], ctx);
            return Scoring.meetsMinimum(scoring.totalFan, this.minFan);
        }
        return false;
    }

    playerSelfWin() {
        const ctx = this.getContext(0);
        ctx.selfDrawn = true;
        const scoring = Scoring.calculate(this.hands[0], ctx);
        this.winner = 0;
        this.winInfo = { scoring, selfDrawn: true };
        this.state = GAME_STATE.ROUND_END;
        this._setExpression(0, EXPR.ECSTATIC);
        for (let i = 1; i < 4; i++) this._setExpression(i, EXPR.ANGRY);
        if (typeof voiceManager !== 'undefined') voiceManager.announceAction('selfWin', 0);
        this._applyPayment();
        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
    }

    playerDiscard(tile) {
        if (this.state !== GAME_STATE.PLAYER_DISCARD) return false;
        this.state = null; // Lock
        this.hands[0].discard(tile);
        this.lastDiscard = tile;
        this.lastDiscardPlayer = 0;
        this._selfDrawn = false;
        this._drawnTile = null;
        if (typeof voiceManager !== 'undefined') voiceManager.announceDiscard(tile, 0);
        this._processClaims(tile, 0);
        return true;
    }

    playerClaim(action, chowCombo) {
        const tile = this.lastDiscard;
        const hand = this.hands[0];

        if (action === 'win') {
            hand.addTile(tile);
            const ctx = this.getContext(0);
            ctx.selfDrawn = false;
            const scoring = Scoring.calculate(hand, ctx);
            this.winner = 0;
            this.winInfo = { scoring, selfDrawn: false, fromPlayer: this.lastDiscardPlayer };
            this.state = GAME_STATE.ROUND_END;
            if (typeof voiceManager !== 'undefined') voiceManager.announceAction('winByDiscard', 0);
            this._setExpression(0, EXPR.ECSTATIC);
            this._setExpression(this.lastDiscardPlayer, EXPR.ANGRY);
            for (let i = 1; i < 4; i++) {
                if (i !== this.lastDiscardPlayer) this._setExpression(i, EXPR.SURPRISED);
            }
            this._applyPayment();
            if (this.onStateChange) this.onStateChange(this.state);
            if (this.onUpdate) this.onUpdate();
            return;
        }

        if (action === 'kong') {
            hand.doKongExposed(tile);
            hand.melds[hand.melds.length - 1].fromPlayer = this.lastDiscardPlayer;
            if (typeof voiceManager !== 'undefined') voiceManager.announceAction('kong', 0);
            const replacement = this.wall.drawFromDeadWall();
            if (replacement) {
                hand.addTile(replacement);
                this._handleFlowerBloom(0);
                this._isKongDraw = true;
                this._selfDrawn = true;
            }
            this.state = GAME_STATE.PLAYER_DISCARD;
            this._setExpression(0, EXPR.HAPPY);
        } else if (action === 'pung') {
            hand.doPung(tile);
            hand.melds[hand.melds.length - 1].fromPlayer = this.lastDiscardPlayer;
            this.state = GAME_STATE.PLAYER_DISCARD;
            this._setExpression(0, EXPR.HAPPY);
            if (typeof voiceManager !== 'undefined') voiceManager.announceAction('pung', 0);
        } else if (action === 'chow') {
            hand.doChow(tile, chowCombo);
            hand.melds[hand.melds.length - 1].fromPlayer = this.lastDiscardPlayer;
            this.state = GAME_STATE.PLAYER_DISCARD;
            this._setExpression(0, EXPR.HAPPY);
            if (typeof voiceManager !== 'undefined') voiceManager.announceAction('chow', 0);
        }

        this._setExpression(this.lastDiscardPlayer, EXPR.SURPRISED);
        const discardHand = this.hands[this.lastDiscardPlayer];
        const dIdx = discardHand.discards.findIndex(t => t.id === tile.id);
        if (dIdx >= 0) discardHand.discards.splice(dIdx, 1);
        this._validateHandSize(0, 'before_discard');

        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
    }

    playerKong(type, key) {
        const hand = this.hands[0];
        if (typeof voiceManager !== 'undefined') voiceManager.announceAction('kong', 0);
        if (type === 'kong_concealed') {
            hand.doKongConcealed(key);
        } else if (type === 'kong_added') {
            hand.doKongAdded(key);
        }
        const replacement = this.wall.drawFromDeadWall();
        if (replacement) {
            hand.addTile(replacement);
            this._handleFlowerBloom(0);
            this._isKongDraw = true;
            this._selfDrawn = true;
        }
        this._validateHandSize(0, 'before_discard');
        this.state = GAME_STATE.PLAYER_DISCARD;
        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
    }

    playerPass() {
        this._advanceTurn();
    }

    /** Process one AI turn */
    processAITurn() {
        if (this.state !== GAME_STATE.AI_TURN) return;

        const p = this.currentPlayer;
        const hand = this.hands[p];
        const ai = this.ai[p - 1];
        const ctx = this.getContext(p);

        const alreadyHas14 = hand.concealed.length === 14;
        if (!alreadyHas14) {
            const tile = this.wall.draw();
            if (!tile) {
                this._handleDraw();
                return;
            }
            hand.addTile(tile);
            this._handleFlowerBloom(p);
            this._selfDrawn = true;
            this._isKongDraw = false;
        }

        this._validateHandSize(p, 'before_discard');

        // Check self-drawn win
        if (hand.canWin()) {
            ctx.selfDrawn = true;
            const scoring = Scoring.calculate(hand, ctx);
            if (Scoring.meetsMinimum(scoring.totalFan, this.minFan)) {
                if (typeof voiceManager !== 'undefined') voiceManager.announceAction('selfWin', p);
                setTimeout(() => {
                    this.winner = p;
                    this.winInfo = { scoring, selfDrawn: true };
                    this.state = GAME_STATE.ROUND_END;
                    this._applyPayment();
                    if (this.onStateChange) this.onStateChange(this.state);
                    if (this.onUpdate) this.onUpdate();
                }, 800);
                return;
            }
        }

        // Check for Kong
        const kongDecision = ai.decideKong(hand);
        if (kongDecision) {
            if (typeof voiceManager !== 'undefined') voiceManager.announceAction('kong', p);
            setTimeout(() => {
                if (kongDecision.action === 'kong_concealed') {
                    hand.doKongConcealed(kongDecision.key);
                } else {
                    hand.doKongAdded(kongDecision.key);
                }
                const replacement = this.wall.drawFromDeadWall();
                if (replacement) {
                    hand.addTile(replacement);
                    this._handleFlowerBloom(p);
                    this._isKongDraw = true;
                    if (hand.canWin()) {
                        ctx.selfDrawn = true;
                        ctx.isKongDraw = true;
                        const scoring = Scoring.calculate(hand, ctx);
                        if (Scoring.meetsMinimum(scoring.totalFan, this.minFan)) {
                            this.winner = p;
                            this.winInfo = { scoring, selfDrawn: true };
                            this.state = GAME_STATE.ROUND_END;
                            this._applyPayment();
                            if (this.onStateChange) this.onStateChange(this.state);
                            if (this.onUpdate) this.onUpdate();
                            return;
                        }
                    }
                }
                this._finishAITurn(p, hand, ai);
            }, 800);
            return;
        }

        this._finishAITurn(p, hand, ai);
    }

    _finishAITurn(p, hand, ai) {
        const discard = ai.chooseDiscard(hand, {
            allDiscards: this.getAllDiscards(),
            roundWind: this.roundWind,
            seatWind: this.seatWinds[p],
            players: this.hands.map((h, i) => ({
                index: i, melds: h.melds, flowers: h.flowers, discardCount: h.discards.length
            }))
        });
        hand.discard(discard);
        this.lastDiscard = discard;
        this.lastDiscardPlayer = p;
        if (typeof voiceManager !== 'undefined') voiceManager.announceDiscard(discard, p);
        this._selfDrawn = false;
        this._drawnTile = null;
        this._setExpression(p, EXPR.SMIRK);
        this._processClaims(discard, p);
    }

    _processClaims(discardTile, fromPlayer) {
        let bestClaim = null;
        let bestPriority = -1;

        for (let i = 0; i < 4; i++) {
            if (i === fromPlayer) continue;
            const hand = this.hands[i];
            const isNextPlayer = ((fromPlayer + 1) % 4) === i;
            const ctx = this.getContext(i);

            if (i === 0) {
                const actions = [];
                hand.concealed.push(discardTile);
                hand.sort();
                if (hand.canWin()) {
                    ctx.selfDrawn = false;
                    const scoring = Scoring.calculate(hand, ctx);
                    if (Scoring.meetsMinimum(scoring.totalFan, this.minFan)) actions.push('win');
                }
                const wIdx = hand.concealed.findIndex(t => t.id === discardTile.id);
                if (wIdx >= 0) hand.concealed.splice(wIdx, 1);
                if (hand.canKongFromDiscard(discardTile)) actions.push('kong');
                if (hand.canPung(discardTile)) actions.push('pung');
                if (isNextPlayer && hand.canChow(discardTile).length > 0) actions.push('chow');

                if (actions.length > 0) {
                    this.pendingClaims = actions;
                    this.state = GAME_STATE.CLAIMING;
                    if (this.onStateChange) this.onStateChange(this.state);
                    if (this.onUpdate) this.onUpdate();
                    return;
                }
            } else {
                const ai = this.ai[i - 1];
                const claim = ai.decideClaim(hand, discardTile, isNextPlayer, ctx);
                if (claim) {
                    const priority = claim === 'win' ? 3 : (claim === 'kong' || claim === 'pung') ? 2 : 1;
                    if (priority > bestPriority) {
                        bestPriority = priority;
                        bestClaim = { player: i, action: claim };
                    }
                }
            }
        }

        if (bestClaim) {
            this._executeAIClaim(bestClaim.player, bestClaim.action, discardTile, fromPlayer);
        } else {
            this._advanceTurn();
        }
    }

    _executeAIClaim(playerIdx, action, discardTile, fromPlayer) {
        if (typeof voiceManager !== 'undefined') {
            if (action === 'win') voiceManager.announceAction('winByDiscard', playerIdx);
            else if (action === 'pung') voiceManager.announceAction('pung', playerIdx);
            else if (action === 'chow') voiceManager.announceAction('chow', playerIdx);
            else if (action === 'kong') voiceManager.announceAction('kong', playerIdx);
        }

        setTimeout(() => {
            const hand = this.hands[playerIdx];
            if (!hand) return;
            const ai = this.ai[playerIdx - 1];
            const discardHand = this.hands[fromPlayer];
            const dIdx = discardHand.discards.findIndex(t => t.id === discardTile.id);
            if (dIdx >= 0) discardHand.discards.splice(dIdx, 1);

            if (action === 'win') {
                hand.addTile(discardTile);
                const ctx = this.getContext(playerIdx);
                ctx.selfDrawn = false;
                const scoring = Scoring.calculate(hand, ctx);
                this.winner = playerIdx;
                this.winInfo = { scoring, selfDrawn: false, fromPlayer };
                this.state = GAME_STATE.ROUND_END;
                this._setExpression(playerIdx, EXPR.ECSTATIC);
                this._setExpression(fromPlayer, EXPR.ANGRY);
                for (let i = 0; i < 4; i++) {
                    if (i !== playerIdx && i !== fromPlayer) this._setExpression(i, EXPR.SURPRISED);
                }
                this._applyPayment();
                if (this.onStateChange) this.onStateChange(this.state);
                if (this.onUpdate) this.onUpdate();
                return;
            } else if (action === 'pung') {
                hand.doPung(discardTile);
                hand.melds[hand.melds.length - 1].fromPlayer = fromPlayer;
                this._setExpression(playerIdx, EXPR.HAPPY);
                this._setExpression(fromPlayer, EXPR.SURPRISED);
                const discard = ai.chooseDiscard(hand, {
                    allDiscards: this.getAllDiscards(),
                    roundWind: this.roundWind,
                    seatWind: this.seatWinds[playerIdx],
                    players: this.hands.map((h, i) => ({
                        index: i, melds: h.melds, flowers: h.flowers, discardCount: h.discards.length
                    }))
                });
                hand.discard(discard);
                if (typeof voiceManager !== 'undefined') voiceManager.announceDiscard(discard, playerIdx);
                this.lastDiscard = discard;
                this.lastDiscardPlayer = playerIdx;
                this._processClaims(discard, playerIdx);
                return;
            } else if (action === 'chow') {
                const combos = hand.canChow(discardTile);
                const combo = ai.chooseChowCombo(combos);
                hand.doChow(discardTile, combo);
                hand.melds[hand.melds.length - 1].fromPlayer = fromPlayer;
                this._setExpression(playerIdx, EXPR.HAPPY);
                this._setExpression(fromPlayer, EXPR.SURPRISED);
                const discard = ai.chooseDiscard(hand, {
                    allDiscards: this.getAllDiscards(),
                    roundWind: this.roundWind,
                    seatWind: this.seatWinds[playerIdx],
                    players: this.hands.map((h, i) => ({
                        index: i, melds: h.melds, flowers: h.flowers, discardCount: h.discards.length
                    }))
                });
                hand.discard(discard);
                if (typeof voiceManager !== 'undefined') voiceManager.announceDiscard(discard, playerIdx);
                this.lastDiscard = discard;
                this.lastDiscardPlayer = playerIdx;
                this._processClaims(discard, playerIdx);
                return;
            } else if (action === 'kong') {
                hand.doKongExposed(discardTile);
                hand.melds[hand.melds.length - 1].fromPlayer = fromPlayer;
                this._setExpression(playerIdx, EXPR.HAPPY);
                this._setExpression(fromPlayer, EXPR.SURPRISED);
                const replacement = this.wall.drawFromDeadWall();
                if (replacement) {
                    hand.addTile(replacement);
                    this._handleFlowerBloom(playerIdx);
                    if (hand.canWin()) {
                        const ctx = this.getContext(playerIdx);
                        ctx.selfDrawn = true;
                        ctx.isKongDraw = true;
                        const scoring = Scoring.calculate(hand, ctx);
                        if (Scoring.meetsMinimum(scoring.totalFan, this.minFan)) {
                            this.winner = playerIdx;
                            this.winInfo = { scoring, selfDrawn: true };
                            this.state = GAME_STATE.ROUND_END;
                            this._applyPayment();
                            if (this.onStateChange) this.onStateChange(this.state);
                            if (this.onUpdate) this.onUpdate();
                            return;
                        }
                    }
                }
                this._validateHandSize(playerIdx, 'before_discard');
                const discard = ai.chooseDiscard(hand, {
                    allDiscards: this.getAllDiscards(), roundWind: this.roundWind, seatWind: this.seatWinds[playerIdx],
                    players: this.hands.map((h, i) => ({
                        index: i, melds: h.melds, flowers: h.flowers, discardCount: h.discards.length
                    }))
                });
                hand.discard(discard);
                if (typeof voiceManager !== 'undefined') voiceManager.announceDiscard(discard, playerIdx);
                this.lastDiscard = discard;
                this.lastDiscardPlayer = playerIdx;
                this._processClaims(discard, playerIdx);
            }
        }, 800);
        if (this.onUpdate) this.onUpdate();
    }

    _advanceTurn() {
        this.currentPlayer = (this.lastDiscardPlayer + 1) % 4;
        this.turnCount++;
        this.state = (this.currentPlayer === 0) ? GAME_STATE.PLAYER_TURN : GAME_STATE.AI_TURN;
        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
    }

    _handleDraw() {
        this.winner = -1;
        this.winInfo = null;
        this.state = GAME_STATE.ROUND_END;
        for (let i = 0; i < 4; i++) this._setExpression(i, EXPR.WORRIED);
        this._applyPayment();
        if (this.onStateChange) this.onStateChange(this.state);
        if (this.onUpdate) this.onUpdate();
    }

    _applyPayment() {
        this.paymentInfo = Scoring.calculatePayment(this);
        for (let i = 0; i < 4; i++) this.scores[i] += this.paymentInfo.deltas[i];
        this.totalRounds++;
    }

    _setExpression(playerIdx, expr) {
        if (this.characters && this.characters[playerIdx]) {
            this.characters[playerIdx].setExpression(expr);
        }
    }

    nextRound() {
        if (this.scores.some(s => s <= 0) || this.totalRounds >= this.maxRounds) {
            this.state = GAME_STATE.GAME_END;
            if (this.onStateChange) this.onStateChange(this.state);
            if (this.onUpdate) this.onUpdate();
            return;
        }
        if (this.winner !== this.dealerIndex) {
            this.dealerIndex = (this.dealerIndex + 1) % 4;
            this.roundNumber++;
            if (this.roundNumber >= 4) {
                this.roundNumber = 0;
                if (this.roundWind < WINDS.NORTH) this.roundWind++;
                else {
                    this.state = GAME_STATE.GAME_END;
                    if (this.onStateChange) this.onStateChange(this.state);
                    if (this.onUpdate) this.onUpdate();
                    return;
                }
            }
        }
        this.startRound();
    }
}
