'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Square } from 'lucide-react';
import { useAIAssistantStore } from '@/lib/ai-assistant-store';

interface VoiceRecorderProps {
    onResult: (text: string) => void;
}

export function VoiceRecorder({ onResult }: VoiceRecorderProps) {
    const { isListening, setListening } = useAIAssistantStore();
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // 停止所有轨道
                stream.getTracks().forEach(track => track.stop());

                // 创建音频 blob
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

                // 转写
                await transcribeAudio(audioBlob);
            };

            mediaRecorder.start(100); // 每 100ms 收集一次数据
            setListening(true);

        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('无法访问麦克风，请检查权限设置');
            setListening(false);
        }
    }, [setListening]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setListening(false);
        }
    }, [setListening]);

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true);

        try {
            // 将 blob 转换为 base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
            });
            reader.readAsDataURL(audioBlob);
            const audioBase64 = await base64Promise;

            // 调用后端 API (使用环境变量配置的URL)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/v1/agent/transcribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_base64: audioBase64,
                    language: 'zh',
                    format: 'webm'
                }),
            });

            if (!response.ok) {
                throw new Error('转写请求失败');
            }

            const result = await response.json();

            if (result.success && result.text) {
                onResult(result.text);
            } else {
                setError(result.error || '语音识别失败');
            }

        } catch (err) {
            console.error('Transcription error:', err);
            setError('语音识别失败，请重试');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleClick = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                disabled={isTranscribing}
                className={`p-3 rounded-xl transition-all ${isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : isTranscribing
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-bg-secondary hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                    }`}
                title={isListening ? '点击停止录音' : '点击开始语音输入'}
            >
                {isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isListening ? (
                    <Square className="w-5 h-5" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>

            {/* 录音指示器 */}
            {isListening && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            )}

            {/* 错误提示 */}
            {error && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 whitespace-nowrap">
                    {error}
                </div>
            )}
        </div>
    );
}
