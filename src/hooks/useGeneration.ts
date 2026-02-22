import { useState, useCallback } from 'react';
import { generateImage, editImage, SafetyFilterError } from '../services/geminiService';
import { buildPrompt, buildEditPrompt } from '../services/promptBuilder';
import { calculateAspectRatio } from '../utils/aspectRatio';
import type { GenerationConfig, ToastMessage, GalleryItem } from '../types';

interface UseGenerationReturn {
    currentImage: string | null;
    isLoading: boolean;
    generationProgress: { current: number; total: number } | null;
    generate: (apiKey: string, config: GenerationConfig, count: number, onImageGenerated: (item: GalleryItem) => void) => Promise<void>;
    edit: (apiKey: string, editType: string) => Promise<void>;
    setCurrentImage: (image: string | null) => void;
    toast: ToastMessage | null;
    clearToast: () => void;
}

let toastCounter = 0;
let galleryIdCounter = 0;

function generateId(): string {
    return `gallery-${Date.now()}-${++galleryIdCounter}`;
}

export function useGeneration(): UseGenerationReturn {
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const showToast = useCallback((type: ToastMessage['type'], message: string) => {
        setToast({ id: `toast-${++toastCounter}`, type, message });
    }, []);

    const clearToast = useCallback(() => setToast(null), []);

    const generate = useCallback(
        async (
            apiKey: string,
            config: GenerationConfig,
            count: number,
            onImageGenerated: (item: GalleryItem) => void
        ) => {
            setIsLoading(true);
            setGenerationProgress({ current: 0, total: count });
            clearToast();

            const prompt = buildPrompt(
                config.mode,
                config.topic,
                config.mandalaPreset,
                config.difficulty,
                config.orientation,
                config.paperSize,
                config.gridN,
                config.gridM
            );

            // Calculate aspect ratio for the image generation
            const aspectRatio = calculateAspectRatio(
                config.gridN,
                config.gridM,
                config.orientation,
                config.paperSize
            );

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < count; i++) {
                setGenerationProgress({ current: i + 1, total: count });
                try {
                    const imageData = await generateImage(apiKey, prompt, { aspectRatio });
                    const item: GalleryItem = {
                        id: generateId(),
                        image: imageData,
                        config,
                        createdAt: Date.now(),
                    };
                    onImageGenerated(item);
                    successCount++;
                } catch (err) {
                    errorCount++;
                    if (err instanceof SafetyFilterError) {
                        showToast('warning', err.message);
                    } else {
                        console.error('Generation error:', err);
                    }
                }
            }

            setGenerationProgress(null);
            setIsLoading(false);

            if (successCount > 0) {
                showToast('success', `✨ ${successCount}개의 도안이 생성되었습니다!`);
            } else if (errorCount > 0) {
                showToast('error', '이미지 생성에 실패했습니다. 다시 시도해 주세요.');
            }
        },
        [clearToast, showToast]
    );

    const edit = useCallback(
        async (apiKey: string, editType: string) => {
            if (!currentImage) return;
            setIsLoading(true);
            clearToast();
            try {
                const editPrompt = buildEditPrompt(editType);
                const editedData = await editImage(apiKey, currentImage, editPrompt);
                setCurrentImage(editedData);
                showToast('success', '✏️ 도안이 수정되었습니다!');
            } catch (err) {
                if (err instanceof SafetyFilterError) {
                    showToast('warning', err.message);
                } else {
                    showToast('error', err instanceof Error ? err.message : '이미지 수정 중 오류가 발생했습니다.');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [currentImage, clearToast, showToast]
    );

    return {
        currentImage,
        isLoading,
        generationProgress,
        generate,
        edit,
        setCurrentImage,
        toast,
        clearToast,
    };
}
