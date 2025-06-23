document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Configurações ---
    const BOARD_SIZE = 30;
    const playerPositions = { 1: 0, 2: 0 };
    let currentPlayer = 1;
    let gameActive = true;

    // --- Referências aos Elementos do DOM ---
    const board = document.getElementById('game-board');
    const player1Piece = document.getElementById('player1');
    const player2Piece = document.getElementById('player2');
    const diceElement = document.getElementById('dice');
    const rollButton = document.getElementById('roll-button');
    const statusMessage = document.getElementById('status-message');

    // --- Configuração da Síntese e Reconhecimento de Voz ---
    const synth = window.speechSynthesis;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        
        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if (command.includes('jogar') || command.includes('lançar')) {
                if (currentPlayer === 1 && gameActive) {
                    handlePlayerTurn();
                }
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

    // --- Funções Principais do Jogo ---

    /**
     * Fala um texto usando a API de Síntese de Voz.
     * @param {string} text - O texto a ser falado.
     */
    function speak(text) {
        if (synth.speaking) {
            synth.cancel(); // Cancela falas anteriores para não sobrepor
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        synth.speak(utterance);
    }

    /**
     * Atualiza a mensagem de status na tela e opcionalmente a fala.
     * @param {string} message - A mensagem a ser exibida.
     * @param {boolean} shouldSpeak - Se a mensagem deve ser falada.
     */
    function updateStatus(message, shouldSpeak = true) {
        statusMessage.textContent = message;
        if (shouldSpeak) {
            speak(message);
        }
    }

    /**
     * Cria o tabuleiro de jogo dinamicamente.
     */
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

    /**
     * Atualiza a posição visual das peças no tabuleiro.
     */
    function updatePiecePositions() {
        // Posição do Jogador 1
        const player1Square = document.getElementById(`square-${playerPositions[1]}`) || board;
        const pos1 = player1Square.getBoundingClientRect();
        const boardPos = board.getBoundingClientRect();
        player1Piece.style.top = `${pos1.top - boardPos.top + 10}px`;
        player1Piece.style.left = `${pos1.left - boardPos.left + 10}px`;

        // Posição do Jogador 2 (CPU)
        const player2Square = document.getElementById(`square-${playerPositions[2]}`) || board;
        const pos2 = player2Square.getBoundingClientRect();
        player2Piece.style.top = `${pos2.top - boardPos.top + 10}px`;
        player2Piece.style.left = `${pos2.left - boardPos.left + 10}px`;
    }

    /**
     * Rola o dado e retorna um número de 1 a 6.
     * @returns {number} O resultado do dado.
     */
    function rollDice() {
        const result = Math.floor(Math.random() * 6) + 1;
        diceElement.textContent = result;
        diceElement.style.transform = `rotateX(${360 * Math.random()}deg) rotateY(${360 * Math.random()}deg)`;
        return result;
    }
    
    /**
     * Move uma peça no tabuleiro.
     * @param {number} player - O jogador (1 ou 2).
     * @param {number} steps - O número de casas para mover.
     */
    function movePiece(player, steps) {
        playerPositions[player] += steps;
        if (playerPositions[player] > BOARD_SIZE) {
            playerPositions[player] = BOARD_SIZE;
        }
        
        updatePiecePositions();
        const playerName = player === 1 ? "Você" : "O computador";
        updateStatus(`${playerName} está na casa ${playerPositions[player]}.`, true);

        if (playerPositions[player] >= BOARD_SIZE) {
            gameActive = false;
            setTimeout(() => {
                updateStatus(`${playerName} venceu a corrida cósmica!`, true);
                rollButton.textContent = "Jogar Novamente";
                rollButton.disabled = false;
                rollButton.onclick = initializeGame;
            }, 1000);
        }
    }

    /**
     * Gerencia o turno do jogador.
     */
    async function handlePlayerTurn() {
        if (!gameActive || currentPlayer !== 1) return;
        
        rollButton.disabled = true;
        updateStatus("Sua vez de jogar...", false);

        const diceResult = rollDice();
        updateStatus(`Você tirou ${diceResult}!`, true);

        await new Promise(resolve => setTimeout(resolve, 1500)); // Espera para o jogador ver o resultado
        
        movePiece(1, diceResult);

        if (gameActive) {
            currentPlayer = 2;
            setTimeout(handleCpuTurn, 2000);
        }
    }

    /**
     * Gerencia o turno do computador.
     */
    async function handleCpuTurn() {
        if (!gameActive) return;
        
        updateStatus("Vez do computador...", true);
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simula o CPU "pensando"

        const diceResult = rollDice();
        updateStatus(`O computador tirou ${diceResult}!`, true);
        
        await new Promise(resolve => setTimeout(resolve, 1500));

        movePiece(2, diceResult);

        if (gameActive) {
            currentPlayer = 1;
            rollButton.disabled = false;
            updateStatus("Sua vez. Lance o dado!", true);
        }
    }

    /**
     * Inicializa ou reinicia o jogo.
     */
    function initializeGame() {
        gameActive = true;
        currentPlayer = 1;
        playerPositions[1] = 0;
        playerPositions[2] = 0;
        
        board.innerHTML = `
            <div class="piece" id="player1" aria-label="Sua peça (Foguete Azul)"></div>
            <div class="piece" id="player2" aria-label="Peça do computador (OVNI Verde)"></div>
        `;
        
        createBoard();
        
        // Reatribuir referências após limpar o board.innerHTML
        const newPlayer1Piece = document.getElementById('player1');
        const newPlayer2Piece = document.getElementById('player2');
        player1Piece.replaceWith(newPlayer1Piece);
        player2Piece.replaceWith(newPlayer2Piece);
        
        updatePiecePositions();
        
        rollButton.textContent = "Lançar Dado";
        rollButton.disabled = false;
        rollButton.onclick = handlePlayerTurn; // Garante que o clique chame a função correta
        updateStatus("Bem-vindo à Corrida Cósmica! É a sua vez.", true);
    }


    // --- Event Listeners ---
    rollButton.addEventListener('click', handlePlayerTurn);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && recognition && currentPlayer === 1 && gameActive) {
            e.preventDefault(); // Impede que a página role
            try {
                updateStatus("Ouvindo... Diga 'jogar'!", false);
                recognition.start();
            } catch (err) {
                console.warn("Reconhecimento já estava ativo.");
            }
        }
    });

    // Ajusta a posição das peças se a janela for redimensionada
    window.addEventListener('resize', updatePiecePositions);
    
    // --- Início do Jogo ---
    initializeGame();
});