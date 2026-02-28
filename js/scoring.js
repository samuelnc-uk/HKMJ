// ============================================================
// scoring.js — Hong Kong Mahjong fan scoring
// ============================================================

class Scoring {
    /**
     * Calculate total fan for a winning hand.
     * @param {Hand} hand
     * @param {Object} context - { seatWind, roundWind, selfDrawn, lastTile, isLastTile, isKongDraw }
     * @returns {{ totalFan: number, breakdown: {name, fan}[] }}
     */
    static calculate(hand, context) {
        const breakdown = [];
        const decomp = hand.getWinDecomposition();
        if (!decomp) return { totalFan: 0, breakdown: [] };

        // ---- Special Hands ----
        if (decomp.special === 'thirteen_orphans') {
            breakdown.push({ name: '十三么', fan: MAX_FAN });
            return { totalFan: MAX_FAN, breakdown };
        }

        if (decomp.special === 'seven_pairs') {
            breakdown.push({ name: '七對子', fan: 4 });
            const tiles = decomp.tiles;
            // Check if all-honours seven pairs
            if (tiles.every(t => t.isHonour)) {
                breakdown.push({ name: '字一色', fan: MAX_FAN });
                return { totalFan: MAX_FAN, breakdown };
            }
            // Check half/full flush with seven pairs
            Scoring._checkFlush(tiles, hand.melds, breakdown);
            let total = breakdown.reduce((s, b) => s + b.fan, 0);
            if (context.selfDrawn) { breakdown.push({ name: '自摸', fan: 1 }); total++; }
            return { totalFan: Math.min(total, MAX_FAN), breakdown };
        }

        // ---- Standard hand analysis ----
        const allSets = [...decomp.sets, ...hand.melds.map(m => ({
            type: m.type === MELD_TYPE.CHOW ? 'chow' : 'pung',
            key: m.tiles[0].key,
            suit: m.tiles[0].suit,
            value: m.tiles[0].value,
            exposed: true
        }))];

        const allTiles = [...hand.concealed];
        for (const m of hand.melds) {
            allTiles.push(...m.tiles);
        }

        // All Honours (字一色)
        if (allTiles.every(t => t.isHonour)) {
            breakdown.push({ name: '字一色', fan: MAX_FAN });
            return { totalFan: MAX_FAN, breakdown };
        }

        // Nine Gates (九蓮寶燈) — must be concealed and all one number suit
        if (hand.melds.length === 0) {
            const suits = new Set(allTiles.map(t => t.suit));
            if (suits.size === 1 && allTiles[0].isNumberSuit) {
                const counts = {};
                for (const t of allTiles) counts[t.value] = (counts[t.value] || 0) + 1;
                // 1112345678999 + any of that suit
                if (counts[1] >= 3 && counts[9] >= 3 && counts[2] >= 1 && counts[3] >= 1 &&
                    counts[4] >= 1 && counts[5] >= 1 && counts[6] >= 1 && counts[7] >= 1 && counts[8] >= 1) {
                    breakdown.push({ name: '九蓮寶燈', fan: MAX_FAN });
                    return { totalFan: MAX_FAN, breakdown };
                }
            }
        }

        // All Pungs (對對糊)
        const isAllPungs = allSets.every(s => s.type !== 'chow');
        if (isAllPungs) {
            breakdown.push({ name: '對對糊', fan: 3 });
        }

        // Mixed/Full Flush
        Scoring._checkFlush(allTiles, hand.melds, breakdown);

        // All Chows — concealed, all sets are chows, pair is not dragon/wind
        const isAllChows = allSets.every(s => s.type === 'chow');
        if (isAllChows && hand.melds.length === 0) {
            // 平糊 (Ping Wu) — concealed all chows
            breakdown.push({ name: '平糊', fan: 1 });
        }

        // Dragon Pungs
        for (const s of allSets) {
            if ((s.type === 'pung' || s.type === MELD_TYPE.PUNG || s.type === MELD_TYPE.KONG_EXPOSED ||
                s.type === MELD_TYPE.KONG_CONCEALED || s.type === MELD_TYPE.KONG_ADDED) &&
                (s.suit === SUITS.DRAGON || (s.key && s.key.startsWith('dragon')))) {
                const val = s.value || parseInt(s.key.split('_')[1]);
                const names = { 1: '中', 2: '發', 3: '白' };
                breakdown.push({ name: `番牌 ${names[val]}`, fan: 1 });
            }
        }

        // Seat Wind Pung
        for (const s of allSets) {
            const sKey = s.key || `${s.suit}_${s.value}`;
            if (sKey === `wind_${context.seatWind}` &&
                (s.type === 'pung' || s.type === MELD_TYPE.PUNG || s.type === MELD_TYPE.KONG_EXPOSED ||
                    s.type === MELD_TYPE.KONG_CONCEALED || s.type === MELD_TYPE.KONG_ADDED)) {
                breakdown.push({ name: `門風 ${WIND_NAMES[context.seatWind]}`, fan: 1 });
            }
        }

        // Round Wind Pung
        for (const s of allSets) {
            const sKey = s.key || `${s.suit}_${s.value}`;
            if (sKey === `wind_${context.roundWind}` &&
                (s.type === 'pung' || s.type === MELD_TYPE.PUNG || s.type === MELD_TYPE.KONG_EXPOSED ||
                    s.type === MELD_TYPE.KONG_CONCEALED || s.type === MELD_TYPE.KONG_ADDED)) {
                breakdown.push({ name: `圈風 ${WIND_NAMES[context.roundWind]}`, fan: 1 });
            }
        }

        // Self-drawn (自摸)
        if (context.selfDrawn) {
            breakdown.push({ name: '自摸', fan: 1 });
        }

        // Concealed Hand (門前清) — no exposed melds and win by discard
        if (hand.melds.length === 0 && !context.selfDrawn) {
            breakdown.push({ name: '門前清', fan: 1 });
        }

        // Last tile win
        if (context.isLastTile) {
            breakdown.push({ name: '海底撈月', fan: 1 });
        }

        // Win on Kong draw
        if (context.isKongDraw) {
            breakdown.push({ name: '槓上自摸', fan: 1 });
        }

        // Small Three Dragons (小三元) — 2 dragon pungs + dragon pair
        const dragonPungCount = allSets.filter(s => {
            const k = s.key || `${s.suit}_${s.value}`;
            return k.startsWith('dragon') && s.type !== 'chow';
        }).length;
        const dragonPair = decomp.pair && decomp.pair.startsWith('dragon');
        if (dragonPungCount === 2 && dragonPair) {
            breakdown.push({ name: '小三元', fan: 4 });
        }
        // Big Three Dragons (大三元)
        if (dragonPungCount === 3) {
            breakdown.push({ name: '大三元', fan: 8 });
        }

        // Small Four Winds (小四喜) — 3 wind pungs + wind pair
        const windPungCount = allSets.filter(s => {
            const k = s.key || `${s.suit}_${s.value}`;
            return k.startsWith('wind') && s.type !== 'chow';
        }).length;
        const windPair = decomp.pair && decomp.pair.startsWith('wind');
        if (windPungCount === 3 && windPair) {
            breakdown.push({ name: '小四喜', fan: 6 });
        }
        if (windPungCount === 4) {
            breakdown.push({ name: '大四喜', fan: MAX_FAN });
        }

        // Flowers and Seasons
        Scoring._checkFlowers(hand, context, breakdown);

        let totalFan = breakdown.reduce((s, b) => s + b.fan, 0);
        return { totalFan: Math.min(totalFan, MAX_FAN), breakdown };
    }

    static _checkFlowers(hand, context, breakdown) {
        const flowers = hand.flowers.filter(t => t.suit === SUITS.FLOWER);
        const seasons = hand.flowers.filter(t => t.suit === SUITS.SEASON);
        const seatWind = context.seatWind; // 1:E, 2:S, 3:W, 4:N

        // Flower set (梅 1, 蘭 2, 竹 3, 菊 4)
        if (flowers.length === 4) {
            breakdown.push({ name: '花牌: 一台', fan: 2 });
        }

        // Matching flower (正花) - awards even if part of a set
        const matchF = flowers.find(f => f.value === seatWind);
        if (matchF) {
            breakdown.push({ name: '正花', fan: 1 });
        }

        // Season set (春 1, 夏 2, 秋 3, 冬 4)
        if (seasons.length === 4) {
            breakdown.push({ name: '季牌: 一台', fan: 2 });
        }

        // Matching season (正季) - awards even if part of a set
        const matchS = seasons.find(s => s.value === seatWind);
        if (matchS) {
            breakdown.push({ name: '正季', fan: 1 });
        }

        // All 8 bonus tiles (八仙過海)
        if (hand.flowers.length === 8) {
            breakdown.push({ name: '八仙過海', fan: MAX_FAN });
        }
    }

    static _checkFlush(allTiles, melds, breakdown) {
        const numberTiles = allTiles.filter(t => t.isNumberSuit);
        const honourTiles = allTiles.filter(t => t.isHonour);
        if (numberTiles.length > 0) {
            const suits = new Set(numberTiles.map(t => t.suit));
            if (suits.size === 1) {
                if (honourTiles.length === 0) {
                    breakdown.push({ name: '清一色', fan: 7 });
                } else {
                    breakdown.push({ name: '混一色', fan: 3 });
                }
            }
        }
    }

    /**
     * Check if total fan meets minimum requirement.
     */
    static meetsMinimum(totalFan, minFan) {
        return totalFan >= minFan;
    }

    /**
     * Convert fan count to points.
     * 1番=2, 2番=4, ... 10番=1024. Capped at 10番.
     */
    static fanToPoints(fan) {
        const cappedFan = Math.min(fan, 10);
        return Math.pow(2, cappedFan);
    }

    /**
     * Calculate payment deltas for a round result.
     * @param {Game} game — the game instance
     * @returns {{ deltas: number[], details: string[], responsible: number }}
     *   deltas[i] = net score change for player i (positive = gain, negative = loss)
     */
    static calculatePayment(game) {
        const deltas = [0, 0, 0, 0];
        const details = [];

        if (game.winner < 0) {
            // Draw — no payments
            details.push('荒莊 — 冇人需要付分');
            return { deltas, details, responsible: -1 };
        }

        const winner = game.winner;
        const info = game.winInfo;
        const totalFan = info.scoring.totalFan;
        const basePoints = Scoring.fanToPoints(totalFan);
        const isDealer = winner === game.dealerIndex;

        if (info.selfDrawn) {
            // === 自摸 ===
            // Check 包自摸 first
            const responsible = Scoring.checkBaoPai(game, winner);

            if (responsible >= 0) {
                // 包自摸: responsible player pays all
                const totalPay = basePoints * 3; // pays for all 3 losers
                deltas[responsible] -= totalPay;
                deltas[winner] += totalPay;
                details.push(`包自摸！${Scoring._playerName(responsible)} 需要包賠全部 ${totalPay} 分`);
                return { deltas, details, responsible };
            }

            // Normal 自摸: each of the 3 losers pays
            for (let i = 0; i < 4; i++) {
                if (i === winner) continue;
                let pay = basePoints;
                // 莊家 rules: if dealer wins, losers pay double; if dealer loses, dealer pays double
                if (isDealer) {
                    pay = basePoints * 2; // dealer self-draws: losers pay double
                } else if (i === game.dealerIndex) {
                    pay = basePoints * 2; // loser is dealer: pays double
                }
                deltas[i] -= pay;
                deltas[winner] += pay;
            }
            details.push(`自摸：每家付 ${basePoints} 分（莊家付/收雙倍）`);
            details.push(`合共 +${deltas[winner]} 分`);
        } else {
            // === 出銃 ===
            const fromPlayer = info.fromPlayer;

            // 半銃制: discarder pays all
            const totalPay = basePoints;

            // Dealer multiplier
            let pay = totalPay;
            if (isDealer || fromPlayer === game.dealerIndex) {
                pay = totalPay * 2; // involves dealer: double
            }

            deltas[fromPlayer] -= pay;
            deltas[winner] += pay;
            details.push(`出銃：${Scoring._playerName(fromPlayer)} 付 ${pay} 分`);
        }

        return { deltas, details, responsible: -1 };
    }

    /**
     * Check 包自摸 (responsibility payment) conditions.
     * Returns the player index who is responsible, or -1 if none.
     * @param {Game} game
     * @param {number} winner — winning player index
     */
    static checkBaoPai(game, winner) {
        const hand = game.hands[winner];
        const melds = hand.melds;
        if (melds.length === 0) return -1;

        // Track who provided each meld (the player who discarded the tile that was claimed)
        // We need to check: is the last meld's provider responsible?

        // 大三元: all 3 dragon sets are melds, check if 3rd dragon meld was from one player
        const dragonMelds = melds.filter(m =>
            m.tiles[0] && m.tiles[0].suit === SUITS.DRAGON
        );
        if (dragonMelds.length >= 3) {
            // The player who provided the 3rd dragon meld is responsible
            const lastDragon = dragonMelds[dragonMelds.length - 1];
            if (lastDragon.fromPlayer !== undefined && lastDragon.fromPlayer !== winner) {
                return lastDragon.fromPlayer;
            }
        }

        // 大四喜: all 4 wind sets are melds
        const windMelds = melds.filter(m =>
            m.tiles[0] && m.tiles[0].suit === SUITS.WIND
        );
        if (windMelds.length >= 4) {
            const lastWind = windMelds[windMelds.length - 1];
            if (lastWind.fromPlayer !== undefined && lastWind.fromPlayer !== winner) {
                return lastWind.fromPlayer;
            }
        }

        // 清一色 with 12+ tiles exposed (4 melds, all same number suit)
        if (melds.length >= 4) {
            const exposedTiles = melds.reduce((sum, m) => sum + m.tiles.length, 0);
            if (exposedTiles >= 12) {
                const suits = new Set(melds.map(m => m.tiles[0].suit));
                if (suits.size === 1 && melds[0].tiles[0].isNumberSuit) {
                    const lastMeld = melds[melds.length - 1];
                    if (lastMeld.fromPlayer !== undefined && lastMeld.fromPlayer !== winner) {
                        return lastMeld.fromPlayer;
                    }
                }
            }
        }

        // 十八羅漢: 4 kongs
        const kongMelds = melds.filter(m =>
            m.type === MELD_TYPE.KONG_EXPOSED ||
            m.type === MELD_TYPE.KONG_CONCEALED ||
            m.type === MELD_TYPE.KONG_ADDED
        );
        if (kongMelds.length >= 4) {
            const lastKong = kongMelds[kongMelds.length - 1];
            if (lastKong.fromPlayer !== undefined && lastKong.fromPlayer !== winner) {
                return lastKong.fromPlayer;
            }
        }

        return -1;
    }

    static _playerName(idx) {
        const names = ['你', '下家', '對家', '上家'];
        return names[idx] || `玩家${idx}`;
    }
}
