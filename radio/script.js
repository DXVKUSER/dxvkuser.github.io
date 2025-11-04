// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// URL DO STREAM (Para o elemento <audio>)
const STREAM_URL = 'https://streamconex.com:8096/stream';

// Elementos do DOM
const currentTitleEl = document.getElementById('current-track-title');
const currentArtistEl = document.getElementById('current-artist');
const albumArtEl = document.getElementById('album-art');
const historyListEl = document.getElementById('playback-history');
const streamStatusEl = document.getElementById('stream-status');
const radioPlayer = document.getElementById('radio-player');
const playPauseButton = document.getElementById('play-pause-button'); // Novo botão

// Variável de estado
let currentTrack = { title: '', artist: '' };
let playbackHistory = [];

/**
 * FUNÇÃO DE SIMULAÇÃO (APENAS PARA TESTE DO LAYOUT E LÓGICA DO FRONT-END)
 * Retorna dados fixos para testar a busca de capa e o histórico.
 */
async function getSimulatedMetadata() {
    // Na primeira chamada (histórico vazio), retorna a primeira música
    if (playbackHistory.length === 0) {
        return { artist: 'Duran Duran', title: 'Ordinary World' }; 
    }
    // Na segunda chamada em diante, retorna a música principal
    return { artist: 'Tears for Fears', title: 'Everybody Wants To Rule The World' };
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
    // *** CHAMANDO A FUNÇÃO DE SIMULAÇÃO PARA TESTE ***
    const metadata = await getSimulatedMetadata();
    
    const newArtist = metadata.artist;
    const newTitle = metadata.title;
    const isMetadataValid = newArtist !== 'Neon Indie Radio' && newTitle !== 'Conectando ao éter...';
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

// Lógica para o botão Play/Pause
playPauseButton.addEventListener('click', () => {
    if (radioPlayer.paused) {
        radioPlayer.play();
        playPauseButton.classList.add('playing');
        streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    } else {
        radioPlayer.pause();
        playPauseButton.classList.remove('playing');
        streamStatusEl.textContent = 'Status: Pausado ⏸️';
    }
});

function init() {
    // Garante que o source do player esteja correto (se já não estiver no HTML)
    if (radioPlayer.querySelector('source').src !== STREAM_URL) {
        radioPlayer.querySelector('source').src = STREAM_URL;
        radioPlayer.load(); // Recarrega o player com a nova URL
    }
    
    // Configura o estado inicial do botão
    if (radioPlayer.paused) {
        playPauseButton.classList.remove('playing');
    } else {
        playPauseButton.classList.add('playing');
    }

    // Event listeners para o player de áudio para atualizar o status
    radioPlayer.onplay = () => {
        playPauseButton.classList.add('playing');
        streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    };
    radioPlayer.onpause = () => {
        playPauseButton.classList.remove('playing');
        streamStatusEl.textContent = 'Status: Pausado ⏸️';
    };
    radioPlayer.onerror = () => {
        playPauseButton.classList.remove('playing');
        streamStatusEl.textContent = 'Status: Erro no Stream 🔴';
    };

    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
