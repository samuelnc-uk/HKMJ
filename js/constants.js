// ============================================================
// constants.js — Hong Kong Mahjong constants & definitions
// ============================================================

const SUITS = {
    WAN: 'wan',    // 萬
    TUNG: 'tung',   // 筒
    SOK: 'sok',    // 索
    WIND: 'wind',   // 風
    DRAGON: 'dragon', // 三元
    FLOWER: 'flower', // 花
    SEASON: 'season'  // 季
};

const SUIT_NAMES = {
    wan: '萬',
    tung: '筒',
    sok: '索',
    wind: '風',
    dragon: '',
    flower: '花',
    season: '季'
};

const WINDS = { EAST: 1, SOUTH: 2, WEST: 3, NORTH: 4 };
const WIND_NAMES = { 1: '東', 2: '南', 3: '西', 4: '北' };
const WIND_ENGLISH = { 1: 'East', 2: 'South', 3: 'West', 4: 'North' };

const DRAGONS = { RED: 1, GREEN: 2, WHITE: 3 };
const DRAGON_NAMES = { 1: '中', 2: '發', 3: '白' };

const NUMBER_NAMES = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
    6: '六', 7: '七', 8: '八', 9: '九'
};

const MELD_TYPE = {
    CHOW: 'chow',
    PUNG: 'pung',
    KONG_EXPOSED: 'kong_exposed',
    KONG_CONCEALED: 'kong_concealed',
    KONG_ADDED: 'kong_added'
};

const GAME_STATE = {
    MENU: 'menu',
    DICE_ROLL: 'dice_roll',
    DEALING: 'dealing',
    PLAYER_TURN: 'player_turn',
    PLAYER_DISCARD: 'player_discard',
    AI_TURN: 'ai_turn',
    CLAIMING: 'claiming',
    ROUND_END: 'round_end',
    GAME_END: 'game_end'
};

const DIFFICULTY = { EASY: 0, MEDIUM: 1, HARD: 2 };
const DIFFICULTY_NAMES = ['簡單 Easy', '普通 Medium', '困難 Hard'];

// 10 tile colour themes — each defines accent hue for suit symbols
const TILE_THEMES = [
    { name: '經典 Classic', hue: 210, sat: 70, lightBase: 35 },
    { name: '翡翠 Jade', hue: 150, sat: 60, lightBase: 30 },
    { name: '紅寶石 Ruby', hue: 0, sat: 70, lightBase: 40 },
    { name: '金色 Gold', hue: 42, sat: 80, lightBase: 40 },
    { name: '紫水晶 Amethyst', hue: 270, sat: 55, lightBase: 40 },
    { name: '天藍 Sky', hue: 195, sat: 75, lightBase: 40 },
    { name: '橙色 Orange', hue: 25, sat: 80, lightBase: 42 },
    { name: '青色 Teal', hue: 175, sat: 60, lightBase: 35 },
    { name: '粉紅 Rose', hue: 340, sat: 60, lightBase: 42 },
    { name: '墨綠 Forest', hue: 130, sat: 50, lightBase: 28 }
];

const MAX_FAN = 13;
const TOTAL_TILES = 144;
const HAND_SIZE = 13;
const WINNING_HAND_SIZE = 14;
