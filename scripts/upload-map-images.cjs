const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const projectUrl =
  process.env.SUPABASE_URL ||
  'https://qjtwgrjjwnqafbvkkfex.supabase.co';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.',
  );
}

const bucket = 'tm-map-images';
const mapsDirectory = path.resolve(process.cwd(), 'assets', 'Maps');

const mapFiles = [
  ['Amazonis_Planatia.png', 'Amazonis_Planatia.png'],
  ['Arabia_Terra.png', 'Arabia_Terra.png'],
  ['Elysium.png', 'Elysium.png'],
  ['Hellas.png', 'Hellas.png'],
  ['Hollandia.png', 'Hollandia.png'],
  ['Terra_Cimmeria.png', 'Terra_Cimmeria.png'],
  ['Tharsis.png', 'Tharsis.png'],
  ['Utopia_Planitia.png', 'Utopia_Planitia.png'],
  ['Vastitas_Borealis.png', 'Vastitas_Borealis.png'],
  ['Vastitas_Borealis_Nova.png', 'Vastitas_Borealis_Nova.png'],
];

const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function ensureBucketExists() {
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Could not list buckets: ${listError.message}`);
  }

  const existingBucket = buckets.find(
    (item) => item.name === bucket,
  );

  if (existingBucket) {
    console.log(`Bucket already exists: ${bucket}`);
    return;
  }

  const { error: createError } =
    await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/png'],
    });

  if (createError) {
    throw new Error(
      `Could not create bucket ${bucket}: ${createError.message}`,
    );
  }

  console.log(`Created public bucket: ${bucket}`);
}

async function uploadFile(sourceName, destinationName) {
  const filePath = path.join(mapsDirectory, sourceName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing map image: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(destinationName, fileBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Failed to upload ${sourceName}: ${error.message}`,
    );
  }

  console.log(`Uploaded: ${sourceName} -> ${destinationName}`);
}

async function main() {
  await ensureBucketExists();

  console.log(`Uploading ${mapFiles.length} map images...`);

  for (const [sourceName, destinationName] of mapFiles) {
    await uploadFile(sourceName, destinationName);
  }

  console.log('');
  console.log('Upload complete.');
  console.log(
    `${projectUrl}/storage/v1/object/public/${bucket}/Tharsis.png`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
