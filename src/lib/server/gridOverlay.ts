import sharp from 'sharp';

export async function overlayGrid(
	pngBuffer: Buffer,
	cols = 20,
	rows = 20
): Promise<Buffer> {
	const meta = await sharp(pngBuffer).metadata();
	const w = meta.width ?? 1024;
	const h = meta.height ?? 768;

	const colW = w / cols;
	const rowH = h / rows;

	let lines = '';
	for (let c = 1; c < cols; c++) {
		const x = Math.round(c * colW);
		lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>`;
		lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="rgba(0,0,0,0.25)" stroke-width="1" stroke-dasharray="4,4"/>`;
	}
	for (let r = 1; r < rows; r++) {
		const y = Math.round(r * rowH);
		lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>`;
		lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(0,0,0,0.25)" stroke-width="1" stroke-dasharray="4,4"/>`;
	}

	let labels = '';
	for (let c = 0; c < cols; c++) {
		const x = Math.round(c * colW + colW / 2);
		const coordX = Math.round(c * colW);
		for (let r = 0; r < rows; r++) {
			const y = Math.round(r * rowH + rowH / 2);
			const coordY = Math.round(r * rowH);
			const labelSize = Math.max(8, Math.min(11, Math.floor(Math.min(colW, rowH) / 5)));
			labels += `<text x="${x}" y="${y - 2}" text-anchor="middle" font-size="${labelSize}" font-family="monospace" fill="rgba(0,0,0,0.7)" font-weight="bold">(${coordX},${coordY})</text>`;
			labels += `<text x="${x}" y="${y - 2}" text-anchor="middle" font-size="${labelSize}" font-family="monospace" fill="rgba(255,255,0,0.9)" font-weight="bold">(${coordX},${coordY})</text>`;
		}
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines}${labels}</svg>`;

	return sharp(pngBuffer)
		.composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
		.png()
		.toBuffer();
}

export async function overlayGridB64(b64: string, cols = 20, rows = 20): Promise<string> {
	const buf = Buffer.from(b64, 'base64');
	const out = await overlayGrid(buf, cols, rows);
	return out.toString('base64');
}
