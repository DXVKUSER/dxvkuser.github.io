// Configurações
const LASTFM_API_KEY = '73b5fb24854700c462c68a42d7ccae2b';

// *** CORREÇÃO CORS ***
// Usamos um proxy público para contornar a restrição de CORS ao buscar os metadados do Shoutcast.
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; 
const SHOUTCAST_RAW_URL = 'http://uk3freenew.listen2myradio.com:8081/currentmetadata?sid=1';
const SHOUTCAST_METADATA_URL = PROXY_URL + SHOUTCAST_RAW_URL;

const HISTORY_LIMIT = 10; // Limite de músicas no histórico
const UPDATE_INTERVAL = 15000; // 15 segundos (intervalo de atualização)

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
 * Busca os metadados do Shoutcast através do Proxy.
 */
async function getShoutcastMetadata() {
    try {
        streamStatusEl.textContent = 'Status: Buscando metadados via Proxy...';
        
        const response = await fetch(SHOUTCAST_METADATA_URL);
        
        if (!response.ok) {
            throw new Error(`Proxy/Server retornou status ${response.status}`);
        }
        
        const metadata = await response.text();
        
        // O formato é geralmente "Artista - Título"
        const parts = metadata.split(' - ');
        let artist = 'Artista Desconhecido';
        let title = 'Título Desconhecido';
        
        if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        } else if (metadata) {
             title = metadata.trim();
        }

        streamStatusEl.textContent = 'Status: Online';
        return { artist, title };

    } catch (error) {
        console.error('Erro ao buscar metadados, mesmo com Proxy:', error);
        // Fallback em caso de erro no proxy ou servidor de streaming
        streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Proxy ou Stream indisponível)';
        return { artist: 'Neon Indie Radio', title: 'Carregando...' };
    }
}

/**
 * Busca a capa do álbum usando a API do Last.fm.
 */
async function getAlbumArt(artist, track) {
    if (!artist || !track || artist === 'Neon Indie Radio') return 'placeholder.png';

    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // 1. Tenta encontrar a imagem da faixa/álbum
        if (data.track && data.track.album && data.track.album.image) {
            const images = data.track.album.image;
            // Busca o tamanho 'extralarge' ou 'large'
            const imageUrl = images.find(img => img.size === 'extralarge' || img.size === 'large')['#text'];
            
            if (imageUrl) {
                return imageUrl;
            }
        }
        
        // 2. Fallback: Tenta a imagem do artista
        return await getArtistImage(artist);

    } catch (error) {
        console.error('Erro ao buscar imagem da capa no Last.fm:', error);
        return await getArtistImage(artist); 
    }
}

/**
 * Fallback: Busca a imagem do artista no Last.fm.
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
 */
function updateHistoryList() {
    historyListEl.innerHTML = ''; // Limpa a lista

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
 */
async function updateRadioInfo() {
    const metadata = await getShoutcastMetadata();
    const newArtist = metadata.artist;
    const newTitle = metadata.title;

    // Verifica se a música mudou e se a metadata é válida (não o placeholder)
    const isMetadataValid = newArtist !== 'Neon Indie Radio' && newTitle !== 'Carregando...';
    const isNewTrack = newArtist !== currentTrack.artist || newTitle !== currentTrack.title;

    if (isNewTrack && isMetadataValid) {
        
        // 1. Atualiza o histórico (se não for a primeira carga)
        if (currentTrack.artist && currentTrack.title) {
            // Adiciona a música anterior ao histórico
            playbackHistory.unshift(currentTrack);
            // Mantém apenas o limite definido
            playbackHistory = playbackHistory.slice(0, HISTORY_LIMIT);
            updateHistoryList();
        }

        // 2. Atualiza a música atual
        currentTrack.artist = newArtist;
        currentTrack.title = newTitle;
        currentArtistEl.textContent = newArtist;
        currentTitleEl.textContent = newTitle;
        currentTitleEl.classList.add('neon-glow'); // Reativa o brilho

        // 3. Busca e atualiza a capa do álbum
        const albumArtUrl = await getAlbumArt(newArtist, newTitle);
        albumArtEl.src = albumArtUrl;
    } else if (!isMetadataValid) {
        // Se a metadata for inválida, apenas atualiza a interface com o placeholder
        currentArtistEl.textContent = newArtist;
        currentTitleEl.textContent = newTitle;
        currentTitleEl.classList.remove('neon-glow');
        albumArtEl.src = 'placeholder.png';
    }
}

// Inicialização
function init() {
    // Adiciona listener para controle do stream (para feedback visual)
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢 (Lembre-se: o player deve ser iniciado manualmente)';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴 (URL de streaming falhou)';

    // Chama a atualização imediatamente e configura o intervalo
    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', init);
