import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const createIcon = (size: number, name: string) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#d33';
    ctx.fillRect(0, 0, size, size);

    // Text (Chef Hat / CB)
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CB', size / 2, size / 2);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join('public', name), buffer);
    console.log(`Created ${name}`);
};

createIcon(192, 'icon-192.png');
createIcon(512, 'icon-512.png');
