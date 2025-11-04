// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// URL direta do stream (para o reprodutor de áudio)
const STREAM_URL = 'https://streamconex.com:8096/stream'; 

// Elementos do DOM
const currentTitleEl = document.getElementById('current-track-title');
const currentArtistEl = document.getElementById('current-artist');
const albumArtEl = document.getElementById('album-art');
const historyListEl = document.getElementById('playback-history');
const streamStatusEl = document.getElementById('stream-status');
const radioPlayer = document.getElementById('radio-player');

// Variável de estado
let currentTrack = { title: '', artist: '' };
let playbackHistory = [];

// Funções de Metadados (Simplificadas)

/**
 * Funções de Metadados Simplificadas: Apenas tenta ler o metadado que o navegador expõe.
 * Se o navegador for capaz de ler o ICY-Metadata, ele estará em radioPlayer.textTracks.
 */
function getShoutcastMetadata() {
    // 1. Tenta pegar metadados do próprio player de áudio (se o navegador os expôs)
    let fullTitle = 'Conectando ao éter...';
    
    // O Chrome/Firefox/Edge às vezes expõem o metadado na propriedade 'default' do textTracks.
    if (radioPlayer.textTracks && radioPlayer.textTracks.length > 0) {
        for (let i = 0; i < radioPlayer.textTracks.length; i++) {
            const track = radioPlayer.textTracks[i];
            if (track.kind === 'metadata' || track.mode === 'showing') {
                // Tenta ouvir por eventos de metadados
                track.oncuechange = function() {
                    if (track.activeCues && track.activeCues.length > 0) {
                        // O valor exato aqui depende do navegador e do stream
                        fullTitle = track.activeCues[0].text || fullTitle;
                        updateMetadataFromTitle(fullTitle);
                    }
                };
            }
        }
    }

    // Se a leitura do textTrack for muito complexa, voltamos ao padrão mais simples
    const metadata = parseMetadata(fullTitle);
    streamStatusEl.textContent = 'Status: Reproduzindo 🟢 (Modo Básico)';
    return metadata;
}

// Tenta atualizar a interface usando o título encontrado no player (caso o oncuechange seja acionado)
function updateMetadataFromTitle(fullTitle) {
    const metadata = parseMetadata(fullTitle);
    const newArtist = metadata.artist;
    const newTitle = metadata.title;
    const isNewTrack = newArtist !== currentTrack.artist || newTitle !== currentTrack.title;
    
    if (isNewTrack) {
        // Lógica de histórico e UI
        if (currentTrack.artist && currentTrack.title) {
            playbackHistory.unshift(currentTrack);
            playbackHistory = playbackHistory.slice(0, HISTORY_LIMIT);
            updateHistoryList();
        }
        currentTrack.artist = newArtist;
        currentTrack.title = newTitle;
        currentArtistEl.textContent = newArtist;
        currentTitleEl.textContent = newTitle;
        currentTitleEl.classList.add('neon-glow'); 
        // A busca de capa (iTunes) ainda é feita
        getAlbumArt(newArtist, newTitle).then(url => albumArtEl.src = url);
    }
}


/**
 * Função Auxiliar: Faz o parsing de "Artista - Título"
 */
function parseMetadata(fullTitle) {
    let artist = 'Artista Desconhecido';
    let title = fullTitle.trim();
    
    const parts = fullTitle.split(' - ');
    if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim(); 
    }
    
    return { artist, title };
}


/**
 * Busca a capa do álbum usando a API pública da Apple/iTunes (funciona no GitHub Pages).
 */
async function getAlbumArt(artist, track) {
    if (!artist || !track || artist === 'Neon Indie Radio') return 'placeholder.png';

    const query = `${artist} ${track}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            let imageUrl = result.artworkUrl100.replace('100x100bb', '600x600bb');
            return imageUrl;
        }
        
        return 'placeholder.png';

    } catch (error) {
        return 'placeholder.png';
    }
}

// *** Funções de Interface (Histórico e Atualização) ***

function updateHistoryList() {
    historyListEl.innerHTML = ''; 
    if (playbackHistory.length === 0) {
        historyListEl.innerHTML = '<li>Nenhum histórico disponível ainda.</li>';
        return;
    }
    playbackHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.artist} - ${item.title}`;
        historyListEl.appendChild(li);
    });
}

// A função de atualização agora é simplificada
async function updateRadioInfo() {
    // Apenas tenta configurar a escuta do metadado do player
    getShoutcastMetadata(); 
}

function init() {
    // Garante que o source do player esteja correto
    if (radioPlayer.querySelector('source').src !== STREAM_URL) {
        radioPlayer.querySelector('source').src = STREAM_URL;
        radioPlayer.load();
    }
    
    // Status básico do player
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';

    updateRadioInfo(); 
    // Mantenha o intervalo para tentar capturar a mudança de faixa
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
