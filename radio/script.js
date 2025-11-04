// Configurações
const HISTORY_LIMIT = 10; 
const UPDATE_INTERVAL = 15000; // Intervalo de atualização
const STREAM_URL = 'https://streamconex.com:8096/stream'; // URL direta do stream

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
 * NOVO MÉTODO: Tenta ler o ICY-Metadata diretamente do stream.
 * * NOTA: Este método tenta forçar o navegador a ler o ICY-Metadata
 * sem usar proxy, enviando o cabeçalho 'Icy-Metadata: 1'.
 * Se o navegador forçá-lo a usar um proxy (CORS), ele irá falhar.
 * Ele funciona apenas se o Shoutcast/Stream for configurado para suportar.
 */
async function getIcyMetadata() {
    streamStatusEl.textContent = 'Status: Tentando ICY-Metadata (Solução JS Puro)...';

    try {
        const response = await fetch(STREAM_URL, {
            // Este cabeçalho é a chave para pedir os metadados
            headers: {
                'Icy-Metadata': '1', 
                'Range': 'bytes=0-1024', // Busca apenas 1KB para não baixar o stream todo
            },
            // 'no-cors' força a requisição, mas oculta cabeçalhos importantes. 
            // 'cors' é necessário para ler o corpo, mas pode ser bloqueado. 
            // Vamos tentar o 'cors' para expor os cabeçalhos.
            mode: 'cors' 
        });

        // 1. Verifica se a requisição foi bem-sucedida
        if (!response.ok) {
            // Um erro 403/404 ou CORS bloqueado
            throw new Error('Falha na requisição ICY (Provável bloqueio CORS).');
        }

        // 2. Tenta ler o cabeçalho ICY-METAINT
        const icyInt = response.headers.get('icy-metaint');
        const icyMeta = response.headers.get('icy-metadata'); 

        // Se o servidor de stream não retornar o metadado no cabeçalho ou o ICY não vier
        if (!icyInt && !icyMeta) {
             throw new Error('Stream não está enviando metadados ICY via cabeçalho.');
        }

        // A solução ICY é complexa. Vamos tentar ler apenas o cabeçalho 'icy-description' se disponível,
        // que é mais comum em navegadores modernos que suportam ICY.
        const icyTitle = response.headers.get('icy-description');
        if (icyTitle) {
            return parseMetadata(icyTitle);
        }
        
        // Como o método ICY de leitura do corpo é extremamente complexo,
        // se a leitura dos cabeçalhos falhar, voltamos para a falha padrão.
        throw new Error('Metadados ICY presentes, mas formato não suportado ou inacessível.');

    } catch (error) {
        console.warn(`ICY-Metadata falhou: ${error.message}.`);
        streamStatusEl.textContent = 'Status: Solução JS Puro falhou 🔴. (CORS ou ICY indisponível)';
        return { artist: 'Neon Indie Radio', title: 'Stream Indisponível' };
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
 * Busca a capa do álbum usando a API pública da Apple/iTunes.
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
    const metadata = await getIcyMetadata(); // Chama o novo método de leitura de metadados
    const newArtist = metadata.artist;
    const newTitle = metadata.title;
    const isMetadataValid = newArtist !== 'Neon Indie Radio' && newTitle !== 'Carregando...' && newTitle !== 'Stream Indisponível';
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
    // Mantém o reprodutor de áudio com a URL HTTPS direta
    radioPlayer.onplay = () => streamStatusEl.textContent = 'Status: Reproduzindo 🟢';
    radioPlayer.onpause = () => streamStatusEl.textContent = 'Status: Pausado ⏸️';
    radioPlayer.onerror = () => streamStatusEl.textContent = 'Status: Erro no Stream 🔴';
    updateRadioInfo(); 
    setInterval(updateRadioInfo, UPDATE_INTERVAL);
}
document.addEventListener('DOMContentLoaded', init);
