class CenaPausa extends Phaser.Scene {
    constructor() {
        super('CenaPausa');
    }

    init(data) {
        this.idFase = data?.idFase || 'fase_1';
        this.cicloAtual = data?.cicloAtual || 1;
        this.nomeFase = data?.nomeFase || 'SETOR ATUAL';
        this.idiomaAtual = localStorage.getItem('idioma_jogo') || 'PT';
    }

    create() {
        const texto = {
            PT: {
                titulo: 'PAUSA',
                setor: 'OPERACAO EM ESPERA',
                continuar: 'CONTINUAR',
                reiniciar: 'REINICIAR SETOR',
                arsenal: 'ARSENAL',
                menu: 'MENU PRINCIPAL',
                telaCheia: 'TELA CHEIA',
                dica: 'ESC / P para voltar ao jogo'
            },
            EN: {
                titulo: 'PAUSED',
                setor: 'OPERATION ON HOLD',
                continuar: 'RESUME',
                reiniciar: 'RESTART SECTOR',
                arsenal: 'ARSENAL',
                menu: 'MAIN MENU',
                telaCheia: 'FULLSCREEN',
                dica: 'ESC / P to return'
            }
        };
        this.t = texto[this.idiomaAtual] || texto.PT;
        this.menuTravado = false;
        this.indiceSelecionado = 0;
        this.ultimoInputGamepad = 0;

        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
        this.add.rectangle(640, 360, 1280, 720, 0x02050b, 0.72);
        this.add.rectangle(640, 360, 1280, 720, 0x0a2430, 0.24).setBlendMode(Phaser.BlendModes.SCREEN);

        const painel = this.add.rectangle(640, 360, 560, 480, 0x06111b, 0.94)
            .setStrokeStyle(2, 0x26d9ff, 0.72);
        const linhaTopo = this.add.rectangle(640, 145, 360, 3, 0x33e7ff, 0.95);
        const linhaBaixo = this.add.rectangle(640, 576, 300, 2, 0x33e7ff, 0.45);

        const titulo = this.add.text(640, 188, this.t.titulo, {
            fontFamily: '"Courier New", monospace',
            fontSize: '54px',
            color: '#dffaff',
            fontStyle: 'bold',
            letterSpacing: 8,
            stroke: '#001018',
            strokeThickness: 5
        }).setOrigin(0.5);

        const subtitulo = this.add.text(640, 238, `${this.t.setor} - ${String(this.nomeFase).toUpperCase()}`, {
            fontFamily: '"Courier New", monospace',
            fontSize: '14px',
            color: '#7edfff',
            letterSpacing: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: [linhaTopo, linhaBaixo],
            alpha: { from: 0.35, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.botoes = [
            this.criarBotao(640, 310, this.t.continuar, () => this.continuar()),
            this.criarBotao(640, 365, this.t.reiniciar, () => this.reiniciar()),
            this.criarBotao(640, 420, this.t.arsenal, () => this.irParaLoja()),
            this.criarBotao(640, 475, this.t.menu, () => this.irParaMenu()),
            this.criarBotao(640, 530, this.t.telaCheia, () => this.alternarTelaCheia())
        ];

        this.add.text(640, 620, this.t.dica, {
            fontFamily: '"Courier New", monospace',
            fontSize: '13px',
            color: '#7f97a6'
        }).setOrigin(0.5);

        this.add.rectangle(640, 360, 1, 720, 0x36e8ff, 0.08);
        this.add.rectangle(640, 360, 1280, 1, 0x36e8ff, 0.08);

        this.input.keyboard.on('keydown-ESC', () => this.continuar());
        this.input.keyboard.on('keydown-P', () => this.continuar());
        this.input.keyboard.on('keydown-UP', () => this.moverSelecao(-1));
        this.input.keyboard.on('keydown-W', () => this.moverSelecao(-1));
        this.input.keyboard.on('keydown-DOWN', () => this.moverSelecao(1));
        this.input.keyboard.on('keydown-S', () => this.moverSelecao(1));
        this.input.keyboard.on('keydown-ENTER', () => this.ativarSelecionado());
        this.input.keyboard.on('keydown-SPACE', () => this.ativarSelecionado());

        this.selecionarBotao(0);
        this.tweens.add({
            targets: [painel, titulo, subtitulo, linhaTopo, linhaBaixo, ...this.botoes],
            alpha: { from: 0, to: 1 },
            duration: 180,
            ease: 'Sine.easeOut'
        });
    }

    criarBotao(x, y, label, acao) {
        const botao = this.add.text(x, y, label, {
            fontFamily: '"Courier New", monospace',
            fontSize: '23px',
            color: '#c9d8df',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        botao.acao = acao;
        botao.on('pointerover', () => this.selecionarBotao(this.botoes.indexOf(botao)));
        botao.on('pointerdown', () => this.executarAcao(botao));
        return botao;
    }

    selecionarBotao(index) {
        if (!this.botoes?.length) return;
        this.indiceSelecionado = Phaser.Math.Wrap(index, 0, this.botoes.length);
        this.botoes.forEach((botao, i) => {
            const selecionado = i === this.indiceSelecionado;
            botao.setStyle({ color: selecionado ? '#ffffff' : '#c9d8df' });
            botao.setShadow(0, 0, selecionado ? '#00e5ff' : '#000000', selecionado ? 18 : 0);
            botao.setScale(selecionado ? 1.1 : 1);
        });
    }

    moverSelecao(delta) {
        this.selecionarBotao(this.indiceSelecionado + delta);
    }

    ativarSelecionado() {
        this.executarAcao(this.botoes[this.indiceSelecionado]);
    }

    executarAcao(botao) {
        if (this.menuTravado || !botao?.acao) return;
        botao.acao();
    }

    continuar() {
        if (this.menuTravado) return;
        this.menuTravado = true;
        const fase = this.scene.get('CenaFase');
        this.scene.resume('CenaFase');
        if (fase?.retomarDaPausa) fase.retomarDaPausa();
        this.scene.stop();
    }

    finalizarFasePausada() {
        const fase = this.scene.get('CenaFase');
        if (fase?.encerrarCenaPelaPausa) fase.encerrarCenaPelaPausa();
        this.scene.stop('CenaFase');
    }

    reiniciar() {
        if (this.menuTravado) return;
        this.menuTravado = true;
        this.finalizarFasePausada();
        this.scene.start('CenaCarregamento', {
            planetaDestino: this.idFase,
            cicloAtual: this.cicloAtual,
            primeiraEntrada: false
        });
    }

    irParaLoja() {
        if (this.menuTravado) return;
        this.menuTravado = true;
        this.finalizarFasePausada();
        this.scene.start('CenaLoja', {
            planetaDestino: this.idFase,
            cicloAtual: this.cicloAtual
        });
    }

    irParaMenu() {
        if (this.menuTravado) return;
        this.menuTravado = true;
        this.finalizarFasePausada();
        this.scene.start('MenuInicial', { abrirSelecaoFases: true });
    }

    alternarTelaCheia() {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
    }

    update(time) {
        const pad = this.input.gamepad?.pad1;
        if (!pad?.connected || time - this.ultimoInputGamepad < 210) return;

        if (pad.down || pad.leftStick.y > 0.45) {
            this.moverSelecao(1);
            this.ultimoInputGamepad = time;
        } else if (pad.up || pad.leftStick.y < -0.45) {
            this.moverSelecao(-1);
            this.ultimoInputGamepad = time;
        } else if (pad.A || pad.start) {
            this.ativarSelecionado();
            this.ultimoInputGamepad = time;
        } else if (pad.B) {
            this.continuar();
            this.ultimoInputGamepad = time;
        }
    }
}
