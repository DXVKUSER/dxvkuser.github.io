// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // 15 segundos

// *** URL QUE CONTÉM O XML COM O NOME DA MÚSICA ***
// Seu endpoint de metadados: IP/Porta/admin.cgi?pass=6565&mode=viewxml
const SHOUTCAST_XML_URL = 'http://78.129.150.207:8081/admin.cgi?pass=6565&mode=viewxml'; 

// *** PROXY FORNECIDO PELO USUÁRIO (Acessado via HTTPS) ***
// Usamos HTTPS na porta 80 para tentar compatibilidade com o GitHub Pages
const PROXY_URL = 'https://51.38.191.151:80/'; 

// O reprodutor de áudio ainda usa o stream HTTPS
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
 * FUNÇÃO PRINCIPAL: Busca o XML via Proxy e extrai a tag <TIT2>.
 */
async function getShoutcastMetadata() {
    streamStatusEl.textContent = 'Status: Buscando metadados via Proxy (XML)...';
    
    // Constrói a URL final: PROXY + URL DO XML
    // O PROXY deve buscar a URL do Shoutcast internamente.
    const fullProxyUrl = PROXY_URL + SHOUTCAST_XML_URL; 

    try {
        // AQUI OCORRE A TENTATIVA DE CONEXÃO COM O NOVO PROXY
        const response = await fetch(fullProxyUrl);
        
        if (!response.ok) {
            throw new Error(`Falha ao conectar no proxy, Status: ${response.status}`);
        }
        
        // Pega o conteúdo como texto para parsing do XML
        const xmlText = await response.text();
        
        // Usa o DOMParser para analisar o XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Procura a tag <TIT2>
        const tit2Element = xmlDoc.getElementsByTagName("TIT2")[0];
        
        if (tit2Element && tit2Element.textContent) {
            const fullTitle = tit2Element.textContent.trim();
            
            if (fullTitle.length < 5) {
                throw new Error("Título da música muito curto ou inválido.");
            }
            
            streamStatusEl.textContent = 'Status: Metadados encontrados! 🎶';
            return parseMetadata(fullTitle);

        } else {
            throw new Error("Tag <TIT2> não encontrada no XML. (XML Inválido)");
        }

    } catch (error) {
        console.error('Erro de Metadados Final:', error);
        streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Proxy indisponível ou Stream Offline)';
        return { artist: 'Neon Indie Radio', title: 'Conectando ao éter...' };
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
    // Garante que o source do player esteja correto
    if (radioPlayer.querySelector('source').src !== STREAM_URL) {
        radioPlayer.querySelector('source').src = STREAM_URL;
        radioPlayer.load();
    }
    
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';
    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
