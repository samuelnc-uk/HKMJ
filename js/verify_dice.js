const fs = require('fs');
const path = require('path');

// Mock browser globals
global.performance = { now: () => Date.now() };

// Concatenate files to simulate browser environment
const files = [
    'constants.js',
    'tile.js',
    'wall.js',
    'hand.js',
    'scoring.js',
    'ai.js',
    'game.js',
    'characters.js'
];

let allCode = '';
files.forEach(f => {
    // Files are now in the SAME directory as this script
    allCode += fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n';
});

// Helper to mock UI/Image dependencies that logic refers to
const mocks = `
global.Image = class {};
function createCharacters() {
    return [
        { setExpression: () => {}, update: () => {}, draw: () => {} },
        { setExpression: () => {}, update: () => {}, draw: () => {} },
        { setExpression: () => {}, update: () => {}, draw: () => {} },
        { setExpression: () => {}, update: () => {}, draw: () => {} }
    ];
}
`;

try {
    // We remove the const declarations that might clash or use var for flexibility
    // Actually, constants.js should be the first file and define GAME_STATE etc.
    // If characters.js also defines EXPR, we let it.

    // Clean up allCode: remove duplicate 'const EXPR' if we were mocking it
    // Actually, let's just run it. The error was 'Identifier EXPR has already been declared'
    // because I put it in mocks AND it was in characters.js.

    const runnable = mocks + allCode + `
        const game = new Game();
        console.log("Initial state:", game.state);
        
        console.log("--- Starting Game ---");
        game.startGame();
        console.log("State after startGame:", game.state);
        
        if (game.state !== GAME_STATE.DICE_ROLL) {
            throw new Error("Game failed to enter DICE_ROLL state. Actual: " + game.state);
        }

        console.log("--- Rolling Dice ---");
        game.rollDice();
        console.log("Dice results:", game.diceResults);
        const sum = game.diceResults.reduce((a, b) => a + b, 0);
        console.log("Dice sum:", sum);

        if (!game.diceRolled || sum === 0) {
            throw new Error("Dice failed to roll");
        }

        console.log("--- Confirming Dice ---");
        game.confirmDice();
        console.log("Dealer index determined:", game.dealerIndex);
        
        const expectedIndex = (sum - 1) % 4;
        console.log("Expected dealer index ((sum-1)%4):", expectedIndex);

        if (game.dealerIndex !== expectedIndex) {
            throw new Error("Dealer determination logic error! Expected " + expectedIndex + " but got " + game.dealerIndex);
        }

        console.log("State after confirmation:", game.state);
        if (game.state !== GAME_STATE.PLAYER_DISCARD && game.state !== GAME_STATE.AI_TURN) {
             throw new Error("Game failed to start round after dice confirmation. Current state: " + game.state);
        }

        console.log("VERIFICATION SUCCESS: Dice roll and dealer selection logic is correct.");
    `;

    new Function(runnable)();
} catch (e) {
    console.error("VERIFICATION FAILED:");
    console.error(e.message);
    process.exit(1);
}
