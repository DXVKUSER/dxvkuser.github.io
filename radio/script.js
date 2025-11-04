// Configurações
const LASTFM_API_KEY = '73b5fb24854700c462c68a42d7ccae2b';
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// *** URL DO PROXY FORNECIDO (Se falhar, teremos que mudar de proxy) ***
const PROXY_URL = 'http://18.188.141.177:1145/'; 

// URL do stream de áudio (para o player HTML5)
const STREAM_URL = 'https://streamconex.com:8096/stream';

// URL BASE do Shoutcast para metadados (para ser usada pelo Proxy)
const SHOUTCAST_BASE_URL = 'https://streamconex.com:8096';

// Tentativas de URL para metadados (Texto Puro) - usando o proxy
const METADATA_URLS = [
    // Tenta obter metadados via endpoint padrão V2
    PROXY_URL + SHOUTCAST_BASE_URL + '/currentmetadata?sid=1', 
    // Tenta obter metadados via endpoint V1 (Texto simples)
    PROXY_URL + SHOUTCAST_BASE_URL + '/7.html',                 
];

// Elementos do DOM (Verifique se estes IDs estão no seu index.html)
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
 * FUNÇÃO PRINCIPAL: Tenta buscar metadados usando o Proxy.
 */
async function getShoutcastMetadata() {
    streamStatusEl.textContent = 'Status: Buscando metadados via Proxy...';
    
    for (const url of METADATA_URLS) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                continue; 
            }
            
            let metadata = await response.text();
            
            // Tratamento especial para o endpoint 7.html
            if (url.includes('7.html')) {
                // Formato: <body>1,2,Artista - Título</body>
                const bodyMatch = metadata.match(/<body>(.*?)<\/body>/i);
                if (bodyMatch) {
                    const rawData = bodyMatch[1].split(',');
                    metadata = rawData.length >= 3 ? rawData.slice(2).join(' - ').trim() : '';
                } else {
                    metadata = '';
                }
            }
            
            if (!metadata || metadata.length < 5 || metadata.toLowerCase().includes('offline')) { 
                continue;
            }

            // Parsing do formato: "Artista - Título"
            const parts = metadata.split(' - ');
            let artist = 'Artista Desconhecido';
            let title = metadata.trim();
            
            if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim(); 
            }
            
            streamStatusEl.textContent = `Status: Metadados encontrados!`;
            return { artist, title }; // Sucesso
            
        } catch (error) {
            console.error(`Falha ao tentar ${url}:`, error);
        }
    }

    // Se todas as URLs falharem (Provavelmente o Proxy)
    streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Proxy ou Stream indisponível)';
    return { artist: 'Neon Indie Radio', title: 'Carregando...' };
}

// *** Funções de Busca de Capa e Artista (Last.fm) ***

async function getAlbumArt(artist, track) {
    if (!artist || !track || artist === 'Neon Indie Radio') return 'placeholder.png';
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.track && data.track.album && data.track.album.image) {
            const images = data.track.album.image;
            // Busca a imagem extragrande ou grande
            const imageUrl = images.find(img => img.size === 'extralarge' || img.size === 'large')['#text'];
            if (imageUrl) return imageUrl;
        }
        return await getArtistImage(artist); // Tenta imagem do artista se a do álbum falhar
    } catch (error) {
        return await getArtistImage(artist); 
    }
}

async function getArtistImage(artist) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.artist && data.artist.image) {
             const images = data.artist.image;
             const imageUrl = images.find(img => img.size === 'extralarge' || img.size === 'large')['#text'];
             if (imageUrl) return imageUrl;
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
    const metadata = await getShoutcastMetadata();
    const newArtist = metadata.artist;
    const newTitle = metadata.title;
    const isMetadataValid = newArtist !== 'Neon Indie Radio' && newTitle !== 'Carregando...';
    const isNewTrack = newArtist !== currentTrack.artist || newTitle !== currentTrack.title;

    if (isNewTrack && isMetadataValid) {
        
        // Adiciona a faixa anterior ao histórico
        if (currentTrack.artist && currentTrack.title) {
            playbackHistory.unshift(currentTrack);
            playbackHistory = playbackHistory.slice(0, HISTORY_LIMIT);
            updateHistoryList();
        }

        // Define a nova faixa
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

// *** Função de Inicialização e Eventos ***

function init() {
    // Garante que o player use a URL HTTPS correta
    const sourceEl = radioPlayer.querySelector('source');
    if (sourceEl && sourceEl.src !== STREAM_URL) {
        sourceEl.src = STREAM_URL;
        radioPlayer.load();
    }
    
    // Event listeners para o player de áudio para atualizar o status
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';

    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', init);
