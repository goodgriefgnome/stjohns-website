// FOR FAKE DATA ONLY: makes the square podcast artwork (1400x1400 JPEG) for the demo sermon series in imported/sermons/.
// Each square is a centre crop of a photo already in public/media, with a plain band at the bottom holding the series name,
// in the style of the Healthy Church square. The sermon importer (Bundle E) will replace this with real artwork.
//
//   node scripts/make-fake-artwork.mjs
import sharp from 'sharp';

const SIZE = 1400;
const BAND = 230;  // height of the plain band at the bottom
const series = [
  { file: 'the-servant-king', photo: 'worship.webp', title: 'The Servant King', subtitle: 'MARK 8–10' },
  { file: 'songs-for-the-journey', photo: 'hero-door.webp', title: 'Songs for the Journey', subtitle: 'PSALMS OF ASCENT' },
  { file: 'easter-2026', photo: 'pastoral.webp', title: 'Easter 2026', subtitle: 'ST JOHN’S DARLINGHURST' },
  { file: 'ruth-faithful-love', photo: 'groups.webp', title: 'Ruth', subtitle: 'FAITHFUL LOVE' },
  { file: 'light-in-the-darkness', photo: 'hero-community.webp', title: 'Light in the Darkness', subtitle: 'ADVENT AND EPIPHANY' },
];

for (const { file, photo, title, subtitle } of series) {
  const band = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${BAND}">
    <rect width="${SIZE}" height="${BAND}" fill="#fff"/>
    <text x="70" y="115" font-family="Georgia, 'DejaVu Serif', serif" font-weight="bold" font-size="92" fill="#0f172a">${title}</text>
    <text x="72" y="175" font-family="'DejaVu Sans', Arial, sans-serif" font-size="38" letter-spacing="4" fill="#334155">${subtitle}</text>
  </svg>`);
  await sharp(`public/media/${photo}`)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .composite([{ input: band, top: SIZE - BAND, left: 0 }])
    .jpeg({ quality: 88 })
    .toFile(`public/media/podcast/${file}.jpg`);
  console.log(`public/media/podcast/${file}.jpg`);
}
