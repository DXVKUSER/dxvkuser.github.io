// Configurações
const LASTFM_API_KEY = '73b5fb24854700c462c68a42d7ccae2b';
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000;

// *** MUDANÇA PRINCIPAL: ENDPOINTS SHOUTCAST v2 (HTTPS) ***
// O proxy é necessário para buscar metadados de qualquer outro domínio (CORS)
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; 
const SHOUTCAST_METADATA_URL = PROXY_URL + 'https://streamconex.com:8096/currentmetadata?sid=1';

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
 * FUNÇÃO CORRIGIDA: Busca metadados do Shoutcast v2 (Texto Puro)
 */
async function getShoutcastMetadata() {
    try {
        streamStatusEl.textContent = 'Status: Buscando metadados (Shoutcast v2)...';
        
        // A requisição vai para o proxy, que retorna o texto do metadado
        const response = await fetch(SHOUTCAST_METADATA_URL);
        
        if (!response.ok) {
            throw new Error(`Proxy/Server retornou status ${response.status}`);
        }
        
        const metadata = await response.text();
        
        // Parsing do formato: "Artista - Título"
        const parts = metadata.split(' - ');
        let artist = 'Artista Desconhecido';
        let title = 'Título Desconhecido';
        
        if (parts.length >= 2) {
            artist = parts[0].trim();
            // Lida com títulos que podem conter '-'
            title = parts.slice(1).join(' - ').trim(); 
        } else if (metadata) {
             title = metadata.trim(); // Se só tiver o título
        }

        streamStatusEl.textContent = 'Status: Online';
        return { artist, title };

    } catch (error) {
        console.error('Erro ao buscar metadados do Shoutcast:', error);
        streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Proxy ou Stream indisponível)';
        return { artist: 'Neon Indie Radio', title: 'Carregando...' };
    }
}

/**
 * Busca a capa do álbum usando a API do Last.fm.
 * (Esta função não muda)
 */
async function getAlbumArt(artist, track) {
    if (!artist || !track || artist === 'Neon Indie Radio') return 'placeholder.png';

    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.track && data.track.album && data.track.album.image) {
            const images = data.track.album.image;
            const imageUrl = images.find(img => img.size === 'extralarge' || img.size === 'large')['#text'];
            
            if (imageUrl) {
                return imageUrl;
            }
        }
        
        return await getArtistImage(artist);

    } catch (error) {
        console.error('Erro ao buscar imagem da capa no Last.fm:', error);
        return await getArtistImage(artist); 
    }
}

/**
 * Fallback: Busca a imagem do artista no Last.fm.
 * (Esta função não muda)
 */
async function getArtistImage(artist) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.artist && data.artist.image) {
             const images = data.artist.image;
             const imageUrl = images.find(img => img.size === 'extralarge' || img.size === 'large')['#text'];
             if (imageUrl) {
                 return imageUrl;
             }
        }
        return 'placeholder.png'; // Fallback final
    } catch (error) {
        console.error('Erro ao buscar imagem do artista no Last.fm:', error);
        return 'placeholder.png';
    }
}


/**
 * Atualiza o histórico de reprodução na interface.
 * (Esta função não muda)
 */
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

/**
 * Função principal para atualizar as informações da rádio.
 * (Esta função não muda)
 */
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
    } else if (!isMetadataValid) {
        currentArtistEl.textContent = newArtist;
        currentTitleEl.textContent = newTitle;
        currentTitleEl.classList.remove('neon-glow');
        albumArtEl.src = 'placeholder.png';
    }
}

// Inicialização
function init() {
    // Feedback para o player
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴 (Verifique a URL/Mountpoint)';

    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', init);
