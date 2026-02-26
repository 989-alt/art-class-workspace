import { GoogleGenAI } from '@google/genai';

const API_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Wraps a promise with a timeout. Rejects if not resolved within the given ms.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label}: 요청 시간이 초과되었습니다 (${ms / 1000}초). 네트워크 상태를 확인하거나 다시 시도해 주세요.`));
        }, ms);
        promise
            .then((val) => { clearTimeout(timer); resolve(val); })
            .catch((err) => { clearTimeout(timer); reject(err); });
    });
}

interface GenerateImageOptions {
    aspectRatio?: string;
    artStyle?: string;
}

/**
 * Custom error for calligraphy-specific failures
 */
export class CalligraphyUnavailableError extends Error {
    constructor() {
        super('⚠️ 서예(캘리그래피) 도안은 텍스트 렌더링이 가능한 gemini-3-pro-image-preview 모델에서만 생성할 수 있습니다. 현재 해당 모델이 과부하 상태(503)이거나 사용 불가하여 서예 도안을 생성할 수 없습니다. 잠시 후 다시 시도하거나, 다른 화풍을 선택해 주세요.');
        this.name = 'CalligraphyUnavailableError';
    }
}

/**
 * Generate an image using Gemini/Imagen models.
 * - For calligraphy: only gemini-3-pro-image-preview (text rendering required)
 * - For other styles: gemini-3-pro-image-preview → imagen-4.0-ultra-generate-001 fallback
 * Returns the base64-encoded image data.
 */
export async function generateImage(
    apiKey: string,
    prompt: string,
    options?: GenerateImageOptions
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    // Build the enhanced prompt with strong aspect ratio instructions
    let enhancedPrompt = prompt;
    if (options?.aspectRatio) {
        enhancedPrompt = `${prompt}\n\nCRITICAL REQUIREMENT: Generate the image with EXACTLY ${options.aspectRatio} aspect ratio. The design MUST completely fill the entire canvas from edge to edge with no empty margins or white space borders. Extend the artwork to touch all four edges of the image.`;
    }

    const isCalligraphy = options?.artStyle === 'calligraphy';

    // Calligraphy requires text rendering → only gemini-3-pro-image-preview supports this
    if (isCalligraphy) {
        try {
            console.log('Calligraphy mode: trying gemini-3-pro-image-preview (text rendering required)');
            return await generateWithGemini(ai, 'gemini-3-pro-image-preview', enhancedPrompt);
        } catch (err) {
            if (err instanceof SafetyFilterError) throw err;
            console.error('gemini-3-pro-image-preview failed for calligraphy:', err);
            throw new CalligraphyUnavailableError();
        }
    }

    // For non-calligraphy styles: try gemini-3-pro-image-preview, then imagen-4.0-ultra-generate-001
    // Step 1: Try gemini-3-pro-image-preview via generateContent
    try {
        console.log('Trying model: gemini-3-pro-image-preview');
        return await generateWithGemini(ai, 'gemini-3-pro-image-preview', enhancedPrompt);
    } catch (err) {
        if (err instanceof SafetyFilterError) throw err;
        console.warn('gemini-3-pro-image-preview failed:', err);
    }

    // Step 2: Fallback to imagen-4.0-ultra-generate-001 via generateImages
    try {
        console.log('Trying model: imagen-4.0-ultra-generate-001');
        return await generateWithImagen(ai, 'imagen-4.0-ultra-generate-001', enhancedPrompt, options?.aspectRatio);
    } catch (err) {
        if (err instanceof SafetyFilterError) throw err;
        console.warn('imagen-4.0-ultra-generate-001 failed:', err);
    }

    throw new Error('이미지를 생성하지 못했습니다. 다시 시도해 주세요.');
}

/**
 * Generate image using Gemini model via generateContent API
 */
async function generateWithGemini(ai: GoogleGenAI, model: string, prompt: string): Promise<string> {
    const response = await withTimeout(
        ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        }),
        API_TIMEOUT_MS,
        model
    );

    if (!response.candidates || response.candidates.length === 0) {
        throw new Error(`${model}: No candidates returned`);
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
        throw new SafetyFilterError('⚠️ 안전 정책에 의해 이미지 생성이 차단되었습니다. 다른 주제로 시도해 주세요.');
    }

    const parts = candidate.content?.parts;
    if (!parts) {
        throw new Error(`${model}: No parts in response`);
    }

    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            console.log(`Successfully generated image with ${model}`);
            return part.inlineData.data;
        }
    }

    throw new Error(`${model}: No image data found`);
}

/**
 * Generate image using Imagen model via generateImages API
 */
async function generateWithImagen(
    ai: GoogleGenAI,
    model: string,
    prompt: string,
    aspectRatio?: string
): Promise<string> {
    const response = await withTimeout(
        ai.models.generateImages({
            model,
            prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio || '1:1',
            },
        }),
        API_TIMEOUT_MS,
        model
    );

    const generatedImage = response.generatedImages?.[0];

    if (generatedImage?.raiFilteredReason) {
        throw new SafetyFilterError('⚠️ 안전 정책에 의해 이미지 생성이 차단되었습니다. 다른 주제로 시도해 주세요.');
    }

    if (generatedImage?.image?.imageBytes) {
        console.log(`Successfully generated image with ${model}`);
        return generatedImage.image.imageBytes;
    }

    throw new Error(`${model}: No image data returned`);
}

/**
 * Edit an existing image using Gemini's image+text-to-image capability.
 * Returns the base64-encoded edited image data.
 */
export async function editImage(
    apiKey: string,
    imageBase64: string,
    editPrompt: string
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const response = await withTimeout(
        ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'image/png',
                                data: imageBase64,
                            },
                        },
                        {
                            text: `${editPrompt}\n\nIMPORTANT: The result must remain a black and white line art coloring page with pure black outlines on white background. No shading, no gradients, no colors. Maintain the exact same aspect ratio and ensure the design fills the entire canvas.`,
                        },
                    ],
                },
            ],
            config: {
                responseModalities: ['Text', 'Image'],
            },
        }),
        API_TIMEOUT_MS,
        'gemini-2.5-flash (edit)'
    );

    if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI가 수정 응답을 생성하지 못했습니다.');
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
        throw new SafetyFilterError('⚠️ 안전 정책에 의해 이미지 수정이 차단되었습니다.');
    }

    const parts = candidate.content?.parts;
    if (!parts) {
        throw new Error('수정 응답에 이미지 데이터가 없습니다.');
    }

    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
    }

    throw new Error('이미지를 수정하지 못했습니다. 다시 시도해 주세요.');
}

/**
 * Validate an API key by making a lightweight request.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: 'Hi',
        });
        return true;
    } catch {
        return false;
    }
}

export class SafetyFilterError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SafetyFilterError';
    }
}
