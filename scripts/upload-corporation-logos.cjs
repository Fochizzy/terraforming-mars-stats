const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const projectUrl =
  process.env.SUPABASE_URL ||
  "https://qjtwgrjjwnqafbvkkfex.supabase.co";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
}

const bucket = "tm-corporation-logos";

const zipFile = path.resolve(
  process.cwd(),
  "assets",
  "Corps_Transparent_Normalized.zip"
);

if (!fs.existsSync(zipFile)) {
  throw new Error(`Missing ZIP:\n${zipFile}`);
}

const extractDir = path.join(
  os.tmpdir(),
  "tm-corporation-logos-" + Date.now()
);

fs.mkdirSync(extractDir, { recursive: true });

execSync(
  `powershell -Command "Expand-Archive -LiteralPath '${zipFile}' -DestinationPath '${extractDir}' -Force"`
);

const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function findPngs(dir) {
  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findPngs(full));
    } else if (entry.name.toLowerCase().endsWith(".png")) {
      results.push(full);
    }
  }

  return results;
}

async function main() {
  const files = findPngs(extractDir);

  console.log(`Found ${files.length} logos`);

  for (const file of files) {
    const filename = path.basename(file);

    const buffer = fs.readFileSync(file);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        upsert: true,
        cacheControl: "31536000",
        contentType: "image/png",
      });

    if (error) {
      throw new Error(`${filename}: ${error.message}`);
    }

    console.log(`Uploaded ${filename}`);
  }

  console.log("");
  console.log("Corporation logos replaced successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});