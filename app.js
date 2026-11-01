const palettes = ['forest', 'ocean', 'amethyst', 'ember'];
function setTheme(theme) {
  if (!palettes.includes(theme)) return;
  document.body.dataset.color = theme;
  document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
  try { localStorage.setItem('mineplot-website-theme', theme); } catch {}
}
try { setTheme(localStorage.getItem('mineplot-website-theme') || 'forest'); } catch {}
document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.theme)));

const platforms = {
  macos: { title: 'macOS · Apple silicon', label: 'macOS', format: 'ZIP · Apple silicon', description: 'For Macs with an M-series chip. Extract the ZIP and move MinePlot to Applications. Intel Macs are not supported.' },
  windows: { title: 'Windows · 64-bit', label: 'Windows', format: 'EXE · x64 installer', description: 'Open the installer and choose where to install MinePlot. Includes desktop and Start menu shortcuts.' },
  linux: { title: 'Linux · 64-bit', label: 'Linux', format: 'AppImage · x64', description: 'Allow execution as a program in the AppImage’s file properties, then open it. Requires a compatible desktop environment.' },
};
const platformButtons = [...document.querySelectorAll('[data-platform]')];
const downloadButton = document.querySelector('#download-launcher');
const downloadStatus = document.querySelector('#download-status');
const checksumsLink = document.querySelector('#checksums-link');
let selectedPlatform = 'macos';
let release;
downloadButton.disabled = true;
function validRelease(value) {
  if (!value || value.schemaVersion !== 1 || value.public !== true || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(value.repository) || !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)?$/.test(value.version) || value.tag !== `v${value.version}` || value.channel !== 'preview') throw new Error('Release information is invalid.');
  const base = `https://github.com/${value.repository}/releases/`;
  if (value.releaseUrl !== `${base}tag/${value.tag}` || value.checksumsUrl !== `${base}download/${value.tag}/SHA256SUMS.txt`) throw new Error('Release information is invalid.');
  for (const platform of Object.keys(platforms)) {
    const item = value.platforms?.[platform];
    const names = platform === 'windows' ? [`MinePlot-Setup-${value.version}-x64.exe`] : platform === 'linux' ? [`MinePlot-${value.version}-linux-x64.AppImage`, `MinePlot-${value.version}-linux-x86_64.AppImage`] : [`MinePlot-${value.version}-arm64.zip`, `MinePlot-${value.version}-macos-arm64.zip`];
    if (!item || !names.includes(item.filename) || item.url !== `${base}download/${value.tag}/${encodeURIComponent(item.filename)}` || !/^[a-f0-9]{64}$/i.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || item.bytes > 2 * 1024 ** 3) throw new Error('Release information is invalid.');
  }
  return value;
}
function selectPlatform(platform) {
  if (!platforms[platform]) return;
  selectedPlatform = platform;
  const value = platforms[platform];
  document.querySelector('#platform-info strong').textContent = value.title;
  document.querySelector('#platform-info p').textContent = value.description;
  platformButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platform === platform)));
  downloadButton.replaceChildren(document.createTextNode(`↓  Download for ${value.label} `));
  const format = document.createElement('span'); format.textContent = value.format; downloadButton.append(format);
  if (!release) return;
  const unsigned = platform === 'macos' && !release.signing?.macSigned ? 'Unsigned and not notarized. macOS may block this preview.' : platform === 'windows' && !release.signing?.windowsSigned ? 'Unsigned installer. Windows may show a security warning.' : '';
  document.querySelector('#release-note').textContent = `v${release.version} · Preview build · ${unsigned || value.format}`;
  checksumsLink.href = release.checksumsUrl;
  checksumsLink.title = `${release.platforms[platform].filename}\nSHA-256: ${release.platforms[platform].sha256}`;
  downloadStatus.textContent = '';
}
platformButtons.forEach(button => button.addEventListener('click', () => selectPlatform(button.dataset.platform)));
const os = navigator.userAgentData?.platform || navigator.platform || '';
selectPlatform(/win/i.test(os) ? 'windows' : /linux/i.test(os) && !/android/i.test(navigator.userAgent) ? 'linux' : 'macos');
document.querySelector('#year').textContent = new Date().getFullYear();
downloadButton.addEventListener('click', () => {
  if (!release || downloadButton.disabled) return;
  const item = release.platforms[selectedPlatform];
  const link = document.createElement('a');
  link.href = item.url; link.rel = 'noopener noreferrer';
  document.body.append(link); link.click(); link.remove();
  downloadStatus.textContent = `Starting the ${platforms[selectedPlatform].label} download from GitHub. Use Release details & SHA-256 to verify your download.`;
});
(async () => {
  try {
    const response = await fetch('release.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Release information is unavailable.');
    const text = await response.text();
    if (text.length > 32768) throw new Error('Release information is invalid.');
    const value = JSON.parse(text);
    if (value?.schemaVersion === 1 && value.pending === true) {
      downloadButton.disabled = true;
      downloadStatus.textContent = 'The first automated release is building; downloads appear after verification.';
      document.querySelector('#release-note').textContent = 'The first automated release is building; downloads appear after verification.';
      return;
    }
    release = validRelease(value);
    document.querySelectorAll('[data-release-version]').forEach(element => { element.textContent = `v${release.version}`; });
    selectPlatform(selectedPlatform);
    downloadButton.disabled = false;
  } catch {
    downloadButton.disabled = true;
    downloadStatus.textContent = 'Download information is unavailable. Refresh the page to try again.';
    document.querySelector('#release-note').textContent = 'No verified release information is available.';
  }
})();
