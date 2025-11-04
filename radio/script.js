// Configurações
const LASTFM_API_KEY = '73b5fb24854700c462c68a42d7ccae2b';
const SHOUTCAST_METADATA_URL = 'http://uk3freenew.listen2myradio.com:8081/currentmetadata?sid=1';
const HISTORY_LIMIT = 10; // Limite de músicas no histórico
const UPDATE_INTERVAL = 15000; // 15 segundos

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
 * Busca os metadados do Shoutcast (Artista - Título).
 * NOTE: Devido a restrições de CORS, em um ambiente de produção real,
 * você precisará de um servidor proxy no seu domínio para buscar esta URL.
 * Aqui, faremos uma simulação ou dependemos de um proxy simples se disponível.
 */
async function getShoutcastMetadata() {
    try {
        // Tentativa de buscar os metadados brutos (sujeito a erros de CORS)
        streamStatusEl.textContent = 'Status: Buscando metadados...';
        
        // **IMPORTANTE:** Este endpoint provavelmente falhará devido a CORS
        // se você estiver rodando em um navegador local (file://) ou em outro domínio.
        // Assumindo que você tem um proxy ou que o navegador permite (raro)
        const response = await fetch(SHOUTCAST_METADATA_URL);
        const metadata = await response.text();
        
        // O formato é geralmente "Artista - Título"
        const parts = metadata.split(' - ');
        let artist = 'Artista Desconhecido';
        let title = 'Título Desconhecido';
        
        if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim(); // Lida com títulos que contêm '-'
        } else if (metadata) {
             title = metadata.trim(); // Se só tiver o título
        }

        streamStatusEl.textContent = 'Status: Online';
        return { artist, title };

    } catch (error) {
        console.error('Erro ao buscar metadados do Shoutcast. Verifique o CORS/Proxy.', error);
        streamStatusEl.textContent = 'Status: Erro de conexão (CORS?). Usando Placeholder.';
        // Retorna dados de placeholder em caso de falha
        return { artist: 'Neon Indie Radio', title: 'Loading...' };
    }
}

/**
 * Busca a capa do álbum usando a API do Last.fm.
 */
async function getAlbumArt(artist, track) {
    if (!artist || !track) return 'placeholder.png';

    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Tenta encontrar a imagem do álbum
        if (data.track && data.track.album && data.track.album.image) {
            // A API retorna uma lista de tamanhos, pegamos o último (extralarge)
            const images = data.track.album.image;
            const imageUrl = images.find(img => img.size === 'extralarge' || img.size === 'large')['#text'];
            
            if (imageUrl) {
                return imageUrl;
            }
        }
        
        // Se falhar em encontrar a imagem da faixa, tenta a imagem do artista
        return await getArtistImage(artist);

    } catch (error) {
        console.error('Erro ao buscar imagem da capa no Last.fm:', error);
        return await getArtistImage(artist); // Tenta imagem do artista como fallback
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
        historyListEl.innerHTML = '<li>Aguarde o histórico ser preenchido...</li>';
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

    // Verifica se a música mudou
    if (newArtist !== currentTrack.artist || newTitle !== currentTrack.title) {
        console.log(`Música Nova: ${newArtist} - ${newTitle}`);

        // 1. Atualiza o histórico (se não for a primeira carga e a música for válida)
        if (currentTrack.artist && currentTrack.title && currentTrack.artist !== 'Neon Indie Radio' && currentTrack.title !== 'Loading...') {
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

        // 3. Busca e atualiza a capa do álbum
        const albumArtUrl = await getAlbumArt(newArtist, newTitle);
        albumArtEl.src = albumArtUrl;
    }
}

// Inicialização
function init() {
    // Adiciona listener para controle do stream (opcional, para feedback visual)
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';

    // Chama a atualização imediatamente e configura o intervalo
    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', init);