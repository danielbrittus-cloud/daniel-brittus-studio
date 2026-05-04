class CenaLoja extends Phaser.Scene {
    constructor() {
        super('CenaLoja');
    }

    init(data) {
        this.planetaDestino = data.planetaDestino || 'fase_1';
        this.cicloAtual = data.cicloAtual || 1;
        this.menuTravado = false; 
    }

    preload() {
        this.load.image('fundo_arsenal', 'assets/cenarios/fundo_arsenal.jpeg');
        this.load.image('astro_padrao', 'assets/ui/astro_padrao.png');
        this.load.image('astro_fuzil', 'assets/ui/astro_fuzil.png');
        this.load.image('astro_canhao', 'assets/ui/astro_canhao.png');
        this.load.image('arma_padrao', 'assets/ui/icone_padrao.jpg');
        this.load.image('arma_fuzil', 'assets/ui/icone_fuzil.png');
        this.load.image('arma_canhao', 'assets/ui/icone_canhao.png');
    }

    create() {
        this.lojaTravada = false; // <-- ADICIONE ISSO AQUI NO COMEÇO!
        // ---> A LINHA MÁGICA QUE FOI APAGADA VOLTOU AQUI: <---
        this.input.setPollAlways();
        
        // ... (resto do seu código da loja)
        // --- SISTEMA DE IDIOMAS (DICIONÁRIO DA LOJA) ---
        this.idiomaAtual = localStorage.getItem('idioma_jogo') || 'PT';
        
        const dic = {
            'PT': {
                titulo: '[ ARSENAL // CAÇADOR ]',
                btnIniciar: '[ INICIAR CAÇADA ]',
                nomePadrao: 'Pistola Básica',
                nomeFuzil: 'Fuzil de Plasma',
                nomeCanhao: 'Canhão Escopeta',
                equipada: '[ EQUIPADA ]',
                equipar: '[ EQUIPAR ]'
            },
            'EN': {
                titulo: '[ HUNTER // ARSENAL ]',
                btnIniciar: '[ START HUNT ]',
                nomePadrao: 'Basic Pistol',
                nomeFuzil: 'Plasma Rifle',
                nomeCanhao: 'Shotgun Cannon',
                equipada: '[ EQUIPPED ]',
                equipar: '[ EQUIP ]'
            }
        };
        // Guarda o dicionário na classe para a função criarCardMinimalista conseguir ler
        this.t = dic[this.idiomaAtual]; 


        // --- BANCO DE DADOS LOCAL ---
        this.moedas = parseInt(localStorage.getItem('conta_bancaria')) || 0;
        let compradasStr = localStorage.getItem('armas_compradas') || 'padrao';
        this.armasCompradas = compradasStr.split(',');
        this.armaEquipada = localStorage.getItem('arma_equipada') || 'padrao';

        // --- O CATÁLOGO DE ARMAS (AGORA TRADUZIDO) ---
        this.catalogo = {
            'padrao': { nome: this.t.nomePadrao, preco: 0, icone: 'arma_padrao', pose: 'astro_padrao' },
            'fuzil': { nome: this.t.nomeFuzil, preco: 1500, icone: 'arma_fuzil', pose: 'astro_fuzil' },
            'canhao': { nome: this.t.nomeCanhao, preco: 4500, icone: 'arma_canhao', pose: 'astro_canhao' }
        };

        this.add.image(0, 0, 'fundo_arsenal').setOrigin(0, 0).setAlpha(0.6).setScale(1.0); 

        let arteInicial = this.catalogo[this.armaEquipada].pose;
        this.personagem = this.add.image(350, 400, arteInicial).setScale(0.4);
        this.tweens.add({ targets: this.personagem, y: 380, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.add.text(50, 40, this.t.titulo, { fontSize: '24px', fill: '#ffffff', fontStyle: 'light', letterSpacing: 2 });
        this.textoGrana = this.add.text(50, 80, `$ ${this.moedas}`, { fontSize: '32px', fill: '#ffff00', fontStyle: 'bold' });

        // --- SISTEMA DE BOTÕES ---
        this.botoesInterativos = []; 

        let startX = 900;
        let startY = 200; 
        let cardHeight = 150; 

        Object.keys(this.catalogo).forEach((chave) => {
            let areaClique = this.criarCardMinimalista(startX, startY, chave, this.catalogo[chave]);
            this.botoesInterativos.push(areaClique); 
            startY += cardHeight;
        });

        // Botão de jogar puxando a tradução
        let btnJogar = this.add.text(1200, 50, this.t.btnIniciar, { 
            fontSize: '20px', fill: '#ff4444', fontStyle: 'bold' 
        }).setOrigin(1, 0.5).setInteractive();
            
        btnJogar.on('pointerdown', () => {
            this.menuTravado = true;
            if (this.lojaTravada) return; 
            this.scene.start('CenaCarregamento', { planetaDestino: this.planetaDestino, cicloAtual: this.cicloAtual }); 
        });

        this.botoesInterativos.push(btnJogar); 

        // --- O NOVO CURSOR VIRTUAL (MIRA DO CONTROLE) ---
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

        this.atualizarArmaNoPersonagem(); 
    }

    // --- A MÁGICA ACONTECE AQUI NO UPDATE ---
    update(time) {
        if (this.menuTravado || this.lojaTravada) return; 

        // SUBSTITUA A LINHA DO PAD POR ESTA "BLINDADA":
        let pad = (this.input.gamepad && this.input.gamepad.pad1) ? this.input.gamepad.pad1 : null;
        
        if (!pad || !pad.connected) {
            if (this.cursorVirtual) this.cursorVirtual.setVisible(false);
            return;
        }
        // ... resto do movimento do cursor ou do jogador

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

        for (let i = 0; i < this.botoesInterativos.length; i++) {
            let botao = this.botoesInterativos[i];
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

    criarCardMinimalista(x, y, chave, dados) {
        let jaTem = this.armasCompradas.includes(chave);
        let estaEquipada = this.armaEquipada === chave;

        let container = this.add.container(x, y);

        let corBorda = estaEquipada ? 0x00ff00 : (jaTem ? 0x888888 : 0xaaaaaa);
        let fundoCard = this.add.rectangle(0, 0, 400, 100, 0x111122)
            .setOrigin(0.5)
            .setAlpha(0.2) 
            .setStrokeStyle(1, corBorda, 0.8) 
            .setInteractive(); 

        let imagemArma = this.add.image(-140, 0, dados.icone).setScale(0.6);
        let textoNome = this.add.text(-60, -15, dados.nome, { fontSize: '22px', fill: '#ffffff', fontStyle: 'light' });
        
        // TRADUÇÃO DOS ESTADOS DA ARMA (Equipada / Equipar)
        let precoTexto = estaEquipada ? this.t.equipada : jaTem ? this.t.equipar : `$ ${dados.preco}`;
        let corPreco = estaEquipada ? '#00ff00' : jaTem ? '#ffffff' : '#ffaa00';
        let textoPreco = this.add.text(-60, 15, precoTexto, { fontSize: '18px', fill: corPreco, fontStyle: 'bold' });

        container.add([fundoCard, imagemArma, textoNome, textoPreco]);

        fundoCard.on('pointerover', () => {
            fundoCard.setAlpha(0.5); 
            this.tweens.add({ targets: container, x: x + 10, duration: 100, ease: 'Power2' }); 
        });

        fundoCard.on('pointerout', () => {
            fundoCard.setAlpha(0.2); 
            this.tweens.add({ targets: container, x: x, duration: 100, ease: 'Power2' }); 
        });

        fundoCard.on('pointerdown', () => {
            if (this.armasCompradas.includes(chave)) {
                this.armaEquipada = chave;
                localStorage.setItem('arma_equipada', chave);
                this.scene.restart({
                    planetaDestino: this.planetaDestino,
                    cicloAtual: this.cicloAtual
                }); 
            } else {
                if (this.moedas >= dados.preco) {
                    this.moedas -= dados.preco;
                    localStorage.setItem('conta_bancaria', this.moedas);
                    
                    this.armasCompradas.push(chave);
                    localStorage.setItem('armas_compradas', this.armasCompradas.join(','));
                    
                    this.armaEquipada = chave;
                    localStorage.setItem('arma_equipada', chave);
                    
                    this.scene.restart({
                        planetaDestino: this.planetaDestino,
                        cicloAtual: this.cicloAtual
                    }); 
                } else {
                    this.cameras.main.shake(200, 0.01);
                }
            }
        });

        return fundoCard; 
    }

    atualizarArmaNoPersonagem() {
        let chaveNovaArte = this.catalogo[this.armaEquipada].pose;
        this.personagem.setTexture(chaveNovaArte);
        this.personagem.clearTint(); 
    }
}
