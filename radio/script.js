// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// *** A API do Last.fm foi removida para usar a da Apple/iTunes que não requer chave. ***
// const LASTFM_API_KEY = '73b5fb24854700c462c68a42d7ccae2b'; 

// *** URL DO PROXY (HTTPS CORRIGIDO) ***
// Se esta URL falhar, o problema é o servidor 18.188.141.177 ou seu firewall.
const PROXY_URL = 'https://18.188.141.177:1145/'; 

const SHOUTCAST_BASE_URL = 'https://streamconex.com:8096';

// Tentativas de URL para metadados (Texto Puro) - usando o novo proxy
const METADATA_URLS = [
    PROXY_URL + SHOUTCAST_BASE_URL + '/currentmetadata?sid=1', // Padrão v2
    PROXY_URL + SHOUTCAST_BASE_URL + '/7.html',                 // Padrão v1 (Texto simples)
];

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
 * FUNÇÃO OTIMIZADA: Tenta buscar metadados em múltiplos endpoints Shoutcast usando o Proxy.
 */
async function getShoutcastMetadata() {
    // Mantido o status para indicar que está tentando o proxy.
    streamStatusEl.textContent = 'Status: Buscando metadados via Proxy (HTTPS)...';
    
    for (const url of METADATA_URLS) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                continue; 
            }
            
            let metadata = await response.text();
            
            // Tratamento especial para o endpoint 7.html
            if (url.includes('7.html')) {
                metadata = metadata.match(/<body>(.*?)<\/body>/i);
                metadata = metadata = metadata ? metadata[1].split(',').slice(2).join(' - ').trim() : ''; 
            }
            
            if (!metadata || metadata.length < 5) { 
                continue;
            }

            // Parsing do formato: "Artista - Título"
            const parts = metadata.split(' - ');
            let artist = 'Artista Desconhecido';
            let title = 'Título Desconhecido';
            
            if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim(); 
            } else if (metadata) {
                 title = metadata.trim();
            }

            streamStatusEl.textContent = `Status: Metadados encontrados com sucesso!`;
            return { artist, title }; // Sucesso

        } catch (error) {
            console.error(`Falha ao tentar ${url}:`, error);
        }
    }

    // Se todas as URLs falharem
    streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Proxy ou Endpoint Shoutcast indisponível)';
    return { artist: 'Neon Indie Radio', title: 'Carregando...' };
}


/**
 * NOVO: Busca a capa do álbum usando a API pública da Apple/iTunes.
 */
async function getAlbumArt(artist, track) {
    if (!artist || !track || artist === 'Neon Indie Radio') return 'placeholder.png';

    // A pesquisa do iTunes é por termo geral e retorna JSON
    const query = `${artist} ${track}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            // O campo artworkUrl100 pode ser alterado para obter resoluções maiores
            // Trocamos "100x100" por "600x600" para uma imagem melhor
            let imageUrl = result.artworkUrl100.replace('100x100bb', '600x600bb');
            
            return imageUrl;
        }
        
        // Se a busca falhar, retorna o placeholder
        return 'placeholder.png';

    } catch (error) {
        console.error('Erro ao buscar capa no iTunes:', error);
        return 'placeholder.png';
    }
}


// *** Funções de Histórico e Inicialização - Inalteradas ***

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
    const metadata = await getShoutcastMetadata();
    const newArtist = metadata.artist;
    const newTitle = metadata.title;
    const isMetadataValid = newArtist !== 'Neon Indie Radio' && newTitle !== 'Carregando...';
    const isNewTrack = newArtist !== currentTrack.artist || newTitle !== currentTrack.title;
    if (isNewTrack && isMetadataValid) {
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
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';
    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
