import { useState, useCallback } from 'react';
import { generateImage, editImage, SafetyFilterError } from '../services/geminiService';
import { buildPrompt, buildEditPrompt, buildPromptFromPreset } from '../services/promptBuilder';
import { calculateAspectRatio } from '../utils/aspectRatio';
import { CURRICULUM_PRESETS } from '../data/curriculumPresets';
import type { GenerationConfig, ToastMessage, GalleryItem } from '../types';

interface UseGenerationReturn {
    currentImage: string | null;
    isLoading: boolean;
    generationProgress: { current: number; total: number } | null;
    generate: (apiKey: string, config: GenerationConfig, count: number, onImageGenerated: (item: GalleryItem) => void) => Promise<void>;
    edit: (apiKey: string, editType: string) => Promise<void>;
    setCurrentImage: (image: string | null) => void;
    toast: ToastMessage | null;
    setToast: (toast: ToastMessage | null) => void;
    clearToast: () => void;
    /** Most recent prompt sent to Gemini (used for certificate metadata). */
    lastPrompt: string;
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
    const [toast, setToastState] = useState<ToastMessage | null>(null);
    const [lastPrompt, setLastPrompt] = useState<string>('');

    const showToast = useCallback((type: ToastMessage['type'], message: string) => {
        setToastState({ id: `toast-${++toastCounter}`, type, message });
    }, []);

    const setToast = useCallback((next: ToastMessage | null) => {
        if (next === null) {
            setToastState(null);
            return;
        }
        // Ensure every externally-set toast gets a unique id so re-renders animate correctly.
        setToastState({ ...next, id: next.id || `toast-${++toastCounter}` });
    }, []);

    const clearToast = useCallback(() => setToastState(null), []);

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

            // Resolve prompt. For curriculum mode with a presetId, require the preset to exist —
            // otherwise surface an error rather than silently falling back to a Korean topic.
            let prompt: string;
            if (config.mode === 'curriculum' && config.presetId) {
                const preset = CURRICULUM_PRESETS.find((p) => p.id === config.presetId);
                if (!preset) {
                    showToast('error', PRESET_NOT_FOUND_MESSAGE);
                    setGenerationProgress(null);
                    setIsLoading(false);
                    return;
                }
                prompt = buildPromptFromPreset(
                    preset,
                    config.selectedTopic ?? null,
                    config.difficulty,
                    config.orientation,
                    config.paperSize,
                    config.gridN,
                    config.gridM
                );
            } else {
                prompt = buildPrompt(
                    config.mode,
                    config.topic,
                    config.mandalaPreset,
                    config.difficulty,
                    config.orientation,
                    config.paperSize,
                    config.gridN,
                    config.gridM
                );
            }

            // Remember the prompt for downstream provenance metadata
            // (copyright certificate page).
            setLastPrompt(prompt);

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
                showToast('success', `${SUCCESS_PREFIX}${successCount}${SUCCESS_SUFFIX}`);
            } else if (errorCount > 0) {
                showToast('error', FAIL_MESSAGE);
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
                setLastPrompt(editPrompt);
                const editedData = await editImage(apiKey, currentImage, editPrompt);
                setCurrentImage(editedData);
                showToast('success', EDIT_SUCCESS_MESSAGE);
            } catch (err) {
                if (err instanceof SafetyFilterError) {
                    showToast('warning', err.message);
                } else {
                    showToast('error', err instanceof Error ? err.message : EDIT_FAIL_MESSAGE);
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
        setToast,
        clearToast,
        lastPrompt,
    };
}

// Korean strings are defined via \uXXXX escapes to avoid any editor/tool
// corruption of multi-byte sequences.
// "선택한 프리셋을 찾을 수 없습니다."
const PRESET_NOT_FOUND_MESSAGE =
    '선택한 프리셋을 찾을 수 없습니다.';
// "✨ "
const SUCCESS_PREFIX = '✨ ';
// "개의 도안이 생성되었습니다!"
const SUCCESS_SUFFIX =
    '개의 도안이 생성되었습니다!';
// "이미지 생성에 실패했습니다. 다시 시도해 주세요."
const FAIL_MESSAGE =
    '이미지 생성에 실패했습니다. 다시 시도해 주세요.';
// "✏️ 도안이 수정되었습니다!"
const EDIT_SUCCESS_MESSAGE =
    '✏️ 도안이 수정되었습니다!';
// "이미지 수정 중 오류가 발생했습니다."
const EDIT_FAIL_MESSAGE =
    '이미지 수정 중 오류가 발생했습니다.';
