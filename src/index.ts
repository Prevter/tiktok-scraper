import https from 'https';

const API_BASE_URL = 'https://api16-normal-v4.tiktokv.com';
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
};

/**
 * Get data from a URL
 * @param url URL to get data from
 * @returns Promise containing the data from the URL
 */
const get = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
};

/**
 * Get a buffer from a URL
 * @param url URL to get buffer from
 * @returns Promise containing the buffer from the URL
 */
const getBuffer = (url: string, progress?: (progress: DownloadProgress) => void): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        let data = Buffer.from([]);
        res.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
          if (!progress) return;
          const downloaded = data.length;
          const total = parseInt(res.headers['content-length'] || '0');
          progress({
            downloaded,
            total,
            progress: (downloaded / total) * 100,
          });
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
};

/**
 * Loads a TikTok video page from short URL to get the full URL
 * @param url Short TikTok video URL (e.g. https://vm.tiktok.com/...)
 * @returns Promise containing the full TikTok video URL
 */
export const getFullURL = async (url: string): Promise<string> => {
  var match = url.match(/(vm|vt)\.tiktok\.com\/(.*)/);
  if (!match)
    match = url.match(/(www|vm|vt)\.tiktok\.com\/t\/(.*)/);
  if (!match)
    throw new Error(`Unknown TikTok video URL: ${url}`);
  // follow the redirect to get the full URL
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        if (res.headers.location) {
          resolve(res.headers.location);
        } else {
          reject('No redirect found');
        }
      })
      .on('error', reject);
  });
};

/**
 * Get the video ID from a TikTok video URL (only full URL)
 * @param url TikTok video URL
 * @returns Video ID
 */
export const getVideoId = (url: string): string => {
  const regex = /\/video\/(\d*)/;
  const match = url.match(regex);
  if (match) return match[1];
  throw new Error(`Invalid TikTok video URL: ${url}`);
};

/**
 * Automatically deduce the video ID from a TikTok video URL
 * @param url Any TikTok video URL (full or short)
 * @returns Promise containing the video ID
 */
export const detectVideoId = async (url: string): Promise<string> => {
  if (url.match(/(vm|vt)\.tiktok\.com\/(.*)/) || url.match(/(vm|vt|www)\.tiktok\.com\/t\/(.*)/)) {
    url = await getFullURL(url);
  }
  return getVideoId(url);
};

/**
 * Fetches a TikTok video data from a video ID or URL
 * @param video TikTok video ID or URL
 * @returns Promise containing the TikTok video data (see {@link TikTokVideo} interface for more details)
 */
export const fetchVideo = async (video: string): Promise<TikTokVideo> => {
  video = video.trim();
  const video_id = video.match(/^\d*$/) ? video : await detectVideoId(video);

  const url = `${API_BASE_URL}/aweme/v1/feed/?aweme_id=${video_id}`;
  const data = await get(url);
  const json = JSON.parse(data);
  const video_data = json.aweme_list[0];

  const videoWatermark: TikTokVideoSource = {
    uri: video_data.video.download_addr.uri,
    url: video_data.video.download_addr.url_list[0],
    width: video_data.video.download_addr.width,
    height: video_data.video.download_addr.height,
    dataSize: video_data.video.download_addr.data_size,
    download: async (progress) => await getBuffer(videoWatermark.url, progress),
  };

  const videoNoWatermark: TikTokVideoSource = {
    uri: video_data.video.play_addr.uri,
    url: video_data.video.play_addr.url_list[0],
    width: video_data.video.play_addr.width,
    height: video_data.video.play_addr.height,
    dataSize: video_data.video.play_addr.data_size,
    download: async (progress) => await getBuffer(videoNoWatermark.url, progress),
  };

  const music: TikTokMusic = {
    id: video_data.music.id,
    name: video_data.music.title,
    author: video_data.music.author,
    url: video_data.music.play_url.url_list[0],
    download: async (progress) => await getBuffer(music.url, progress),
  };

  return {
    id: video_data.aweme_id,
    url: `https://www.tiktok.com/@${video_data.author.nickname}/video/${video_data.aweme_id}`,
    description: video_data.desc,
    author: video_data.author.nickname,
    videoWatermark,
    videoNoWatermark,
    width: video_data.video.width,
    height: video_data.video.height,
    likes: video_data.statistics.digg_count,
    shares: video_data.statistics.share_count,
    playCount: video_data.statistics.play_count,
    comments: video_data.statistics.comment_count,
    music,
    previewImageUrl: video_data.video.origin_cover.url_list[0],
    download: async (options?: DownloadOptions) => {
      options = options || {};
      const video = options.watermark ? videoWatermark : videoNoWatermark;
      return await video.download(options.progress);
    },
  };
};

/**
 * TikTok video source data containing all important information
 * about the video: URL, size, like count, share count, etc.
 *
 * Contains a `download` method to download the video data to a buffer.
 */
export interface TikTokVideo {
  /** Video ID */
  readonly id: string;
  /** Video URL */
  readonly url: string;
  /** Video description */
  readonly description: string;
  /** Video author name */
  readonly author: string;
  /** Video source with watermark */
  readonly videoWatermark: TikTokVideoSource;
  /** Video source without watermark */
  readonly videoNoWatermark: TikTokVideoSource;
  /** Video width */
  readonly width: number;
  /** Video height */
  readonly height: number;
  /** Number of likes */
  readonly likes: number;
  /** Number of shares */
  readonly shares: number;
  /** Number of plays */
  readonly playCount: number;
  /** Number of comments */
  readonly comments: number;
  /** Music data */
  readonly music: TikTokMusic;
  /** Preview image URL */
  readonly previewImageUrl: string;

  /**
   * Downloads the video
   * @param options Download options (see {@link DownloadOptions})
   * @returns Promise containing the video data buffer
   */
  readonly download: (options?: DownloadOptions) => Promise<Buffer>;
}

/**
 * TikTok video source
 *
 * Contains information about the video source
 * and provides a method to download the video
 * @see {@link TikTokVideo}
 */
export interface TikTokVideoSource {
  /** Video URI */
  readonly uri: string;
  /** Video download URL */
  readonly url: string;
  /** Video width */
  readonly width: number;
  /** Video height */
  readonly height: number;
  /** Video data size */
  readonly dataSize: number;

  /**
   * Downloads the video
   * @param progress Callback function to track the download progress
   * @returns Promise containing the video data buffer
   */
  readonly download: (progress?: (progress: DownloadProgress) => void) => Promise<Buffer>;
}

/**
 * TikTok music
 *
 * Contains information about the music
 * and provides a method to download the music
 * @see {@link TikTokVideo}
 */
export interface TikTokMusic {
  /** Music ID */
  readonly id: string;
  /** Music name */
  readonly name: string;
  /** Music author */
  readonly author: string;
  /** Music download URL */
  readonly url: string;

  /**
   * Downloads the music
   * @param progress Callback function to track the download progress
   * @returns Promise containing the music data buffer
   */
  readonly download: (progress?: (progress: DownloadProgress) => void) => Promise<Buffer>;
}

export interface DownloadProgress {
  /** Total bytes to download */
  readonly total: number;
  /** Bytes downloaded */
  readonly downloaded: number;
  /** Download progress in percent */
  readonly progress: number;
}

export interface DownloadOptions {
  /** Whether to download the video with watermark or not */
  readonly watermark?: boolean;
  /** Callback function to track download progress */
  progress?: (progress: DownloadProgress) => void;
}
