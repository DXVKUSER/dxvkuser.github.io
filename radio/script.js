// Configurações
const LASTFM_API_KEY = '73b5fb24854700c462c68a42d7ccae2b';

// *** CORREÇÃO AQUI: USANDO PROXY CORS ANYWHERE ***
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; 
const SHOUTCAST_METADATA_URL = PROXY_URL + 'http://uk3freenew.listen2myradio.com:8081/currentmetadata?sid=1';

const HISTORY_LIMIT = 10; // Limite de músicas no histórico
const UPDATE_INTERVAL = 15000; // 15 segundos

// ... (Resto do código permanece igual) ...

/**
 * Busca os metadados do Shoutcast (Artista - Título).
 */
async function getShoutcastMetadata() {
    try {
        streamStatusEl.textContent = 'Status: Buscando metadados via Proxy...';
        
        // A requisição agora vai para o proxy, que retorna o conteúdo do Shoutcast
        const response = await fetch(SHOUTCAST_METADATA_URL);
        
        // Se o proxy retornar um erro (ex: 403 Forbidden), o conteúdo pode não ser texto puro.
        if (!response.ok) {
            throw new Error(`Proxy/Server retornou status ${response.status}`);
        }
        
        const metadata = await response.text();
        
        // ... (o código de parsing 'metadata.split' permanece igual) ...
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
        streamStatusEl.textContent = 'Status: Erro de conexão 🔴 (Verifique se o proxy está ativo)';
        return { artist: 'Neon Indie Radio', title: 'Carregando...' };
    }
}

// ... (O restante do script é mantido) ...
