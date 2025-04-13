import { exec } from 'child_process';

const STREAM_URL = `https://twitch.tv/`;

// const ADBLOCK_PROXYS = `--twitch-proxy-playlist=http://185.223.29.142:9595`;

const proxys = [
    'https://eu.luminous.dev',
    'https://lb-eu.cdn-perfprod.com',
    'https://eu2.luminous.dev',
    'https://lb-eu3.cdn-perfprod.com',
];

const ADBLOCK_PROXYS = `--twitch-proxy-playlist=${proxys.join(',')}`;

interface TwitchMeta {
    type: 'success';
    plugin: 'twitch';
    metadata: {
        id: string;
        author: string;
        category: string;
        title: string;
    };
    streams: {
        [key: string]: {
            type: 'hls';
            url: string;
            headers: any;
            master: string;
        };
    };
}

async function isLive(streamerName: string) {
    const meta = await getMetaData(streamerName, false);
    // if (meta.type == 'error' && meta.error.includes('No playable streams')) {
    //     console.log('FALSE');
    if (meta.type == 'error') {
        return false;
    }
    return true;
}

interface TwitchMetaError {
    type: 'error';
    error: string;
}

function getMetaData(streamerName: string, useProxys = true): Promise<TwitchMeta | TwitchMetaError> {
    return new Promise((resolve, reject) => {
        exec(`streamlink --json ${useProxys ? ADBLOCK_PROXYS : ''} ${STREAM_URL}${streamerName}`, (err, stdout, stderr) => {
            try {
                const json = JSON.parse(stdout);
                // console.log(json);

                if (json.error) {
                    resolve({ type: 'error', error: json.error });
                    return;
                }
                json.type == 'success';
                resolve(json);
            } catch (error) {
                console.log('Error parsing JSON', error);

                reject(error);
            }
        });
    });
}

export { TwitchMeta, TwitchMetaError, isLive, getMetaData };