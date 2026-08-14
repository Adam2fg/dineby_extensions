// CinebyTV Scraper Plugin - Vidsrc & Multiembed
// Uses sendMessage to communicate with the Dart httpGet backend

async function httpGet(url, headers = {}) {
    // flutter_js exposes sendMessage. The Dart backend expects a JSON string.
    const args = JSON.stringify({ url: url, headers: headers });
    const response = await sendMessage("httpGet", args);
    return response;
}

async function getStream(imdbId) {
    try {
        // 1. Try vidsrc.net
        const vidsrcHtml = await httpGet(`https://vidsrc.net/embed/movie?imdb=${imdbId}`);
        
        if (!vidsrcHtml.startsWith("ERROR")) {
            // Find iframe
            const iframeMatch = vidsrcHtml.match(/<iframe[^>]+src="([^"]+)"/i);
            if (iframeMatch) {
                let iframeUrl = iframeMatch[1];
                if (iframeUrl.startsWith('//')) {
                    iframeUrl = 'https:' + iframeUrl;
                }

                // Fetch iframe HTML
                const iframeHtml = await httpGet(iframeUrl, { 'Referer': `https://vidsrc.net/embed/movie?imdb=${imdbId}` });

                // Extract m3u8 from iframe HTML using a regex
                const m3u8Match = iframeHtml.match(/(https?:\/\/[^"']*\.m3u8[^"']*)/i);
                if (m3u8Match) {
                    return JSON.stringify({ url: m3u8Match[1], subtitles: [] });
                }
            }
        }

        // 2. Try multiembed.mov as fallback
        const multiHtml = await httpGet(`https://multiembed.mov/?video_id=${imdbId}&tmdb=1`);
        if (!multiHtml.startsWith("ERROR")) {
            const multiIframeMatch = multiHtml.match(/<iframe[^>]+src="([^"]+)"/i);
            if (multiIframeMatch) {
                let multiIframeUrl = multiIframeMatch[1];
                if (multiIframeUrl.startsWith('//')) {
                    multiIframeUrl = 'https:' + multiIframeUrl;
                }
                
                const multiIframeHtml = await httpGet(multiIframeUrl, { 'Referer': `https://multiembed.mov/` });
                const multiM3u8Match = multiIframeHtml.match(/(https?:\/\/[^"']*\.m3u8[^"']*)/i);
                
                if (multiM3u8Match) {
                    return JSON.stringify({ url: multiM3u8Match[1], subtitles: [] });
                }
            }
        }

        // If both fail, return an error
        return JSON.stringify({ error: "Could not find a valid .m3u8 stream. Sites might be using Cloudflare or obfuscation." });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}
