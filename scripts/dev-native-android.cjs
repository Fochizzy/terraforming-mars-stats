const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const metroUrl = 'http://127.0.0.1:8081';
const metroStatusUrl = `${metroUrl}/status`;
const localAppData = process.env.LOCALAPPDATA;
const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (localAppData ? path.join(localAppData, 'Android', 'Sdk') : null);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!androidHome) {
  fail('Android SDK path is not configured. Set ANDROID_HOME or install the SDK in %LOCALAPPDATA%\\Android\\Sdk.');
}

const adbPath = path.join(androidHome, 'platform-tools', 'adb.exe');
if (!fs.existsSync(adbPath)) {
  fail(`adb.exe was not found at ${adbPath}`);
}

function readAppConfig() {
  const appConfigPath = path.join(projectRoot, 'app.json');
  return JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
}

function readDevClientScheme() {
  const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const schemes = [...manifest.matchAll(/android:scheme="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((scheme) => scheme !== 'http' && scheme !== 'https');

  return schemes.find((scheme) => scheme.startsWith('exp+')) ?? schemes[0] ?? 'terraforming-mars-stats';
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve(body);
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.on('error', reject);
  });
}

async function isMetroReady() {
  try {
    const body = await httpGet(metroStatusUrl, 2000);
    return body.trim() === 'packager-status:running';
  } catch {
    return false;
  }
}

async function waitForMetro(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isMetroReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function runAdb(args, options = {}) {
  return execFileSync(adbPath, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  });
}

function launchAndroidDevClient(appPackage, scheme) {
  const devClientUrl = `${scheme}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`;

  runAdb(['reverse', 'tcp:8081', 'tcp:8081']);
  runAdb(['shell', 'am', 'force-stop', appPackage], { stdio: 'ignore' });
  runAdb([
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    devClientUrl,
    appPackage,
  ]);

  console.log(`Opened ${appPackage} with ${devClientUrl}`);
}

async function main() {
  const appConfig = readAppConfig();
  const appPackage = appConfig.expo?.android?.package;
  if (!appPackage) {
    fail('Could not resolve expo.android.package from app.json');
  }

  const scheme = readDevClientScheme();

  if (await isMetroReady()) {
    console.log(`Reusing existing Metro server at ${metroUrl}`);
    launchAndroidDevClient(appPackage, scheme);
    return;
  }

  const env = {
    ...process.env,
    ANDROID_HOME: androidHome,
    PATH: `${process.env.PATH};${path.join(androidHome, 'platform-tools')}`,
  };

  const child = spawn(
    process.execPath,
    [
      '--dns-result-order=ipv4first',
      'node_modules/expo/bin/cli',
      'start',
      '--dev-client',
      '--clear',
      '--host',
      'localhost',
      '--port',
      '8081',
    ],
    {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    }
  );

  const stopChild = () => {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  };

  process.on('SIGINT', stopChild);
  process.on('SIGTERM', stopChild);

  const ready = await waitForMetro(120000);
  if (!ready) {
    stopChild();
    fail(`Metro did not become ready at ${metroUrl}`);
  }

  launchAndroidDevClient(appPackage, scheme);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
