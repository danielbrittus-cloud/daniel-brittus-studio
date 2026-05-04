class CenaCutsceneFuga extends Phaser.Scene {
    constructor() {
        super('CenaCutsceneFuga');
    }

    init(data) {
        // Recebe os dados da fase que acabou de ser vencida
        this.planetaDestino = data.planetaDestino || 'fase_1';
        this.cicloAtual = data.cicloAtual || 1;
        this.videoFugaPath = data.videoFuga || 'assets/ui/video_fuga.webm';
        this.videoFugaKey = 'video_fuga_runtime';
    }

    preload() {
        // Coloque aqui o vídeo da fuga fotorrealista! (Recomendado: 720p .webm)
        if (this.cache.video.exists(this.videoFugaKey)) {
            this.cache.video.remove(this.videoFugaKey);
        }
        this.load.video(this.videoFugaKey, this.videoFugaPath, 'loadeddata', false, true);
    }

    create() {
        // 1. Toca o vídeo da fuga cobrindo a tela toda
        let video = this.add.video(640, 360, this.videoFugaKey).setOrigin(0.5);
        video.play(false); // false = não repete o vídeo
        
        // Se o vídeo não existir ou der erro, segue para o seletor de fases
        video.on('error', () => { this.irParaSeletorFases(); });

        // 2. Efeito de Escurecer as bordas para ficar estilo cinema
        this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.4);

        // 3. O Letreiro Épico de Missão Completa
        let textoVit = this.add.text(640, 360, 'MISSÃO COMPLETA', {
            fontFamily: '"Impact", sans-serif', 
            fontSize: '80px', 
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 0, color: '#00aaff', blur: 25, stroke: true, fill: true }
        }).setOrigin(0.5).setAlpha(0).setScale(2);

        // Faz o texto dar um "soco" na tela depois de 1 segundo de vídeo
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: textoVit,
                alpha: 1,
                scale: 1,
                duration: 500,
                ease: 'Bounce.easeOut'
            });
        });

        // 4. Quando o vídeo terminar, ele faz o fade e manda para o seletor de fases
        video.on('complete', () => {
            this.irParaSeletorFases();
        });

        // (OPCIONAL) Permite pular a cutscene clicando ou apertando botão no controle
        this.input.on('pointerdown', () => this.irParaSeletorFases());
        if (this.input.gamepad) {
            this.input.gamepad.once('down', () => this.irParaSeletorFases());
        }
    }

    irParaSeletorFases() {
        if (this.saindo) return;
        this.saindo = true;
        
        this.cameras.main.fade(1000, 0, 0, 0, false, (cam, pct) => {
            if (pct === 1) {
                this.scene.start('MenuInicial', {
                    abrirSelecaoFases: true
                });
            }
        });
    }
}
