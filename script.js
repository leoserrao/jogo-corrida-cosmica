document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Configurações ---
    const BOARD_SIZE = 30;
    let playerPositions = { 1: 0, 2: 0 };
    let currentPlayer = 1;
    let gameActive = true;

    // --- Referências aos Elementos do DOM ---
    const board = document.getElementById('game-board');
    let player1Piece = document.getElementById('player1');
    let player2Piece = document.getElementById('player2');
    const diceElement = document.getElementById('dice');
    const rollButton = document.getElementById('roll-button');
    const statusMessage = document.getElementById('status-message');

    // --- Sistema de Fila para a Síntese de Voz (sem alterações) ---
    const synth = window.speechSynthesis;
    let speechQueue = [];
    let isSpeaking = false;

    function processSpeechQueue() {
        if (isSpeaking || speechQueue.length === 0) return;
        isSpeaking = true;
        const textToSpeak = speechQueue.shift();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        utterance.onend = () => {
            isSpeaking = false;
            setTimeout(processSpeechQueue, 150);
        };
        utterance.onerror = () => {
            isSpeaking = false;
            processSpeechQueue();
        };
        synth.speak(utterance);
    }

    function queueSpeech(text) {
        speechQueue.push(text);
        processSpeechQueue();
    }

    // --- Reconhecimento de Voz (sem alterações) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if ((command.includes('jogar') || command.includes('lançar')) && !rollButton.disabled) {
                handlePlayerTurn();
            }
        };
        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            updateStatus('Não consegui entender. Tente novamente.', false);
        };
    }

    // --- Funções do Jogo (Refatoradas) ---

    function updateStatus(message, shouldSpeak = true) {
        statusMessage.textContent = message;
        if (shouldSpeak) {
            queueSpeech(message);
        }
    }

    function createBoard() {
        for (let i = 1; i <= BOARD_SIZE; i++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.id = `square-${i}`;
            square.textContent = i;
            if (i === 1) square.classList.add('start');
            if (i === BOARD_SIZE) square.classList.add('finish');
            board.appendChild(square);
        }
    }

    function updatePiecePositions() {
        const boardPos = board.getBoundingClientRect();
        if (playerPositions[1] > 0) {
            const square = document.getElementById(`square-${playerPositions[1]}`);
            if (square) {
                const pos = square.getBoundingClientRect();
                player1Piece.style.top = `${pos.top - boardPos.top + 10}px`;
                player1Piece.style.left = `${pos.left - boardPos.left + 10}px`;
            }
        } else {
            player1Piece.style.top = '-50px';
            player1Piece.style.left = '10px';
        }

        if (playerPositions[2] > 0) {
            const square = document.getElementById(`square-${playerPositions[2]}`);
            if (square) {
                const pos = square.getBoundingClientRect();
                player2Piece.style.top = `${pos.top - boardPos.top + 10}px`;
                player2Piece.style.left = `${pos.left - boardPos.left + 10}px`;
            }
        } else {
            player2Piece.style.top = '-50px';
            player2Piece.style.left = '70px';
        }
    }

    function rollDice() {
        const result = Math.floor(Math.random() * 6) + 1;
        diceElement.textContent = result;
        diceElement.style.transform = `rotateX(${360 * Math.random()}deg) rotateY(${360 * Math.random()}deg)`;
        return result;
    }

    async function handlePlayerTurn() {
        if (!gameActive || currentPlayer !== 1) return;

        rollButton.disabled = true;
        updateStatus("Sua vez. Lançando o dado...", false);

        const diceResult = rollDice();
        queueSpeech(`Você tirou ${diceResult}!`);

        await new Promise(resolve => setTimeout(resolve, 1000));
        movePiece(1, diceResult);

        if (gameActive) {
            currentPlayer = 2;
            setTimeout(handleCpuTurn, 2500);
        }
    }

    async function handleCpuTurn() {
        if (!gameActive) return;

        updateStatus("Vez do computador...", true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const diceResult = rollDice();
        queueSpeech(`O computador tirou ${diceResult}!`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        movePiece(2, diceResult);

        // CORREÇÃO CRÍTICA: O turno do computador termina aqui. Ele apenas
        // prepara o cenário para o jogador 1, mas NÃO o invoca.
        if (gameActive) {
            currentPlayer = 1;
            rollButton.disabled = false;
            updateStatus("Sua vez. Lance o dado!", true);
        }
    }

    function movePiece(player, steps) {
        playerPositions[player] += steps;
        if (playerPositions[player] >= BOARD_SIZE) {
            playerPositions[player] = BOARD_SIZE;
        }

        updatePiecePositions();

        const playerName = player === 1 ? "Você" : "O computador";
        setTimeout(() => {
            updateStatus(`${playerName} avançou para a casa ${playerPositions[player]}.`, true);
        }, 500);

        if (playerPositions[player] >= BOARD_SIZE) {
            // Em vez de colocar a lógica aqui, chamamos uma função de fim de jogo
            setTimeout(() => endGame(player), 1500);
        }
    }

    /**
     * NOVO: Função para finalizar o jogo e gerenciar os listeners do botão.
     * @param {number} winner - O jogador que venceu (1 ou 2).
     */
    function endGame(winner) {
        gameActive = false;
        const winnerName = winner === 1 ? "Você" : "O computador";
        updateStatus(`${winnerName} venceu a corrida cósmica!`, true);

        // Remove o listener de "jogar" para não ser acionado acidentalmente.
        rollButton.removeEventListener('click', handlePlayerTurn);
        // Adiciona um novo listener que irá REINICIAR o jogo.
        rollButton.addEventListener('click', initializeGame);

        rollButton.textContent = "Jogar Novamente";
        rollButton.disabled = false;
    }

    /**
     * REESTRUTURADO: Função para inicializar o jogo, agora também gerencia os listeners.
     */
    function initializeGame() {
        // Se esta função foi chamada pelo botão "Jogar Novamente",
        // removemos o listener antigo para evitar que ele se acumule.
        rollButton.removeEventListener('click', initializeGame);
        // Adiciona o listener principal para o turno do jogador.
        rollButton.addEventListener('click', handlePlayerTurn);

        gameActive = true;
        currentPlayer = 1;
        playerPositions = { 1: 0, 2: 0 };

        if (synth.speaking) synth.cancel();
        speechQueue = [];
        isSpeaking = false;

        board.innerHTML = `
            <div class="piece" id="player1" aria-label="Sua peça (Foguete Azul)"></div>
            <div class="piece" id="player2" aria-label="Peça do computador (OVNI Verde)"></div>
        `;
        createBoard();

        player1Piece = document.getElementById('player1');
        player2Piece = document.getElementById('player2');
        updatePiecePositions();

        rollButton.textContent = "Lançar Dado";
        rollButton.disabled = false;
        updateStatus("Bem-vindo à Corrida Cósmica! É a sua vez.", true);
    }

    // --- Event Listeners Globais ---
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !rollButton.disabled) {
            e.preventDefault();
            if (recognition) {
                try {
                    updateStatus("Ouvindo... Diga 'jogar'!", false);
                    recognition.start();
                } catch (err) { /* Ignora se já estiver ativo */ }
            }
        }
    });

    window.addEventListener('resize', updatePiecePositions);
    
    // --- Início do Jogo ---
    initializeGame();
});