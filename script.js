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

    // --- CORREÇÃO: Sistema de Fila para a Síntese de Voz ---
    const synth = window.speechSynthesis;
    let speechQueue = []; // A fila de mensagens a serem faladas
    let isSpeaking = false; // Flag para controlar o estado da fala

    /**
     * Processa a próxima mensagem na fila de fala.
     * É chamada quando uma fala termina, criando um ciclo.
     */
    function processSpeechQueue() {
        if (isSpeaking || speechQueue.length === 0) {
            return; // Se já estiver falando ou a fila estiver vazia, não faz nada
        }
        isSpeaking = true;
        const textToSpeak = speechQueue.shift(); // Pega a primeira mensagem da fila
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;

        // Quando a fala terminar, permite que a próxima seja processada
        utterance.onend = () => {
            isSpeaking = false;
            // Pequeno atraso para soar mais natural entre as frases
            setTimeout(processSpeechQueue, 150); 
        };
        
        // Em caso de erro, também continua para a próxima
        utterance.onerror = () => {
            console.error("Ocorreu um erro na síntese de voz.");
            isSpeaking = false;
            processSpeechQueue();
        };

        synth.speak(utterance);
    }

    /**
     * Adiciona uma mensagem à fila de fala em vez de falar diretamente.
     * @param {string} text - O texto a ser adicionado na fila.
     */
    function queueSpeech(text) {
        speechQueue.push(text);
        processSpeechQueue(); // Tenta iniciar o processo de fala
    }
    // --- Fim da Correção do Sistema de Voz ---

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if ((command.includes('jogar') || command.includes('lançar')) && currentPlayer === 1 && gameActive) {
                handlePlayerTurn();
            }
        };
        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            updateStatus('Não consegui entender. Tente novamente.', false);
        };
    } else {
        console.warn('Reconhecimento de voz não é suportado neste navegador.');
        document.querySelector('.instructions').innerHTML += '<br><small>Seu navegador não suporta comandos de voz.</small>';
    }

    /**
     * Atualiza a mensagem de status na tela e opcionalmente a adiciona à fila de fala.
     * @param {string} message - A mensagem a ser exibida.
     * @param {boolean} shouldSpeak - Se a mensagem deve ser falada.
     */
    function updateStatus(message, shouldSpeak = true) {
        statusMessage.textContent = message;
        if (shouldSpeak) {
            queueSpeech(message); // MODIFICADO: Usa a fila em vez de falar diretamente
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
            const pos = square.getBoundingClientRect();
            player1Piece.style.top = `${pos.top - boardPos.top + 10}px`;
            player1Piece.style.left = `${pos.left - boardPos.left + 10}px`;
        } else {
            player1Piece.style.top = '-50px';
            player1Piece.style.left = '10px';
        }

        if (playerPositions[2] > 0) {
            const square = document.getElementById(`square-${playerPositions[2]}`);
            const pos = square.getBoundingClientRect();
            player2Piece.style.top = `${pos.top - boardPos.top + 10}px`;
            player2Piece.style.left = `${pos.left - boardPos.left + 10}px`;
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
    
    function movePiece(player, steps) {
        playerPositions[player] += steps;
        if (playerPositions[player] > BOARD_SIZE) {
            playerPositions[player] = BOARD_SIZE;
        }
        
        updatePiecePositions();
        
        const playerName = player === 1 ? "Você" : "O computador";
        setTimeout(() => {
            updateStatus(`${playerName} avançou para a casa ${playerPositions[player]}.`, true);
        }, 500);

        if (playerPositions[player] >= BOARD_SIZE) {
            gameActive = false;
            setTimeout(() => {
                const winnerName = player === 1 ? "Você" : "O computador";
                updateStatus(`${winnerName} venceu a corrida cósmica!`, true);
                rollButton.textContent = "Jogar Novamente";
                rollButton.disabled = false;
                rollButton.onclick = initializeGame;
            }, 1500);
        }
    }

    async function handlePlayerTurn() {
        if (!gameActive || currentPlayer !== 1) return;
        
        rollButton.disabled = true;
        updateStatus("Sua vez de jogar...", false);

        const diceResult = rollDice();
        queueSpeech(`Você tirou ${diceResult}!`); // MODIFICADO: Usa a fila

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
        queueSpeech(`O computador tirou ${diceResult}!`); // MODIFICADO: Usa a fila
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        movePiece(2, diceResult);

        if (gameActive) {
            currentPlayer = 1;
            rollButton.disabled = false;
            updateStatus("Sua vez. Lance o dado!", true);
        }
    }

    function initializeGame() {
        gameActive = true;
        currentPlayer = 1;
        playerPositions = { 1: 0, 2: 0 };
        
        // CORREÇÃO: Limpa a fila e cancela qualquer fala pendente do jogo anterior
        if (synth.speaking) {
            synth.cancel();
        }
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
        rollButton.onclick = handlePlayerTurn;
        
        updateStatus("Bem-vindo à Corrida Cósmica! É a sua vez.", true);
    }

    // --- Event Listeners ---
    rollButton.addEventListener('click', handlePlayerTurn);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !rollButton.disabled) {
            e.preventDefault();
            if (recognition && currentPlayer === 1 && gameActive) {
                try {
                    updateStatus("Ouvindo... Diga 'jogar'!", false);
                    recognition.start();
                } catch (err) {
                    console.warn("Reconhecimento de voz já estava ativo.");
                }
            }
        }
    });
    window.addEventListener('resize', updatePiecePositions);
    
    // --- Início do Jogo ---
    initializeGame();
});