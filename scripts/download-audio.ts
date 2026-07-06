import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HERO_NAMES = ['makeboluo', 'ganjiangmoxie', 'kai', 'zhenji', 'yunying', 'hainuo', 'yuji', 'xiaoqiao', 'caiwenji', 'yao'];

const AUDIO_DIR = path.resolve(__dirname, '..', 'public', 'audio');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * Parse hero-voice-selection.md and return a Map of hero directory name ->
 * array of selected voice URLs.
 */
function parseVoiceSelectionFile(): Map<string, string[]> {
  const content = fs.readFileSync(path.resolve(__dirname, '..', 'hero-voice-selection.md'), 'utf-8');
  const result = new Map<string, string[]>();

  // Map hero display names to directory names (underscore-free, lowercase)
  const nameMap: Record<string, string> = {
    '马可波罗': 'makeboluo', '干将莫邪': 'ganjiangmoxie', '铠': 'kai',
    '甄姬': 'zhenji', '云缨': 'yunying', '海诺': 'hainuo',
    '虞姬': 'yuji', '小乔': 'xiaoqiao', '蔡文姬': 'caiwenji', '瑶': 'yao',
  };

  const lines = content.split('\n');
  let currentHero = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect hero section header (## 马可波罗, etc.)
    for (const [zhName, dirName] of Object.entries(nameMap)) {
      if (line.includes(zhName) && line.startsWith('## ')) {
        currentHero = dirName;
        break;
      }
    }
    if (!currentHero) continue;

    // Check if this line is marked [x] (selected)
    if (line.includes('[x]')) {
      // The URL is typically on the next 1-2 lines (inside a code block)
      const lookAhead = lines.slice(i + 1, i + 4);
      for (const nextLine of lookAhead) {
        const urlMatch = nextLine.match(/https:\/\/game\.gtimg\.cn\/[^\s)]+/);
        if (urlMatch) {
          const url = urlMatch[0];
          if (!result.has(currentHero)) result.set(currentHero, []);
          result.get(currentHero)!.push(url);
          break; // stop looking once URL is found
        }
      }
    }
  }
  return result;
}

async function main(): Promise<void> {
  ensureDir(AUDIO_DIR);

  // Parse the voice selection file
  console.log('Parsing voice selection file...');
  const selections = parseVoiceSelectionFile();
  console.log(`Found voice selections for ${selections.size} heroes`);

  for (const [hero, urls] of selections.entries()) {
    const heroDir = path.join(AUDIO_DIR, hero);
    ensureDir(heroDir);
    console.log(`\nDownloading ${urls.length} voice(s) for ${hero}...`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = url.endsWith('.mp3') ? '.mp3' : '.wav';
      const dest = path.join(heroDir, `${i + 1}${ext}`);

      if (fs.existsSync(dest)) {
        console.log(`  [${i + 1}/${urls.length}] Already exists: ${path.basename(dest)}`);
        continue;
      }

      try {
        await downloadFile(url, dest);
        console.log(`  [${i + 1}/${urls.length}] Downloaded: ${path.basename(dest)}`);
      } catch (err) {
        console.error(`  [${i + 1}/${urls.length}] FAILED: ${(err as Error).message}`);
      }
    }
  }

  // Create a voices.json manifest
  const manifest: Record<string, { files: string[] }> = {};
  for (const hero of HERO_NAMES) {
    const heroDir = path.join(AUDIO_DIR, hero);
    if (fs.existsSync(heroDir)) {
      const files = fs.readdirSync(heroDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
      if (files.length > 0) manifest[hero] = { files };
    }
  }
  fs.writeFileSync(path.join(AUDIO_DIR, 'voices.json'), JSON.stringify(manifest, null, 2));
  console.log('\n✓ voices.json manifest created');
  console.log('Done!');
}

main().catch(console.error);
