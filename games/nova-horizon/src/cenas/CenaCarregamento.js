class CenaCarregamento extends Phaser.Scene {
    constructor() {
        super('CenaCarregamento');
    }

    init(data) {
        this.dadosTransmissao = data || {};
        this.idFase = this.dadosTransmissao.planetaDestino || 'fase_1';
        this.chaveMapaAtual = `dados_mapa_${this.idFase}`;
        this.mapaCarregado = null;
        this.assetsMapaPreparados = false;
        this.precisaJoystickPlugin = !this.sys.game.device.os.desktop && !this.registry.get('joystick_carregado');

        this.limparCacheDaFaseAnterior();
        this.registry.set(`fase_pronta_${this.idFase}`, false);
    }

    preload() {
        this.criarTelaCarregamento();
        this.registrarEventosLoader();
        this.enfileirarAssetsBase();
        this.load.json(this.chaveMapaAtual, `assets/mapas/${this.idFase}.json`);
    }

    create() {
        const mapa = this.mapaCarregado || this.cache.json.get(this.chaveMapaAtual);
        this.atualizarDescricaoMissao(mapa);
        this.atualizarBarra(1);
        this.textoStatus.setText('SISTEMAS PRONTOS');

        this.cameras.main.flash(250, 0, 255, 255);
        this.time.delayedCall(180, () => {
            this.scene.start('CenaFase', {
                ...this.dadosTransmissao,
                planetaDestino: this.idFase
            });
        });
    }

    criarTelaCarregamento() {
        const cx = this.scale.width * 0.5;
        const cy = this.scale.height * 0.5;

        this.cameras.main.setBackgroundColor('#02060d');
        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x02060d, 1);
        this.add.rectangle(cx, cy, this.scale.width * 0.82, 210, 0x071522, 0.92).setStrokeStyle(1, 0x1a425f, 0.85);
        this.add.rectangle(cx, cy - 78, 460, 2, 0x103852, 0.9);

        this.textoTitulo = this.add.text(cx, cy - 112, 'SINCRONIZANDO MISSAO', {
            fontFamily: '"Courier New", monospace',
            fontSize: '28px',
            color: '#8ee6ff',
            letterSpacing: 3
        }).setOrigin(0.5);

        this.textoMissao = this.add.text(cx, cy - 62, this.idFase.toUpperCase(), {
            fontFamily: '"Courier New", monospace',
            fontSize: '14px',
            color: '#6f93aa',
            letterSpacing: 2
        }).setOrigin(0.5);

        this.textoStatus = this.add.text(cx, cy - 8, 'PREPARANDO ARQUIVOS...', {
            fontFamily: '"Courier New", monospace',
            fontSize: '16px',
            color: '#d7f8ff',
            letterSpacing: 1
        }).setOrigin(0.5);

        this.barraFundo = this.add.rectangle(cx, cy + 38, 520, 18, 0x08131d, 1)
            .setStrokeStyle(1, 0x1f6c8d, 0.9);
        this.barraProgresso = this.add.rectangle(cx - 260, cy + 38, 4, 10, 0x33d7ff, 1).setOrigin(0, 0.5);

        this.textoPercentual = this.add.text(cx, cy + 72, '0%', {
            fontFamily: '"Courier New", monospace',
            fontSize: '18px',
            color: '#33d7ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.textoTitulo,
            alpha: 0.55,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    registrarEventosLoader() {
        this.load.on('progress', (valor) => this.atualizarBarra(valor));
        this.load.on('fileprogress', (arquivo) => {
            const nome = String(arquivo?.key || 'recurso').split('_').join(' ').toUpperCase();
            this.textoStatus.setText(`CARREGANDO ${nome}...`);
        });
        this.load.on('filecomplete', (key, type) => {
            if (type === 'json' && key === this.chaveMapaAtual) {
                this.mapaCarregado = this.cache.json.get(this.chaveMapaAtual);
                this.atualizarDescricaoMissao(this.mapaCarregado);
                this.enfileirarAssetsDoMapa(this.mapaCarregado);
            }
        });
        this.load.once('complete', () => {
            if (this.precisaJoystickPlugin) {
                this.registry.set('joystick_carregado', true);
            }
            this.registry.set(`fase_pronta_${this.idFase}`, true);
            this.registry.set(`assets_baixados_${this.idFase}`, true);
            this.registrarAssetsDaFaseAtual(this.mapaCarregado || this.cache.json.get(this.chaveMapaAtual));
        });
    }

    atualizarDescricaoMissao(mapa) {
        const nome = mapa?.nomeFase || this.idFase;
        this.textoMissao.setText(String(nome).toUpperCase());
    }

    atualizarBarra(valor) {
        const progresso = Phaser.Math.Clamp(valor || 0, 0, 1);
        this.barraProgresso.width = Math.max(4, 520 * progresso);
        this.textoPercentual.setText(`${Math.round(progresso * 100)}%`);
    }

    enfileirarAssetsBase() {
        this.enfileirarImagemSeNecessario('tiro_padrao', 'assets/ui/tiro_padrao.png');
        this.enfileirarImagemSeNecessario('tiro_fuzil', 'assets/ui/tiro_fuzil.png');
        this.enfileirarImagemSeNecessario('tiro_canhao', 'assets/ui/tiro_canhao.png');

        this.enfileirarAtlasSeNecessario('astronauta', 'assets/personagens/atlas_astro.png', 'assets/personagens/atlas_astro.json');
        this.enfileirarJsonSeNecessario('dados_atlas', 'assets/personagens/atlas_astro.json');

        this.enfileirarAtlasSeNecessario('alien_comum', 'assets/personagens/atlas_alien_comum.png', 'assets/personagens/atlas_alien_comum.json');
        this.enfileirarAtlasSeNecessario('alien_veloz', 'assets/personagens/atlas_alien_veloz.png', 'assets/personagens/atlas_alien_veloz.json');
        this.enfileirarAtlasSeNecessario('alien_tanque', 'assets/personagens/atlas_alien_tanque.png', 'assets/personagens/atlas_alien_tanque.json');
        this.enfileirarAtlasSeNecessario('yeti', 'assets/personagens/atlas_yeti.png', 'assets/personagens/atlas_yeti.json');

        if (this.precisaJoystickPlugin) {
            this.load.plugin('rexvirtualjoystickplugin', 'rexvirtualjoystickplugin.min.js', true);
        }

        this.enfileirarImagemSeNecessario('braco_padrao', 'assets/personagens/braco_padrao.png');
        this.enfileirarImagemSeNecessario('braco_fuzil', 'assets/personagens/braco_fuzil.png');
        this.enfileirarImagemSeNecessario('braco_canhao', 'assets/personagens/braco_canhao.png');
        this.enfileirarImagemSeNecessario('nave_resgate', 'assets/cenarios/nave_resgate.png');
        this.enfileirarImagemSeNecessario('capacete_trincado', 'assets/ui/capacete_trincado.png');

        this.enfileirarAudioSeNecessario('som_tiro', 'assets/audio/tiro.mp3');
        this.enfileirarAudioSeNecessario('som_passos', 'assets/audio/passos.mp3');
        this.enfileirarAudioSeNecessario('som_chuva', 'assets/audio/chuva.mp3');
        this.enfileirarAudioSeNecessario('som_alien_morte', 'assets/audio/alien_morte.mp3');
        this.enfileirarAudioSeNecessario('som_alien_grito', 'assets/audio/alien_grito.mp3');
        this.enfileirarAudioSeNecessario('aviso_chuva', 'assets/audio/aviso_chuva.mp3');
        this.enfileirarAudioSeNecessario('aviso_neve', 'assets/audio/aviso_neve.mp3');
        this.enfileirarAudioSeNecessario('fita_gelo', 'assets/audio/fita_gelo.mp3');
        this.enfileirarAudioSeNecessario('musica_fase_1', 'assets/audio/musica_fase_1.mp3');
        this.enfileirarAudioSeNecessario('musica_fase_2', 'assets/audio/musica_fase_2.mp3');
        this.enfileirarAudioSeNecessario('musica_fase_3', 'assets/audio/musica_fase_3.mp3');
        this.enfileirarAudioSeNecessario('musica_fase_4', 'assets/audio/musica_fase_4.mp3');
    }

    enfileirarAssetsDoMapa(mapa) {
        if (!mapa || this.assetsMapaPreparados) return;
        this.assetsMapaPreparados = true;

        (mapa.assetsParaCarregar || []).forEach((asset) => {
            if (asset.tipo === 'atlas') {
                this.enfileirarAtlasSeNecessario(asset.chave, asset.caminho, asset.caminhoJson, true);
            } else if (asset.tipo === 'image') {
                this.enfileirarImagemSeNecessario(asset.chave, asset.caminho, true);
            }
        });
    }

    limparCacheDaFaseAnterior() {
        const faseAnterior = this.registry.get('fase_cache_atual');
        if (!faseAnterior || faseAnterior === this.idFase) return;

        const assets = this.registry.get(`assets_cache_${faseAnterior}`) || [];
        assets.forEach((asset) => {
            if (!asset?.chave) return;
            try {
                if ((asset.tipo === 'image' || asset.tipo === 'atlas') && this.textures.exists(asset.chave)) {
                    this.textures.remove(asset.chave);
                }
                if (asset.tipo === 'video' && this.cache.video.exists(asset.chave)) {
                    this.cache.video.remove(asset.chave);
                }
            } catch (erro) {
                console.warn('Falha ao limpar asset da fase anterior.', asset.chave, erro);
            }
        });

        const chaveMapaAnterior = `dados_mapa_${faseAnterior}`;
        if (this.cache.json.exists(chaveMapaAnterior)) {
            this.cache.json.remove(chaveMapaAnterior);
        }

        this.registry.remove(`assets_cache_${faseAnterior}`);
        this.registry.remove(`fase_pronta_${faseAnterior}`);
        this.registry.remove(`assets_baixados_${faseAnterior}`);
    }

    registrarAssetsDaFaseAtual(mapa) {
        const assets = (mapa?.assetsParaCarregar || [])
            .filter((asset) => asset?.chave && ['image', 'atlas', 'video'].includes(asset.tipo))
            .map((asset) => ({ tipo: asset.tipo, chave: asset.chave }));

        this.registry.set(`assets_cache_${this.idFase}`, assets);
        this.registry.set('fase_cache_atual', this.idFase);
    }

    enfileirarImagemSeNecessario(chave, caminho, forcarRecarga = false) {
        if (forcarRecarga && this.textures.exists(chave)) {
            this.textures.remove(chave);
        }
        if (!this.textures.exists(chave)) {
            this.load.image(chave, caminho);
        }
    }

    enfileirarAtlasSeNecessario(chave, caminhoImagem, caminhoJson, forcarRecarga = false) {
        if (forcarRecarga && this.textures.exists(chave)) {
            this.textures.remove(chave);
        }
        if (!this.textures.exists(chave)) {
            this.load.atlas(chave, caminhoImagem, caminhoJson);
        }
    }

    enfileirarJsonSeNecessario(chave, caminho) {
        if (!this.cache.json.exists(chave)) {
            this.load.json(chave, caminho);
        }
    }

    enfileirarAudioSeNecessario(chave, caminho) {
        if (!this.cache.audio.exists(chave)) {
            this.load.audio(chave, caminho);
        }
    }
}
