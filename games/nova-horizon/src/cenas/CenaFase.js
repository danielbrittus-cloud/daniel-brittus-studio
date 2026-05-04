class CenaFase extends Phaser.Scene {
    constructor() {
        super('CenaFase');
    }

    init(data) {
        this.cicloAtual = data.cicloAtual || 1;
        this.moedas = parseInt(localStorage.getItem('conta_bancaria')) || 0; 
        this.pontuacao = data.pontuacao || 0;
        this.primeiraEntrada = data.primeiraEntrada !== false; 
        
        // Pega o nome do arquivo que a Loja ou o Menu mandou!
        this.idFase = data.planetaDestino || 'fase_1'; 

        // === A CURA DO ZUMBI: Reseta todas as travas toda vez que a fase inicia! ===
        this.venceuFase = false;
        this.jogadorEstaVivo = true;
        this.controlesTravados = false;
        // =========================================================================
    }

    preload() {
        this.chaveMapaAtual = `dados_mapa_${this.idFase}`;
        return;

        // Carrega o DNA da fase atual
        this.load.json(this.chaveMapaAtual, `assets/mapas/${this.idFase}.json`);
        
        this.load.image('tiro_padrao', 'assets/ui/tiro_padrao.png');
        this.load.image('tiro_fuzil', 'assets/ui/tiro_fuzil.png');
        this.load.image('tiro_canhao', 'assets/ui/tiro_canhao.png');
        
        this.load.atlas('astronauta', 'assets/personagens/atlas_astro.png', 'assets/personagens/atlas_astro.json');
        this.load.json('dados_atlas', 'assets/personagens/atlas_astro.json');
        
        this.load.atlas('alien_comum', 'assets/personagens/atlas_alien_comum.png', 'assets/personagens/atlas_alien_comum.json');
        this.load.atlas('alien_veloz', 'assets/personagens/atlas_alien_veloz.png', 'assets/personagens/atlas_alien_veloz.json');
        this.load.atlas('alien_tanque', 'assets/personagens/atlas_alien_tanque.png', 'assets/personagens/atlas_alien_tanque.json');
        this.load.atlas('yeti', 'assets/personagens/atlas_yeti.png', 'assets/personagens/atlas_yeti.json');

        // ---> CORREÇÃO DO CRASH DA FASE 2: TRAVA DO PLUGIN <---
        if (!this.registry.get('joystick_carregado')) {
            this.load.plugin('rexvirtualjoystickplugin', 'rexvirtualjoystickplugin.min.js', true);
            this.registry.set('joystick_carregado', true);
        }
        
        this.load.image('braco_padrao', 'assets/personagens/braco_padrao.png');
        this.load.image('braco_fuzil', 'assets/personagens/braco_fuzil.png');
        this.load.image('braco_canhao', 'assets/personagens/braco_canhao.png'); 
        this.load.image('nave_resgate', 'assets/cenarios/nave_resgate.png');

        this.load.audio('som_tiro', 'assets/audio/tiro.mp3');
        this.load.audio('som_passos', 'assets/audio/passos.mp3');
        this.load.audio('som_chuva', 'assets/audio/chuva.mp3'); 
        this.load.audio('som_alien_morte', 'assets/audio/alien_morte.mp3');
        this.load.audio('som_alien_grito', 'assets/audio/alien_grito.mp3'); 
        this.load.audio('aviso_chuva', 'assets/audio/aviso_chuva.mp3'); 
        this.load.audio('aviso_neve', 'assets/audio/aviso_neve.mp3');
        this.load.audio('fita_gelo', 'assets/audio/fita_gelo.mp3');

        this.load.audio('musica_fase_1', 'assets/audio/musica_fase_1.mp3');
        this.load.audio('musica_fase_2', 'assets/audio/musica_fase_2.mp3');
        this.load.audio('musica_fase_3', 'assets/audio/musica_fase_3.mp3'); 
        this.load.audio('musica_fase_4', 'assets/audio/musica_fase_4.mp3');

        this.load.image('capacete_trincado', 'assets/ui/capacete_trincado.png');
    }

    create() {
        if (!this.registry.get(`fase_pronta_${this.idFase}`) || !this.cache.json.get(this.chaveMapaAtual)) {
            this.scene.start('CenaCarregamento', {
                ...this.scene.settings.data,
                planetaDestino: this.idFase,
                cicloAtual: this.cicloAtual,
                primeiraEntrada: this.primeiraEntrada
            });
            return;
        }

        let mapaRaw = this.cache.json.get(this.chaveMapaAtual);
        if (!mapaRaw) return; 
        
        // A MÁGICA: Fazemos uma cópia profunda (Deep Clone) desvinculada do cache original!
        let mapa = JSON.parse(JSON.stringify(mapaRaw));
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruirFundoVideo());
        const aliensConfigDaFase = Array.isArray(mapa.aliensConfig) ? mapa.aliensConfig : Object.values(mapa.aliensConfig || {});
        this.aliensConfigDaFase = aliensConfigDaFase;
        this.aliensCustomizados = new Map(aliensConfigDaFase.map(alien => [alien.id, alien]));

        let assetsFaltando = (mapa.assetsParaCarregar || []).filter(asset => {
            if (asset.tipo === 'atlas' || asset.tipo === 'image') {
                return !this.textures.exists(asset.chave);
            }
            return false;
        });

        if (assetsFaltando.length > 0) {
            assetsFaltando.forEach(asset => {
                if (asset.tipo === 'image') this.load.image(asset.chave, asset.caminho);
                if (asset.tipo === 'atlas') this.load.atlas(asset.chave, asset.caminho, asset.caminhoJson);
            });

            this.load.once('complete', () => {
                this.registry.set('assets_baixados_' + this.idFase, true);
                this.scene.restart(this.scene.settings.data); 
            });

            this.load.start();
            return; 
        }
        
        this.nomeFase = mapa.nomeFase || "Setor Desconecido";
        this.nomeBioma = mapa.bioma || "floresta";
        this.trilhaFase = mapa.musica || "musica_fase_1";
        this.usarLanterna = mapa.usarLanterna !== false;
        this.perfilVisualBioma = this.construirPerfilVisualBioma();
        this.configurarPerfilDesempenho();

        // NOVO: Recebe a taxa de dano do Editor (se vier vazio, usa 0.20)
        this.taxaDanoTempestade = mapa.danoClima !== undefined ? mapa.danoClima : 0.20;

        this.chaoFisico = this.physics.add.staticGroup();
        this.zonasDanoGroup = this.physics.add.staticGroup();
        this.gatilhosGroup = this.physics.add.staticGroup();
        this.zonasSegurasGroup = this.physics.add.staticGroup(); 
        
        this.spawnsOcultos = []; 
        this.hordaFinalAtivada = false;
        this.tiposAlienHordaFinal = this.obterTiposAlienPermitidosNaFase(mapa);

        this.idiomaAtual = localStorage.getItem('idioma_jogo') || 'PT';
        const dic = {
            'PT': { labelCreditos: 'CRÉDITOS:', labelProgresso: 'CONCLUSÃO DA MISSÃO:', avisoInvasao: 'INVASÃO INICIADA\nCAÇADA AUTORIZADA', avisoHorda: 'SINAL DE RESGATE\nSOBREVIVA À HORDA FINAL', morteTitulo: 'SINAL VITAL PERDIDO', morteReiniciar: '> REINICIAR SETOR <', morteLoja: '> ACESSAR LOJA <' },
            'EN': { labelCreditos: 'CREDITS:', labelProgresso: 'MISSION PROGRESS:', avisoInvasao: 'INVASION STARTED\nHUNT AUTHORIZED', avisoHorda: 'RESCUE SIGNAL\nSURVIVE THE FINAL HORDE', morteTitulo: 'VITAL SIGN LOST', morteReiniciar: '> RESTART SECTOR <', morteLoja: '> ACCESS SHOP <' }
        };
        this.t = dic[this.idiomaAtual];

        this.perigoAcumulado = 0;   
        this.emAreaSegura = false;  
        this.climaAtivo = false;    

        let configPerigo = {
            'floresta': { titulo: 'TOXICIDADE DO TRAJE:', cor: 0x00ff00 },
            'gelo': { titulo: 'TEMPERATURA CORPORAL:', cor: 0x00ffff },
            'vulcao': { titulo: 'NÍVEL DE SUPERAQUECIMENTO:', cor: 0xff4400 },
            'solar': { titulo: 'DANOS NO TRAJE (AREIA):', cor: 0xffaa00 },
            'mar': { titulo: 'RESERVA DE OXIGÊNIO:', cor: 0x0088ff }
        };
        let cPerigo = configPerigo[this.nomeBioma] || configPerigo['floresta'];

        this.elementosHUD = [];
        this.registrarElementoHUD(this.add.text(40, 30, this.nomeFase, { fontSize: '14px', fill: '#8888aa', letterSpacing: 3 }).setDepth(2000), 40, 30);
        this.registrarElementoHUD(this.add.text(40, 55, cPerigo.titulo, { fontSize: '10px', fill: '#ffffff', letterSpacing: 1 }).setDepth(2000), 40, 55);
        this.registrarElementoHUD(this.add.rectangle(40, 75, 200, 8, 0x001122).setOrigin(0, 0.5).setDepth(2000), 40, 75);
        this.barraPerigo = this.registrarElementoHUD(this.add.rectangle(40, 75, 0, 8, cPerigo.cor).setOrigin(0, 0.5).setDepth(2000), 40, 75);
        this.textoMoedas = this.registrarElementoHUD(this.add.text(1100, 30, `${this.t.labelCreditos} ${this.moedas}`, { fontSize: '14px', fill: '#00ffff', letterSpacing: 1 }).setOrigin(1, 0).setDepth(2000), 1100, 30);
        this.registrarElementoHUD(this.add.rectangle(640, 45, 400, 2, 0x222233).setOrigin(0.5).setDepth(2000), 640, 45);
        this.barraProgresso = this.registrarElementoHUD(this.add.graphics().setDepth(2000), 0, 0);
        this.textoProgresso = this.registrarElementoHUD(this.add.text(640, 25, `${this.t.labelProgresso} 0%`, { fontSize: '12px', fill: '#ffffff', letterSpacing: 2 }).setOrigin(0.5).setDepth(2000), 640, 25);

        this.corAmbienteExterna = this.perfilVisualBioma.ambienteClaro;
        this.corAmbientePadrao = this.usarLanterna ? this.perfilVisualBioma.ambienteEscuro : this.perfilVisualBioma.ambienteClaro;
        this.corAmbienteCaverna = this.perfilVisualBioma.ambienteCaverna;
        this.corAmbienteAtual = this.corAmbientePadrao;

        this.lights.enable();
        this.lights.setAmbientColor(this.corAmbientePadrao); 
        this.criarTexturaSombraSuave();

        this.jogador = this.physics.add.sprite(200, 200, 'astronauta').setPipeline('Light2D');
        this.jogador.setScale(1.0);
        this.jogador.setDepth(21);
        this.sombraJogador = this.criarSombraContato(200, 315, 20, 0.95, 0.32, 0.26);

        let forcaTraje = this.usarLanterna ? this.perfilVisualBioma.luzTraje.intensity : 0;
        let forcaFarol = this.usarLanterna ? this.perfilVisualBioma.lanterna.intensity : 0;
        this.luzTraje = this.lights.addLight(this.jogador.x, this.jogador.y, this.perfilVisualBioma.luzTraje.radius)
            .setColor(this.perfilVisualBioma.luzTraje.color)
            .setIntensity(forcaTraje);
        this.luzFarol = this.lights.addLight(this.jogador.x, this.jogador.y, this.perfilVisualBioma.lanterna.radius)
            .setColor(this.perfilVisualBioma.lanterna.color)
            .setIntensity(forcaFarol);

        // A CORREÇÃO DA COLISÃO DO GELO FICA AQUI!
        this.physics.add.collider(this.jogador, this.chaoFisico); // A colisão base SEMPRE existe agora

        if (this.nomeBioma === 'gelo' && this.primeiraEntrada) {
            this.jogador.setPosition(200, -100); // Põe ele no céu
            this.controlesTravados = true; 
            this.esperandoImpactoGelo = true; // Avisa o update que estamos na animação
        } else {
            this.controlesTravados = false;
            this.esperandoImpactoGelo = false;
        }

        this.jogador.body.setSize(126, 270);
        this.jogador.body.setOffset(12, 28);
        this.jogador.body.setCollideWorldBounds(true); 
        this.jogador.body.setBounce(0.1); 
        if (this.nomeBioma === 'mar') {
            this.jogador.body.setGravityY(-260);
            this.jogador.body.setDrag(180, 260);
            this.jogador.body.setMaxVelocity(230, 260);
        }

        this.jogadorEstaVivo = true;
        this.jogador.hp = 25; 
        this.jogadorTomandoDano = false; 

        this.cameras.main.startFollow(this.jogador, true, 0.05, 0.05);
        this.configurarCameraDaFase(mapa);
        this.cameras.main.fadeIn(450, 0, 0, 0);

        this.armaEquipadaKey = localStorage.getItem('arma_equipada') || 'padrao';
        const statusArmaBase = {
            'padrao': { braco: 'braco_padrao', bala: 'tiro_padrao', corLuz: 0xB5394, dano: 5 },
            'fuzil': { braco: 'braco_fuzil', bala: 'tiro_fuzil', corLuz: 0xBF0000, dano: 5 }, 
            'canhao': { braco: 'braco_canhao', bala: 'tiro_canhao', corLuz: 0xFF9900, dano: 5 } 
        };
        const armaBase = statusArmaBase[this.armaEquipadaKey] || statusArmaBase['padrao'];
        const corProjetilBioma = this.perfilVisualBioma.projeteis[this.armaEquipadaKey] || armaBase.corLuz;
        this.statusArma = {
            ...armaBase,
            corLuz: corProjetilBioma,
            corProjetil: corProjetilBioma
        };

        this.braco = this.add.sprite(this.jogador.x, this.jogador.y, this.statusArma.braco);
        this.braco.setScale(1.0).setPipeline('Light2D').setDepth(22).setOrigin(0.21, 0.38);
        
        this.lasers = this.physics.add.group({ defaultKey: 'laser', maxSize: 30 });
        this.poderesAliens = this.physics.add.group({ defaultKey: 'poder_alien', maxSize: 80 });
        this.inimigos = this.physics.add.group();
        this.objetosCaindo = this.physics.add.group();
        this.physics.add.collider(this.inimigos, this.chaoFisico); 
        this.physics.add.collider(this.objetosCaindo, this.chaoFisico, this.objetoCaindoAcertouChao, null, this);
        this.physics.add.overlap(this.lasers, this.inimigos, this.acertouAlien, null, this);
        this.physics.add.collider(this.jogador, this.inimigos, this.danoNoJogador, null, this);
        this.physics.add.overlap(this.jogador, this.poderesAliens, this.acertouJogadorComPoderAlien, null, this);
        this.physics.add.overlap(this.jogador, this.objetosCaindo, this.acertouJogadorComObjetoCaindo, null, this);

        this.itensInterativos = this.physics.add.staticGroup();
        this.physics.add.overlap(this.jogador, this.itensInterativos, this.acionarItem, null, this);

        this.criarAnimacoes();
        this.prepararEfeitosClima(); 
        this.prepararEfeitosSubaquaticos();
        this.prepararEfeitosFeedbackFinal();
        this.aplicarPosFXCena();
        this.aplicarCorrecaoVisualBioma();
        
        this.montarFaseJson(mapa);

        this.input.setPollAlways();
        this.ultimoToqueTempo = 0;
        this.teclas = this.input.keyboard.createCursorKeys();
        this.teclasWASD = this.input.keyboard.addKeys({ up: 87, left: 65, down: 83, right: 68 });
        this.input.addPointer(2); 
        let isDesktop = this.sys.game.device.os.desktop;

        if (!isDesktop) {
            // JOYSTICK ESQUERDO (MOVIMENTO E MIRA): Fixo e Visível
            this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: 112, y: 585, radius: 72,
                base: this.add.circle(0, 0, 72, 0x888888, 0.2).setDepth(5100),
                thumb: this.add.circle(0, 0, 34, 0xcccccc, 0.42).setDepth(5101),
                dir: '8dir'
            });
            this.registrarElementoHUDDinamico(this.joystick.base);
            this.registrarElementoHUDDinamico(this.joystick.thumb);

            // JOYSTICK DIREITO (PULO): Invisível, nasce onde o dedo encostar!
            this.joystickPulo = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: 0, y: 0, radius: 80,
                base: this.add.circle(0, 0, 80, 0x000000, 0).setDepth(5100),
                thumb: this.add.circle(0, 0, 40, 0x000000, 0).setDepth(5101),
                dir: '8dir'
            });
            this.registrarElementoHUDDinamico(this.joystickPulo.base);
            this.registrarElementoHUDDinamico(this.joystickPulo.thumb);
        }

        // --- SISTEMA DE TIROS (CLIQUE SIMPLES) ---
        this.teclaTiro = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.configurarMenuPausa();
        this.ultimoToqueTempo = 0; 

        // MEMÓRIA DO CONTROLE: Começa no PC
        this.usandoGamepadParaMirar = false;
        
        // Se o jogador mexer o mouse na mesa, o jogo destrava o analógico e volta pro PC
        this.input.on('pointermove', () => {
            this.usandoGamepadParaMirar = false;
        });

        this.input.on('pointerdown', (pointer) => {
            if (!this.jogadorEstaVivo) return;

            if (isDesktop) {
                this.atirar();
            } else {
                // No Mobile: Tocou na metade DIREITA da tela?
                if (pointer.x > 640) {
                    // 1. Reposiciona o joystick invisível para ler o arrasto do pulo
                    this.joystickPulo.x = pointer.x;
                    this.joystickPulo.y = pointer.y;

                    // 2. Já dispara o tiro na hora do toque (sem precisar de 2 toques!)
                    this.atirar();
                }
            }
        });

        this.somTiro = this.sound.add('som_tiro', { volume: 0.8 });
        this.somPassos = this.sound.add('som_passos', { volume: 0.9, loop: true, rate: 1.5 });
        this.somAlienMorte = this.sound.add('som_alien_morte', { volume: 0.6 });

        if (this.cache.audio.exists(this.trilhaFase)) {
            this.musicaFundo = this.sound.add(this.trilhaFase, { volume: 0.3, loop: true });
            this.musicaFundo.play();
        }

        let rateClima = this.nomeBioma === 'gelo' ? 0.5 : 1; 
        this.somChuva = this.sound.add('som_chuva', { volume: 0, rate: rateClima, loop: true });
        this.somChuva.play();

        this.limiteEsquerdoDaTela = 0;
        this.limiteDireitoDaTela = 500000; 

        this.overlayCapacete = this.registrarElementoHUD(this.add.image(640, 360, 'capacete_trincado').setDepth(3000).setAlpha(0), 640, 360);
        this.criarBotaoPausaHUD();

        if (this.cicloAtual === 1) {
            let textoMissao = this.registrarElementoHUD(this.add.text(640, 360, this.t.avisoInvasao, { fontSize: '50px', fill: '#ff0000', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(4000), 640, 360);
            this.cameras.main.flash(800, 255, 0, 0); 
            this.cameras.main.shake(500, 0.02);
            this.time.delayedCall(2000, () => {
                this.tweens.add({ targets: textoMissao, alpha: 0, duration: 500, onComplete: () => textoMissao.destroy() });
            });
        }
    }
    

    construirPerfilVisualBioma() {
        const perfis = {
            floresta: {
                ambienteEscuro: 0x07110a,
                ambienteClaro: 0xa7c7b0,
                ambienteCaverna: 0x040808,
                luzTraje: { color: 0x9fffc0, intensity: 0.95, radius: 110 },
                lanterna: { color: 0xd9ffe9, intensity: 2.8, intensityDisparo: 7.2, radius: 450 },
                projeteis: { padrao: 0x88ffc1, fuzil: 0xff7b70, canhao: 0xffd36c },
                clima: { particula: 0x4be00a, tempestade: 0x90ff5d, respingo: 0x7dff52, traje: 0x5cff74, overlay: 0x6a8f42 },
                contraste: { color: 0x102014, alpha: 0.14, blendMode: Phaser.BlendModes.MULTIPLY }
            },
            gelo: {
                ambienteEscuro: 0x07121c,
                ambienteClaro: 0xc7e4ff,
                ambienteCaverna: 0x040912,
                luzTraje: { color: 0xbdefff, intensity: 1.05, radius: 110 },
                lanterna: { color: 0xe8fbff, intensity: 3.25, intensityDisparo: 8.4, radius: 470 },
                projeteis: { padrao: 0xb5f0ff, fuzil: 0xff8897, canhao: 0xffe19d },
                clima: { particula: 0xe9f7ff, tempestade: 0xcff1ff, respingo: 0xeafaff, traje: 0xa8ebff, overlay: 0xd8ecff },
                contraste: { color: 0x0b1830, alpha: 0.12, blendMode: Phaser.BlendModes.MULTIPLY }
            },
            vulcao: {
                ambienteEscuro: 0x170908,
                ambienteClaro: 0xf3b08f,
                ambienteCaverna: 0x0b0404,
                luzTraje: { color: 0xffb477, intensity: 0.9, radius: 105 },
                lanterna: { color: 0xffd0a3, intensity: 2.9, intensityDisparo: 8.2, radius: 455 },
                projeteis: { padrao: 0xffbf7a, fuzil: 0xff6c57, canhao: 0xfff08e },
                clima: { particula: 0xff8c42, tempestade: 0xffa35f, respingo: 0xffb473, traje: 0xff7b47, overlay: 0xff8a52 },
                contraste: { color: 0x2b0b09, alpha: 0.16, blendMode: Phaser.BlendModes.MULTIPLY }
            },
            solar: {
                ambienteEscuro: 0x171108,
                ambienteClaro: 0xf3ddb0,
                ambienteCaverna: 0x0b0804,
                luzTraje: { color: 0xffda88, intensity: 0.9, radius: 105 },
                lanterna: { color: 0xffedb8, intensity: 2.75, intensityDisparo: 7.8, radius: 445 },
                projeteis: { padrao: 0xffdc86, fuzil: 0xff8c5f, canhao: 0xfff0a6 },
                clima: { particula: 0xffc15a, tempestade: 0xffd978, respingo: 0xffcf73, traje: 0xffb85a, overlay: 0xffc15a },
                contraste: { color: 0x2a1a0a, alpha: 0.15, blendMode: Phaser.BlendModes.MULTIPLY }
            },
            mar: {
                ambienteEscuro: 0x061421,
                ambienteClaro: 0x9ec7e8,
                ambienteCaverna: 0x030811,
                luzTraje: { color: 0x8dd9ff, intensity: 1, radius: 110 },
                lanterna: { color: 0xbcecff, intensity: 3.05, intensityDisparo: 8, radius: 460 },
                projeteis: { padrao: 0x8fd7ff, fuzil: 0x7aa6ff, canhao: 0xa7f2ff },
                clima: { particula: 0x7ed0ff, tempestade: 0x9de2ff, respingo: 0xbcecff, traje: 0x63c7ff, overlay: 0x69bdf0 },
                contraste: { color: 0x081b2c, alpha: 0.17, blendMode: Phaser.BlendModes.MULTIPLY }
            }
        };

        return perfis[this.nomeBioma] || perfis.floresta;
    }


    construirPerfilCinematograficoBioma(modoLeve) {
        const perfis = {
            floresta: {
                vignette: { x: 0.5, y: 0.5, radius: 0.72, strength: 0.24 },
                bloom: { color: 0x8dffb3, offsetX: 1, offsetY: 1, blurStrength: 1.15, strength: 0.24, steps: 4 }
            },
            gelo: {
                vignette: { x: 0.5, y: 0.5, radius: 0.74, strength: 0.2 },
                bloom: { color: 0xb8ecff, offsetX: 1, offsetY: 1, blurStrength: 1.3, strength: 0.32, steps: 4 }
            },
            vulcao: {
                vignette: { x: 0.5, y: 0.5, radius: 0.69, strength: 0.3 },
                bloom: { color: 0xffa347, offsetX: 1, offsetY: 1, blurStrength: 1.25, strength: 0.26, steps: 4 }
            },
            solar: {
                vignette: { x: 0.5, y: 0.5, radius: 0.68, strength: 0.28 },
                bloom: { color: 0xffd36b, offsetX: 1, offsetY: 1, blurStrength: 1.2, strength: 0.22, steps: 4 }
            },
            mar: {
                vignette: { x: 0.5, y: 0.5, radius: 0.75, strength: 0.26 },
                bloom: { color: 0x6bcfff, offsetX: 1, offsetY: 1, blurStrength: 1.18, strength: 0.2, steps: 4 }
            }
        };

        const perfilBase = perfis[this.nomeBioma] || {
            vignette: { x: 0.5, y: 0.5, radius: 0.72, strength: 0.22 },
            bloom: { color: 0xa8f3ff, offsetX: 1, offsetY: 1, blurStrength: 1.2, strength: 0.24, steps: 4 }
        };

        if (!modoLeve) return perfilBase;

        return {
            vignette: {
                ...perfilBase.vignette,
                radius: Math.max(0.66, perfilBase.vignette.radius - 0.02),
                strength: perfilBase.vignette.strength * 0.68
            },
            bloom: {
                ...perfilBase.bloom,
                blurStrength: Math.max(0.95, perfilBase.bloom.blurStrength - 0.18),
                strength: perfilBase.bloom.strength * 0.58,
                steps: Math.max(3, (perfilBase.bloom.steps || 4) - 1)
            }
        };
    }

    configurarPerfilDesempenho() {
        const nav = typeof navigator !== 'undefined' ? navigator : {};
        const memoria = nav.deviceMemory || 4;
        const nucleos = nav.hardwareConcurrency || 4;
        const reduzirMovimento = typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;
        const modoLeve = !this.sys.game.device.os.desktop || memoria <= 4 || nucleos <= 4 || reduzirMovimento;
        const perfilCinema = this.construirPerfilCinematograficoBioma(modoLeve);

        this.perfilDesempenho = {
            modoLeve,
            fatorParticulas: modoLeve ? 0.55 : 1,
            usarPosFX: true,
            usarDepthOfFieldFundo: !modoLeve,
            usarFantasmaAlien: !modoLeve,
            usarPointLightMuzzle: !modoLeve,
            intervaloFundoVideo: modoLeve ? 50 : 33,
            vignette: perfilCinema.vignette,
            bloom: perfilCinema.bloom
        };
    }

    ajustarQuantidadeParticulas(valor, minimo = 1) {
        const fator = this.perfilDesempenho?.fatorParticulas || 1;
        return Math.max(minimo, Math.round(valor * fator));
    }

    criarAnimacoes() {
        // MÁGICA: Só cria as animações globais se elas ainda não existirem!
        if (!this.anims.exists('correr')) {
            this.anims.create({ key: 'correr', frames: this.anims.generateFrameNames('astronauta', { prefix: 'andando_', start: 1, end: 17 }), frameRate: 20, repeat: -1 });
            this.anims.create({ key: 'parado', frames: this.anims.generateFrameNames('astronauta', { prefix: 'parado_', start: 1, end: 16 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'pular', frames: this.anims.generateFrameNames('astronauta', { prefix: 'pulando_', start: 1, end: 16 }), frameRate: 12, repeat: 0 });
            this.anims.create({ key: 'morte_astro', frames: this.anims.generateFrameNames('astronauta', { prefix: 'morte_', start: 1, end: 20 }), frameRate: 10, repeat: 0 });

            this.anims.create({ key: 'correr_comum', frames: this.anims.generateFrameNames('alien_comum', { prefix: 'correndo_', start: 1, end: 26 }), frameRate: 12, repeat: -1 });
            this.anims.create({ key: 'correr_veloz', frames: this.anims.generateFrameNames('alien_veloz', { prefix: 'correndo_', start: 1, end: 28 }), frameRate: 18, repeat: -1 });
            this.anims.create({ key: 'correr_tanque', frames: this.anims.generateFrameNames('alien_tanque', { prefix: 'correndo_', start: 1, end: 73 }), frameRate: 8, repeat: -1 });
            // Consertamos o 'alien_yeti' para 'yeti' (que é o nome que está no preload)
            this.anims.create({ key: 'correr_yeti', frames: this.anims.generateFrameNames('yeti', { prefix: 'correndo_', start: 1, end: 42 }), frameRate: 30, repeat: -1 });
            
        }
    }

    prepararEfeitosClima() {
        const blendParticulas = this.perfilDesempenho?.modoLeve ? 'NORMAL' : 'ADD';
        const climaVisual = this.perfilVisualBioma?.clima || {};
        let selfArea = {
            tetos: [], 
            contains: function(x, y) {
                if (y > 630) return true; 
                for (let i = 0; i < selfArea.tetos.length; i++) {
                    if (selfArea.tetos[i].contains(x, y)) return true; 
                }
                return false;
            }
        };
        this.areaColisaoChuva = selfArea;

        let gGota = this.add.graphics();
        if (this.nomeBioma === 'floresta') gGota.fillStyle(climaVisual.particula || 0x4BE00A, 0.6).fillRect(0, 0, 2, 25);
        else if (this.nomeBioma === 'solar') gGota.fillStyle(climaVisual.particula || 0xffaa00, 0.6).fillCircle(2, 2, 2);
        else gGota.fillStyle(climaVisual.particula || 0xffffff, 0.5).fillCircle(4, 4, 4); 
        gGota.generateTexture('particula_clima', 8, 25); gGota.destroy();

        // SUBSTITUA ESTE BLOCO DA PARTICULA:
        this.particulasClima = this.add.particles(0, 0, 'particula_clima', {
            // LIGA AUTOMÁTICO SE FOR FLORESTA OU GELO!
            emitting: this.nomeBioma === 'floresta' || this.nomeBioma === 'gelo', 
            x: { min: -200, max: 1480 }, y: -50,                      
            lifespan: 2500,              
            // Neve fraca cai mais devagar, chuva ácida cai rápido
            speedY: this.nomeBioma === 'gelo' ? { min: 200, max: 500 } : { min: 800, max: 1200 }, 
            speedX: this.nomeBioma === 'gelo' ? { min: 20, max: 100 } : { min: 100, max: 300 },  
            scale: { start: 0.5, end: this.nomeBioma === 'gelo' ? 1.0 : 0.7 },
            // Quantidade: 2 = Neve fraquinha e bonita, 5 = Chuva normal
            quantity: this.ajustarQuantidadeParticulas(this.nomeBioma === 'gelo' ? 2 : 5), 
            blendMode: blendParticulas,
            deathZone: { type: 'onEnter', source: this.areaColisaoChuva } 
        }).setScrollFactor(0).setDepth(18);

        let gRespingo = this.add.graphics().fillStyle(climaVisual.respingo || 0xffffff, 0.8).fillCircle(2, 2, 2);
        gRespingo.generateTexture('respingo_chuva', 4, 4); gRespingo.destroy();
        
        this.emissorRespingo = this.add.particles(0, 0, 'respingo_chuva', {
            frequency: -1, lifespan: 200, speed: {min: 50, max: 150}, angle: {min: 180, max: 360}, gravityY: 400, scale: {start: 1, end: 0}, blendMode: blendParticulas
        }).setDepth(25);

        let gTraje = this.add.graphics().fillStyle(climaVisual.traje || 0x4BE00A, 0.5).fillCircle(4, 4, 4);
        gTraje.generateTexture('fumaca_traje', 8, 8); gTraje.destroy();
        this.emissorTraje = this.add.particles(0, 0, 'fumaca_traje', {
            emitting: false, lifespan: { min: 400, max: 800 }, speedY: { min: -50, max: -100 }, speedX: { min: -20, max: 20 }, scale: { start: 1, end: 0 }, alpha: { start: 0.6, end: 0 }, gravityY: -200, blendMode: blendParticulas
        }).setDepth(25);

        this.overlayClima = this.registrarElementoHUD(this.add.rectangle(640, 360, 1280, 720, climaVisual.overlay || 0xffffff).setDepth(18).setAlpha(0), 640, 360);

        let gSangue = this.add.graphics().fillStyle(0x00ff00, 0.8).fillRect(0, 0, 4, 4);
        gSangue.generateTexture('gota_sangue', 4, 4); gSangue.destroy();
        this.emissorSangue = this.add.particles(0, 0, 'gota_sangue', { emitting: false, lifespan: { min: 200, max: 400 }, speed: { min: 150, max: 350 }, scale: { start: 1, end: 0 }, gravityY: 800, blendMode: blendParticulas }).setDepth(25);

        let gNeve = this.add.graphics().fillStyle(0xffffff, 0.5).fillCircle(2,2,2);
        gNeve.generateTexture('gota_neve', 4, 4); gNeve.destroy();
        this.fumacaImpacto = this.add.particles(0, 0, 'gota_neve', { emitting: false, speed: { min: 100, max: 300 }, scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 600, blendMode: blendParticulas }).setDepth(25);

        let gPoderAlien = this.add.graphics();
        gPoderAlien.fillStyle(0xffffff, 1).fillCircle(8, 8, 6);
        gPoderAlien.generateTexture('poder_alien', 16, 16);
        gPoderAlien.destroy();

        this.luzMuzzle = this.perfilDesempenho?.usarPointLightMuzzle
            ? this.add.pointlight(0, 0, 0, 100, 0.1).setDepth(30).setAlpha(0)
            : null;
    }

    prepararEfeitosSubaquaticos() {
        if (this.nomeBioma !== 'mar') return;

        const blend = this.perfilDesempenho?.modoLeve ? 'NORMAL' : 'ADD';
        const gBolha = this.add.graphics();
        gBolha.lineStyle(1, 0xbcecff, 0.78).strokeCircle(6, 6, 5);
        gBolha.fillStyle(0xdff8ff, 0.16).fillCircle(6, 6, 4);
        gBolha.generateTexture('bolha_oceano', 12, 12);
        gBolha.destroy();

        this.bolhasAmbiente = this.add.particles(0, 0, 'bolha_oceano', {
            x: { min: -80, max: 1360 },
            y: { min: 740, max: 920 },
            lifespan: { min: 4200, max: 7600 },
            speedY: { min: -36, max: -90 },
            speedX: { min: -18, max: 18 },
            alpha: { start: 0.38, end: 0 },
            scale: { start: 0.35, end: 1.25 },
            quantity: this.ajustarQuantidadeParticulas(2),
            frequency: this.perfilDesempenho?.modoLeve ? 360 : 180,
            blendMode: blend
        }).setScrollFactor(0).setDepth(19);

        this.bolhasJogador = this.add.particles(0, 0, 'bolha_oceano', {
            emitting: false,
            lifespan: { min: 900, max: 1800 },
            speedY: { min: -65, max: -130 },
            speedX: { min: -26, max: 26 },
            alpha: { start: 0.62, end: 0 },
            scale: { start: 0.22, end: 0.85 },
            quantity: 2,
            blendMode: blend
        }).setDepth(26);

        this.overlayAguaOceano = this.registrarElementoHUD(
            this.add.rectangle(640, 360, 1280, 720, 0x1b8cc8, 0.16)
                .setDepth(16)
                .setBlendMode(Phaser.BlendModes.SCREEN),
            640,
            360
        );

        this.tweens.add({
            targets: this.overlayAguaOceano,
            alpha: { from: 0.10, to: 0.22 },
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    prepararEfeitosFeedbackFinal() {
        if (!this.textures.exists('impacto_neon')) {
            const gImpacto = this.add.graphics();
            gImpacto.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
            gImpacto.fillStyle(0xffffff, 0.35).fillCircle(4, 4, 8);
            gImpacto.generateTexture('impacto_neon', 16, 16);
            gImpacto.destroy();
        }

        if (!this.textures.exists('risco_luz')) {
            const gRisco = this.add.graphics();
            gRisco.fillStyle(0xffffff, 0.95).fillRect(0, 0, 18, 2);
            gRisco.generateTexture('risco_luz', 18, 2);
            gRisco.destroy();
        }

        if (!this.textures.exists('gota_gosma_alien')) {
            const gGosma = this.add.graphics();
            gGosma.fillStyle(0xffffff, 0.95).fillCircle(8, 8, 7);
            gGosma.fillStyle(0xffffff, 0.45).fillCircle(5, 5, 3);
            gGosma.generateTexture('gota_gosma_alien', 16, 16);
            gGosma.destroy();
        }

        const blend = this.perfilDesempenho?.modoLeve ? 'NORMAL' : 'ADD';
        this.emissorImpacto = this.add.particles(0, 0, 'impacto_neon', {
            emitting: false,
            lifespan: { min: 180, max: 360 },
            speed: { min: 90, max: 360 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.9, end: 0 },
            gravityY: 180,
            blendMode: blend
        }).setDepth(42);

        this.emissorRiscosImpacto = this.add.particles(0, 0, 'risco_luz', {
            emitting: false,
            lifespan: { min: 110, max: 240 },
            speed: { min: 120, max: 420 },
            rotate: { min: 0, max: 360 },
            scaleX: { start: 1.2, end: 0.25 },
            scaleY: { start: 1, end: 0.2 },
            alpha: { start: 0.75, end: 0 },
            blendMode: blend
        }).setDepth(43);

        this.emissorGosmaAlien = this.add.particles(0, 0, 'gota_gosma_alien', {
            emitting: false,
            lifespan: { min: 420, max: 950 },
            speed: { min: 90, max: 460 },
            angle: { min: 195, max: 345 },
            scale: { start: 1.25, end: 0.12 },
            alpha: { start: 0.95, end: 0 },
            gravityY: 780,
            bounce: 0.25,
            blendMode: 'NORMAL'
        }).setDepth(44);
    }

    emitirImpactoVisual(x, y, cor = 0x8dffb3, quantidade = 8) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const qtd = this.ajustarQuantidadeParticulas(quantidade, 3);
        this.emissorImpacto?.setParticleTint(cor);
        this.emissorRiscosImpacto?.setParticleTint(cor);
        this.emissorImpacto?.emitParticleAt(x, y, qtd);
        this.emissorRiscosImpacto?.emitParticleAt(x, y, Math.max(2, Math.floor(qtd * 0.55)));

        if (!this.perfilDesempenho?.modoLeve) {
            const brilho = this.add.circle(x, y, 12, cor, 0.42)
                .setDepth(41)
                .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: brilho,
                alpha: 0,
                scale: 2.4,
                duration: 160,
                onComplete: () => brilho.destroy()
            });
        }
    }

    criarExplosaoGosmaAlien(alien) {
        if (!alien) return;
        const x = alien.x;
        const y = alien.y;
        const escala = Phaser.Math.Clamp(alien.escalaBaseVisual || Math.abs(alien.scaleX) || 1.2, 0.8, 3.8);
        const corGosma = Phaser.Math.RND.pick([0x06120a, 0x0b1f10, 0x1eff63, 0x51ff89]);
        const corLuz = corGosma === 0x06120a || corGosma === 0x0b1f10 ? 0x37ff72 : corGosma;
        const qtd = this.ajustarQuantidadeParticulas(18 + Math.round(escala * 7), 10);

        this.emissorGosmaAlien?.setParticleTint(corGosma);
        this.emissorGosmaAlien?.explode(qtd, x, y - 20);
        this.emitirImpactoVisual(x, y - 25, corLuz, 10 + Math.round(escala * 2));

        const manchas = Math.min(7, Math.max(3, Math.round(escala * 2)));
        for (let i = 0; i < manchas; i += 1) {
            const dx = Phaser.Math.Between(-34, 34) * escala;
            const dy = Phaser.Math.Between(-14, 36) * escala;
            const raio = Phaser.Math.Between(10, 22) * escala;
            const mancha = this.add.ellipse(x + dx, y + dy, raio * 1.35, raio, corGosma, 0.78)
                .setDepth(43)
                .setBlendMode(Phaser.BlendModes.MULTIPLY)
                .setRotation(Phaser.Math.FloatBetween(0, Math.PI));
            this.tweens.add({
                targets: mancha,
                alpha: 0,
                scaleX: 1.35,
                scaleY: 0.7,
                duration: 900 + Phaser.Math.Between(0, 350),
                ease: 'Sine.easeOut',
                onComplete: () => mancha.destroy()
            });
        }

        if (!this.perfilDesempenho?.modoLeve) {
            const brilho = this.add.circle(x, y - 20, 18 * escala, corLuz, 0.24)
                .setDepth(42)
                .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: brilho,
                alpha: 0,
                scale: 2.2,
                duration: 260,
                ease: 'Quad.easeOut',
                onComplete: () => brilho.destroy()
            });
        }
    }

    criarTexturaSombraSuave() {
        if (this.textures.exists('sombra_suave')) return;

        let gSombra = this.add.graphics();
        gSombra.fillStyle(0x000000, 0.16).fillEllipse(64, 24, 96, 24);
        gSombra.fillStyle(0x000000, 0.10).fillEllipse(64, 24, 118, 30);
        gSombra.fillStyle(0x000000, 0.06).fillEllipse(64, 24, 136, 36);
        gSombra.generateTexture('sombra_suave', 128, 48);
        gSombra.destroy();
    }

    criarSombraContato(x, y, depth, escalaX = 1, escalaY = 0.35, alpha = 0.22) {
        return this.add.image(x, y, 'sombra_suave')
            .setOrigin(0.5)
            .setDepth(depth)
            .setScale(escalaX, escalaY)
            .setAlpha(alpha)
            .setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    atualizarSombraContato(sombra, alvo, offsetY = 0, alphaBase = 0.22, escalaBaseX = 1, escalaBaseY = 0.35) {
        if (!sombra || !alvo) return;

        sombra.x = alvo.x;
        sombra.y = (alvo.body ? alvo.body.bottom : alvo.y) + offsetY;

        let alturaNoAr = 0;
        if (alvo.body && !alvo.body.touching.down) {
            alturaNoAr = Phaser.Math.Clamp(Math.abs(alvo.body.velocity.y) / 900, 0, 0.12);
        }

        sombra.setAlpha(Math.max(0.08, alphaBase - alturaNoAr));
        sombra.setScale(
            Math.max(0.72, escalaBaseX - (alturaNoAr * 0.9)),
            Math.max(0.18, escalaBaseY - (alturaNoAr * 0.5))
        );
    }

    aplicarPosFXCena() {
        const camera = this.cameras.main;
        if (!this.perfilDesempenho?.usarPosFX || !camera?.postFX) return;
        const configVignette = this.perfilDesempenho.vignette;
        const configBloom = this.perfilDesempenho.bloom;

        if (camera.postFX.addBloom && configBloom) {
            this.fxBloomCena = camera.postFX.addBloom(
                configBloom.color,
                configBloom.offsetX,
                configBloom.offsetY,
                configBloom.blurStrength,
                configBloom.strength,
                configBloom.steps
            );
        }
        if (camera.postFX.addVignette && configVignette) {
            this.fxVignetteCena = camera.postFX.addVignette(
                configVignette.x,
                configVignette.y,
                configVignette.radius,
                configVignette.strength
            );
        }
    }

    aplicarCorrecaoVisualBioma() {
        const contraste = this.perfilVisualBioma?.contraste;
        if (!contraste) return;

        this.overlayContrasteBioma = this.add.rectangle(640, 360, 1280, 720, contraste.color)
            .setDepth(17)
            .setAlpha(contraste.alpha)
            .setBlendMode(contraste.blendMode || Phaser.BlendModes.MULTIPLY);
        this.registrarElementoHUD(this.overlayContrasteBioma, 640, 360);
    }

    configurarMenuPausa() {
        this.menuPausaAberto = false;
        this.input.keyboard.on('keydown-ESC', () => this.abrirMenuPausa());
        this.input.keyboard.on('keydown-P', () => this.abrirMenuPausa());
    }

    criarBotaoPausaHUD() {
        const botao = this.registrarElementoHUD(
            this.add.text(1238, 28, 'II', {
                fontFamily: '"Courier New", monospace',
                fontSize: '18px',
                color: '#9eefff',
                fontStyle: 'bold',
                backgroundColor: 'rgba(2, 12, 20, 0.62)',
                padding: { x: 10, y: 6 }
            })
                .setOrigin(1, 0)
                .setDepth(5000)
                .setInteractive({ useHandCursor: true }),
            1238,
            28
        );

        botao.on('pointerover', () => botao.setStyle({ color: '#ffffff' }).setShadow(0, 0, '#00e5ff', 14));
        botao.on('pointerout', () => botao.setStyle({ color: '#9eefff' }).setShadow(0, 0, '#000000', 0));
        botao.on('pointerdown', () => this.abrirMenuPausa());
        this.botaoPausaHUD = botao;
    }

    abrirMenuPausa() {
        if (this.menuPausaAberto || this.venceuFase || !this.jogadorEstaVivo) return;
        if (!this.scene.isActive('CenaFase')) return;

        this.menuPausaAberto = true;
        this.controlesTravadosAntesPausa = this.controlesTravados;
        this.controlesTravados = true;
        this.somPassos?.pause();
        this.sound.pauseAll();
        if (this.fundoVideoElement && !this.fundoVideoElement.paused) {
            this.fundoVideoElement.pause();
        }

        this.scene.launch('CenaPausa', {
            idFase: this.idFase,
            cicloAtual: this.cicloAtual,
            nomeFase: this.nomeFase
        });
        this.scene.pause();
    }

    retomarDaPausa() {
        this.menuPausaAberto = false;
        this.controlesTravados = !!this.controlesTravadosAntesPausa;
        this.sound.resumeAll();
        if (this.fundoVideoElement) {
            this.tentarTocarFundoVideo('retomar_pausa');
        }
    }

    encerrarCenaPelaPausa() {
        this.menuPausaAberto = false;
        this.sound.resumeAll();
        this.sound.stopAll();
        this.destruirFundoVideo();
    }

    animarCorAmbiente(corDestino, duracao = 2000) {
        const corOrigem = Phaser.Display.Color.IntegerToRGB(this.corAmbienteAtual ?? this.corAmbientePadrao);
        const corFinal = Phaser.Display.Color.IntegerToRGB(corDestino);

        this.tweens.addCounter({
            from: 0,
            to: 100,
            duration: duracao,
            onUpdate: (tween) => {
                const t = tween.getValue() / 100;
                const r = Phaser.Math.Linear(corOrigem.r, corFinal.r, t);
                const g = Phaser.Math.Linear(corOrigem.g, corFinal.g, t);
                const b = Phaser.Math.Linear(corOrigem.b, corFinal.b, t);
                this.lights.setAmbientColor(Phaser.Display.Color.GetColor(r, g, b));
            },
            onComplete: () => {
                this.corAmbienteAtual = corDestino;
            }
        });
    }

    aplicarProfundidadeCampoNoFundo(alvo) {
        if (!alvo || !this.perfilDesempenho?.usarDepthOfFieldFundo) return;
        if (!alvo.preFX?.addBlur) return;
        if (alvo._fxProfundidadeFundoAplicado) return;

        alvo.preFX.addBlur(1, 1, 1);
        alvo._fxProfundidadeFundoAplicado = true;
    }

    update(time) {
        if (this.venceuFase) return; 
        this.atualizarTexturaFundoVideo(time);
        this.sincronizarCameraHUD();
        this.atualizarEfeitosSubaquaticos(time);
        
        // --- O PORTÃO DE FERRO: Se o jogador não existir ainda, aborte o update! ---
        if (!this.jogador || !this.jogador.body) return;
        const velocidadeYAnteriorJogador = this.ultimaVelocidadeYJogador || 0;

        let pad = (this.input.gamepad && this.input.gamepad.pad1) ? this.input.gamepad.pad1 : null;
        if (pad && pad.connected && (pad.start || pad.select) && time - (this.ultimoInputPausaGamepad || 0) > 350) {
            this.ultimoInputPausaGamepad = time;
            this.abrirMenuPausa();
            return;
        }

        if (pad && pad.connected && !this.controlesTravados) {
            
            // Movimento horizontal
            if (pad.leftStick.x < -0.1) {
                this.jogador.setVelocityX(-300);
            } else if (pad.leftStick.x > 0.1) {
                this.jogador.setVelocityX(300);
            } else {
                this.jogador.setVelocityX(0);
            }

            // Pulo
            if (pad.A && this.jogador.body.touching.down) {
                this.jogador.setVelocityY(-500);
            }

            // Atirar
            if (pad.rightTrigger > 0.1) {
                this.atirar();
            }
        }
        if (!this.jogadorEstaVivo) { this.atualizarMenuMorte(pad, time); return; }

        // 2. COLE ISTO NO INÍCIO DO UPDATE(), SUBSTITUINDO AS LÓGICAS DO BRAÇO:
        let offsetsBraco = {
            'parado': { x: -27, y: -70 },
            'correr': { x: -13, y: -73 },
            'pular': { x: -24, y: -70 },
            'morte_astro': { x: 0, y: 50 },
        };

        let animAtual = this.jogador.anims.currentAnim ? this.jogador.anims.currentAnim.key.split('_')[0] : 'parado';
        let off = offsetsBraco[animAtual] || offsetsBraco['parado'];
        let dirX = this.jogador.flipX ? -off.x : off.x;
            this.braco.x = this.jogador.x + dirX;
            this.braco.y = this.jogador.y + off.y;

        let anguloMira = this.braco.rotation;
        if (Math.abs(anguloMira) > Math.PI / 2) { 
            this.jogador.setFlipX(true); 
            this.braco.setFlipY(true); 
            this.braco.setOrigin(0.21, 1 - 0.38); // Proteção para não descolar!
        } else { 
            this.jogador.setFlipX(false); 
            this.braco.setFlipY(false); 
            this.braco.setOrigin(0.21, 0.38);
        }

        // A CORREÇÃO DA QUEDA LIVRE: Monitora quando ele bate no chão (ou no fim da tela)
        if (this.esperandoImpactoGelo) {
            // Se tocou num bloco de chão OU bateu no limite final da tela embaixo
            if (this.jogador.body.touching.down || this.jogador.body.blocked.down) {
                this.executarImpactoGelo();
                this.esperandoImpactoGelo = false;
            }
        }

        if (this.controlesTravados) return;

        let progressoRaw = (this.jogador.x / this.distanciaParaResgate) * 100;
        let porcentagem = Phaser.Math.Clamp(Math.floor(progressoRaw), 0, 100);
        this.textoProgresso.setText(`${this.t.labelProgresso} ${porcentagem}%`);
        this.barraProgresso.clear();
        this.barraProgresso.fillStyle(0x00ffff, 0.8);
        this.barraProgresso.fillRect(440, 44, (porcentagem / 100) * 400, 2);

        if (this.climaAtivo && this.nomeBioma === 'floresta') {
            this.emissorRespingo.setParticleTint(this.perfilVisualBioma?.clima?.respingo || 0x4BE00A); 
            if (Phaser.Math.Between(0, 100) > (this.perfilDesempenho?.modoLeve ? 72 : 40)) {
                this.emissorRespingo.emitParticleAt(this.jogador.x + Phaser.Math.Between(-700, 700), 630);
            }
            if (this.areaColisaoChuva && this.areaColisaoChuva.tetos) {
                this.areaColisaoChuva.tetos.forEach(teto => {
                    let centroX = teto.x + (teto.width / 2);
                    if (Math.abs(this.jogador.x - centroX) < 1000) {
                        if (Phaser.Math.Between(0, 100) > (this.perfilDesempenho?.modoLeve ? 84 : 20)) {
                            let rx = teto.x + Phaser.Math.Between(0, teto.width);
                            this.emissorRespingo.emitParticleAt(rx, teto.y);
                        }
                    }
                });
            }
        }

        // ... (resto do update)
        if (this.emAreaSegura) {
            this.perigoAcumulado -= 0.15; 
        } else {
            let taxaDano = 0.00; // Neve fraca = 0 dano!
            
            if (this.climaAtivo) { // Se pisar no Gatilho da Tempestade:
                if (this.nomeBioma === 'floresta') taxaDano = 0.05; 
                else if (this.nomeBioma === 'gelo') taxaDano = this.taxaDanoTempestade;
                else if (this.nomeBioma === 'solar') taxaDano = 0.1;
            }
            if (this.nomeBioma === 'mar') taxaDano = 0.05; 
            
            this.perigoAcumulado += taxaDano;
        }

        this.perigoAcumulado = Phaser.Math.Clamp(this.perigoAcumulado, 0, 100);
        this.barraPerigo.width = (this.perigoAcumulado / 100) * 200;

        if (this.perigoAcumulado > 75) {
            if (this.time.now % 500 < 250) this.barraPerigo.setAlpha(0); else this.barraPerigo.setAlpha(1);
            if (this.nomeBioma === 'gelo') this.jogador.setTint(0x00ffff);
            else if (this.nomeBioma === 'floresta') { this.jogador.setTint(0x00ff00); this.emissorTraje.emitting = true; }
            else if (this.nomeBioma === 'vulcao') this.jogador.setTint(0xff4400);
        } else {
            this.barraPerigo.setAlpha(1);
            this.emissorTraje.emitting = false;
            if (!this.jogadorTomandoDano) {
                this.jogador.clearTint();
                this.braco?.clearTint();
            }
        }

        if (!this.jogadorTomandoDano) {
            let alphaCapacete = 0;
            if (this.jogador.hp <= 7) alphaCapacete = 0.2 + ((7 - this.jogador.hp) * 0.1); 
            if (this.perigoAcumulado > 75 && (this.time.now % 400 < 200)) alphaCapacete = Math.max(alphaCapacete, 0.4);
            this.overlayCapacete.setAlpha(alphaCapacete);
        }

        if (this.perigoAcumulado >= 100 && this.jogadorEstaVivo) {
            this.matarJogador(this.jogador);
            return; 
        }

        this.emAreaSegura = false; 

        if (this.jogador.y > 750) {
            this.matarJogador(this.jogador);
            return; 
        }
        
        const larguraVisivelCamera = (this.cameras.main.width || 1280) / (this.zoomCameraFase || 1);
        const limitePeloJogador = Math.max(0, this.jogador.x - (larguraVisivelCamera / 2));
        if (limitePeloJogador > this.limiteEsquerdoDaTela) {
            this.limiteEsquerdoDaTela = limitePeloJogador;
        }

        if (this.jogador.x < this.limiteEsquerdoDaTela + 65) this.jogador.x = this.limiteEsquerdoDaTela + 65;

        if (this.jogador.x > this.distanciaParaResgate - 2500 && !this.hordaFinalAtivada) {
            this.hordaFinalAtivada = true;
            this.cameras.main.flash(1000, 255, 0, 0);
            this.sound.play('som_alien_grito', { volume: 1.5 }); 
            
            let textoAlerta = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, this.t.avisoHorda, { fontSize: '40px', fill: '#ff0000', fontStyle: 'bold', letterSpacing: 5, align: 'center' }).setOrigin(0.5).setDepth(4000);
            this.cameras.main.shake(1500, 0.01);
            this.tweens.add({ targets: textoAlerta, alpha: 0, duration: 500, delay: 2500, onComplete: () => textoAlerta.destroy() });

            this.limiteEsquerdoDaTela = Math.max(this.limiteEsquerdoDaTela, limitePeloJogador);
            
            this.time.addEvent({
                delay: 1000,
                callback: () => {
                    if (this.jogadorEstaVivo && this.jogador.x < this.distanciaParaResgate) {
                        let lado = Phaser.Math.RND.pick([1, -1]);
                        let monstro = this.sortearAlienDaFaseParaHorda();
                        this.gerarAlienEspecifico(monstro, this.jogador.x + (1000 * lado), 100);
                        
                        if(Phaser.Math.Between(0, 10) > 6) {
                            let monstroForte = this.sortearAlienDaFaseParaHorda();
                            this.gerarAlienEspecifico(monstroForte, this.jogador.x + (1200 * lado), 100);
                        }
                    }
                },
                loop: true
            });
        }

        if (this.fundoVideoSprites?.length) this.atualizarPosicoesFundoVideo();
        else if (this.fundoParallax) this.fundoParallax.tilePositionX = this.cameras.main.scrollX * 0.3;
        this.atualizarSombraContato(this.sombraJogador, this.jogador, 10, 0.24, 0.95, 0.32);
        const jogadorNoChao = this.jogador.body.touching.down || this.jogador.body.blocked.down;
        if (jogadorNoChao && !this.jogadorEstavaNoChao && velocidadeYAnteriorJogador > 220) {
            const corPoeira = this.nomeBioma === 'mar' ? 0x8fd7ff : (this.perfilVisualBioma?.clima?.particula || 0xe8f6ff);
            this.emitirImpactoVisual(this.jogador.x, this.jogador.body.bottom, corPoeira, this.nomeBioma === 'mar' ? 5 : 7);
        }
        this.jogadorEstavaNoChao = jogadorNoChao;
        this.ultimaVelocidadeYJogador = this.jogador.body.velocity.y;
        this.luzTraje.x = this.jogador.x; this.luzTraje.y = this.jogador.y - 20;

        let isDesktop = this.sys.game.device.os.desktop;
        let velocidade = 250; let forcaPulo = -450; 
        let movendoEsquerda = this.teclas.left.isDown || this.teclasWASD.left.isDown;
        let movendoDireita = this.teclas.right.isDown || this.teclasWASD.right.isDown;
        let pulando = this.teclas.up.isDown || this.teclasWASD.up.isDown;
        let nadandoBaixo = this.teclas.down.isDown || this.teclasWASD.down.isDown;

        if (!isDesktop && this.joystick) {
            let joyKeys = this.joystick.createCursorKeys();
            movendoEsquerda = movendoEsquerda || joyKeys.left.isDown; movendoDireita = movendoDireita || joyKeys.right.isDown;
            nadandoBaixo = nadandoBaixo || joyKeys.down.isDown;
            if (this.joystick.force > 0) anguloMira = this.joystick.rotation;
            if (this.joystickPulo) pulando = pulando || this.joystickPulo.createCursorKeys().up.isDown;
        }

        if (pad && pad.connected) {
            let eixoMoverX = pad.leftStick.x;
            let eixoMoverY = pad.leftStick.y;
            if (pad.left || eixoMoverX < -0.2) movendoEsquerda = true;
            if (pad.right || eixoMoverX > 0.2) movendoDireita = true;
            if (eixoMoverY > 0.35) nadandoBaixo = true;
            if (eixoMoverY < -0.35) pulando = true;
            if (pad.A) pulando = true; 
            if (Math.abs(pad.rightStick.x) > 0.2 || Math.abs(pad.rightStick.y) > 0.2) { anguloMira = Math.atan2(pad.rightStick.y, pad.rightStick.x); this.usandoGamepadParaMirar = true; }
            if (pad.R1 && (time - this.ultimoToqueTempo > 200)) { this.atirar(); this.ultimoToqueTempo = time; }
        }

        if (isDesktop && !this.usandoGamepadParaMirar) {
            let pointerMira = this.input.activePointer;
            let miraMundo = this.cameras.main.getWorldPoint(pointerMira.x, pointerMira.y);
            anguloMira = Phaser.Math.Angle.Between(this.jogador.x, this.jogador.y - 45, miraMundo.x, miraMundo.y);
            if (Phaser.Input.Keyboard.JustDown(this.teclaTiro)) this.atirar();
        }

        this.braco.rotation = anguloMira;
        if (Math.abs(anguloMira) > Math.PI / 2) { this.jogador.setFlipX(true); this.braco.setFlipY(true); } 
        else { this.jogador.setFlipX(false); this.braco.setFlipY(false); }
        
        this.luzFarol.x = this.jogador.x + Math.cos(anguloMira) * 220; this.luzFarol.y = (this.jogador.y - 20) + Math.sin(anguloMira) * 220;

        const emAgua = this.nomeBioma === 'mar';
        if (emAgua) {
            velocidade = 185;
            forcaPulo = -185;
            const impulsoVertical = 170;
            this.jogador.body.setDrag(180, 260);
            this.jogador.body.setMaxVelocity(230, 260);

            if (movendoEsquerda) this.jogador.body.setVelocityX(-velocidade);
            else if (movendoDireita) this.jogador.body.setVelocityX(velocidade);
            else this.jogador.body.setVelocityX(this.jogador.body.velocity.x * 0.82);

            if (pulando) this.jogador.body.setVelocityY(-impulsoVertical);
            else if (nadandoBaixo) this.jogador.body.setVelocityY(impulsoVertical * 0.75);

            if (movendoEsquerda || movendoDireita || pulando || nadandoBaixo) this.jogador.anims.play('pular', true);
            else this.jogador.anims.play('parado', true);
        } else if (movendoEsquerda) {
            this.jogador.body.setVelocityX(-velocidade);
            if (this.jogador.body.touching.down) this.jogador.anims.play('correr', true);
        } else if (movendoDireita) {
            this.jogador.body.setVelocityX(velocidade);
            if (this.jogador.body.touching.down) this.jogador.anims.play('correr', true);
        } else {
            this.jogador.body.setVelocityX(0); 
            if (this.jogador.body.touching.down) this.jogador.anims.play('parado', true);
        }

        if (!emAgua && pulando && this.jogador.body.touching.down) this.jogador.body.setVelocityY(forcaPulo);
        if (!emAgua && !this.jogador.body.touching.down) this.jogador.anims.play('pular', true);

        if (!emAgua && (movendoEsquerda || movendoDireita) && this.jogador.body.touching.down) { if (!this.somPassos.isPlaying) this.somPassos.play(); } 
        else { this.somPassos.stop(); }

        this.lasers.children.iterate((laser) => {
            if (laser && laser.active) {
                if (Math.abs(laser.x - this.jogador.x) > 800) { laser.setActive(false).setVisible(false); if (laser.luz) laser.luz.setIntensity(0); } 
                else { if (laser.luz) { laser.luz.x = laser.x; laser.luz.y = laser.y; } }
            }
        });

        this.poderesAliens.children.iterate((poder) => {
            if (poder && poder.active) {
                if (Math.abs(poder.x - this.jogador.x) > 1800 || poder.y < -200 || poder.y > 1000) {
                    poder.setActive(false).setVisible(false);
                    poder.body.stop();
                    if (poder.luz) poder.luz.setIntensity(0);
                } else if (poder.luz) {
                    poder.luz.x = poder.x;
                    poder.luz.y = poder.y;
                }
            }
        });

        this.objetosCaindo?.children.iterate((objeto) => {
            if (objeto && objeto.active) {
                if (objeto.luz) {
                    objeto.luz.x = objeto.x;
                    objeto.luz.y = objeto.y;
                }
                if (objeto.y > 980) {
                    if (objeto.luz) objeto.luz.setIntensity(0);
                    objeto.destroy();
                }
            }
        });

        this.inimigos.children.iterate((alien) => {
            if (alien && alien.active) {
                if (Math.abs(this.jogador.x - alien.x) > 1500) { alien.body.setVelocity(0, alien.fisicaAlien === 'andar' ? alien.body.velocity.y : 0); if (alien.anims.isPlaying) alien.anims.pause(); return; }
                this.atualizarSombraContato(alien.sombra, alien, 6, 0.18, alien.escalaBaseVisual ? alien.escalaBaseVisual * 0.9 : 1, 0.26);
                let velocidadeDaFera = alien.velocidadePerseguicao || 500;
                let comportamentoAlien = alien.comportamentoAlien || 'correr';
                let fisicaAlien = alien.fisicaAlien || 'andar';
                let distanciaXJogador = this.jogador.x - alien.x;
                let distanciaYJogador = (this.jogador.y - 40) - alien.y;
                let distanciaXAbs = Math.abs(distanciaXJogador);
                let distanciaYAbs = Math.abs(this.jogador.y - alien.y);
                let distanciaTotalJogador = Math.max(1, Math.sqrt((distanciaXJogador * distanciaXJogador) + (distanciaYJogador * distanciaYJogador)));
                let ehVoadorAtirador = fisicaAlien === 'voar' && comportamentoAlien === 'parar_atirar';
                let dentroAlcanceTiro = ehVoadorAtirador
                    ? distanciaTotalJogador <= (alien.alcanceTiro || 650)
                    : distanciaXAbs <= (alien.alcanceTiro || 650) && distanciaYAbs <= (fisicaAlien === 'andar' ? 220 : 360);
                let dentroAlcanceCorpo = distanciaXAbs <= (alien.alcanceAtaque || 140) && distanciaYAbs <= (fisicaAlien === 'andar' ? 180 : 220);
                let podeMover = fisicaAlien !== 'andar' || alien.body.touching.down;
                if (podeMover) {
                    if (!alien.anims.isPlaying) alien.anims.resume();
                    alien.body.setGravityY(0);

                    if (distanciaXJogador < 0) alien.setFlipX(false);
                    else alien.setFlipX(true);

                    if (ehVoadorAtirador) {
                        if (!alien.anims.isPlaying) alien.anims.resume();
                        let distanciaMinima = alien.distanciaMinimaVoo || 130;
                        let fatorVelocidade = distanciaTotalJogador <= distanciaMinima ? 0.35 : 1;
                        let velocidadeX = (distanciaXJogador / distanciaTotalJogador) * velocidadeDaFera * fatorVelocidade;
                        let velocidadeY = (distanciaYJogador / distanciaTotalJogador) * velocidadeDaFera * fatorVelocidade;
                        alien.setVelocity(velocidadeX, velocidadeY);
                        if (dentroAlcanceTiro) this.dispararPoderAlien(alien, time);
                    } else if (comportamentoAlien === 'parar_atirar' && dentroAlcanceTiro) {
                        if (fisicaAlien === 'andar') alien.setVelocityX(0);
                        else alien.setVelocity(0, 0);
                        if (alien.anims.isPlaying) alien.anims.pause();
                        this.dispararPoderAlien(alien, time);
                    } else if (comportamentoAlien === 'andar_atacar' && dentroAlcanceCorpo) {
                        if (fisicaAlien === 'andar') alien.setVelocityX(0);
                        else alien.setVelocity(0, 0);
                        if (!alien.atacandoCorpo) this.executarAtaqueCorpoAlien(alien, time);
                    } else {
                        if (!alien.anims.isPlaying) alien.anims.resume();
                        if (distanciaXJogador < 0) alien.setVelocityX(-velocidadeDaFera); 
                        else alien.setVelocityX(velocidadeDaFera);
                        if (fisicaAlien !== 'andar') {
                            let alvoY = fisicaAlien === 'voar' ? this.jogador.y - 120 : this.jogador.y - 20;
                            let velocidadeY = Phaser.Math.Clamp((alvoY - alien.y) * (fisicaAlien === 'voar' ? 1.6 : 1.1), -velocidadeDaFera * 0.65, velocidadeDaFera * 0.65);
                            alien.setVelocityY(velocidadeY);
                        }
                    }
                }
                if (alien.tremeAoCaminhar && fisicaAlien === 'andar' && alien.body.touching.down && Math.abs(alien.body.velocity.x) > 25 && distanciaXAbs < 1250) {
                    if (!alien.proximoTremorCaminhada || time >= alien.proximoTremorCaminhada) {
                        const escalaTremor = alien.escalaBaseVisual || alien.scaleX || 2.5;
                        const intensidade = Phaser.Math.Clamp(escalaTremor * 0.002, 0.006, 0.018);
                        this.cameras.main.shake(130, intensidade);
                        alien.proximoTremorCaminhada = time + (alien.intervaloTremorCaminhada || 360);
                    }
                }
                if (this.perfilDesempenho?.usarFantasmaAlien && (alien.tipoBaseAlien === 'veloz' || alien.tipoBaseAlien === 'tanque')) {
                    if (!alien.tempoUltimoFantasma) alien.tempoUltimoFantasma = 0;
                    if (time - alien.tempoUltimoFantasma > 60) {
                        this.criarRastroFantasma(alien, alien.tipoBaseAlien === 'veloz' ? 0xff0000 : 0xffaa00);
                        alien.tempoUltimoFantasma = time;
                    }
                }
            }
        });
    }

    atualizarEfeitosSubaquaticos(time) {
        if (this.nomeBioma !== 'mar' || !this.jogador?.active) return;

        if (!this.proximaBolhaJogador || time >= this.proximaBolhaJogador) {
            const movendo = Math.abs(this.jogador.body.velocity.x) > 25 || Math.abs(this.jogador.body.velocity.y) > 25;
            const quantidade = movendo ? Phaser.Math.Between(2, 4) : 1;
            this.bolhasJogador?.explode(
                quantidade,
                this.jogador.x + Phaser.Math.Between(-28, 28),
                this.jogador.y - Phaser.Math.Between(72, 105)
            );
            this.proximaBolhaJogador = time + (movendo ? 210 : 520);
        }

        if (this.overlayAguaOceano) {
            const ondulacao = Math.sin(time / 900) * 0.015;
            this.overlayAguaOceano.setAlpha(0.15 + ondulacao);
        }
    }

    atirar() {
        if (this.controlesTravados) return;
        let laser = this.lasers.get(this.jogador.x, this.jogador.y);

        if (laser) {
            laser.setTexture(this.statusArma.bala).setActive(true).setVisible(true);
            laser.setTint(this.statusArma.corProjetil || this.statusArma.corLuz);
            laser.body.setAllowGravity(false); 
            
            let angulo = this.braco.rotation; laser.rotation = angulo; 
            
            // O laser agora nasce exatamente na altura dinâmica do braço!
            laser.y = this.braco.y; 
            
            this.physics.velocityFromRotation(angulo, 2500, laser.body.velocity);

            if (!laser.luz) laser.luz = this.lights.addLight(laser.x, laser.y, 150);
            laser.luz.setColor(this.statusArma.corLuz).setIntensity(2);
            this.somTiro.play();

            let dist = this.armaEquipadaKey === 'fuzil' ? 120 : (this.armaEquipadaKey === 'canhao' ? 150 : 100); 
            
            // O flash do tiro agora acompanha o braço (this.braco.x e this.braco.y)!
            if (this.luzMuzzle) {
                this.luzMuzzle.setPosition(this.braco.x + Math.cos(angulo) * dist, this.braco.y + Math.sin(angulo) * dist);
                let corHex = Phaser.Display.Color.IntegerToRGB(this.statusArma.corLuz);
                this.luzMuzzle.color.setTo(corHex.r, corHex.g, corHex.b);
                this.luzMuzzle.setAlpha(0.2); this.luzMuzzle.intensity = 5; this.luzMuzzle.radius = 80;

                this.time.delayedCall(60, () => { if (this.luzMuzzle) { this.luzMuzzle.setAlpha(0); this.luzMuzzle.intensity = 0; } });
            }

            let recuo = this.statusArma.dano * 2; 
            this.jogador.x += this.jogador.flipX ? recuo : -recuo;
            this.cameras.main.shake(100, 0.002 * this.statusArma.dano); 
            this.luzFarol.setIntensity(this.perfilVisualBioma?.lanterna?.intensityDisparo || 8); 
            this.time.delayedCall(150, () => {
                if (this.luzFarol) this.luzFarol.setIntensity(this.usarLanterna ? (this.perfilVisualBioma?.lanterna?.intensity || 3) : 0);
            });
        }
    }

    matarJogador(jogador) {
        jogador.clearTint();
        if (this.braco) { this.braco.clearTint(); this.braco.setVisible(false); }
        if (this.emissorTraje) this.emissorTraje.emitting = false;
        this.jogadorEstaVivo = false;

        jogador.body.setVelocityX(0); jogador.body.setAcceleration(0, 0); jogador.body.checkCollision.none = true; 

        if (this.luzTraje) this.luzTraje.setIntensity(0);
        if (this.luzFarol) this.luzFarol.setIntensity(0);
        if (this.musicaFundo) this.musicaFundo.stop(); 
        if (this.somPassos) this.somPassos.stop();
        if (this.somChuva) this.somChuva.stop(); 

        jogador.anims.play('morte_astro', true);

        jogador.on('animationcomplete-morte_astro', () => {
            this.time.delayedCall(1000, () => { this.mostrarTelaMorte(); });
        });
    }

    mostrarTelaMorte() {
        this.morteTravada = false;
        let bgMorte = this.registrarElementoHUD(this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setDepth(6000), 640, 360);
        this.registrarElementoHUD(this.add.text(640, 250, this.t.morteTitulo, { fontFamily: '"Courier New", monospace', fontSize: '50px', fill: '#ff0000', fontStyle: 'bold', letterSpacing: 5 }).setOrigin(0.5).setDepth(6000), 640, 250);

        let btnReiniciar = this.registrarElementoHUD(this.add.text(640, 400, this.t.morteReiniciar, { fontFamily: '"Courier New", monospace', fontSize: '26px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(6000).setInteractive(), 640, 400);
        btnReiniciar.on('pointerover', () => btnReiniciar.setStyle({ fill: '#00ffff' })); btnReiniciar.on('pointerout', () => btnReiniciar.setStyle({ fill: '#ffffff' }));
        btnReiniciar.on('pointerdown', () => {
            if(this.morteTravada) return; this.morteTravada = true;
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.restart({ 
                    planetaDestino: this.idFase, // Mantém a fase atual (fase_1, fase_2, etc)
                    cicloAtual: this.cicloAtual, 
                    primeiraEntrada: false 
                });
            });
        });

        let btnLoja = this.registrarElementoHUD(this.add.text(640, 480, this.t.morteLoja, { fontFamily: '"Courier New", monospace', fontSize: '20px', fill: '#aaaaaa' }).setOrigin(0.5).setDepth(6000).setInteractive(), 640, 480);
        btnLoja.on('pointerover', () => btnLoja.setStyle({ fill: '#ffcc00' })); btnLoja.on('pointerout', () => btnLoja.setStyle({ fill: '#aaaaaa' }));
        btnLoja.on('pointerdown', () => {
            if(this.morteTravada) return; this.morteTravada = true;
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => { this.scene.start('CenaLoja', { planetaDestino: this.idFase, cicloAtual: this.cicloAtual }); });
        });

        this.botoesMorte = [btnReiniciar, btnLoja]; this.indiceMorte = 0; this.tempoMenuMorte = 0;
        btnReiniciar.emit('pointerover');
    }

    atualizarMenuMorte(pad, time) {
        if (!pad || !pad.connected || !this.botoesMorte) return;
        if (time - this.tempoMenuMorte < 200) return;

        if (pad.down || pad.up || Math.abs(pad.leftStick.y) > 0.5) {
            this.botoesMorte[this.indiceMorte].emit('pointerout');
            this.indiceMorte = this.indiceMorte === 0 ? 1 : 0;
            this.botoesMorte[this.indiceMorte].emit('pointerover');
            this.tempoMenuMorte = time;
        }
        if (pad.A) { this.botoesMorte[this.indiceMorte].emit('pointerdown'); this.tempoMenuMorte = time; }
    }

    criarRastroFantasma(personagem, corNeon = 0x00ffff) {
        let fantasma = this.add.image(personagem.x, personagem.y, personagem.texture.key, personagem.frame.name);
        fantasma.setScale(personagem.scaleX, personagem.scaleY).setFlipX(personagem.flipX).setFlipY(personagem.flipY).setOrigin(personagem.originX, personagem.originY);
        fantasma.setTint(corNeon).setAlpha(0.5).setDepth(personagem.depth - 1);
        this.tweens.add({ targets: fantasma, alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 300, onComplete: () => fantasma.destroy() });
    }

    acertouAlien(laser, alien) {
        laser.setActive(false).setVisible(false); laser.body.stop(); laser.x = -100; 
        if (laser.luz) laser.luz.setIntensity(0);

        alien.hp -= this.statusArma.dano;
        this.emissorSangue.emitParticleAt(alien.x, alien.y, 5 * this.statusArma.dano);
        this.emitirImpactoVisual(alien.x, alien.y, this.statusArma.corProjetil || 0x8dffb3, this.statusArma.dano + 5);

        if (alien.hp <= 0) {
            if (alien.sombra) alien.sombra.destroy();
            this.criarExplosaoGosmaAlien(alien);

            this.moedas += alien.recompensa; this.textoMoedas.setText(this.t.labelCreditos + ' ' + this.moedas);
            localStorage.setItem('conta_bancaria', this.moedas);
            this.somAlienMorte?.play(); alien.destroy();
        } else {
            alien.setTint(0xff0000); 
            alien.setVelocityX(alien.x > this.jogador.x ? 200 : -200);
            this.time.delayedCall(100, () => { if (alien && alien.active) alien.clearTint(); });
        }
    }

    danoNoJogador(jogador, alien, dano = 1) {
        if (!this.jogadorEstaVivo || this.jogadorTomandoDano) return;
        jogador.hp -= Math.max(1, parseInt(dano) || 1); this.jogadorTomandoDano = true; 

        this.cameras.main.flash(200, 255, 0, 0); 
        this.cameras.main.shake(300, 0.02);
        this.emitirImpactoVisual(jogador.x, jogador.y - 35, 0xff3b3b, 10);
        
        this.overlayCapacete.setAlpha(0.9);
        this.tweens.add({ targets: this.overlayCapacete, alpha: 0, duration: 600 });
        
        jogador.setTint(0xff0000);
        if (this.braco) this.braco.setTint(0xff0000);
        jogador.setVelocityX(jogador.x < alien.x ? -300 : 300); jogador.setVelocityY(-200);

        if (jogador.hp <= 0) { this.matarJogador(jogador); } 
        else {
            this.tweens.add({ targets: [jogador, this.braco].filter(Boolean), alpha: 0.2, duration: 100, repeat: 5, yoyo: true, onComplete: () => {
                jogador.clearTint(); jogador.setAlpha(1);
                if (this.braco) { this.braco.clearTint(); this.braco.setAlpha(1); }
                this.jogadorTomandoDano = false; 
            }});
        }
    }

    acertouJogadorComPoderAlien(jogador, poder) {
        if (!poder?.active) return;
        poder.setActive(false).setVisible(false);
        poder.body.stop();
        if (poder.luz) poder.luz.setIntensity(0);
        this.danoNoJogador(jogador, { x: poder.x });
    }

    vencerFase() {
        if (this.venceuFase) return; // Evita que a função rode duas vezes
        this.venceuFase = true; 

        // 1. CONGELA O TEMPO (Física, Animações e Controles)
        this.physics.pause();
        this.inimigos.children.iterate(alien => { if (alien.anims) alien.anims.pause(); });
        this.jogador.anims.pause();
        this.controlesTravados = true;

        // 2. DESLIGA TODO O ÁUDIO DA FASE
        if (this.musicaFundo) this.musicaFundo.stop();
        if (this.somChuva) this.somChuva.stop();
        if (this.somPassos) this.somPassos.stop();
        this.sound.play('som_alien_morte', { volume: 2, rate: 0.5 }); 

        // 3. CALCULA A PRÓXIMA FASE (A correção do bug do loop infinito)
        let numeroFaseAtual = parseInt(this.idFase.split('_')[1]) || 1; 
        let proximaFaseNum = numeroFaseAtual + 1; 
        let proximoDestino = 'fase_' + proximaFaseNum; 

        // Salva no HD que o jogador liberou o próximo nível
        localStorage.setItem('fase_liberada', proximaFaseNum.toString());

        // 4. TRANSIÇÃO IMEDIATA (Sem esperar)
        this.cameras.main.flash(300, 255, 255, 255); 
        this.cameras.main.fade(400, 0, 0, 0, false, (cam, pct) => {
            if (pct === 1) {
                // Manda os dados certinhos para a nossa nova Cena de Cutscene
                this.scene.start('CenaCutsceneFuga', { 
                    cicloAtual: this.cicloAtual + 1, 
                    planetaDestino: proximoDestino,
                    videoFuga: this.videoFugaCutscene || 'assets/ui/video_fuga.webm'
                });
            }
        });
    }

    executarImpactoGelo() {
        this.controlesTravados = false; this.primeiraEntrada = false;
        this.fumacaImpacto.emitParticleAt(this.jogador.x, this.jogador.y + 40, 25);
        this.cameras.main.shake(400, 0.01);
        this.sound.play('som_alien_morte', { volume: 1.2, rate: 0.3 });
    }

    criarTexturaSeamless(chaveOrigem, chaveDestino) {
        let imgRef = this.textures.get(chaveOrigem).getSourceImage();
        let canvas = document.createElement('canvas');
        canvas.width = imgRef.width * 2;
        canvas.height = imgRef.height;
        let ctx = canvas.getContext('2d');

        ctx.drawImage(imgRef, 0, 0);
        ctx.save();
        ctx.translate(imgRef.width * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(imgRef, 0, 0);
        ctx.restore();

        if (this.textures.exists(chaveDestino)) {
            this.textures.remove(chaveDestino);
        }

        this.textures.addCanvas(chaveDestino, canvas);
        return chaveDestino;
    }

    destruirFundoVideo() {
        if (this.fundoVideoFrameRequest && this.fundoVideoElement?.cancelVideoFrameCallback) {
            this.fundoVideoElement.cancelVideoFrameCallback(this.fundoVideoFrameRequest);
        }
        if (this.fundoVideoElement) {
            this.fundoVideoElement.pause();
            this.fundoVideoElement.removeAttribute('src');
            this.fundoVideoElement.load();
            this.fundoVideoElement.remove();
        }

        this.fundoVideoElement = null;
        this.fundoVideoTexture = null;
        this.fundoVideoCanvas = null;
        this.fundoVideoContext = null;
        this.fundoVideoFrameRequest = null;
        this.fundoVideoSprites?.forEach(sprite => sprite.destroy());
        this.fundoVideoSprites = null;
        this.fundoVideoTileLargura = 0;
        this.proximaAtualizacaoFundoVideo = 0;

        if (this.textures.exists('fundo_infinito_video')) {
            this.textures.remove('fundo_infinito_video');
        }
    }

    iniciarFundoEmVideo(caminhoVideo, alturaFase) {
        this.destruirFundoVideo();

        this.fundoVideoElement = this.criarElementoVideoFundo(caminhoVideo);
        this.fundoVideoAutoplayBloqueado = false;
        this.fundoVideoElement.addEventListener('playing', () => {
            this.fundoVideoAutoplayBloqueado = false;
        });
        this.fundoVideoElement.addEventListener('error', () => {
            console.warn('Fundo em video falhou ao carregar.', this.fundoVideoElement?.error);
        });

        const agendarProximoFrame = () => {
            if (!this.fundoVideoElement?.requestVideoFrameCallback) return;
            this.fundoVideoFrameRequest = this.fundoVideoElement.requestVideoFrameCallback(() => {
                this.atualizarTexturaFundoVideo(0, true);
                agendarProximoFrame();
            });
        };

        const inicializarCanvas = () => {
            if (!this.fundoVideoElement || this.fundoVideoElement.videoWidth <= 0 || this.fundoVideoElement.videoHeight <= 0) return;

            this.fundoVideoCanvas = document.createElement('canvas');
            this.fundoVideoCanvas.width = this.fundoVideoElement.videoWidth * 2;
            this.fundoVideoCanvas.height = this.fundoVideoElement.videoHeight;
            this.fundoVideoContext = this.fundoVideoCanvas.getContext('2d');
            this.fundoVideoTexture = this.textures.addCanvas('fundo_infinito_video', this.fundoVideoCanvas);

            this.atualizarTexturaFundoVideo(0, true);
            this.criarMosaicoFundoVideo(alturaFase);

            agendarProximoFrame();
        };

        if (this.fundoVideoElement.readyState >= 2) inicializarCanvas();
        else this.fundoVideoElement.addEventListener('loadeddata', inicializarCanvas, { once: true });

        this.fundoVideoElement.load();
        this.tentarTocarFundoVideo('init');

        this.input.once('pointerdown', () => {
            if (this.fundoVideoElement?.paused || this.fundoVideoAutoplayBloqueado) {
                this.tentarTocarFundoVideo('pointerdown');
            }
        });
        this.input.keyboard.once('keydown', () => {
            if (this.fundoVideoElement?.paused || this.fundoVideoAutoplayBloqueado) {
                this.tentarTocarFundoVideo('keydown');
            }
        });
    }

    tentarTocarFundoVideo(origem = 'desconhecida') {
        if (!this.fundoVideoElement) return;
        const tentativa = this.fundoVideoElement.play();
        if (tentativa && typeof tentativa.catch === 'function') {
            tentativa.catch((erro) => {
                this.fundoVideoAutoplayBloqueado = true;
                console.warn(`Autoplay do fundo em video bloqueado (${origem}).`, erro?.message || erro);
            });
        }
    }

    criarElementoVideoFundo(caminhoVideo) {
        const video = document.createElement('video');
        video.src = caminhoVideo;
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'auto';
        video.setAttribute('muted', 'muted');
        video.setAttribute('playsinline', 'playsinline');
        video.style.position = 'fixed';
        video.style.left = '-9999px';
        video.style.top = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);
        return video;
    }

    criarMosaicoFundoVideo(alturaFase) {
        this.fundoVideoSprites?.forEach(sprite => sprite.destroy());
        this.fundoVideoSprites = [];

        const larguraTela = ((this.scale.width || this.cameras.main.width || 1280) / (this.zoomCameraFase || 1)) + ((this.margemHorizontalCamera || 0) * 2);
        const alturaFundoVisivel = alturaFase + (this.margemVerticalCamera || 0);
        const escala = alturaFundoVisivel / this.fundoVideoCanvas.height;
        this.fundoVideoTileLargura = this.fundoVideoCanvas.width * escala;
        const quantidade = Math.max(3, Math.ceil(larguraTela / this.fundoVideoTileLargura) + 2);

        for (let i = 0; i < quantidade; i++) {
            let sprite = this.add.image(0, 0, 'fundo_infinito_video')
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setDepth(-20)
                .setDisplaySize(this.fundoVideoTileLargura, alturaFundoVisivel);
            this.aplicarProfundidadeCampoNoFundo(sprite);
            this.fundoVideoSprites.push(sprite);
        }

        this.atualizarPosicoesFundoVideo();
    }

    atualizarPosicoesFundoVideo() {
        if (!this.fundoVideoSprites?.length || !this.fundoVideoTileLargura) return;
        const deslocamento = ((this.cameras.main.scrollX * 0.3) % this.fundoVideoTileLargura + this.fundoVideoTileLargura) % this.fundoVideoTileLargura;
        this.fundoVideoSprites.forEach((sprite, indice) => {
            sprite.x = -deslocamento + ((indice - 1) * this.fundoVideoTileLargura) - (this.margemHorizontalCamera || 0);
            sprite.y = -(this.margemVerticalCamera || 0);
        });
    }

    atualizarTexturaFundoVideo(time = 0, forcar = false) {
        if (!this.fundoVideoTexture || !this.fundoVideoElement || !this.fundoVideoContext || !this.fundoVideoCanvas) return;
        if (!forcar && time < (this.proximaAtualizacaoFundoVideo || 0)) return;
        if (this.fundoVideoElement.readyState < 2) return;

        let metade = this.fundoVideoCanvas.width / 2;
        this.fundoVideoContext.clearRect(0, 0, this.fundoVideoCanvas.width, this.fundoVideoCanvas.height);
        this.fundoVideoContext.drawImage(this.fundoVideoElement, 0, 0, metade, this.fundoVideoCanvas.height);
        this.fundoVideoContext.save();
        this.fundoVideoContext.translate(this.fundoVideoCanvas.width, 0);
        this.fundoVideoContext.scale(-1, 1);
        this.fundoVideoContext.drawImage(this.fundoVideoElement, 0, 0, metade, this.fundoVideoCanvas.height);
        this.fundoVideoContext.restore();

        this.fundoVideoTexture.refresh();
        this.atualizarPosicoesFundoVideo();
        this.proximaAtualizacaoFundoVideo = time + (this.perfilDesempenho?.intervaloFundoVideo || 33);
    }

    registrarElementoHUD(objeto, xBase, yBase) {
        if (!objeto) return objeto;
        objeto.setScrollFactor(0);
        objeto.hudXBase = xBase;
        objeto.hudYBase = yBase;
        objeto.hudScaleXBase = objeto.scaleX || 1;
        objeto.hudScaleYBase = objeto.scaleY || 1;
        if (!this.elementosHUD) this.elementosHUD = [];
        this.elementosHUD.push(objeto);
        this.ajustarElementoHUDParaZoom(objeto);
        if (this.cameras?.main) this.cameras.main.ignore(objeto);
        if (this.cameraHUD) objeto.cameraFilter = (objeto.cameraFilter || 0) & ~this.cameraHUD.id;
        return objeto;
    }

    registrarElementoHUDDinamico(objeto) {
        if (!objeto) return objeto;
        objeto.setScrollFactor(0);
        if (!this.elementosHUDDinamicos) this.elementosHUDDinamicos = [];
        this.elementosHUDDinamicos.push(objeto);
        if (this.cameras?.main) this.cameras.main.ignore(objeto);
        if (this.cameraHUD) objeto.cameraFilter = (objeto.cameraFilter || 0) & ~this.cameraHUD.id;
        return objeto;
    }

    ajustarElementoHUDParaZoom(objeto) {
        if (!objeto) return;
        objeto.setPosition(objeto.hudXBase || 0, objeto.hudYBase || 0);
        objeto.setScale(objeto.hudScaleXBase || 1, objeto.hudScaleYBase || 1);
    }

    ajustarHUDParaZoomCamera() {
        (this.elementosHUD || []).forEach(objeto => {
            if (objeto?.active !== false) this.ajustarElementoHUDParaZoom(objeto);
        });
    }

    configurarCameraHUD() {
        const larguraTela = this.scale.width || this.cameras.main.width || 1280;
        const alturaTela = this.scale.height || this.cameras.main.height || 720;

        if (!this.cameraHUD) {
            this.cameraHUD = this.cameras.add(0, 0, larguraTela, alturaTela, false, 'camera_hud');
        } else {
            this.cameraHUD.setViewport(0, 0, larguraTela, alturaTela);
        }

        this.cameraHUD.setScroll(0, 0);
        this.cameraHUD.setZoom(1);
        this.sincronizarCameraHUD();
    }

    sincronizarCameraHUD() {
        if (!this.cameraHUD) return;

        const hudSet = new Set([...(this.elementosHUD || []), ...(this.elementosHUDDinamicos || [])]);
        const mundo = this.children.list.filter(objeto => !hudSet.has(objeto));
        if (mundo.length) this.cameraHUD.ignore(mundo);

        (this.elementosHUD || []).forEach(objeto => {
            if (!objeto) return;
            this.cameras.main.ignore(objeto);
            objeto.cameraFilter = (objeto.cameraFilter || 0) & ~this.cameraHUD.id;
        });
        (this.elementosHUDDinamicos || []).forEach(objeto => {
            if (!objeto) return;
            this.cameras.main.ignore(objeto);
            objeto.cameraFilter = (objeto.cameraFilter || 0) & ~this.cameraHUD.id;
        });
    }

    configurarCameraDaFase(mapa) {
        const larguraFase = mapa.larguraFase || 50000;
        const alturaFase = mapa.alturaFase || 720;
        const zoomConfigurado = parseFloat(mapa.zoomCamera ?? 0.86);
        const zoom = Phaser.Math.Clamp(Number.isFinite(zoomConfigurado) ? zoomConfigurado : 0.86, 0.55, 1.2);
        const larguraTela = this.scale.width || this.cameras.main.width || 1280;
        const alturaTela = this.scale.height || this.cameras.main.height || 720;
        const alturaVisivel = alturaTela / zoom;
        const larguraVisivel = larguraTela / zoom;
        const margemVertical = Math.max(0, alturaVisivel - alturaFase);
        const margemHorizontal = Math.max(0, larguraVisivel - larguraTela);

        this.zoomCameraFase = zoom;
        this.alturaFaseAtual = alturaFase;
        this.larguraBoundsCamera = larguraFase;
        this.margemVerticalCamera = margemVertical;
        this.margemHorizontalCamera = margemHorizontal;

        this.cameras.main.setZoom(zoom);
        this.cameras.main.setBounds(0, -margemVertical, larguraFase, alturaFase + margemVertical);
        this.ajustarHUDParaZoomCamera();
        this.configurarCameraHUD();
    }

    montarFaseJson(mapa) {
        this.physics.world.setBounds(0, 0, mapa.larguraFase, mapa.alturaFase);
        this.configurarCameraDaFase(mapa);
        const tiposAsset = new Map((mapa.assetsParaCarregar || []).map(asset => [asset.chave, asset.tipo]));
        const caminhosAsset = new Map((mapa.assetsParaCarregar || []).map(asset => [asset.chave, asset.caminho]));

        if (mapa.fundo) {
            const fundoEhVideo = mapa.fundoTipo === 'video' || tiposAsset.get(mapa.fundo) === 'video';
            if (fundoEhVideo) {
                this.iniciarFundoEmVideo(caminhosAsset.get(mapa.fundo), mapa.alturaFase);
            } else {
            // Pega a imagem original carregada pela IA
            let imgRef = this.textures.get(mapa.fundo).getSourceImage();
            let w = imgRef.width;
            let h = imgRef.height;

            // Criamos um Canvas invisível para "assar" a imagem (igual fizemos no Editor)
            let canvas = document.createElement('canvas');
            canvas.width = w * 2;
            canvas.height = h;
            let ctx = canvas.getContext('2d');

            // 1. Desenha a parte normal
            ctx.drawImage(imgRef, 0, 0);

            // 2. Inverte o contexto e desenha a parte espelhada
            ctx.save();
            ctx.translate(w * 2, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(imgRef, 0, 0);
            ctx.restore();

            // 3. Remove a textura antiga se ela já existir (evita erro de chave duplicada)
            if (this.textures.exists('fundo_infinito_seamless')) {
                this.textures.remove('fundo_infinito_seamless');
            }

            // 4. Adiciona ao Phaser como uma textura de Canvas (que o TileSprite aceita!)
            this.textures.addCanvas('fundo_infinito_seamless', canvas);

            // 5. Cria o Parallax usando a nossa nova textura perfeita
            const larguraFundoVisivel = ((this.scale.width || this.cameras.main.width || 1280) / (this.zoomCameraFase || 1)) + ((this.margemHorizontalCamera || 0) * 2);
            const alturaFundoVisivel = mapa.alturaFase + (this.margemVerticalCamera || 0);
            this.fundoParallax = this.add.tileSprite(-(this.margemHorizontalCamera || 0), -(this.margemVerticalCamera || 0), larguraFundoVisivel, alturaFundoVisivel, 'fundo_infinito_seamless')
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setDepth(-20); 
            this.fundoParallax.setTileScale(1, alturaFundoVisivel / h);
            this.aplicarProfundidadeCampoNoFundo(this.fundoParallax);
            }
        }

        if (mapa.cenario) {
            mapa.cenario.forEach(item => {
                
                // === NOVO: GERA O CHÃO CONTÍNUO NA MEMÓRIA SE NECESSÁRIO ===
                if (item.seamless) {
                    let texKey = item.chave + '_seamless';
                    // Cria a textura 2x maior apenas 1 vez, mesmo se tiver 10 pedaços de chão iguais
                    if (!this.textures.exists(texKey)) {
                        this.criarTexturaSeamless(item.chave, texKey);
                    }
                    // Manda o Phaser usar a nossa imagem recém-criada em vez da original
                    item.chave = texKey; 
                }
                // ===========================================================

                let img;
                if (item.animTipo === 'atlas') {
                    // --- MUDANÇA: Seta a origem pro Topo-Esquerda (0,0) para bater perfeitamente com o Editor CSS ---
                    img = this.add.sprite(item.x, item.y, item.chave).setOrigin(0, 0);
                    let chaveAnim = `${item.chave}_anim`;
                    
                    if (!this.anims.exists(chaveAnim)) {
                        let textura = this.textures.get(item.chave);
                        if (textura && textura.key !== '__MISSING') {
                            let nomesDosFrames = textura.getFrameNames();
                            let framesFiltrados = nomesDosFrames.filter(f => f.startsWith(item.animPrefix)).sort();
                            if (framesFiltrados.length > 0) {
                                let arrayDeFrames = framesFiltrados.map(f => ({ key: item.chave, frame: f }));
                                this.anims.create({ key: chaveAnim, frames: arrayDeFrames, frameRate: item.animFps || 15, repeat: -1 });
                                img.play(chaveAnim);
                            }
                        }
                    } else {
                        img.play(chaveAnim);
                    }
                } else {
                    // --- MUDANÇA: Seta a origem pro Topo-Esquerda (0,0) também! ---
                    img = this.add.image(item.x, item.y, item.chave).setOrigin(0, 0);
                    
                    if (item.animTipo === 'balanco') {
                        // Se for balanço (ex: árvore), a base tem que ficar fixa no chão (Bottom-Center).
                        // Como recebemos a coordenada Topo-Esquerda, temos que empurrar o pivô pro meio e pra baixo:
                        img.setOrigin(0.5, 1);
                        img.x += (img.width * item.escala) / 2;
                        img.y += (img.height * item.escala);
                        this.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: Phaser.Math.Between(2000, 3500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    }
                }
                img.setDepth(item.depth).setScale(item.escala).setAlpha(item.alpha);

                // Só aplica o motor de luz se você deixou ligado no Editor
                if (item.usarLuz !== false) {
                    img.setPipeline('Light2D');
                } else {
                    // Opcional: Se estiver sem luz, podemos dar um tom levemente mais escuro 
                    // fixo para combinar com o clima, mas sem reagir à lanterna.
                    img.setTint(0xbbbbbb); 
                } 
                
                // NOVO: Aplica a velocidade Parallax (se não tiver no JSON, usa 1.0 padrão)
                let velScroll = item.scrollFactor !== undefined ? item.scrollFactor : 1.0;
                
                // O ", 1" no final garante que o pulo (eixo Y) continue normal, só o eixo X faz o efeito 3D
                img.setScrollFactor(velScroll, 1);
            });
        }

        if (mapa.colisoes) {
            mapa.colisoes.forEach(box => {
                let chao = this.add.rectangle(box.x, box.y, box.largura, box.altura, 0x000000, 0); 
                this.physics.add.existing(chao, true); this.chaoFisico.add(chao);
            });
        }

        if (mapa.zonasDano) {
            mapa.zonasDano.forEach(box => {
                let zona = this.add.rectangle(box.x, box.y, box.largura, box.altura, 0xff0000, 0);
                this.physics.add.existing(zona, true); this.zonasDanoGroup.add(zona);
            });
            this.physics.add.overlap(this.jogador, this.zonasDanoGroup, () => {
                if (this.jogadorEstaVivo && !this.jogadorTomandoDano) { this.danoNoJogador(this.jogador, { x: this.jogador.x + 10 }); }
            });
        }

        if (mapa.zonasSeguras) {
            mapa.zonasSeguras.forEach(box => {
                let zona = this.add.rectangle(box.x, box.y, box.largura, box.altura, 0x00aaff, 0);
                this.physics.add.existing(zona, true); 
                this.zonasSegurasGroup.add(zona);

                let rectTeto = new Phaser.Geom.Rectangle(box.x - box.largura/2, box.y - box.altura/2, box.largura, box.altura);
                if (this.areaColisaoChuva && this.areaColisaoChuva.tetos) {
                    this.areaColisaoChuva.tetos.push(rectTeto);
                }
            });
            
            this.physics.add.overlap(this.jogador, this.zonasSegurasGroup, () => {
                this.emAreaSegura = true; 
            });
        }

        if (mapa.gatilhos) {
            mapa.gatilhos.forEach(gData => {
                let box = this.add.rectangle(gData.x, gData.y, gData.largura, gData.altura, 0x00ff00, 0);
                this.physics.add.existing(box, true); box.dados = gData; this.gatilhosGroup.add(box);
            });
            this.physics.add.overlap(this.jogador, this.gatilhosGroup, (jogador, box) => {
                this.acionarGatilho(box.dados); box.destroy(); 
            });
        }

        if (mapa.spawns) {
            mapa.spawns.forEach(spawn => {
                spawn.jaInvocado = false; 
                spawn.grupoNormalizado = this.normalizarGrupoGatilho(spawn.grupo);

                if (!spawn.ativacao || spawn.ativacao === 'imediato') {
                    this.gerarAlienEspecifico(spawn, spawn.x, spawn.y, spawn.depth, spawn.escala, spawn.comportamento, spawn.corPoder);
                } else {
                    this.spawnsOcultos.push(spawn);
                }
            });
        }

        if (mapa.luzes) {
            mapa.luzes.forEach(luz => {
                let corHex = Phaser.Display.Color.HexStringToColor(luz.cor).color;
                this.lights.addLight(luz.x, luz.y, luz.raio).setColor(corHex).setIntensity(luz.intensidade);
            });
        }

        if (mapa.itens) {
            mapa.itens.forEach(item => this.gerarItemInterativo(item.item, item.x, item.y));
        }

        if (mapa.naveResgate) {
            this.distanciaParaResgate = mapa.naveResgate.x;
            this.videoFugaCutscene = mapa.naveResgate.videoFugaCaminho || 'assets/ui/video_fuga.webm';
            
            this.naveResgate = this.physics.add.staticImage(mapa.naveResgate.x, mapa.naveResgate.y, 'nave_resgate').setPipeline('Light2D').setDepth(15);
            this.naveResgate.setSize(300, 500); 
            this.sombraNaveResgate = this.criarSombraContato(mapa.naveResgate.x, mapa.naveResgate.y + 230, 14, 1.9, 0.42, 0.24);
            
            this.physics.add.overlap(this.jogador, this.naveResgate, () => {
                if (this.jogadorEstaVivo) this.vencerFase(); 
            }, null, this);
        } else {
            this.distanciaParaResgate = mapa.larguraFase - 1000;
            this.videoFugaCutscene = 'assets/ui/video_fuga.webm';
        }
    }

    exibirTextoGatilho(dados) {
        let texto = dados.texto || '';
        if (!texto) return;

        if (this.textoGatilhoAtual) {
            this.textoGatilhoAtual.destroy();
            this.textoGatilhoAtual = null;
        }

        let tamanho = parseInt(dados.tamanhoTexto || 28);
        let tempo = parseInt(dados.tempoTexto || 4000);
        let cor = dados.corTexto || '#ffffff';

        this.textoGatilhoAtual = this.registrarElementoHUD(this.add.text(640, 560, texto, {
            fontFamily: '"Courier New", monospace',
            fontSize: `${Number.isFinite(tamanho) ? tamanho : 28}px`,
            fill: cor,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 900 }
        }).setOrigin(0.5).setDepth(4200).setAlpha(0), 640, 560);
        const hudY = (valor) => valor;

        this.tweens.add({
            targets: this.textoGatilhoAtual,
            alpha: 1,
            y: hudY(535),
            duration: 260,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: this.textoGatilhoAtual,
                    alpha: 0,
                    y: hudY(512),
                    duration: 420,
                    delay: Number.isFinite(tempo) ? tempo : 4000,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        this.textoGatilhoAtual?.destroy();
                        this.textoGatilhoAtual = null;
                    }
                });
            }
        });
    }

    normalizarGrupoGatilho(valor) {
        const grupo = String(valor || '').trim().toLowerCase();
        return grupo || 'horda_1';
    }

    obterTiposAlienPermitidosNaFase(mapa) {
        const tiposBaseValidos = new Set(['comum', 'veloz', 'tanque', 'yeti']);
        const tipos = [];
        const adicionarTipo = (tipo) => {
            const tipoNormalizado = String(tipo || '').trim();
            if (!tipoNormalizado || tipos.includes(tipoNormalizado)) return;
            if (tiposBaseValidos.has(tipoNormalizado) || this.aliensCustomizados?.has(tipoNormalizado)) {
                tipos.push(tipoNormalizado);
            }
        };

        (mapa.spawns || []).forEach(spawn => adicionarTipo(spawn.inimigo));
        if (tipos.length === 0) {
            (this.aliensConfigDaFase || []).forEach(alien => adicionarTipo(alien.id));
        }

        if (tipos.length > 0) return tipos;
        return this.nomeBioma === 'gelo' ? ['yeti'] : ['comum'];
    }

    sortearAlienDaFaseParaHorda() {
        const tiposPermitidos = this.tiposAlienHordaFinal || [];
        if (tiposPermitidos.length === 0) return this.nomeBioma === 'gelo' ? 'yeti' : 'comum';
        return Phaser.Math.RND.pick(tiposPermitidos);
    }

    acionarGatilho(dados) {
        const acao = dados.acao === 'mensagem' ? 'mostrar_texto' : dados.acao;
        if (acao === 'clima_on') { 
            this.alterarClima(true); 
        } 
        else if (acao === 'clima_off') { 
            this.alterarClima(false); 
        } 
        // --- NOVO: TRANSIÇÃO DE LUZ DINÂMICA ---
        else if (acao === 'luz_off') {
            this.animarCorAmbiente(this.corAmbienteCaverna, 2000);
            this.luzTraje.setIntensity(this.perfilVisualBioma?.luzTraje?.intensity || 1);
            this.luzFarol.setIntensity(this.perfilVisualBioma?.lanterna?.intensity || 3);
            return;
            // Escurece o mundo suavemente em 2 segundos
            this.tweens.addCounter({
                from: 255, to: 5, duration: 2000,
                onUpdate: (tween) => {
                    let v = Math.floor(tween.getValue());
                    // 0x050510 é o nosso azul escuro profundo
                    this.lights.setAmbientColor(Phaser.Display.Color.GetColor(v/10, v/10, (v/10) + 10));
                }
            });
            // Liga a lanterna e a luz do traje
            this.luzTraje.setIntensity(this.perfilVisualBioma?.luzTraje?.intensity || 1);
            this.luzFarol.setIntensity(this.perfilVisualBioma?.lanterna?.intensity || 3);
        }
        else if (acao === 'luz_on') {
            this.animarCorAmbiente(this.corAmbienteExterna, 2000);
            this.luzTraje.setIntensity(0);
            this.luzFarol.setIntensity(0);
            return;
            // Volta a claridade total
            this.tweens.addCounter({
                from: 5, to: 255, duration: 2000,
                onUpdate: (tween) => {
                    let v = Math.floor(tween.getValue());
                    this.lights.setAmbientColor(Phaser.Display.Color.GetColor(v, v, v));
                }
            });
            // Desliga a lanterna para economizar processamento
            this.luzTraje.setIntensity(0);
            this.luzFarol.setIntensity(0);
        } 
        else if (acao === 'audio') {
            if (dados.audio && this.cache.audio.exists(dados.audio)) {
                this.sound.play(dados.audio, { volume: 1.0 });
            } else {
                console.warn('Gatilho de audio nao encontrou a chave no cache.', { audio: dados.audio });
            }
        }
        else if (acao === 'spawn_grupo') {
            const grupoAlvo = this.normalizarGrupoGatilho(dados.grupo);
            let invocados = 0;
            this.spawnsOcultos.forEach(spawn => {
                if (spawn.ativacao === 'espera_grupo' && (spawn.grupoNormalizado || this.normalizarGrupoGatilho(spawn.grupo)) === grupoAlvo && !spawn.jaInvocado) {
                    this.gerarAlienEspecifico(spawn, spawn.x, spawn.y, spawn.depth, spawn.escala, spawn.comportamento, spawn.corPoder);
                    spawn.jaInvocado = true; 
                    invocados++;
                }
            });
            if (invocados === 0) {
                console.warn('Gatilho de spawn_grupo nao encontrou spawns aguardando o grupo.', {
                    grupo: grupoAlvo,
                    spawnsOcultos: this.spawnsOcultos.map(spawn => ({
                        inimigo: spawn.inimigo,
                        ativacao: spawn.ativacao,
                        grupo: spawn.grupo,
                        jaInvocado: spawn.jaInvocado
                    }))
                });
            }
        }
        else if (acao === 'mostrar_texto') {
            this.exibirTextoGatilho(dados);
        }
        else if (acao === 'queda_objeto') {
            this.iniciarQuedaObjeto(dados);
        }
        else {
            console.warn('Gatilho com acao desconhecida.', dados);
        }
    }

    iniciarQuedaObjeto(dados) {
        const chaveSprite = String(dados.quedaSpriteKey || '').trim();
        if (!chaveSprite || !this.textures.exists(chaveSprite)) {
            console.warn('Gatilho queda_objeto sem sprite carregado.', dados);
            return;
        }

        const offsetX = parseFloat(dados.quedaOffsetX || 0) || 0;
        const alvoX = this.jogador.x + offsetX;
        const avisoMs = Math.max(0, parseInt(dados.quedaAvisoMs || 550));
        const aviso = this.add.rectangle(alvoX, 690, 120, 10, 0xff4422, 0.78)
            .setDepth(3900)
            .setAlpha(0.2);

        this.tweens.add({
            targets: aviso,
            alpha: 0.9,
            scaleX: 1.7,
            duration: 120,
            yoyo: true,
            repeat: Math.max(1, Math.floor(avisoMs / 240)),
            onComplete: () => aviso.destroy()
        });

        this.time.delayedCall(avisoMs, () => {
            if (!this.jogadorEstaVivo) return;

            const objeto = this.objetosCaindo.create(alvoX, -120, chaveSprite);
            const escala = Math.max(0.05, parseFloat(dados.quedaEscala || 1) || 1);
            const velocidade = Math.max(120, parseFloat(dados.quedaVelocidade || 780) || 780);
            objeto.setScale(escala);
            objeto.setDepth(95);
            objeto.setPipeline('Light2D');
            objeto.body.setAllowGravity(false);
            objeto.body.setVelocityY(velocidade);
            objeto.body.setSize(objeto.width * 0.72, objeto.height * 0.82);
            objeto.danoQueda = Math.max(1, parseInt(dados.quedaDano || 1));
            objeto.jaAcertouJogador = false;
            objeto.jaImpactouChao = false;
            objeto.luz = this.lights.addLight(objeto.x, objeto.y, 170).setColor(0xffaa66).setIntensity(1.8);
        });
    }

    acertouJogadorComObjetoCaindo(jogador, objeto) {
        if (!objeto?.active || objeto.jaAcertouJogador) return;
        objeto.jaAcertouJogador = true;
        this.danoNoJogador(jogador, { x: objeto.x }, objeto.danoQueda || 1);
    }

    objetoCaindoAcertouChao(objeto) {
        if (!objeto?.active || objeto.jaImpactouChao) return;
        objeto.jaImpactouChao = true;
        objeto.body.stop();
        objeto.setVelocity(0, 0);
        this.cameras.main.shake(380, 0.018);
        this.fumacaImpacto?.explode(18, objeto.x, objeto.y);
        if (objeto.luz) {
            objeto.luz.setIntensity(0);
        }
        this.tweens.add({
            targets: objeto,
            alpha: 0,
            y: objeto.y + 18,
            duration: 260,
            ease: 'Sine.easeIn',
            onComplete: () => objeto.destroy()
        });
    }

    alterarClima(ligar) {
        this.climaAtivo = ligar;
        if (ligar) {
            if (this.nomeBioma === 'floresta') {
                this.sound.play('aviso_chuva', { volume: 0.8 });
                this.particulasClima.setQuantity(this.ajustarQuantidadeParticulas(25)); 
                this.particulasClima.setParticleTint(this.perfilVisualBioma?.clima?.tempestade || 0x4BE00A); 
            } else if (this.nomeBioma === 'gelo') {
                this.sound.play('aviso_neve', { volume: 0.8 });
                this.particulasClima.setQuantity(this.ajustarQuantidadeParticulas(60)); 
                
                // NOVO EFEITO: Liga o "Vento" (Gravidade Lateral) e o "Peso" da neve
                this.particulasClima.gravityX = 800; // Vento forte empurrando pra direita
                this.particulasClima.gravityY = 600; // Puxa pra baixo mais rápido
                
                this.tweens.add({ targets: this.overlayClima, alpha: 0.4, duration: 3000 });
                this.overlayClima.fillColor = this.perfilVisualBioma?.clima?.overlay || 0xeeeeff;
            } else if (this.nomeBioma === 'solar') {
                this.particulasClima.start(); 
                this.particulasClima.setQuantity(this.ajustarQuantidadeParticulas(80)); 
                
                // Tempestade de Areia
                this.particulasClima.gravityX = 1200; // Vento absurdamente forte
                
                this.tweens.add({ targets: this.overlayClima, alpha: 0.6, duration: 3000 });
                this.overlayClima.fillColor = this.perfilVisualBioma?.clima?.overlay || 0xffaa00;
            }
        } else {
            if (this.nomeBioma === 'floresta') {
                this.particulasClima.setQuantity(this.ajustarQuantidadeParticulas(5)); 
                this.particulasClima.setParticleTint(this.perfilVisualBioma?.clima?.particula || 0xffffff); 
            } else if (this.nomeBioma === 'gelo') {
                this.particulasClima.setQuantity(this.ajustarQuantidadeParticulas(2)); 
                
                // DESLIGA O VENTO: Volta a ser uma neve de natal levinha
                this.particulasClima.gravityX = 0; 
                this.particulasClima.gravityY = 0; 
                
                this.tweens.add({ targets: this.overlayClima, alpha: 0, duration: 3000 });
            } else if (this.nomeBioma === 'solar') {
                this.particulasClima.setQuantity(this.ajustarQuantidadeParticulas(15)); 
                
                this.particulasClima.gravityX = 0; // Desliga vento da areia
                
                this.tweens.add({ targets: this.overlayClima, alpha: 0, duration: 3000 });
            }
        }
    }

    dispararPoderAlien(alien, time) {
        if (!alien?.active || !this.jogadorEstaVivo) return;
        let recarga = alien.recargaTiro || 1400;
        if ((alien.ultimoTiroAlien || 0) + recarga > time) return;

        let poder = this.poderesAliens.get(alien.x, alien.y - 35);
        if (!poder) return;

        alien.ultimoTiroAlien = time;
        poder.setTexture('poder_alien').setActive(true).setVisible(true);
        poder.body.setAllowGravity(false);
        poder.setDepth((alien.depth || 20) + 1);
        poder.setScale(alien.escalaPoderAlien || 1.1);

        let corInteira = alien.corPoderAlienInt || Phaser.Display.Color.HexStringToColor('#ff3355').color;
        poder.setTint(corInteira);
        let angulo = Phaser.Math.Angle.Between(alien.x, alien.y - 35, this.jogador.x, this.jogador.y - 40);
        poder.rotation = angulo;
        this.physics.velocityFromRotation(angulo, alien.velocidadePoderAlien || 620, poder.body.velocity);

        if (!poder.luz) poder.luz = this.lights.addLight(poder.x, poder.y, alien.raioPoderAlien || 110);
        poder.luz.setColor(corInteira).setIntensity(alien.intensidadePoderAlien || 1.8).setRadius(alien.raioPoderAlien || 110);
    }

    executarAtaqueCorpoAlien(alien, time) {
        if (!alien?.active || !this.jogadorEstaVivo) return;
        let recarga = alien.recargaAtaque || 900;
        if ((alien.ultimoAtaqueCorpo || 0) + recarga > time) return;

        alien.ultimoAtaqueCorpo = time;
        alien.atacandoCorpo = true;
        alien.setVelocityX(0);
        if (alien.anims.isPlaying) alien.anims.pause();

        const escalaBase = alien.escalaBaseVisual || alien.scaleX || 1;
        const xInicial = alien.x;
        const impulso = this.jogador.x >= alien.x ? 18 : -18;

        this.time.delayedCall(110, () => {
            if (!alien?.active || !this.jogadorEstaVivo) return;
            if (Math.abs(this.jogador.x - alien.x) <= (alien.alcanceAtaque || 140) + 25 && Math.abs(this.jogador.y - alien.y) <= 190) {
                this.danoNoJogador(this.jogador, alien);
            }
        });

        this.tweens.add({
            targets: alien,
            x: xInicial + impulso,
            scaleX: escalaBase * 1.08,
            scaleY: escalaBase * 0.94,
            duration: 110,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (!alien?.active) return;
                alien.x = xInicial;
                alien.setScale(escalaBase);
                alien.atacandoCorpo = false;
                if (alien.anims) alien.anims.resume();
            }
        });
    }

    resolverConfigAlien(tipoOuConfig, escalaCustomizada = null, comportamento = 'correr', corPoder = '#ff3355') {
        const tiposBaseValidos = ['comum', 'veloz', 'tanque', 'yeti'];
        const overrideSePreenchido = (valorBase, valorNovo) => {
            if (valorNovo === undefined || valorNovo === null || valorNovo === '') return valorBase;
            return valorNovo;
        };
        let origem = null;
        let tipoInformado = tipoOuConfig;

        if (typeof tipoOuConfig === 'object' && tipoOuConfig !== null) {
            tipoInformado = tipoOuConfig.inimigo || 'comum';
            if (!tiposBaseValidos.includes(tipoInformado) && tipoInformado !== 'atlas_customizado' && this.aliensCustomizados?.has(tipoInformado)) {
                const baseConfig = this.aliensCustomizados.get(tipoInformado);
                origem = {
                    ...baseConfig,
                    ...tipoOuConfig,
                    atlasKey: overrideSePreenchido(baseConfig.atlasKey, tipoOuConfig.atlasKey),
                    atlasPng: overrideSePreenchido(baseConfig.atlasPng, tipoOuConfig.atlasPng),
                    atlasJson: overrideSePreenchido(baseConfig.atlasJson, tipoOuConfig.atlasJson),
                    animPrefix: overrideSePreenchido(baseConfig.animPrefix, tipoOuConfig.animPrefix),
                    base: overrideSePreenchido(baseConfig.base, tipoOuConfig.base),
                    scale: overrideSePreenchido(baseConfig.scale, tipoOuConfig.scale),
                    escala: overrideSePreenchido(baseConfig.scale, tipoOuConfig.escala)
                };
            } else {
                origem = tipoOuConfig;
            }
        } else if (typeof tipoOuConfig === 'string' && !tiposBaseValidos.includes(tipoOuConfig) && this.aliensCustomizados?.has(tipoOuConfig)) {
            origem = this.aliensCustomizados.get(tipoOuConfig);
            tipoInformado = tipoOuConfig;
        }

        if (origem) {
            const tipoBase = tiposBaseValidos.includes(tipoInformado)
                ? tipoInformado
                : (tiposBaseValidos.includes(origem.base) ? origem.base : 'comum');
            const atlasKey = (origem.atlasKey || '').trim();
            const ehCustom = tipoInformado === 'atlas_customizado' || !!atlasKey || !!this.aliensCustomizados?.get(tipoInformado);

            return {
                ehCustom,
                tipoBase,
                chaveAtlas: ehCustom ? atlasKey : (tipoInformado === 'yeti' ? 'yeti' : `alien_${tipoInformado}`),
                animPrefix: (origem.animPrefix || 'correndo_').trim() || 'correndo_',
                animFps: parseInt(origem.animFps || 0),
                frameCount: parseInt(origem.frameCount || 0),
                escalaCustomizada: origem.escala ?? escalaCustomizada,
                comportamento: origem.comportamento || comportamento || 'correr',
                fisica: origem.fisica || 'andar',
                corPoder: origem.corPoder || corPoder || '#ff3355',
                hp: origem.hp,
                bodyWidth: origem.bodyWidth,
                bodyHeight: origem.bodyHeight,
                bodyOffsetX: origem.bodyOffsetX,
                bodyOffsetY: origem.bodyOffsetY,
                velocidade: origem.velocidade,
                recompensa: origem.recompensa,
                alcanceTiro: origem.alcanceTiro,
                recargaTiro: origem.recargaTiro,
                velocidadePoder: origem.velocidadePoder,
                raioPoder: origem.raioPoder,
                intensidadePoder: origem.intensidadePoder,
                escalaPoder: origem.escalaPoder,
                alcanceAtaque: origem.alcanceAtaque,
                recargaAtaque: origem.recargaAtaque,
                tremorCaminhada: origem.tremorCaminhada || 'auto'
            };
        }

        const tipoBase = tiposBaseValidos.includes(tipoInformado) ? tipoInformado : 'comum';
        return {
            ehCustom: false,
            tipoBase,
            chaveAtlas: tipoBase === 'yeti' ? 'yeti' : `alien_${tipoBase}`,
            animPrefix: 'correndo_',
            escalaCustomizada,
            comportamento: comportamento || 'correr',
            fisica: 'andar',
            corPoder: corPoder || '#ff3355',
            tremorCaminhada: 'auto'
        };
    }

    obterAnimacaoAlien(configAlien) {
        if (!configAlien?.chaveAtlas || !this.textures.exists(configAlien.chaveAtlas)) return null;

        if (!configAlien.ehCustom) {
            const chavePadrao = `correr_${configAlien.tipoBase}`;
            return this.anims.exists(chavePadrao) ? chavePadrao : null;
        }

        const prefixoSeguro = (configAlien.animPrefix || 'correndo_').replace(/[^a-zA-Z0-9_]+/g, '_');
        const chaveAnim = `correr_custom_${configAlien.chaveAtlas}_${prefixoSeguro}`;
        if (this.anims.exists(chaveAnim)) return chaveAnim;

        const textura = this.textures.get(configAlien.chaveAtlas);
        if (!textura || textura.key === '__MISSING') return null;

        let frames = textura.getFrameNames()
            .filter(frame => frame.startsWith(configAlien.animPrefix || 'correndo_'))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        if (!frames.length) {
            frames = textura.getFrameNames().slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        }
        if (configAlien.frameCount > 0) {
            frames = frames.slice(0, configAlien.frameCount);
        }
        if (!frames.length) return null;

        const fpsBase = { comum: 12, veloz: 18, tanque: 8, yeti: 30 };
        this.anims.create({
            key: chaveAnim,
            frames: frames.map(frame => ({ key: configAlien.chaveAtlas, frame })),
            frameRate: configAlien.animFps || fpsBase[configAlien.tipoBase] || 12,
            repeat: -1
        });

        return chaveAnim;
    }

    gerarAlienEspecifico(tipoSorteado, posX, posY, profundidadeZ = 20, escalaCustomizada = null, comportamento = 'correr', corPoder = '#ff3355') {
        const configAlien = this.resolverConfigAlien(tipoSorteado, escalaCustomizada, comportamento, corPoder);
        if (!configAlien.chaveAtlas || !this.textures.exists(configAlien.chaveAtlas)) {
            console.warn('Alien nao gerado: atlas ausente.', {
                tipoSolicitado: typeof tipoSorteado === 'object' ? tipoSorteado?.inimigo : tipoSorteado,
                chaveAtlas: configAlien.chaveAtlas
            });
            return null;
        }

        let novoAlien = this.inimigos.create(posX, posY, configAlien.chaveAtlas);
        
        novoAlien.setDepth(profundidadeZ); 
        novoAlien.setPipeline('Light2D').setBounce(0.2); 
        novoAlien.body.setCollideWorldBounds(true);

        let tipoBase = configAlien.tipoBase;
        const presetsBase = {
            comum: { scale: 1.3, bodyWidth: 230, bodyHeight: 198, hp: 2 + this.cicloAtual, velocidade: Phaser.Math.Between(100 + (this.cicloAtual * 50), 300 + (this.cicloAtual * 50)), recompensa: 150, alcanceTiro: 680, recargaTiro: 1200, velocidadePoder: 640, raioPoder: 110, intensidadePoder: 1.8, escalaPoder: 1.1, alcanceAtaque: 135, recargaAtaque: 900 },
            veloz: { scale: 1.2, bodyWidth: 226, bodyHeight: 124, hp: 1 + this.cicloAtual, velocidade: 450 + (this.cicloAtual * 50), recompensa: 250, alcanceTiro: 680, recargaTiro: 900, velocidadePoder: 760, raioPoder: 110, intensidadePoder: 1.8, escalaPoder: 1.1, alcanceAtaque: 135, recargaAtaque: 700 },
            tanque: { scale: 2.2, bodyWidth: 86, bodyHeight: 139, hp: 5 + (this.cicloAtual * 2), velocidade: 0 + (this.cicloAtual * 50), recompensa: 500, alcanceTiro: 820, recargaTiro: 1400, velocidadePoder: 520, raioPoder: 150, intensidadePoder: 2.4, escalaPoder: 1.6, alcanceAtaque: 170, recargaAtaque: 1200 },
            yeti: { scale: 1.5, bodyWidth: 260, bodyHeight: 153, hp: 15 + (this.cicloAtual * 2), velocidade: -100 + (this.cicloAtual * 50), recompensa: 200, alcanceTiro: 760, recargaTiro: 1200, velocidadePoder: 640, raioPoder: 110, intensidadePoder: 1.8, escalaPoder: 1.1, alcanceAtaque: 185, recargaAtaque: 900 }
        };
        const preset = presetsBase[tipoBase] || presetsBase.comum;
        const escalaInicial = (configAlien.escalaCustomizada !== undefined && configAlien.escalaCustomizada !== null && configAlien.escalaCustomizada !== '') ? parseFloat(configAlien.escalaCustomizada) : preset.scale;

        novoAlien.setScale(escalaInicial);
        novoAlien.body.setSize(parseInt(configAlien.bodyWidth || preset.bodyWidth), parseInt(configAlien.bodyHeight || preset.bodyHeight));
        novoAlien.body.setOffset(parseInt(configAlien.bodyOffsetX || 0), parseInt(configAlien.bodyOffsetY || 0));
        novoAlien.hp = parseInt(configAlien.hp || preset.hp);
        novoAlien.velocidadePerseguicao = parseFloat(configAlien.velocidade || preset.velocidade);
        novoAlien.recompensa = parseInt(configAlien.recompensa || preset.recompensa);
        novoAlien.tipoBaseAlien = tipoBase;
        novoAlien.comportamentoAlien = configAlien.comportamento || 'correr';
        novoAlien.fisicaAlien = configAlien.fisica || 'andar';
        if (novoAlien.fisicaAlien === 'voar' || novoAlien.fisicaAlien === 'nadar') {
            novoAlien.velocidadePerseguicao = Math.abs(novoAlien.velocidadePerseguicao || 0);
            if (novoAlien.velocidadePerseguicao < 80) {
                novoAlien.velocidadePerseguicao = novoAlien.fisicaAlien === 'voar' ? 260 : 180;
            }
        }
        if (novoAlien.fisicaAlien === 'voar' || novoAlien.fisicaAlien === 'nadar') {
            novoAlien.body.setAllowGravity(false);
            novoAlien.body.setDrag(80, novoAlien.fisicaAlien === 'nadar' ? 180 : 80);
            novoAlien.body.setMaxVelocity(novoAlien.velocidadePerseguicao, novoAlien.velocidadePerseguicao * 0.75);
            novoAlien.setY(posY);
        } else {
            novoAlien.body.setAllowGravity(true);
        }
        novoAlien.corPoderAlien = configAlien.corPoder || '#ff3355';
        novoAlien.corPoderAlienInt = Phaser.Display.Color.HexStringToColor(novoAlien.corPoderAlien).color;
        novoAlien.alcanceTiro = parseInt(configAlien.alcanceTiro || preset.alcanceTiro);
        novoAlien.recargaTiro = parseInt(configAlien.recargaTiro || preset.recargaTiro);
        novoAlien.velocidadePoderAlien = parseFloat(configAlien.velocidadePoder || preset.velocidadePoder);
        novoAlien.raioPoderAlien = parseFloat(configAlien.raioPoder || preset.raioPoder);
        novoAlien.intensidadePoderAlien = parseFloat(configAlien.intensidadePoder || preset.intensidadePoder);
        novoAlien.escalaPoderAlien = parseFloat(configAlien.escalaPoder || preset.escalaPoder);
        let chaveAnimacao = this.obterAnimacaoAlien(configAlien);
        if (chaveAnimacao) novoAlien.anims.play(chaveAnimacao, true);
        
        // === MÁGICA DA ESCALA DO EDITOR ===
        // Se você digitou uma escala no Editor, ela substitui a escala padrão do monstro!
        if (configAlien.escalaCustomizada && configAlien.escalaCustomizada !== "") {
            let valorEscala = parseFloat(configAlien.escalaCustomizada);
            novoAlien.setScale(valorEscala);
            
            // Opcional: Aumenta o HP e o Dano baseado no tamanho dele para virar um Chefe!
            if (valorEscala > 2.0) {
                novoAlien.hp *= 3; 
                novoAlien.recompensa *= 2;
            }
        }
        novoAlien.escalaBaseVisual = novoAlien.scaleX;
        const modoTremorCaminhada = configAlien.tremorCaminhada || 'auto';
        novoAlien.tremeAoCaminhar = modoTremorCaminhada === 'sempre' || (modoTremorCaminhada !== 'nunca' && novoAlien.escalaBaseVisual > 2.5);
        novoAlien.intervaloTremorCaminhada = Phaser.Math.Clamp(620 - (novoAlien.escalaBaseVisual * 85), 240, 520);
        novoAlien.sombra = this.criarSombraContato(posX, posY + 90, (profundidadeZ || 20) - 1, novoAlien.scaleX * 0.9, 0.26, 0.18);
        novoAlien.alcanceAtaque = parseInt(configAlien.alcanceAtaque || preset.alcanceAtaque);
        novoAlien.recargaAtaque = parseInt(configAlien.recargaAtaque || preset.recargaAtaque);

        let distanciaX = posX - this.jogador.x;
        let panCalculado = Phaser.Math.Clamp(distanciaX / 1000, -1, 1);

        this.sound.play('som_alien_grito', { 
            volume: 0.4, 
            rate: Phaser.Math.FloatBetween(0.8, 1.2), 
            pan: panCalculado 
        });

        return novoAlien;
    }

    gerarItemInterativo(tipoItem, posX, posY) {
        let spriteKey = tipoItem === 'fogueira' ? null : 'arte_capsula';
        if (tipoItem === 'cabana') spriteKey = null; 
        
        let itemObj = this.itensInterativos.create(posX, posY, spriteKey);
        itemObj.setPipeline('Light2D').setDepth(15);
        itemObj.tipo = tipoItem;

        if (tipoItem === 'cabana') {
            itemObj.setSize(250, 200); 
            itemObj.luz = this.lights.addLight(posX, posY + 40, 200).setColor(0x00ff00).setIntensity(1.5);
            itemObj.sombra = this.criarSombraContato(posX, posY + 92, 14, 1.25, 0.34, 0.16);
        } else if (tipoItem === 'fogueira') {
            itemObj.setSize(250, 200).setVisible(false); 
            itemObj.fogoVisual = this.add.particles(posX, posY + 30, 'gota_sangue', { color: [0xffaa00, 0xff4400, 0x222222], speed: { min: 50, max: 150 }, angle: { min: 240, max: 300 }, scale: { start: 1.5, end: 0 }, lifespan: 800, blendMode: 'ADD' }).setDepth(15);
            itemObj.luz = this.lights.addLight(posX, posY, 300, 0xffaa00, 2);
            itemObj.sombra = this.criarSombraContato(posX, posY + 70, 14, 1.1, 0.30, 0.14);
        } else {
            let corLuz = 0x00ff00; 
            if (tipoItem === 'bolha_ar') corLuz = 0x0088ff;
            if (tipoItem === 'resfriador') corLuz = 0x00ffff;
            if (tipoItem === 'barreira') corLuz = 0xffaa00;
            itemObj.luz = this.lights.addLight(posX, posY, 300).setColor(corLuz).setIntensity(1.5);
            itemObj.sombra = this.criarSombraContato(posX, posY + 52, 14, 0.82, 0.24, 0.13);
        }
    }

    acionarItem(jogador, itemObj) {
        if (itemObj.tipo !== 'cabana') {
            this.emAreaSegura = true; 
        }

        if (itemObj.tipo === 'cabana') {
            itemObj.luz.setIntensity(1.5 + Math.sin(this.time.now / 150) * 0.5);
        } else if (itemObj.tipo === 'fogueira') {
            itemObj.fogoVisual.setScale(2);
        } else {
            itemObj.setAlpha(0.6 + Math.sin(this.time.now / 50) * 0.4);
            itemObj.luz.setIntensity(3);
        }
    }
}
