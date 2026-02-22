import JSZip from 'jszip';
import type { GalleryItem } from '../types';

/**
 * Export multiple gallery items as a ZIP archive.
 * Each image is saved as a PNG file with a descriptive name.
 */
export async function exportToZip(
    items: GalleryItem[],
    filename: string = 'art-class-designs.zip'
): Promise<void> {
    const zip = new JSZip();

    items.forEach((item, index) => {
        // Convert base64 to binary
        const binaryData = atob(item.image);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
        }

        // Create descriptive filename
        const mode = item.config.mode === 'mandala' ? 'mandala' : item.config.topic.slice(0, 20).replace(/[^a-zA-Z0-9가-힣]/g, '_');
        const timestamp = new Date(item.createdAt).toISOString().slice(0, 10);
        const name = `design_${index + 1}_${mode}_${timestamp}.png`;

        zip.file(name, bytes, { binary: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });

    // Download the ZIP file
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
