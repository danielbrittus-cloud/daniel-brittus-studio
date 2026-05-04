const isMobileShell = window.matchMedia('(pointer: coarse), (max-width: 820px)').matches;

const config = {
    type: Phaser.AUTO,
    // O gerenciador de Escala é o segredo para o 16:9 perfeito
    scale: {
        mode: isMobileShell ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT, // Mobile preenche a tela; desktop preserva tudo.
        autoCenter: Phaser.Scale.CENTER_BOTH, // Centraliza o jogo horizontalmente e verticalmente
        width: 1280,  // Largura (16)
        height: 720,   // Altura (9)
        fullscreenTarget: document.documentElement
    },
    backgroundColor: '#000000',
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        mipmapFilter: 'LINEAR'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 }, 
            debug: false 
        }
    },
    input: {
        gamepad: true // <-- ADICIONE ESTA LINHA AQUI!
    },
    scene: [MenuInicial, CenaLoja, CenaFase, CenaPausa, CenaCarregamento, CenaCutsceneFuga] // <-- ADICIONE ESTA LINHA AQUI!
};

const jogo = new Phaser.Game(config);
window.novaHorizonGame = jogo;

// --- VACINA PARA O BUG DO GAMEPAD (PHASER 3.60) ---
// Filtra controles "fantasmas" antes do Phaser tentar limpá-los na mudança de cena
if (Phaser.Input.Gamepad.GamepadPlugin) {
    const originalShutdown = Phaser.Input.Gamepad.GamepadPlugin.prototype.shutdown;
    
    Phaser.Input.Gamepad.GamepadPlugin.prototype.shutdown = function () {
        // Limpa os buracos (undefined) da matriz ANTES do motor tentar acessá-los
        if (this.gamepads && this.gamepads.length > 0) {
            this.gamepads = this.gamepads.filter(g => g !== undefined && g !== null);
        }
        // Executa a limpeza original com segurança
        originalShutdown.call(this);
    };
}
