document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Configurações ---
    const CONFIG = {
        BOARD_SIZE: 30,
        ANIMATION_DURATION: 500, // Duração da animação da peça em ms (definido no CSS)
        PIECE_OFFSET: 10,        // Deslocamento da peça dentro do quadrado em px
        TIMEOUTS: {
            POST_MOVE_SPEECH: 600,      // Deve ser um pouco > ANIMATION_DURATION
            END_GAME_DELAY: 1500,
            CPU_TURN_START_DELAY: 2000,
            PRE_MOVE_DELAY: 1000,
            POST_CPU_TURN_DELAY: 500,
            SPEECH_QUEUE_INTERVAL: 150,
        }
    };

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

    // --- Sistema de Fila para a Síntese de Voz ---
    const synth = window.speechSynthesis; // Verificado abaixo se é suportado
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
            setTimeout(processSpeechQueue, CONFIG.TIMEOUTS.SPEECH_QUEUE_INTERVAL);
        };
        utterance.onerror = () => {
            isSpeaking = false;
            processSpeechQueue();
        };
        synth.speak(utterance);
    }

    function queueSpeech(text) {
        // Apenas adiciona à fila se a API for suportada
        if (synth) speechQueue.push(text);
        processSpeechQueue();
    }

    function waitForSpeechToEnd() {
        return new Promise(resolve => {
            const checkSpeech = () => {
                // Resolve se a API não for suportada ou se a fala terminou
                if (!synth || (!isSpeaking && speechQueue.length === 0)) {
                    resolve();
                } else {
                    setTimeout(checkSpeech, 100); // Verifica a cada 100ms
                }
            };
            checkSpeech();
        });
    }

    // --- Reconhecimento de Voz ---
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

    // --- Funções do Jogo ---

    function updateStatus(message, shouldSpeak = true) {
        statusMessage.textContent = message;
        if (shouldSpeak) {
            queueSpeech(message);
        }
    }

    function createBoard() {
        for (let i = 1; i <= CONFIG.BOARD_SIZE; i++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.id = `square-${i}`;
            square.textContent = i;
            if (i === 1) square.classList.add('start'); // Início
            if (i === CONFIG.BOARD_SIZE) square.classList.add('finish'); // Fim
            board.appendChild(square);
        }
    }

    function updatePiecePositions() {
        const boardPos = board.getBoundingClientRect();

        // Pega a posição do dado para alinhar as peças fora do tabuleiro
        const dicePos = diceElement.getBoundingClientRect();
        // Centraliza verticalmente com o dado e posiciona à esquerda
        const offBoardTop = `${dicePos.top - boardPos.top + (diceElement.offsetHeight / 4)}px`;
        const offBoardLeftPlayer1 = `${dicePos.left - boardPos.left - 60}px`; // Foguete
        const offBoardLeftPlayer2 = `${dicePos.left - boardPos.left - 110}px`; // OVNI

        const updateSinglePiece = (player, pieceElement) => {
            const currentPosition = playerPositions[player];
            if (currentPosition > 0) {
                const square = document.getElementById(`square-${currentPosition}`);
                if (square) {
                    const pos = square.getBoundingClientRect();
                    pieceElement.style.top = `${pos.top - boardPos.top + CONFIG.PIECE_OFFSET}px`;
                    pieceElement.style.left = `${pos.left - boardPos.left + CONFIG.PIECE_OFFSET}px`;
                }
            } else {
                // Posiciona a peça fora do tabuleiro, ao lado do dado
                pieceElement.style.top = offBoardTop;
                pieceElement.style.left = player === 1 ? offBoardLeftPlayer1 : offBoardLeftPlayer2;
            }
        };

        updateSinglePiece(1, player1Piece);
        updateSinglePiece(2, player2Piece);
    }

    function rollDice() {
        const result = Math.floor(Math.random() * 6) + 1;
        diceElement.textContent = result;
        // A linha abaixo, que causava a animação, foi removida.
        return result;
    }

    /**
     * MODIFICADO: Transforma movePiece em uma função que retorna uma Promise.
     * A Promise resolve depois que a animação da peça e a mensagem de movimento são acionadas.
     */
    function movePiece(player, steps) {
        return new Promise(resolve => {
            playerPositions[player] += steps;
            if (playerPositions[player] >= CONFIG.BOARD_SIZE) {
                playerPositions[player] = CONFIG.BOARD_SIZE;
            }

            updatePiecePositions();

            const playerName = player === 1 ? "Você" : "O computador";

            // Atraso para sincronizar com a animação da peça no CSS.
            setTimeout(() => {
                updateStatus(`${playerName} avançou para a casa ${playerPositions[player]}.`, true);

                if (playerPositions[player] >= CONFIG.BOARD_SIZE) {
                    setTimeout(() => endGame(player), CONFIG.TIMEOUTS.END_GAME_DELAY);
                }

                resolve(); // A Promise é resolvida aqui.
            }, CONFIG.TIMEOUTS.POST_MOVE_SPEECH);
        });
    }

    async function handlePlayerTurn() {
        if (!gameActive || currentPlayer !== 1) return;

        rollButton.disabled = true;
        updateStatus("Sua vez. Lançando o dado...", false);

        const diceResult = rollDice();
        queueSpeech(`Você tirou ${diceResult}!`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.PRE_MOVE_DELAY));

        // MODIFICADO: Espera a conclusão do movimento.
        await movePiece(1, diceResult);

        // Aguarda a narração do movimento do jogador terminar antes de passar a vez.
        await waitForSpeechToEnd();

        if (gameActive) {
            currentPlayer = 2;
            handleCpuTurn(); // Inicia a vez do computador imediatamente após a fala.
        }
    }

    async function handleCpuTurn() {
        if (!gameActive) return;

        updateStatus("Vez do computador...", true);

        // Pequena pausa para a narração inicial começar e dar ritmo ao jogo.
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.POST_CPU_TURN_DELAY));

        const diceResult = rollDice();
        queueSpeech(`O computador tirou ${diceResult}!`);

        // MODIFICADO: Espera a função movePiece terminar.
        await movePiece(2, diceResult);

        await waitForSpeechToEnd();

        if (gameActive) {
            currentPlayer = 1;
            rollButton.disabled = false;
            updateStatus("Sua vez. Lance o dado!", true);
        }
    }

    function endGame(winner) {
        gameActive = false;
        const winnerName = winner === 1 ? "Você" : "O computador";
        updateStatus(`${winnerName} venceu a corrida cósmica! Clique em Jogar Novamente ou pressione a tecla N no teclado.`, true);

        rollButton.removeEventListener('click', handlePlayerTurn);
        rollButton.addEventListener('click', initializeGame);

        rollButton.textContent = "Jogar Novamente";
        rollButton.disabled = false;
    }

    function initializeGame() {
        rollButton.removeEventListener('click', initializeGame);
        rollButton.addEventListener('click', handlePlayerTurn);

        gameActive = true;
        currentPlayer = 1;
        playerPositions = { 1: 0, 2: 0 };

        // Cancela a fala apenas se a API for suportada e estiver falando
        if (synth && synth.speaking) synth.cancel();
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
        updateStatus("Bem-vindo à Corrida Cósmica! Percorra as 30 casas e chegue ao planeta final antes do seu oponente! Controles: Clique em Lançar Dado ou pressione a Barra de Espaço no teclado para ativar o microfone e diga jogar. É a sua vez.", true);
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
        } else if (e.key.toLowerCase() === 'n' && !gameActive) {
            initializeGame();
        }
    });

    window.addEventListener('resize', updatePiecePositions);

    // --- Início do Jogo ---
    initializeGame();
});