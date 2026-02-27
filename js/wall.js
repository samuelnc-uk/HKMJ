// ============================================================
// wall.js — Wall building, shuffling, dealing
// ============================================================

class Wall {
    constructor() {
        this.tiles = [];
        this.deadWall = [];
        this.drawIndex = 0;
    }

    /** Build and shuffle a new wall */
    build() {
        this.tiles = createAllTiles();
        this.shuffle();
        // Dead wall: last 14 tiles
        this.deadWall = this.tiles.splice(this.tiles.length - 14, 14);
        this.drawIndex = 0;
    }

    /** Fisher-Yates shuffle */
    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    /** Draw one tile from the wall. Returns null if wall exhausted. */
    draw() {
        if (this.drawIndex >= this.tiles.length) return null;
        return this.tiles[this.drawIndex++];
    }

    /** Draw from dead wall (for Kong replacement) */
    drawFromDeadWall() {
        if (this.deadWall.length === 0) return null;
        return this.deadWall.pop();
    }

    /** Remaining tiles in the live wall */
    get remaining() {
        return this.tiles.length - this.drawIndex;
    }

    /** Deal initial hands: 13 tiles each, dealer gets 14 */
    deal(dealerIndex) {
        const hands = [[], [], [], []];
        // Deal 4 rounds of 4 tiles, then 1 each
        for (let round = 0; round < 3; round++) {
            for (let p = 0; p < 4; p++) {
                const idx = (dealerIndex + p) % 4;
                for (let t = 0; t < 4; t++) {
                    hands[idx].push(this.draw());
                }
            }
        }
        // Last tile each
        for (let p = 0; p < 4; p++) {
            const idx = (dealerIndex + p) % 4;
            hands[idx].push(this.draw());
        }
        // Dealer draws one extra
        hands[dealerIndex].push(this.draw());
        return hands;
    }
}
