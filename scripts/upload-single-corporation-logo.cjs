const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const filePath = process.argv[2];
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

async function main() {
  const { error } = await supabase.storage
    .from('tm-corporation-logos')
    .upload('AstroDrill.png', fs.readFileSync(filePath), {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '0',
    });

  if (error) {
    throw error;
  }

  console.log('Uploaded AstroDrill.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
