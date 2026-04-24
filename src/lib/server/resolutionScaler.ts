import sharp from 'sharp';

export const MAX_RESOLUTION_WIDTH = 1280;
export const MAX_RESOLUTION_HEIGHT = 800;
export const MIN_RESOLUTION_WIDTH = 800;
export const MIN_RESOLUTION_HEIGHT = 600;

export class ResolutionScaler {
	private screenshotFn: () => Promise<Uint8Array>;
	private originalResolution: [number, number];
	private scaledResolution: [number, number];
	private scaleFactor: number;

	constructor(
		screenshotFn: () => Promise<Uint8Array>,
		originalResolution: [number, number]
	) {
		this.screenshotFn = screenshotFn;
		this.originalResolution = originalResolution;
		const { scaledResolution, scaleFactor } = this.calculateScaledResolution(originalResolution);
		this.scaledResolution = scaledResolution;
		this.scaleFactor = scaleFactor;
	}

	public getOriginalResolution(): [number, number] {
		return this.originalResolution;
	}

	public getScaledResolution(): [number, number] {
		return this.scaledResolution;
	}

	public getScaleFactor(): number {
		return this.scaleFactor;
	}

	public scaleToOriginalSpace(coordinate: [number, number]): [number, number] {
		if (this.scaleFactor === 1) {
			return [Math.round(coordinate[0]), Math.round(coordinate[1])];
		}
		return [
			Math.round(coordinate[0] / this.scaleFactor),
			Math.round(coordinate[1] / this.scaleFactor)
		];
	}

	public scaleToModelSpace(coordinate: [number, number]): [number, number] {
		if (this.scaleFactor === 1) {
			return [Math.round(coordinate[0]), Math.round(coordinate[1])];
		}
		return [
			Math.round(coordinate[0] * this.scaleFactor),
			Math.round(coordinate[1] * this.scaleFactor)
		];
	}

	public async takeScreenshot(): Promise<Buffer> {
		const bytes = await this.screenshotFn();
		const buf = Buffer.from(bytes);
		if (this.scaleFactor === 1) return buf;
		return this.scaleBuffer(buf);
	}

	public async scaleBuffer(buf: Buffer): Promise<Buffer> {
		const [w, h] = this.scaledResolution;
		try {
			return await sharp(buf)
				.resize(w, h, { fit: 'fill', kernel: 'lanczos3', fastShrinkOnLoad: false })
				.png()
				.toBuffer();
		} catch {
			return buf;
		}
	}

	private calculateScaledResolution(originalResolution: [number, number]): {
		scaledResolution: [number, number];
		scaleFactor: number;
	} {
		const [width, height] = originalResolution;

		if (
			width <= MAX_RESOLUTION_WIDTH &&
			width >= MIN_RESOLUTION_WIDTH &&
			height <= MAX_RESOLUTION_HEIGHT &&
			height >= MIN_RESOLUTION_HEIGHT
		) {
			return { scaledResolution: [width, height], scaleFactor: 1 };
		}

		let widthScaleFactor = 1;
		if (width > MAX_RESOLUTION_WIDTH) widthScaleFactor = MAX_RESOLUTION_WIDTH / width;
		else if (width < MIN_RESOLUTION_WIDTH) widthScaleFactor = MIN_RESOLUTION_WIDTH / width;

		let heightScaleFactor = 1;
		if (height > MAX_RESOLUTION_HEIGHT) heightScaleFactor = MAX_RESOLUTION_HEIGHT / height;
		else if (height < MIN_RESOLUTION_HEIGHT) heightScaleFactor = MIN_RESOLUTION_HEIGHT / height;

		let scaleFactor: number;
		if (widthScaleFactor < 1 || heightScaleFactor < 1) {
			scaleFactor = Math.min(widthScaleFactor, heightScaleFactor);
		} else {
			scaleFactor = Math.max(widthScaleFactor, heightScaleFactor);
		}

		const scaledWidth = Math.round(width * scaleFactor);
		const scaledHeight = Math.round(height * scaleFactor);

		const finalScaleFactor = Math.sqrt(
			(scaledWidth / width) * (scaledHeight / height)
		);

		return {
			scaledResolution: [scaledWidth, scaledHeight],
			scaleFactor: finalScaleFactor
		};
	}
}
