class MenuInicial extends Phaser.Scene {
    constructor() {
        super('MenuInicial');
    }

    init(data) {
        this.abrirSelecaoFasesDireto = !!(data && data.abrirSelecaoFases);
    }

    preload() {
        this.load.video('videoEspaco', 'assets/ui/fundo_menu.webm', 'loadeddata', false, true);
        this.load.audio('temaMenu', 'assets/audio/tema_menu.mp3');

        this.load.image('thumb_fase1', 'assets/cenarios/fundo_realista.webp');
        this.load.image('thumb_fase2', 'assets/cenarios/fundo4.jpeg');
        this.load.image('thumb_fase3', 'assets/cenarios/fundo_fase4.jpeg');
        this.load.image('thumb_fase4', 'assets/cenarios/fundo_deserto.jpeg');
        this.load.image('menu_1', 'assets/ui/1.webp');
        this.load.image('menu_2', 'assets/ui/2.webp');
        this.load.image('menu_3', 'assets/ui/3.webp');
        this.load.image('menu_4', 'assets/ui/4.webp');
    }

    create() {
        this.input.setPollAlways();
        this.menuTravado = false;

        this.idiomaAtual = localStorage.getItem('idioma_jogo') || 'PT';

        const dic = {
            PT: {
                subtitulo: 'DEFENDER O SETOR',
                btnNovo: '> INICIAR NOVA JORNADA <',
                escolhaSetor: 'ESCOLHA O SETOR DE DESEMBARQUE',
                resumoSetor: 'Selecione a zona de operacao e siga para o arsenal antes da descida.',
                voltar: '< VOLTAR PARA O MENU <',
                telaCheia: '[ F ] TELA CHEIA',
                fase1: 'SETOR 01: FLORESTA',
                fase2: 'SETOR 02: GELO',
                fase3: 'SETOR 03: VULCAO',
                fase4: 'SETOR 04: SOLAR',
                disponivel: 'DISPONIVEL',
                bloqueado: '[ BLOQUEADO ]'
            },
            EN: {
                subtitulo: 'DEFEND THE SECTOR',
                btnNovo: '> START NEW JOURNEY <',
                escolhaSetor: 'CHOOSE DROP SECTOR',
                resumoSetor: 'Pick the operation zone and move to the arsenal before deployment.',
                voltar: '< BACK TO MENU <',
                telaCheia: '[ F ] FULLSCREEN',
                fase1: 'SECTOR 01: FOREST',
                fase2: 'SECTOR 02: ICE',
                fase3: 'SECTOR 03: VOLCANO',
                fase4: 'SECTOR 04: SOLAR',
                disponivel: 'AVAILABLE',
                bloqueado: '[ LOCKED ]'
            }
        };

        let t = dic[this.idiomaAtual];

        let chavesFundo = ['menu_1', 'menu_2', 'menu_3', 'menu_4'];
        let bgAtual = 0;

        let bgTraseiro = this.add.image(640, 360, chavesFundo[0]).setAlpha(0.5).setDepth(-10);
        let bgFrontal = this.add.image(640, 360, chavesFundo[1]).setAlpha(0).setDepth(-9);

        const aplicarZoom = (alvo) => {
            alvo.setScale(1);
            this.tweens.add({ targets: alvo, scale: 1.15, duration: 12000, ease: 'Sine.easeInOut' });
        };

        aplicarZoom(bgTraseiro);

        this.time.addEvent({
            delay: 6000,
            loop: true,
            callback: () => {
                bgAtual = (bgAtual + 1) % chavesFundo.length;
                bgFrontal.setTexture(chavesFundo[bgAtual]);
                aplicarZoom(bgFrontal);

                this.tweens.add({
                    targets: bgFrontal,
                    alpha: 0.5,
                    duration: 2000,
                    onComplete: () => {
                        bgTraseiro.setTexture(chavesFundo[bgAtual]);
                        bgTraseiro.setScale(bgFrontal.scaleX);
                        bgFrontal.setAlpha(0);
                    }
                });
            }
        });

        let musicaFundo = this.sound.add('temaMenu', { volume: 0.4, loop: true });
        musicaFundo.play();

        let titulo = this.add.text(640, 150, 'NOVA HORIZON', {
            fontFamily: '"Impact", sans-serif',
            fontSize: '76px',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 0, color: '#00aaff', blur: 25, stroke: true, fill: true }
        }).setOrigin(0.5);

        this.tweens.add({ targets: titulo, y: 140, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        let subtitulo = this.add.text(640, 230, t.subtitulo, {
            fontFamily: '"Courier New", monospace',
            fontSize: '22px',
            color: '#ff3333',
            letterSpacing: 8,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({ targets: subtitulo, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        const criarBotao = (x, y, texto, corPadrao, corBrilho, tamanhoFonte) => {
            let btn = this.add.text(x, y, texto, {
                fontFamily: '"Courier New", monospace',
                fontSize: tamanhoFonte,
                color: corPadrao,
                fontStyle: 'bold'
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerover', () => {
                btn.setStyle({ color: '#ffffff' });
                btn.setShadow(0, 0, corBrilho, 20);
                this.tweens.add({ targets: btn, scaleX: 1.12, scaleY: 1.12, duration: 150 });
            });

            btn.on('pointerout', () => {
                btn.setStyle({ color: corPadrao });
                btn.setShadow(0, 0, corBrilho, 0);
                this.tweens.add({ targets: btn, scaleX: 1.0, scaleY: 1.0, duration: 150 });
            });

            return btn;
        };

        let menuPrincipal = this.add.container(0, 0);
        let menuFases = this.add.container(0, 0).setVisible(false);

        let destaqueJornada = this.add.rectangle(640, 500, 520, 118, 0x050d16, 0.68)
            .setStrokeStyle(2, 0x00dfff, 0.35);
        let linhaJornada = this.add.rectangle(640, 442, 280, 3, 0x00ffff, 0.85);
        let btnNovoJogo = criarBotao(640, 500, t.btnNovo, '#d7dde2', '#00ffff', '30px');

        menuPrincipal.add([destaqueJornada, linhaJornada, btnNovoJogo]);

        let painelFases = this.add.rectangle(640, 415, 1120, 500, 0x020611, 0.74)
            .setStrokeStyle(2, 0x00d8ff, 0.35);
        let brilhoPainel = this.add.rectangle(640, 187, 520, 3, 0x00ffff, 0.85);
        let textoSetores = this.add.text(640, 145, t.escolhaSetor, {
            fontFamily: '"Courier New", monospace',
            fontSize: '24px',
            fill: '#00ffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        let resumoSetores = this.add.text(640, 188, t.resumoSetor, {
            fontFamily: '"Courier New", monospace',
            fontSize: '15px',
            fill: '#a7c7d8'
        }).setOrigin(0.5);

        const modoTestePublisher = true;
        const nivelLiberadoSalvo = parseInt(localStorage.getItem('fase_liberada'), 10);
        let nivelLiberado = modoTestePublisher
            ? 99
            : (Number.isFinite(nivelLiberadoSalvo) ? nivelLiberadoSalvo : 1);

        const criarCardFase = (posX, posY, chaveImg, tituloFase, nivelNecessario, planetaNome, ciclo) => {
            let liberada = nivelLiberado >= nivelNecessario;
            let container = this.add.container(posX, posY);
            container.setScale(0.88);

            let fundoCard = this.add.rectangle(0, 0, 320, 220, 0x06111d, 0.92)
                .setStrokeStyle(2, liberada ? 0x00e5ff : 0x803344, 0.95);
            let faixaSuperior = this.add.rectangle(0, -90, 318, 30, 0x081827, 0.95);
            let miniaturaFrame = this.add.rectangle(0, -18, 292, 132, 0x000000, 0.22)
                .setStrokeStyle(1, liberada ? 0x00ffff : 0x662233, 0.65);
            let miniatura = this.add.image(0, -18, chaveImg).setDisplaySize(284, 124);
            if (!liberada) miniatura.setTint(0x333333);

            let txtIndice = this.add.text(-126, -90, `0${nivelNecessario}`, {
                fontFamily: '"Courier New", monospace',
                fontSize: '16px',
                fill: liberada ? '#7ef9ff' : '#ff7788',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            let txt = this.add.text(0, 70, tituloFase, {
                fontFamily: '"Courier New", monospace',
                fontSize: '18px',
                fill: liberada ? '#ffffff' : '#b17584',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);

            let badgeStatus = this.add.rectangle(0, 100, 168, 26, liberada ? 0x00ffff : 0x551122, liberada ? 0.12 : 0.22)
                .setStrokeStyle(1, liberada ? 0x00ffff : 0xaa3344, 0.8);
            let txtStatus = this.add.text(0, 100, liberada ? t.disponivel : t.bloqueado, {
                fontFamily: '"Courier New", monospace',
                fontSize: '14px',
                fill: liberada ? '#7ef9ff' : '#ff6677',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            container.add([fundoCard, faixaSuperior, miniaturaFrame, miniatura, txtIndice, txt, badgeStatus, txtStatus]);

            if (liberada) {
                container.setSize(320, 220);
                container.setInteractive();

                container.on('pointerover', () => {
                    this.tweens.add({ targets: container, scale: 0.94, duration: 150 });
                    fundoCard.setFillStyle(0x0b1e2f, 0.98);
                    miniaturaFrame.setFillStyle(0x051018, 0.45);
                });

                container.on('pointerout', () => {
                    this.tweens.add({ targets: container, scale: 0.88, duration: 150 });
                    fundoCard.setFillStyle(0x06111d, 0.92);
                    miniaturaFrame.setFillStyle(0x000000, 0.22);
                });

                container.on('pointerdown', () => {
                    if (this.menuTravado) return;
                    this.menuTravado = true;
                    this.iniciarFaseEspecifica(planetaNome, ciclo, musicaFundo);
                });
            }

            return container;
        };

        let cardFase1 = criarCardFase(470, 315, 'thumb_fase1', t.fase1, 1, 'fase_1', 1);
        let cardFase2 = criarCardFase(810, 315, 'thumb_fase2', t.fase2, 2, 'fase_2', 2);
        let cardFase3 = criarCardFase(470, 540, 'thumb_fase3', t.fase3, 3, 'fase_3', 3);
        let cardFase4 = criarCardFase(810, 540, 'thumb_fase4', t.fase4, 4, 'fase_4', 4);

        let btnVoltar = criarBotao(640, 676, t.voltar, '#ff6666', '#ff0000', '20px');

        let btnTelaCheia = this.add.text(1260, 700, t.telaCheia, {
            fontFamily: '"Courier New", monospace',
            fontSize: '16px',
            fill: '#8888aa',
            fontStyle: 'bold'
        }).setOrigin(1, 1).setInteractive();

        btnTelaCheia.on('pointerover', () => btnTelaCheia.setStyle({ fill: '#00ffff' }));
        btnTelaCheia.on('pointerout', () => btnTelaCheia.setStyle({ fill: '#8888aa' }));
        btnTelaCheia.on('pointerdown', () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen();
            else this.scale.startFullscreen();
        });

        this.input.keyboard.addKey('F').on('down', () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen();
            else this.scale.startFullscreen();
        });

        let corAtiva = '#00ffff';
        let corInativa = '#555555';

        let btnPT = this.add.text(1180, 30, 'PT-BR', {
            fontFamily: '"Courier New", monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            fill: this.idiomaAtual === 'PT' ? corAtiva : corInativa
        }).setOrigin(1, 0).setInteractive();

        this.add.text(1200, 30, '|', { fontSize: '18px', fill: '#555555' }).setOrigin(0.5, 0);

        let btnEN = this.add.text(1260, 30, 'EN', {
            fontFamily: '"Courier New", monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            fill: this.idiomaAtual === 'EN' ? corAtiva : corInativa
        }).setOrigin(1, 0).setInteractive();

        const trocarIdioma = (novoIdioma) => {
            if (this.menuTravado) return;
            if (this.idiomaAtual !== novoIdioma) {
                this.menuTravado = true;
                localStorage.setItem('idioma_jogo', novoIdioma);
                this.scene.restart({
                    abrirSelecaoFases: menuFases.visible
                });
            }
        };

        btnPT.on('pointerdown', () => trocarIdioma('PT'));
        btnEN.on('pointerdown', () => trocarIdioma('EN'));

        btnPT.on('pointerover', () => { if (this.idiomaAtual !== 'PT') btnPT.setStyle({ fill: '#ffffff' }); });
        btnPT.on('pointerout', () => { if (this.idiomaAtual !== 'PT') btnPT.setStyle({ fill: corInativa }); });
        btnEN.on('pointerover', () => { if (this.idiomaAtual !== 'EN') btnEN.setStyle({ fill: '#ffffff' }); });
        btnEN.on('pointerout', () => { if (this.idiomaAtual !== 'EN') btnEN.setStyle({ fill: corInativa }); });

        const atualizarBotoesSelecao = () => {
            this.botoesAtivos = [cardFase1];
            if (nivelLiberado >= 2) this.botoesAtivos.push(cardFase2);
            if (nivelLiberado >= 3) this.botoesAtivos.push(cardFase3);
            if (nivelLiberado >= 4) this.botoesAtivos.push(cardFase4);
            this.botoesAtivos.push(btnVoltar, btnTelaCheia, btnPT, btnEN);
        };

        const limparFocoAtual = () => {
            if (this.botaoFocadoAtual) {
                this.botaoFocadoAtual.emit('pointerout');
                this.botaoFocadoAtual = null;
            }
        };

        const abrirSelecaoFases = () => {
            if (this.menuTravado) return;
            menuPrincipal.setVisible(false);
            menuFases.setVisible(true);
            limparFocoAtual();
            atualizarBotoesSelecao();
        };

        const voltarAoMenuPrincipal = () => {
            menuFases.setVisible(false);
            menuPrincipal.setVisible(true);
            limparFocoAtual();
            this.botoesAtivos = [btnNovoJogo, btnTelaCheia, btnPT, btnEN];
        };

        btnNovoJogo.on('pointerdown', abrirSelecaoFases);
        btnVoltar.on('pointerdown', voltarAoMenuPrincipal);

        menuFases.add([
            painelFases,
            brilhoPainel,
            textoSetores,
            resumoSetores,
            cardFase1,
            cardFase2,
            cardFase3,
            cardFase4,
            btnVoltar
        ]);

        this.botoesAtivos = [btnNovoJogo, btnTelaCheia, btnPT, btnEN];

        if (this.abrirSelecaoFasesDireto) {
            abrirSelecaoFases();
        }

        this.cursorVirtual = this.add.graphics();
        this.cursorVirtual.fillStyle(0xffffff, 1);
        this.cursorVirtual.lineStyle(2, 0x00ffff, 1);
        this.cursorVirtual.beginPath();
        this.cursorVirtual.moveTo(0, 0);
        this.cursorVirtual.lineTo(15, 5);
        this.cursorVirtual.lineTo(5, 15);
        this.cursorVirtual.closePath();
        this.cursorVirtual.fillPath();
        this.cursorVirtual.strokePath();

        this.cursorVirtual.setDepth(9999);
        this.cursorX = 640;
        this.cursorY = 360;
        this.botaoFocadoAtual = null;
        this.tempoUltimoClique = 0;
    }

    update(time) {
        if (this.menuTravado || this.lojaTravada) return;

        let pad = (this.input.gamepad && this.input.gamepad.pad1) ? this.input.gamepad.pad1 : null;

        if (!pad || !pad.connected) {
            if (this.cursorVirtual) this.cursorVirtual.setVisible(false);
            return;
        }

        this.cursorVirtual.setVisible(true);

        let velocidadeCursor = 12;
        let eixoX = pad.leftStick.x;
        let eixoY = pad.leftStick.y;

        if (Math.abs(eixoX) > 0.1) this.cursorX += eixoX * velocidadeCursor;
        if (Math.abs(eixoY) > 0.1) this.cursorY += eixoY * velocidadeCursor;

        this.cursorX = Phaser.Math.Clamp(this.cursorX, 0, 1280);
        this.cursorY = Phaser.Math.Clamp(this.cursorY, 0, 720);

        this.cursorVirtual.setPosition(this.cursorX, this.cursorY);

        let encostouEmAlgo = false;

        for (let i = 0; i < this.botoesAtivos.length; i++) {
            let botao = this.botoesAtivos[i];
            let limites = botao.getBounds();

            if (Phaser.Geom.Rectangle.Contains(limites, this.cursorX, this.cursorY)) {
                encostouEmAlgo = true;

                if (this.botaoFocadoAtual !== botao) {
                    if (this.botaoFocadoAtual) this.botaoFocadoAtual.emit('pointerout');
                    this.botaoFocadoAtual = botao;
                    this.botaoFocadoAtual.emit('pointerover');
                }
                break;
            }
        }

        if (!encostouEmAlgo && this.botaoFocadoAtual) {
            this.botaoFocadoAtual.emit('pointerout');
            this.botaoFocadoAtual = null;
        }

        let confirmou = pad.A;

        if (confirmou && this.botaoFocadoAtual && time - this.tempoUltimoClique > 300) {
            this.botaoFocadoAtual.emit('pointerdown');
            this.tempoUltimoClique = time;
            this.tweens.add({ targets: this.cursorVirtual, scale: 0.7, duration: 50, yoyo: true });
        }
    }

    iniciarFaseEspecifica(planeta, ciclo, musicaFundo) {
        this.tweens.add({ targets: musicaFundo, volume: 0, duration: 1000 });
        this.cameras.main.fadeOut(1000, 0, 0, 0, (cam, pct) => {
            if (pct === 1) {
                musicaFundo.stop();
                this.scene.start('CenaLoja', { planetaDestino: planeta, cicloAtual: ciclo });
            }
        });
    }
}
