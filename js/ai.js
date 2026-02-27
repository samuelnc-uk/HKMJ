// ============================================================
// ai.js — AI opponent logic (3 difficulty levels)
// ============================================================

class AI {
    constructor(difficulty) {
        this.difficulty = difficulty;
    }

    /**
     * Choose a tile to discard from hand.
     * @param {Hand} hand
     * @param {Object} gameState — info about round
     * @returns {Tile} the tile to discard
     */
    chooseDiscard(hand, gameState) {
        switch (this.difficulty) {
            case DIFFICULTY.EASY: return this._discardEasy(hand);
            case DIFFICULTY.MEDIUM: return this._discardMedium(hand, gameState);
            case DIFFICULTY.HARD: return this._discardHard(hand, gameState);
            default: return this._discardEasy(hand);
        }
    }

    /** Easy: random discard */
    _discardEasy(hand) {
        const idx = Math.floor(Math.random() * hand.concealed.length);
        return hand.concealed[idx];
    }

    /** Medium: discard isolated tiles first, keep pairs and sequences */
    _discardMedium(hand, gameState) {
        const dangerous = this._getDangerousConditions(gameState);
        const tiles = hand.concealed;
        const scored = tiles.map(t => {
            let val = this._tileValue(t, hand);
            // Defensive penalty
            if (dangerous.suits.has(t.suit) || dangerous.honours.has(t.key)) {
                val -= 15; // Moderate penalty
            }
            return { tile: t, score: val };
        });
        scored.sort((a, b) => a.score - b.score);
        const pool = scored.slice(0, Math.min(3, scored.length));
        return pool[Math.floor(Math.random() * pool.length)].tile;
    }

    /** Hard: evaluate shanten, optimal discard, defensive play */
    _discardHard(hand, gameState) {
        const dangerous = this._getDangerousConditions(gameState);
        const tiles = hand.concealed;
        let bestTile = tiles[0];
        let bestScore = -Infinity;

        for (const t of tiles) {
            // Lower tileValue means less useful for us, so higher -tileValue means more discardable
            let score = -this._tileValue(t, hand);

            // 1. Defensive: Prefer tiles that have ALREADY been discarded (Safe tiles / Gen-butsu)
            if (gameState && gameState.allDiscards) {
                const count = gameState.allDiscards.filter(d => d.key === t.key).length;
                if (count > 0) {
                    score += 15 + count * 5; // Strong safety bonus
                }
            }

            // 2. Heavy penalty for dangerous tiles
            // If someone is threatening a suit, do NOT discard it
            if (dangerous.suits.has(t.suit)) {
                score -= 50; // Very heavy penalty
            }
            if (dangerous.honours.has(t.key)) {
                score -= 40;
            }

            // 3. Wall awareness: If wall is low, be even more defensive
            if (gameState && gameState.wallRemaining < 15) {
                // Highly value any tile that has been seen before
                // and avoid ANY number tile if multiple players are close
                if (t.isNumberSuit) score -= 10;
            }

            if (score > bestScore) {
                bestScore = score;
                bestTile = t;
            }
        }
        return bestTile;
    }

    /** Score a tile's value in hand (higher = more useful) */
    _tileValue(tile, hand) {
        let value = 0;
        const key = tile.key;
        const count = hand.countByKey(key);

        // Pairs and triplets are valuable
        if (count >= 3) value += 8;
        else if (count >= 2) value += 4;

        // Check for sequence potential (number suits only)
        if (tile.isNumberSuit) {
            const suit = tile.suit;
            const v = tile.value;
            // Adjacent tiles
            if (hand.countByKey(`${suit}_${v - 1}`) > 0) value += 3;
            if (hand.countByKey(`${suit}_${v + 1}`) > 0) value += 3;
            // Gap tiles
            if (hand.countByKey(`${suit}_${v - 2}`) > 0) value += 1;
            if (hand.countByKey(`${suit}_${v + 2}`) > 0) value += 1;
            // Terminal tiles are less useful in sequences
            if (v === 1 || v === 9) value -= 1;
        }

        // Dragons and useful winds
        if (tile.isDragon) value += 2;

        return value;
    }

    /**
     * Decide whether to claim a discarded tile.
     * @returns {string|null} 'win'|'kong'|'pung'|'chow'|null
     */
    decideClaim(hand, discardTile, canChow, context) {
        switch (this.difficulty) {
            case DIFFICULTY.EASY: return this._claimEasy(hand, discardTile, canChow, context);
            case DIFFICULTY.MEDIUM: return this._claimMedium(hand, discardTile, canChow, context);
            case DIFFICULTY.HARD: return this._claimHard(hand, discardTile, canChow, context);
            default: return null;
        }
    }

    _claimEasy(hand, discardTile, canChow, context) {
        // Always try to win
        if (this._canWinWith(hand, discardTile, context)) return 'win';
        // Sometimes claim Pung (50%)
        if (hand.canPung(discardTile) && Math.random() < 0.5) return 'pung';
        // Never chow
        return null;
    }

    _claimMedium(hand, discardTile, canChow, context) {
        if (this._canWinWith(hand, discardTile, context)) return 'win';
        if (hand.canKongFromDiscard(discardTile)) return 'kong';

        // --- Flush Bias Check ---
        const bias = this._shouldProtectFlush(hand, discardTile, context);
        if (bias.protect) return null;

        if (hand.canPung(discardTile)) return 'pung';

        // Interception: If someone is a threat, accept a non-matching Chow if it helps block them
        const dangerous = this._getDangerousConditions(context);
        const isDangerousSuit = dangerous.suits.has(discardTile.suit);

        if (canChow && hand.canChow(discardTile).length > 0) {
            // Strict 3-Fan Check: Don't chow if it pollutes a numerical suit we've already Punged
            if (context.minFan >= 3 && discardTile.isNumberSuit) {
                const hadNumericalPung = hand.melds.some(m =>
                    (m.type === MELD_TYPE.PUNG || m.type.startsWith('kong')) &&
                    m.tiles[0].isNumberSuit
                );
                if (hadNumericalPung) {
                    const primarySuit = hand.melds.find(m => m.tiles[0].isNumberSuit).tiles[0].suit;
                    if (discardTile.suit !== primarySuit) return null;
                }
            }

            if (isDangerousSuit) return 'chow'; // Prevent dangerous player from getting it or skip her turn
            if (Math.random() < 0.6) return 'chow';
        }
        return null;
    }

    _claimHard(hand, discardTile, canChow, context) {
        if (this._canWinWith(hand, discardTile, context)) return 'win';
        if (hand.canKongFromDiscard(discardTile)) return 'kong';

        // --- Flush Bias Check ---
        const bias = this._shouldProtectFlush(hand, discardTile, context);
        if (bias.protect) return null;

        // Check for Interception: If a player is dangerous, AI is more aggressive in claiming that suit
        const dangerous = this._getDangerousConditions(context);
        const isDangerousSuit = dangerous.suits.has(discardTile.suit);

        // Strategic Pung
        if (hand.canPung(discardTile)) {
            if (isDangerousSuit) return 'pung'; // Intercept!
            // Always pung dragons and useful winds
            if (discardTile.isDragon) return 'pung';
            if (discardTile.isWind && (discardTile.value === context.seatWind || discardTile.value === context.roundWind)) {
                return 'pung';
            }
            const pungMelds = hand.melds.filter(m => m.type !== MELD_TYPE.CHOW).length;
            if (pungMelds >= 2) return 'pung';
            if (Math.random() < 0.4) return 'pung';
        }

        if (canChow && hand.canChow(discardTile).length > 0) {
            // Strict 3-Fan Check: Don't chow if it pollutes a numerical suit we've already Punged
            if (context.minFan >= 3 && discardTile.isNumberSuit) {
                const hadNumericalPung = hand.melds.some(m =>
                    (m.type === MELD_TYPE.PUNG || m.type.startsWith('kong')) &&
                    m.tiles[0].isNumberSuit
                );
                if (hadNumericalPung) {
                    const primarySuit = hand.melds.find(m => m.tiles[0].isNumberSuit).tiles[0].suit;
                    if (discardTile.suit !== primarySuit) return null;
                }
            }

            if (isDangerousSuit) return 'chow'; // Intercept!
            if (Math.random() < 0.3) return 'chow';
        }
        return null;
    }

    _shouldProtectFlush(hand, discardTile, context) {
        // Honours don't "pollute" a Flush potential as much (can become Mixed Flush)
        if (discardTile.isHonour) return { protect: false };

        // 1. Strict Suit Locking: If AI already has exposed melds of a number suit
        const meldSuits = new Set(hand.melds
            .map(m => m.tiles[0].suit)
            .filter(s => s === SUITS.WAN || s === SUITS.TUNG || s === SUITS.SOK));

        if (meldSuits.size > 0) {
            const lockedSuit = Array.from(meldSuits)[0];
            if (discardTile.suit !== lockedSuit) {
                // If minFan >= 3, we MUST be strict about not polluting suits via Chow
                // Pung is still okay if it's towards All Pungs, but Chow is restricted
                const potential = this._estimateHandPotential(hand, context);
                const minThreshold = context.minFan >= 3 ? 6 : 3; // Harder to break lock in high-min games
                if (potential < minThreshold) return { protect: true, suit: lockedSuit };
            }
            return { protect: false };
        }

        // 2. Strong Bias Detection (Current logic)
        const dist = this._getSuitDistribution(hand);
        const numberSuits = [SUITS.WAN, SUITS.TUNG, SUITS.SOK];
        const dominantSuit = numberSuits.find(s => dist[s] >= 7); // Strong bias

        if (dominantSuit && discardTile.suit !== dominantSuit) {
            const potential = this._estimateHandPotential(hand, context);
            if (potential < 3) {
                return { protect: true, suit: dominantSuit };
            }
        }
        return { protect: false };
    }

    _canWinWith(hand, discardTile, context) {
        // Temporarily add tile and check win
        hand.concealed.push(discardTile);
        hand.sort();
        const canWin = hand.canWin();
        // Remove it
        const idx = hand.concealed.findIndex(t => t.id === discardTile.id);
        if (idx >= 0) hand.concealed.splice(idx, 1);

        if (!canWin) return false;

        // Check minimum fan requirement
        hand.concealed.push(discardTile);
        hand.sort();
        const scoring = Scoring.calculate(hand, {
            seatWind: context.seatWind,
            roundWind: context.roundWind,
            selfDrawn: false,
            lastTile: false,
            isLastTile: false,
            isKongDraw: false
        });
        const idx2 = hand.concealed.findIndex(t => t.id === discardTile.id);
        if (idx2 >= 0) hand.concealed.splice(idx2, 1);

        return Scoring.meetsMinimum(scoring.totalFan, context.minFan);
    }

    /**
     * Decide whether to declare a concealed Kong or added Kong during own turn.
     * @returns {{ action: string, key: string }|null}
     */
    decideKong(hand) {
        // Check concealed kongs
        const cKongs = hand.getConcealedKongs();
        if (cKongs.length > 0) return { action: 'kong_concealed', key: cKongs[0] };
        // Check added kongs
        const aKongs = hand.getAddedKongs();
        if (aKongs.length > 0) return { action: 'kong_added', key: aKongs[0] };
        return null;
    }

    /**
     * Choose which Chow combination to use (if multiple available).
     */
    chooseChowCombo(combos) {
        // For now, pick the first option (lowest values)
        return combos[0];
    }

    // ===================== Strategy Helpers =====================

    _getSuitDistribution(hand) {
        const dist = { [SUITS.WAN]: 0, [SUITS.TUNG]: 0, [SUITS.SOK]: 0, [SUITS.WIND]: 0, [SUITS.DRAGON]: 0 };
        for (const t of hand.concealed) {
            dist[t.suit]++;
        }
        for (const m of hand.melds) {
            dist[m.tiles[0].suit] += 3;
        }
        return dist;
    }

    /**
     * Estimates the "likely" fan count for the hand.
     * Considers confirmed fan (flowers, honour pungs) and strong potential (All Pungs).
     */
    _estimateHandPotential(hand, context) {
        let fan = 0;

        // 1. Confirmed Flower Fan
        const flowers = hand.flowers.filter(t => t.suit === SUITS.FLOWER);
        const seasons = hand.flowers.filter(t => t.suit === SUITS.SEASON);
        if (flowers.length === 4) fan += 2;
        if (seasons.length === 4) fan += 2;
        if (flowers.find(f => f.value === context.seatWind)) fan += 1;
        if (seasons.find(s => s.value === context.seatWind)) fan += 1;

        // 2. Honour Pungs (Concealed or Exposed)
        const allSets = hand.melds.map(m => ({ type: m.type, suit: m.tiles[0].suit, value: m.tiles[0].value }));
        // Add potential concealed pungs/kongs
        const counts = {};
        for (const t of hand.concealed) counts[t.key] = (counts[t.key] || 0) + 1;
        for (const k in counts) {
            if (counts[k] >= 3) {
                const parts = k.split('_');
                allSets.push({ type: 'pung', suit: parts[0], value: parseInt(parts[1]) });
            }
        }

        for (const s of allSets) {
            if (s.type === 'chow') continue;
            if (s.suit === SUITS.DRAGON) fan += 1;
            if (s.suit === SUITS.WIND) {
                if (s.value === context.seatWind) fan += 1;
                if (s.value === context.roundWind) fan += 1;
            }
        }

        // 3. Potential for All Pungs (对对糊 - 3 Fan)
        // If we already have 3+ sets of pungs/pairs, it's a strong candidate
        const pungs = allSets.filter(s => s.type !== 'chow').length;
        const pairs = Object.values(counts).filter(c => c === 2).length;
        if (pungs + pairs >= 4) fan = Math.max(fan, 3);

        // 4. Seven Pairs potential
        if (hand.melds.length === 0 && pairs >= 5) fan = Math.max(fan, 4);

        return fan;
    }

    _getDangerousConditions(gameState) {
        const dangerous = { suits: new Set(), honours: new Set(), players: [] };
        if (!gameState || !gameState.players) return dangerous;

        for (const p of gameState.players) {
            // Logic for HK Mahjong Bao (包)
            const suitCounts = {};
            let honourPungs = 0;

            for (const m of p.melds) {
                const firstTile = m.tiles[0];
                if (firstTile.isNumberSuit) {
                    suitCounts[firstTile.suit] = (suitCounts[firstTile.suit] || 0) + 3;
                } else if (firstTile.isHonour) {
                    if (m.type !== MELD_TYPE.CHOW) honourPungs++;
                }
            }

            // If a player has 9 or 12 tiles of one suit exposed
            for (const suit in suitCounts) {
                if (suitCounts[suit] >= 9) {
                    dangerous.suits.add(suit);
                    dangerous.players.push(p.index);
                }
            }

            // If a player has multiple honour sets (Dragons/Winds)
            if (honourPungs >= 2) {
                // Consider all dragons and their own wind dangerous
                dangerous.honours.add('dragon_1');
                dangerous.honours.add('dragon_2');
                dangerous.honours.add('dragon_3');
                dangerous.players.push(p.index);
            }
        }
        return dangerous;
    }
}
