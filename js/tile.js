// ============================================================
// tile.js — Tile class
// ============================================================

class Tile {
    constructor(suit, value, id) {
        this.suit = suit;
        this.value = value;
        this.id = id;          // unique 0-135
    }

    /** Is this a number suit (wan/tung/sok)? */
    get isNumberSuit() {
        return this.suit === SUITS.WAN || this.suit === SUITS.TUNG || this.suit === SUITS.SOK;
    }

    get isWind() { return this.suit === SUITS.WIND; }
    get isDragon() { return this.suit === SUITS.DRAGON; }
    get isHonour() { return this.isWind || this.isDragon; }
    get isFlower() { return this.suit === SUITS.FLOWER; }
    get isSeason() { return this.suit === SUITS.SEASON; }
    get isBonus() { return this.isFlower || this.isSeason; }
    get isTerminal() { return this.isNumberSuit && (this.value === 1 || this.value === 9); }
    get isTerminalOrHonour() { return this.isTerminal || this.isHonour; }

    /** Chinese display name */
    get displayName() {
        if (this.suit === SUITS.WIND) return WIND_NAMES[this.value];
        if (this.suit === SUITS.DRAGON) return DRAGON_NAMES[this.value];
        if (this.suit === SUITS.FLOWER) {
            const names = { 1: '梅', 2: '蘭', 3: '竹', 4: '菊' };
            return names[this.value];
        }
        if (this.suit === SUITS.SEASON) {
            const names = { 1: '春', 2: '夏', 3: '秋', 4: '冬' };
            return names[this.value];
        }
        return NUMBER_NAMES[this.value] + SUIT_NAMES[this.suit];
    }

    /** Short label for rendering on tile face */
    get label() {
        if (this.suit === SUITS.WIND) return WIND_NAMES[this.value];
        if (this.suit === SUITS.DRAGON) return DRAGON_NAMES[this.value];
        return this.value.toString();
    }

    get suitLabel() {
        if (this.isHonour) return '';
        return SUIT_NAMES[this.suit];
    }

    /** Sort key for ordering tiles in hand */
    get sortKey() {
        const suitOrder = { wan: 0, tung: 1, sok: 2, wind: 3, dragon: 4 };
        return suitOrder[this.suit] * 100 + this.value;
    }

    /** Check if tiles match (same suit and value) */
    matches(other) {
        return this.suit === other.suit && this.value === other.value;
    }

    /** Create key for grouping identical tiles */
    get key() {
        return `${this.suit}_${this.value}`;
    }

    static compare(a, b) {
        return a.sortKey - b.sortKey;
    }
}

/** Generate all 136 tiles */
function createAllTiles() {
    const tiles = [];
    let id = 0;
    const numberSuits = [SUITS.WAN, SUITS.TUNG, SUITS.SOK];

    for (const suit of numberSuits) {
        for (let value = 1; value <= 9; value++) {
            for (let copy = 0; copy < 4; copy++) {
                tiles.push(new Tile(suit, value, id++));
            }
        }
    }
    // Winds
    for (let value = 1; value <= 4; value++) {
        for (let copy = 0; copy < 4; copy++) {
            tiles.push(new Tile(SUITS.WIND, value, id++));
        }
    }
    // Dragons
    for (let value = 1; value <= 3; value++) {
        for (let copy = 0; copy < 4; copy++) {
            tiles.push(new Tile(SUITS.DRAGON, value, id++));
        }
    }
    // Flowers
    for (let value = 1; value <= 4; value++) {
        tiles.push(new Tile(SUITS.FLOWER, value, id++));
    }
    // Seasons
    for (let value = 1; value <= 4; value++) {
        tiles.push(new Tile(SUITS.SEASON, value, id++));
    }
    return tiles;
}
