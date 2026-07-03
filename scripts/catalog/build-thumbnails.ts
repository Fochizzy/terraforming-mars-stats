import sharp from 'sharp';

export async function buildThumbnail(inputPath: string, outputPath: string) {
  await sharp(inputPath).resize({ width: 240 }).png().toFile(outputPath);
}
