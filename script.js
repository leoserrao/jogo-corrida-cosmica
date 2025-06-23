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

    // --- Sistema de Fila para a Síntese de Voz ---
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

    /**
     * MODIFICADO: Transforma movePiece em uma função que retorna uma Promise.
     * A Promise resolve depois que a animação da peça e a mensagem de movimento são acionadas.
     */
    function movePiece(player, steps) {
        return new Promise(resolve => {
            playerPositions[player] += steps;
            if (playerPositions[player] >= BOARD_SIZE) {
                playerPositions[player] = BOARD_SIZE;
            }

            updatePiecePositions();

            const playerName = player === 1 ? "Você" : "O computador";
            
            // Atraso para sincronizar com a animação da peça no CSS.
            setTimeout(() => {
                updateStatus(`${playerName} avançou para a casa ${playerPositions[player]}.`, true);
                
                if (playerPositions[player] >= BOARD_SIZE) {
                    setTimeout(() => endGame(player), 1500);
                }
                
                resolve(); // A Promise é resolvida aqui.
            }, 600); // Um pouco mais que a animação (0.5s)
        });
    }

    async function handlePlayerTurn() {
        if (!gameActive || currentPlayer !== 1) return;

        rollButton.disabled = true;
        updateStatus("Sua vez. Lançando o dado...", false);

        const diceResult = rollDice();
        queueSpeech(`Você tirou ${diceResult}!`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // MODIFICADO: Espera a conclusão do movimento.
        await movePiece(1, diceResult);

        if (gameActive) {
            currentPlayer = 2;
            setTimeout(handleCpuTurn, 2000); // Aumenta um pouco a pausa.
        }
    }

    async function handleCpuTurn() {
        if (!gameActive) return;

        updateStatus("Vez do computador...", true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const diceResult = rollDice();
        queueSpeech(`O computador tirou ${diceResult}!`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // MODIFICADO: Espera a função movePiece terminar.
        await movePiece(2, diceResult);

        // MODIFICADO: Este bloco agora só executa APÓS a narração do movimento do computador.
        if (gameActive) {
            currentPlayer = 1;
            rollButton.disabled = false;
            // Adiciona uma pequena pausa para dar um respiro antes da próxima narração.
            setTimeout(() => {
                updateStatus("Sua vez. Lance o dado!", true);
            }, 500);
        }
    }
    
    function endGame(winner) {
        gameActive = false;
        const winnerName = winner === 1 ? "Você" : "O computador";
        updateStatus(`${winnerName} venceu a corrida cósmica!`, true);

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