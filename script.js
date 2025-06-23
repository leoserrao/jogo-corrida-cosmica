document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Configurações ---
    const BOARD_SIZE = 30;
    let playerPositions = { 1: 0, 2: 0 };
    let currentPlayer = 1;
    let gameActive = true;

    // --- Referências aos Elementos do DOM (usando 'let' para poder reatribuir) ---
    let board = document.getElementById('game-board');
    let player1Piece = document.getElementById('player1');
    let player2Piece = document.getElementById('player2');
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

    function speak(text) {
        if (synth.speaking) {
            synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        synth.speak(utterance);
    }

    function updateStatus(message, shouldSpeak = true) {
        statusMessage.textContent = message;
        if (shouldSpeak) {
            speak(message);
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

    /**
     * CORREÇÃO: Atualiza a posição visual das peças no tabuleiro.
     * Agora lida explicitamente com a posição inicial '0' (fora do tabuleiro).
     */
    function updatePiecePositions() {
        const boardPos = board.getBoundingClientRect();

        // Posição do Jogador 1
        if (playerPositions[1] > 0) {
            const square = document.getElementById(`square-${playerPositions[1]}`);
            const pos = square.getBoundingClientRect();
            player1Piece.style.top = `${pos.top - boardPos.top + 10}px`;
            player1Piece.style.left = `${pos.left - boardPos.left + 10}px`;
        } else {
            // Posição inicial (fora do tabuleiro)
            player1Piece.style.top = '-50px';
            player1Piece.style.left = '10px';
        }

        // Posição do Jogador 2 (CPU)
        if (playerPositions[2] > 0) {
            const square = document.getElementById(`square-${playerPositions[2]}`);
            const pos = square.getBoundingClientRect();
            player2Piece.style.top = `${pos.top - boardPos.top + 10}px`;
            player2Piece.style.left = `${pos.left - boardPos.left + 10}px`;
        } else {
            // Posição inicial (fora do tabuleiro, com um pequeno deslocamento)
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
        // Atraso na mensagem para dar tempo da animação da peça ocorrer
        setTimeout(() => {
            updateStatus(`${playerName} avançou para a casa ${playerPositions[player]}.`, true);
        }, 500); // 500ms corresponde à transição no CSS

        if (playerPositions[player] >= BOARD_SIZE) {
            gameActive = false;
            setTimeout(() => {
                const winnerName = player === 1 ? "Você" : "O computador";
                updateStatus(`${winnerName} venceu a corrida cósmica!`, true);
                rollButton.textContent = "Jogar Novamente";
                rollButton.disabled = false;
                // Ao clicar, chama a função de inicialização
                rollButton.onclick = initializeGame;
            }, 1500);
        }
    }

    async function handlePlayerTurn() {
        if (!gameActive || currentPlayer !== 1) return;
        
        rollButton.disabled = true;
        updateStatus("Sua vez. Lançando o dado...", false);

        const diceResult = rollDice();
        speak(`Você tirou ${diceResult}!`);

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
        speak(`O computador tirou ${diceResult}!`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        movePiece(2, diceResult);

        if (gameActive) {
            currentPlayer = 1;
            rollButton.disabled = false;
            updateStatus("Sua vez. Lance o dado!", true);
        }
    }

    /**
     * CORREÇÃO: Inicializa ou reinicia o jogo corretamente.
     */
    function initializeGame() {
        gameActive = true;
        currentPlayer = 1;
        playerPositions = { 1: 0, 2: 0 };
        
        // Limpa o tabuleiro para recriá-lo
        board.innerHTML = `
            <div class="piece" id="player1" aria-label="Sua peça (Foguete Azul)"></div>
            <div class="piece" id="player2" aria-label="Peça do computador (OVNI Verde)"></div>
        `;
        
        createBoard();
        
        // CORREÇÃO CRÍTICA: Reatribui as variáveis às novas peças no DOM
        player1Piece = document.getElementById('player1');
        player2Piece = document.getElementById('player2');
        
        updatePiecePositions();
        
        rollButton.textContent = "Lançar Dado";
        rollButton.disabled = false;
        // Garante que o clique chame a função de turno do jogador
        rollButton.onclick = handlePlayerTurn;
        
        updateStatus("Bem-vindo à Corrida Cósmica! É a sua vez.", true);
    }

    // --- Event Listeners ---
    rollButton.addEventListener('click', handlePlayerTurn);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && rollButton.disabled === false) {
            e.preventDefault();
            if (recognition && currentPlayer === 1 && gameActive) {
                try {
                    updateStatus("Ouvindo... Diga 'jogar'!", false);
                    recognition.start();
                } catch (err) {
                    // Evita erro caso o reconhecimento já esteja em execução
                    console.warn("Reconhecimento de voz já estava ativo.");
                }
            }
        }
    });

    window.addEventListener('resize', updatePiecePositions);
    
    // --- Início do Jogo ---
    initializeGame();
});