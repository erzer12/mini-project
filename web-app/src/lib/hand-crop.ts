// Extracts the hand region from a video frame using MediaPipe landmarks,
// resizes it to 28x28 grayscale, and returns 784 pixel values (0-1 normalized).
// Preprocessed to better match Sign MNIST format (dark background, high contrast).

let cropCanvas: HTMLCanvasElement | null = null;
let cropCtx: CanvasRenderingContext2D | null = null;

interface Landmark {
    x: number;
    y: number;
    z: number;
}

/**
 * Extract the hand region from a video frame, convert to 28x28 grayscale,
 * and apply preprocessing to better match Sign MNIST data format.
 */
export const extractHandImage = (
    video: HTMLVideoElement,
    landmarks: Landmark[],
): number[] | null => {
    if (!landmarks || landmarks.length === 0) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Compute bounding box from landmarks (normalized 0-1 coords)
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const lm of landmarks) {
        if (lm.x < minX) minX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y > maxY) maxY = lm.y;
    }

    // Make the bounding box square (Sign MNIST images are square)
    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Add 30% padding
    const padded = size * 1.3;
    minX = Math.max(0, centerX - padded / 2);
    minY = Math.max(0, centerY - padded / 2);
    maxX = Math.min(1, centerX + padded / 2);
    maxY = Math.min(1, centerY + padded / 2);

    // Convert to pixel coordinates
    const sx = Math.floor(minX * vw);
    const sy = Math.floor(minY * vh);
    const sw = Math.floor((maxX - minX) * vw);
    const sh = Math.floor((maxY - minY) * vh);

    if (sw <= 0 || sh <= 0) return null;

    // Create offscreen canvas (reused)
    if (!cropCanvas) {
        cropCanvas = document.createElement("canvas");
        cropCanvas.width = 28;
        cropCanvas.height = 28;
        cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
    }

    if (!cropCtx) return null;

    // Draw the cropped hand region, resized to 28x28
    cropCtx.fillStyle = "#000000";
    cropCtx.fillRect(0, 0, 28, 28);
    cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 28, 28);

    // Get pixel data and convert to grayscale
    const imageData = cropCtx.getImageData(0, 0, 28, 28);
    const pixels = imageData.data; // RGBA

    const grayscale = new Array(784);
    let min = 255, max = 0;

    // First pass: convert to grayscale and find min/max for contrast stretching
    for (let i = 0; i < 784; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        grayscale[i] = gray;
        if (gray < min) min = gray;
        if (gray > max) max = gray;
    }

    // Second pass: contrast stretch and normalize to 0-1
    const range = max - min || 1;
    for (let i = 0; i < 784; i++) {
        grayscale[i] = (grayscale[i] - min) / range;
    }

    return grayscale;
};
