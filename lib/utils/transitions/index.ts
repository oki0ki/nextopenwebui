// Odpowiednik src/lib/utils/transitions/index.ts.
// Oryginał zwracał Svelte TransitionConfig z cubicOut easing.
// W React używamy Framer Motion; eksportujemy helper generujący animację z identycznymi parametrami:
//   y: -8, start: 0.95, duration: 200ms
export type FlyAndScaleParams = {
	y?: number;
	start?: number;
	duration?: number;
};

const defaultFlyAndScaleParams = { y: -8, start: 0.95, duration: 200 };

export const flyAndScale = (params?: FlyAndScaleParams) => {
	const withDefaults = { ...defaultFlyAndScaleParams, ...params };
	// cubic-out easing = cubic-bezier(0.215, 0.61, 0.355, 1.0)
	return {
		initial: { opacity: 0, y: withDefaults.y, scale: withDefaults.start },
		animate: { opacity: 1, y: 0, scale: 1 },
		exit: { opacity: 0, y: withDefaults.y, scale: withDefaults.start },
		transition: { duration: withDefaults.duration / 1000, ease: [0.215, 0.61, 0.355, 1.0] },
	};
};
