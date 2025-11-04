// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// *** PARTE DE CONEXÃO REAL COMENTADA PARA O TESTE ***
const SHOUTCAST_XML_URL = 'http://78.129.150.207:8081/admin.cgi?pass=6565&mode=viewxml'; 
const PROXY_URL = 'https://51.38.191.151:80/'; 
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


/**
 * FUNÇÃO DE SIMULAÇÃO (APENAS PARA TESTE)
 * Retorna dados fixos para testar a busca de capa e o histórico.
 */
async function getSimulatedMetadata() {
    // 1. Música que será adicionada ao histórico
    if (playbackHistory.length === 0) {
        streamStatusEl.textContent = 'Status: Simulação - Adicionando ao Histórico...';
        return { artist: 'Duran Duran', title: 'Ordinary World' }; 
    }
    
    // 2. Música atual (Tears for Fears)
    streamStatusEl.textContent = 'Status: Simulação - Tears for Fears';
    return { artist: 'Tears for Fears', title: 'Everybody Wants To Rule The World' };
}


/**
 * FUNÇÃO PRINCIPAL: Substituída por getSimulatedMetadata para este teste.
 * * async function getShoutcastMetadata() { ... }
 */


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
 * Busca a capa do álbum usando a API pública da Apple/iTunes (sem chave).
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
            // Troca 100x100 por 600x600 para uma imagem maior
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

async function updateRadioInfo() {
    // *** CHAMANDO A FUNÇÃO DE SIMULAÇÃO ***
    const metadata = await getSimulatedMetadata();
    
    const newArtist = metadata.artist;
    const newTitle = metadata.title;
    const isMetadataValid = newArtist !== 'Neon Indie Radio' && newTitle !== 'Conectando ao éter...';
    // Testa se é uma nova faixa (sempre será na primeira execução)
    const isNewTrack = newArtist !== currentTrack.artist || newTitle !== currentTrack.title;
    
    if (isNewTrack && isMetadataValid) {
        if (currentTrack.artist && currentTrack.title) {
            // Adiciona a faixa anterior (Duran Duran) ao histórico
            playbackHistory.unshift(currentTrack);
            playbackHistory = playbackHistory.slice(0, HISTORY_LIMIT);
            updateHistoryList();
        }
        
        // Define a faixa atual (Tears for Fears)
        currentTrack.artist = newArtist;
        currentTrack.title = newTitle;
        currentArtistEl.textContent = newArtist;
        currentTitleEl.textContent = newTitle;
        currentTitleEl.classList.add('neon-glow'); 
        
        // Busca a capa para a faixa atual
        const albumArtUrl = await getAlbumArt(newArtist, newTitle);
        albumArtEl.src = albumArtUrl;
        
    } else {
        currentArtistEl.textContent = newArtist;
        currentTitleEl.textContent = newTitle;
        currentTitleEl.classList.remove('neon-glow');
        if (!isMetadataValid) {
            albumArtEl.src = 'placeholder.png';
        }
    }
}
function init() {
    // Garante que o source do player esteja correto
    if (radioPlayer.querySelector('source').src !== STREAM_URL) {
        radioPlayer.querySelector('source').src = STREAM_URL;
        radioPlayer.load();
    }
    
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';
    updateRadioInfo(); 
    // O intervalo garantirá a transição de Duran Duran para Tears for Fears
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
