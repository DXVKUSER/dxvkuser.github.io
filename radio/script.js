// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// *** PROXY PÚBLICO ESTÁVEL (Cors-Anywhere ou similar) ***
// Ele é NECESSÁRIO porque o navegador bloqueia a porta do Shoutcast.
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; 
// URL DO SEU STREAM (HTTPS é obrigatório no GitHub Pages)
const SHOUTCAST_BASE_URL = 'https://streamconex.com:8096'; 

// Tentativas de URL para metadados, com o Proxy na frente de CADA UMA:
const METADATA_URLS = [
    // 1. Tenta o endpoint 7.html (Metadado Simples e Comum)
    PROXY_URL + SHOUTCAST_BASE_URL + '/7.html',                 
    // 2. Tenta o endpoint de XML/JSON (Se o servidor suportar)
    PROXY_URL + SHOUTCAST_BASE_URL + '/currentmetadata?sid=1', 
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
    streamStatusEl.textContent = 'Status: Buscando metadados via Proxy Público...';
    
    for (const url of METADATA_URLS) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                continue; 
            }
            
            let metadata = await response.text();
            
            // Tratamento especial para o endpoint 7.html
            if (url.includes('7.html')) {
                // O formato v1 é "número,número,Artista - Título"
                // Procura por <body>...</body> e então faz o parsing
                const bodyMatch = metadata.match(/<body>(.*?)<\/body>/i);
                if (bodyMatch) {
                    // Limpa HTML e separa a string
                    const rawData = bodyMatch[1].split(',');
                    if (rawData.length >= 3) {
                         // Pega o terceiro elemento em diante e junta, removendo a contagem
                         metadata = rawData.slice(2).join(' - ').trim();
                    } else {
                         metadata = '';
                    }
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
            let title = metadata.trim(); // Assume o metadata completo como título se não houver separação
            
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

    // Se todas as URLs falharem
    streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Proxy Público Bloqueado ou Stream Offline)';
    return { artist: 'Neon Indie Radio', title: 'Conectando ao éter...' };
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
    const metadata = await getShoutcastMetadata();
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
function init() {
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';
    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
