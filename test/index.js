const { fetchVideo } = require('@prevter/tiktok-download');
const fs = require('fs');

(async () => {
  const url = 'https://vm.tiktok.com/ZM2fge1BM/';
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

  // Try to download the video
  console.log('Downloading video without watermark...');
  const no_watermark = await video.download();

  console.log('Downloading video with watermark...');
  const watermarked = await video.download({ watermark: true });

  console.log('Downloading music...');
  const music = await video.music.download((p) => {
    console.log(`${p.progress.toFixed(2)}% done, ${p.downloaded}/${p.total} bytes`);
  });

  // Save buffers to files
  console.log('Saving files...');
  fs.writeFileSync('no_watermark.mp4', no_watermark);
  fs.writeFileSync('watermarked.mp4', watermarked);
  fs.writeFileSync('music.mp3', music);
})();