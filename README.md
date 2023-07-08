# TikTok Video Downloader

![npm](https://img.shields.io/npm/v/%40prevter%2Ftiktok-scraper)
![npm type definitions](https://img.shields.io/npm/types/%40prevter%2Ftiktok-scraper)
![GitHub](https://img.shields.io/github/license/prevter/tiktok-scraper)  

Simple library to download TikTok videos without watermark in TypeScript.

## Installation

```bash
npm install @prevter/tiktok-scraper
```

## Usage

```ts
// Typescript:
import { fetchVideo } from '@prevter/tiktok-scraper';
import { writeFileSync } from 'fs';

// Javascript:
// const { fetchVideo } = require('@prevter/tiktok-scraper');
// const { writeFileSync } = require('fs');

const url = 'https://www.tiktok.com/@username/video/1234567891234567891';

// Using promise
fetchVideo(url)
  .then(async (video) => {
    const buffer = await video.download();
    writeFileSync('video.mp4', buffer);
  })
  .catch((err) => {
    console.error(err);
  });

// Using await
const video = await fetchVideo(url);
const buffer = await video.download();
writeFileSync('video.mp4', buffer);
```

Supports full URLs (www.tiktok.com) and short URLs (vm.tiktok.com).  
`fetchVideo` parameter can be a URL or a video ID. It will automatically detect how to handle the parameter. If it fails to detect, it will throw an error, so you can handle it.  
This method return a `Promise<Buffer>`, so you can either save it to a file or just send it to anywhere you want.

You can also download video with watermark or even download music from the video:

```ts
const video = await fetchVideo(url);

// add `true` argument to download video with watermark
const watermarkBuffer = await video.download({ watermark: true });
const noWatermarkBuffer = await video.download();
const musicBuffer = await video.music.download();
```

You can add a `progress` callback to track download progress:

```ts
const video = await fetchVideo(url);

const buffer = await video.download({
  progress: (p) => {
    console.log(`Downloaded ${p.progress}% (${p.downloaded}/${p.total} bytes)`);
  },
});
```

In addition, you can get some information about the video:

```ts
const video = await fetchVideo(url);

console.log('Video description:', video.description);
console.log('🔗 URL:', video.url);
console.log('👤 Author:', video.author);
console.log('❤️ Likes:', video.likes);
console.log('💬 Comments:', video.comments);
console.log('🔁 Shares:', video.shares);
console.log('▶️ Plays:', video.playCount);
console.log('🎵 Music:', video.music.name, '-', video.music.author);
console.log('🖼️ Thumbnail URL:', video.previewImageUrl);

/*
Video description: This is a video description
🔗 URL: https://www.tiktok.com/@username/video/1234567891234567891
👤 Author: username
❤️ Likes: 123456
💬 Comments: 1234
🔁 Shares: 1234
▶️ Plays: 1234567
🎵 Music: Music Name - Music Author
🖼️ Thumbnail URL: https://p16-sign-sg.tiktokcdn.com/...
*/
```

## Building and testing

Build typescript files:

```bash
npm run build
```

Build and run test script:

```bash
npm run build:test
```
