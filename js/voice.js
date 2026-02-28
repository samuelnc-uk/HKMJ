// ============================================================
// voice.js — Voice announcements using Web Speech API
// ============================================================

class VoiceManager {
    constructor() {
        this.enabled = true;
        this.volume = 1.0;
        this._synth = window.speechSynthesis;
        this._voices = [];
        this._voiceReady = false;

        // Character voice profiles:
        // Player 0: 阿明 — 高音高, 中語速, 男聲
        // Player 1: 陳太 — 低音高, 低語速, 女聲
        // Player 2: 肥佬 — 低音高, 中語速, 男聲
        // Player 3: 小麗 — 高音高, 高語速, 女聲
        this._playerProfiles = [
            { pitch: 1.0, rate: 1.0, gender: 'male' },  // 阿明
            { pitch: 0.7, rate: 0.8, gender: 'female' },  // 陳太
            { pitch: 0.6, rate: 0.8, gender: 'male' },  // 肥佬
            { pitch: 1.2, rate: 1.0, gender: 'female' },  // 小麗
        ];

        // Cantonese tile name lookup
        this._tileNames = {};
        this._buildTileNames();

        // Preload voices
        this._loadVoices();
        if (this._synth.onvoiceschanged !== undefined) {
            this._synth.onvoiceschanged = () => this._loadVoices();
        }

        // Random reaction phrases for each situation
        this._reactions = {
            discard_thinking: [
                '嗯……', '唔……', '諗下先……'
            ],
            pung: ['碰！', '碰！', '碰碰碰！'],
            chow: ['上左先！', '上！', '照上！'],
            kong: ['槓！', '開槓！', '大槓！'],
            selfWin: ['自摸！', '仲唔自摸?', '自摸！速速磅！'],
            winByDiscard: ['食你個糊', '仲唔到我食?!', '食糊！多謝速速磅！', '食糊！'],
            flower: ['花！', '補花！'],
            worried: ['哎呀……', '唔好啊……', '慘了……', '仆街啦今次……'],
            happy: ['好嘢！', '正！', '唔錯！'],
            angry: ['唉！', '咁都得?!', '唔係呀……'],
            surprised: ['嘩！', '乜L嘢呀?!', '頂！！'],
            thinking: ['嗯……', '等等……', '諗下先……',]
        };
    }

    _buildTileNames() {
        const nums = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };
        // 萬子
        for (let v = 1; v <= 9; v++) this._tileNames[`wan_${v}`] = nums[v] + '萬';
        // 筒子 (spoken as 「同」 in Cantonese)
        for (let v = 1; v <= 9; v++) this._tileNames[`tung_${v}`] = nums[v] + '同';
        // 索子
        for (let v = 1; v <= 9; v++) this._tileNames[`sok_${v}`] = nums[v] + '索';
        // 風牌 (just say the direction, no 風)
        this._tileNames['wind_1'] = '東';
        this._tileNames['wind_2'] = '南';
        this._tileNames['wind_3'] = '西';
        this._tileNames['wind_4'] = '北';
        // 三元
        this._tileNames['dragon_1'] = '紅中';
        this._tileNames['dragon_2'] = '發財';
        this._tileNames['dragon_3'] = '白板';
        // 花季
        this._tileNames['flower_1'] = '梅花';
        this._tileNames['flower_2'] = '蘭花';
        this._tileNames['flower_3'] = '竹花';
        this._tileNames['flower_4'] = '菊花';
        this._tileNames['season_1'] = '春天';
        this._tileNames['season_2'] = '夏天';
        this._tileNames['season_3'] = '秋天';
        this._tileNames['season_4'] = '冬天';
    }

    _loadVoices() {
        this._voices = this._synth.getVoices();
        this._voiceReady = this._voices.length > 0;
    }

    /** Find a voice matching the desired gender and language */
    _getVoice(gender) {
        const zhVoices = this._voices.filter(v =>
            v.lang === 'zh-HK' || v.lang.startsWith('zh-HK')
        );

        if (zhVoices.length > 1 && gender) {
            // Try to find gendered voice by name heuristics
            const femaleHints = ['female', 'woman', '女', 'tracy', 'sin-ji', 'sinji'];
            const maleHints = ['male', 'man', '男', 'daniel', 'wan-lung'];
            const hints = gender === 'female' ? femaleHints : maleHints;
            const match = zhVoices.find(v =>
                hints.some(h => v.name.toLowerCase().includes(h))
            );
            if (match) return match;
        }

        // Fallback: any zh-HK voice
        if (zhVoices.length > 0) return zhVoices[0];
        // Fallback: any Chinese voice
        const anyChinese = this._voices.find(v => v.lang.startsWith('zh'));
        return anyChinese || null;
    }

    // ===================== Public API =====================

    /** Speak a text string as a specific player */
    speak(text, playerIndex = 0) {
        if (!this.enabled || !this._synth) return;

        // Only cancel if queue is backed up (meaning something is wrong or excessive)
        // Increasing to 3 to allow "Pung!" then "Tile Name" to queue naturally.
        if (this._synth.pending && this._voices.length > 3) {
            this._synth.cancel();
        }

        const profile = this._playerProfiles[playerIndex] || this._playerProfiles[0];

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-HK';
        utter.volume = this.volume;
        utter.rate = profile.rate;
        utter.pitch = profile.pitch;

        const voice = this._getVoice(profile.gender);
        if (voice) utter.voice = voice;

        this._synth.speak(utter);
    }

    /** Announce a tile by its key (e.g. 'wan_3') */
    announceTile(tileKey, playerIndex = 0) {
        const name = this._tileNames[tileKey];
        if (name) this.speak(name, playerIndex);
    }

    /** Announce a tile discard */
    announceDiscard(tile, playerIndex = 0) {
        const key = `${tile.suit}_${tile.value}`;
        this.announceTile(key, playerIndex);
    }

    /** Announce an action (pung, chow, kong, etc.) */
    announceAction(action, playerIndex = 0) {
        const phrases = this._reactions[action];
        if (phrases && phrases.length > 0) {
            const phrase = phrases[Math.floor(Math.random() * phrases.length)];
            this.speak(phrase, playerIndex);
        }
    }

    /** Announce flower bloom */
    announceFlower(playerIndex = 0) {
        this.announceAction('flower', playerIndex);
    }

    /** Toggle voice on/off */
    toggleVoice() {
        this.enabled = !this.enabled;
        if (!this.enabled) this._synth.cancel();
        return this.enabled;
    }

    /** Check if voice is enabled */
    isEnabled() {
        return this.enabled;
    }
}

// Global instance
const voiceManager = new VoiceManager();
