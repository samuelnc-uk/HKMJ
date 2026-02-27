// ============================================================
// hand.js — Hand management & win detection
// ============================================================

class Hand {
    constructor(playerIndex) {
        this.playerIndex = playerIndex;
        this.concealed = [];    // Tile[]
        this.melds = [];        // { type, tiles[] }
        this.flowers = [];      // Tile[] — exposed flowers/seasons
        this.discards = [];     // Tile[] — this player's discard pile
    }

    reset() {
        this.concealed = [];
        this.melds = [];
        this.flowers = [];
        this.discards = [];
    }

    /** Set initial dealt tiles */
    setInitial(tiles) {
        this.concealed = tiles.slice();
        this.sort();
    }

    sort() {
        this.concealed.sort(Tile.compare);
    }

    addTile(tile) {
        this.concealed.push(tile);
        this.sort();
    }

    addFlower(tile) {
        this.flowers.push(tile);
        this.flowers.sort(Tile.compare);
    }

    removeTile(tile) {
        const idx = this.concealed.findIndex(t => t.id === tile.id);
        if (idx >= 0) this.concealed.splice(idx, 1);
    }

    removeTileByKey(key) {
        const idx = this.concealed.findIndex(t => t.key === key);
        if (idx >= 0) {
            const tile = this.concealed[idx];
            this.concealed.splice(idx, 1);
            return tile;
        }
        return null;
    }

    discard(tile) {
        this.removeTile(tile);
        this.discards.push(tile);
        return tile;
    }

    /** Count tiles matching a key in concealed */
    countByKey(key) {
        return this.concealed.filter(t => t.key === key).length;
    }

    /** Get all concealed tiles matching a key */
    getTilesByKey(key) {
        return this.concealed.filter(t => t.key === key);
    }

    // ===================== Claim Checks =====================

    /** Can this player Pung the given discarded tile? */
    canPung(discardTile) {
        return this.countByKey(discardTile.key) >= 2;
    }

    /** Can this player Kong (exposed) the discarded tile? */
    canKongFromDiscard(discardTile) {
        return this.countByKey(discardTile.key) >= 3;
    }

    /** Can this player declare a concealed Kong from hand? Returns array of possible kong keys */
    getConcealedKongs() {
        const counts = {};
        for (const t of this.concealed) {
            counts[t.key] = (counts[t.key] || 0) + 1;
        }
        return Object.keys(counts).filter(k => counts[k] === 4);
    }

    /** Can this player add to an existing exposed Pung to make an added Kong? */
    getAddedKongs() {
        const result = [];
        for (const meld of this.melds) {
            if (meld.type === MELD_TYPE.PUNG) {
                const key = meld.tiles[0].key;
                if (this.countByKey(key) >= 1) {
                    result.push(key);
                }
            }
        }
        return result;
    }

    /**
     * Can this player Chow the given tile?
     * Only from the player to the left.
     * Returns array of possible chow combos: [ [tile1Key, tile2Key], ... ]
     */
    canChow(discardTile) {
        if (!discardTile.isNumberSuit) return [];
        const combos = [];
        const suit = discardTile.suit;
        const val = discardTile.value;

        // Check val-2, val-1 (need both in hand)
        if (val >= 3) {
            const k1 = `${suit}_${val - 2}`;
            const k2 = `${suit}_${val - 1}`;
            if (this.countByKey(k1) > 0 && this.countByKey(k2) > 0) {
                combos.push([k1, k2]);
            }
        }
        // Check val-1, val+1
        if (val >= 2 && val <= 8) {
            const k1 = `${suit}_${val - 1}`;
            const k2 = `${suit}_${val + 1}`;
            if (this.countByKey(k1) > 0 && this.countByKey(k2) > 0) {
                combos.push([k1, k2]);
            }
        }
        // Check val+1, val+2
        if (val <= 7) {
            const k1 = `${suit}_${val + 1}`;
            const k2 = `${suit}_${val + 2}`;
            if (this.countByKey(k1) > 0 && this.countByKey(k2) > 0) {
                combos.push([k1, k2]);
            }
        }
        return combos;
    }

    /** Execute a Chow claim */
    doChow(discardTile, comboKeys) {
        const tiles = [discardTile];
        for (const key of comboKeys) {
            const t = this.removeTileByKey(key);
            if (t) tiles.push(t);
        }
        tiles.sort(Tile.compare);
        this.melds.push({ type: MELD_TYPE.CHOW, tiles });
    }

    /** Execute a Pung claim */
    doPung(discardTile) {
        const tiles = [discardTile];
        for (let i = 0; i < 2; i++) {
            const t = this.removeTileByKey(discardTile.key);
            if (t) tiles.push(t);
        }
        this.melds.push({ type: MELD_TYPE.PUNG, tiles });
    }

    /** Execute an exposed Kong */
    doKongExposed(discardTile) {
        const tiles = [discardTile];
        for (let i = 0; i < 3; i++) {
            const t = this.removeTileByKey(discardTile.key);
            if (t) tiles.push(t);
        }
        this.melds.push({ type: MELD_TYPE.KONG_EXPOSED, tiles });
    }

    /** Execute a concealed Kong */
    doKongConcealed(key) {
        const tiles = [];
        for (let i = 0; i < 4; i++) {
            const t = this.removeTileByKey(key);
            if (t) tiles.push(t);
        }
        this.melds.push({ type: MELD_TYPE.KONG_CONCEALED, tiles });
    }

    /** Execute an added Kong (add 4th tile to existing Pung) */
    doKongAdded(key) {
        const meldIdx = this.melds.findIndex(m =>
            m.type === MELD_TYPE.PUNG && m.tiles[0].key === key
        );
        if (meldIdx >= 0) {
            const t = this.removeTileByKey(key);
            if (t) {
                this.melds[meldIdx].tiles.push(t);
                this.melds[meldIdx].type = MELD_TYPE.KONG_ADDED;
            }
        }
    }

    // ===================== Win Detection =====================

    /** Get all tiles (concealed + unrolled melds) for win checking */
    getAllTilesForWinCheck() {
        return this.concealed.slice();
    }

    /**
     * Check if the concealed tiles can form a winning hand.
     * The total concealed tiles should be 14 - 3*numMelds (since each meld removes 3 from concealed).
     * We need to find: remaining tiles = n*3-tile-sets + 1 pair
     */
    canWin() {
        const tiles = this.concealed.slice();
        // Standard win: sets + pair
        if (this._checkStandardWin(tiles)) return true;
        // Seven Pairs (七對子): only if no melds and 14 concealed tiles
        if (this.melds.length === 0 && tiles.length === 14 && this._checkSevenPairs(tiles)) return true;
        // Thirteen Orphans (十三么)
        if (this.melds.length === 0 && tiles.length === 14 && this._checkThirteenOrphans(tiles)) return true;
        return false;
    }

    _checkStandardWin(tiles) {
        // Group tiles by key
        const groups = {};
        for (const t of tiles) {
            groups[t.key] = (groups[t.key] || 0) + 1;
        }
        return this._tryRemoveSets(groups, Object.keys(groups), 0, false);
    }

    /** Recursive: try to decompose groups into sets + exactly 1 pair */
    _tryRemoveSets(groups, keys, keyIdx, pairUsed) {
        // Skip keys with 0 count
        while (keyIdx < keys.length && groups[keys[keyIdx]] === 0) keyIdx++;

        if (keyIdx >= keys.length) {
            return pairUsed; // All tiles accounted for, must have used exactly one pair
        }

        const key = keys[keyIdx];
        const count = groups[key];
        const parts = key.split('_');
        const suit = parts[0];
        const value = parseInt(parts[1]);

        // Try pair
        if (!pairUsed && count >= 2) {
            groups[key] -= 2;
            if (this._tryRemoveSets(groups, keys, keyIdx, true)) {
                groups[key] += 2;
                return true;
            }
            groups[key] += 2;
        }

        // Try pung (triplet)
        if (count >= 3) {
            groups[key] -= 3;
            if (this._tryRemoveSets(groups, keys, keyIdx, pairUsed)) {
                groups[key] += 3;
                return true;
            }
            groups[key] += 3;
        }

        // Try chow (sequence) — only for number suits
        if (suit === SUITS.WAN || suit === SUITS.TUNG || suit === SUITS.SOK) {
            if (value <= 7) {
                const k2 = `${suit}_${value + 1}`;
                const k3 = `${suit}_${value + 2}`;
                if ((groups[k2] || 0) > 0 && (groups[k3] || 0) > 0) {
                    groups[key]--;
                    groups[k2]--;
                    groups[k3]--;
                    if (this._tryRemoveSets(groups, keys, keyIdx, pairUsed)) {
                        groups[key]++;
                        groups[k2]++;
                        groups[k3]++;
                        return true;
                    }
                    groups[key]++;
                    groups[k2]++;
                    groups[k3]++;
                }
            }
        }

        return false;
    }

    _checkSevenPairs(tiles) {
        const counts = {};
        for (const t of tiles) {
            counts[t.key] = (counts[t.key] || 0) + 1;
        }
        const values = Object.values(counts);
        return values.length === 7 && values.every(v => v === 2);
    }

    _checkThirteenOrphans(tiles) {
        const required = [
            'wan_1', 'wan_9', 'tung_1', 'tung_9', 'sok_1', 'sok_9',
            'wind_1', 'wind_2', 'wind_3', 'wind_4',
            'dragon_1', 'dragon_2', 'dragon_3'
        ];
        const counts = {};
        for (const t of tiles) {
            counts[t.key] = (counts[t.key] || 0) + 1;
        }
        // Must have all 13 types, one of them must be doubled
        let hasPair = false;
        for (const key of required) {
            if (!counts[key] || counts[key] < 1) return false;
            if (counts[key] === 2) hasPair = true;
        }
        return hasPair;
    }

    /**
     * Get the decomposition of a winning hand for scoring.
     * Returns { pairs: [key], sets: [{type, tiles/key, suit, startVal}] } or null
     */
    getWinDecomposition() {
        const tiles = this.concealed.slice();
        // Try Seven Pairs
        if (this.melds.length === 0 && tiles.length === 14 && this._checkSevenPairs(tiles)) {
            return { special: 'seven_pairs', tiles };
        }
        // Try Thirteen Orphans
        if (this.melds.length === 0 && tiles.length === 14 && this._checkThirteenOrphans(tiles)) {
            return { special: 'thirteen_orphans', tiles };
        }
        // Standard decomposition
        const groups = {};
        for (const t of tiles) {
            groups[t.key] = (groups[t.key] || 0) + 1;
        }
        const result = { pair: null, sets: [] };
        if (this._decompose(groups, Object.keys(groups), 0, result)) {
            // Include exposed melds
            result.melds = this.melds.slice();
            return result;
        }
        return null;
    }

    _decompose(groups, keys, keyIdx, result) {
        while (keyIdx < keys.length && groups[keys[keyIdx]] === 0) keyIdx++;
        if (keyIdx >= keys.length) return result.pair !== null;

        const key = keys[keyIdx];
        const count = groups[key];
        const parts = key.split('_');
        const suit = parts[0];
        const value = parseInt(parts[1]);

        // Try pair
        if (result.pair === null && count >= 2) {
            groups[key] -= 2;
            result.pair = key;
            if (this._decompose(groups, keys, keyIdx, result)) {
                groups[key] += 2;
                return true;
            }
            result.pair = null;
            groups[key] += 2;
        }

        // Try pung
        if (count >= 3) {
            groups[key] -= 3;
            result.sets.push({ type: 'pung', key, suit, value });
            if (this._decompose(groups, keys, keyIdx, result)) {
                groups[key] += 3;
                return true;
            }
            result.sets.pop();
            groups[key] += 3;
        }

        // Try chow
        if (suit === SUITS.WAN || suit === SUITS.TUNG || suit === SUITS.SOK) {
            if (value <= 7) {
                const k2 = `${suit}_${value + 1}`;
                const k3 = `${suit}_${value + 2}`;
                if ((groups[k2] || 0) > 0 && (groups[k3] || 0) > 0) {
                    groups[key]--;
                    groups[k2]--;
                    groups[k3]--;
                    result.sets.push({ type: 'chow', key, suit, value });
                    if (this._decompose(groups, keys, keyIdx, result)) {
                        groups[key]++;
                        groups[k2]++;
                        groups[k3]++;
                        return true;
                    }
                    result.sets.pop();
                    groups[key]++;
                    groups[k2]++;
                    groups[k3]++;
                }
            }
        }

        return false;
    }
}
