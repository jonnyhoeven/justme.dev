import fs from 'node:fs';
import path from 'node:path';
import { defineLoader } from 'vitepress';

export interface MusicTrack {
  filename: string;
  url: string;
  title: string;
  channels?: number;
  bpm?: number;
  tracker?: string;
  patterns?: number;
}

declare const data: MusicTrack[];
export { data };

export default defineLoader({
  watch: ['../public/audio/*.xm'],
  load(): MusicTrack[] {
    const audioDir = path.resolve(__dirname, '../public/audio');
    if (!fs.existsSync(audioDir)) return [];

    return fs
      .readdirSync(audioDir)
      .filter((file) => file.toLowerCase().endsWith('.xm'))
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      )
      .map((file) => {
        let title = '';
        let tracker = '';
        let channels = 0;
        let patterns = 0;
        let bpm = 0;

        try {
          const buffer = fs.readFileSync(path.join(audioDir, file));
          if (buffer.length >= 80) {
            title = buffer
              .subarray(17, 37)
              .toString('utf-8')
              .replace(/\0+$/, '')
              .trim();
            tracker = buffer
              .subarray(38, 58)
              .toString('utf-8')
              .replace(/\0+$/, '')
              .trim();
            channels = buffer.readUInt16LE(68);
            patterns = buffer.readUInt16LE(70);
            bpm = buffer.readUInt16LE(78);
          }
        } catch {
          // ignore unreadable file
        }

        if (!title) {
          title = file
            .replace(/\.xm$/i, '')
            .replace(/^\d+[-_.\s]+/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }

        return {
          filename: file,
          url: `/audio/${file}`,
          title,
          ...(channels > 0 ? { channels } : {}),
          ...(bpm > 0 ? { bpm } : {}),
          ...(tracker ? { tracker } : {}),
          ...(patterns > 0 ? { patterns } : {})
        };
      });
  }
});
