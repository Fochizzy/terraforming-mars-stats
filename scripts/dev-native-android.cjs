const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const defaultMetroPort = 8081;
const metroHost = '127.0.0.1';
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

function buildMetroUrl(port) {
  return `http://${metroHost}:${port}`;
}

function buildMetroStatusUrl(port) {
  return `${buildMetroUrl(port)}/status`;
}

async function isMetroReady(port) {
  try {
    const body = await httpGet(buildMetroStatusUrl(port), 2000);
    return body.trim() === 'packager-status:running';
  } catch {
    return false;
  }
}

async function waitForMetro(port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isMetroReady(port)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function canListenOnPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen(port, metroHost, () => {
      server.close(() => resolve(true));
    });
  });
}

async function resolveMetroPort() {
  if (await isMetroReady(defaultMetroPort)) {
    return {
      port: defaultMetroPort,
      reuseExisting: true,
    };
  }

  for (let candidate = defaultMetroPort; candidate < defaultMetroPort + 10; candidate += 1) {
    if (await canListenOnPort(candidate)) {
      return {
        port: candidate,
        reuseExisting: false,
      };
    }
  }

  fail(
    `Could not find an available Metro port between ${defaultMetroPort} and ${defaultMetroPort + 9}.`
  );
}

function runAdb(args, options = {}) {
  return execFileSync(adbPath, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  });
}

function launchAndroidDevClient(appPackage, scheme, port) {
  const metroUrl = buildMetroUrl(port);
  const devClientUrl = `${scheme}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`;

  runAdb(['reverse', '--remove-all']);
  runAdb(['reverse', `tcp:${port}`, `tcp:${port}`]);
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
  const { port, reuseExisting } = await resolveMetroPort();

  if (reuseExisting) {
    console.log(`Reusing existing Metro server at ${buildMetroUrl(port)}`);
    launchAndroidDevClient(appPackage, scheme, port);
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
      String(port),
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

  const ready = await waitForMetro(port, 120000);
  if (!ready) {
    stopChild();
    fail(`Metro did not become ready at ${buildMetroUrl(port)}`);
  }

  console.log(`Started Metro server at ${buildMetroUrl(port)}`);
  launchAndroidDevClient(appPackage, scheme, port);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
