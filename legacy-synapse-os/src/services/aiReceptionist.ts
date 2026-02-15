/**
 * ============================================================
 * 🤖 AI 接线员服务 (AI Receptionist / AI Phone Agent)
 * ============================================================
 * 
 * 功能：自动接听电话 → 语音识别 → LLM理解意图 → 自动下单
 * 
 * 架构图：
 * ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
 * │   来电      │ ──► │  VoIP/SIP   │ ──► │    ASR      │ ──► │    LLM      │
 * │  (顾客)     │     │  电话服务    │     │  语音转文字  │     │  意图理解    │
 * └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
 *                                                                    │
 *                     ┌─────────────┐     ┌─────────────┐           │
 *                     │   挂断电话   │ ◄── │  TTS回复    │ ◄─────────┘
 *                     │  自动下单    │     │  语音合成    │
 *                     └─────────────┘     └─────────────┘
 * 
 * ============================================================
 * 需要对接的外部服务 (全部预留接口，易于更换)
 * ============================================================
 */

// ============================================================
// 1️⃣ VoIP/SIP 电话服务 - 接收和拨打电话
// ============================================================
/**
 * 推荐服务商：
 * 
 * 🔷 Twilio Voice (推荐新手)
 *    - 官网: https://www.twilio.com/voice
 *    - 优点: 文档完善，API 简单，支持 WebSocket 实时流
 *    - 价格: ~$0.013/分钟 入站, ~$0.014/分钟 出站
 *    - 集成方式: REST API + WebSocket
 * 
 * 🔷 Vonage (原 Nexmo)
 *    - 官网: https://developer.vonage.com/voice
 *    - 优点: 全球覆盖好，企业级稳定性
 *    - 价格: 按需付费
 * 
 * 🔷 Plivo
 *    - 官网: https://www.plivo.com/
 *    - 优点: 价格较低，适合高通话量
 * 
 * 🔷 自建 Asterisk/FreeSWITCH (高级)
 *    - 适合: 高度定制化需求
 *    - 需要: 服务器 + SIP 中继
 */

export interface VoIPConfig {
    provider: 'twilio' | 'vonage' | 'plivo' | 'asterisk' | 'custom';

    // Twilio 配置示例
    twilio?: {
        accountSid: string;      // 从 Twilio Console 获取
        authToken: string;       // 从 Twilio Console 获取
        phoneNumber: string;     // 购买的电话号码 (如 +1-555-123-4567)
        webhookUrl: string;      // 接收来电通知的 URL (如 https://your-api.com/voice/incoming)
    };

    // Vonage 配置
    vonage?: {
        apiKey: string;
        apiSecret: string;
        applicationId: string;
        privateKeyPath: string;
    };

    // 自建 SIP 配置
    sip?: {
        server: string;          // SIP 服务器地址
        port: number;            // 默认 5060
        username: string;
        password: string;
        stunServer?: string;     // STUN 服务器 (WebRTC 需要)
    };
}

// ============================================================
// 2️⃣ ASR 语音转文字服务 - 实时转录通话内容
// ============================================================
/**
 * 推荐服务商：
 * 
 * 🔷 OpenAI Whisper (推荐精度)
 *    - API: https://platform.openai.com/docs/guides/speech-to-text
 *    - 优点: 多语言支持优秀，中英文混合效果好
 *    - 价格: $0.006/分钟
 *    - 注意: 非实时，需上传音频文件
 * 
 * 🔷 Deepgram (推荐实时)
 *    - API: https://developers.deepgram.com/
 *    - 优点: 实时流式转录，延迟 <300ms
 *    - 价格: $0.0043/分钟 (Pay-as-you-go)
 *    - 支持: WebSocket 实时流
 * 
 * 🔷 AssemblyAI
 *    - API: https://www.assemblyai.com/
 *    - 优点: 实时 + 后处理，自动标点
 *    - 价格: $0.00025/秒 (~$0.015/分钟)
 * 
 * 🔷 Google Cloud Speech-to-Text
 *    - API: https://cloud.google.com/speech-to-text
 *    - 优点: 企业级稳定，多语言
 *    - 价格: $0.016/分钟 (标准模型)
 * 
 * 🔷 Azure Speech Service
 *    - API: https://azure.microsoft.com/en-us/products/cognitive-services/speech-services
 *    - 优点: 支持自定义模型
 * 
 * 🔷 本地部署 Whisper (省钱方案)
 *    - 使用: whisper.cpp 或 faster-whisper
 *    - 需要: GPU 服务器
 *    - 成本: 仅服务器费用
 */

export interface ASRConfig {
    provider: 'whisper' | 'deepgram' | 'assemblyai' | 'google' | 'azure' | 'local-whisper';

    // OpenAI Whisper
    whisper?: {
        apiKey: string;          // OpenAI API Key
        model: 'whisper-1';      // 目前只有一个模型
        language?: string;       // 'zh' | 'en' | 自动检测
    };

    // Deepgram (实时流推荐)
    deepgram?: {
        apiKey: string;
        model: 'nova-2' | 'enhanced' | 'base';
        language: 'zh' | 'en' | 'multi';  // multi: 多语言混合
        punctuate: boolean;      // 自动标点
        smartFormat: boolean;    // 智能格式化数字等
    };

    // 本地 Whisper
    localWhisper?: {
        modelPath: string;       // 模型文件路径
        modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
        device: 'cuda' | 'cpu';
    };
}

// ============================================================
// 3️⃣ LLM 意图理解服务 - 理解订单并生成响应
// ============================================================
/**
 * 推荐模型：
 * 
 * 🔷 OpenAI GPT-4o / GPT-4o-mini (推荐)
 *    - API: https://platform.openai.com/
 *    - 优点: 理解能力强，支持 function calling
 *    - 价格: GPT-4o $5/1M input tokens
 * 
 * 🔷 Claude 3.5 Sonnet (Anthropic)
 *    - API: https://www.anthropic.com/api
 *    - 优点: 推理能力强，安全性好
 *    - 价格: $3/1M input tokens
 * 
 * 🔷 开源模型 (省钱方案)
 *    - Llama 3.1 70B / 8B
 *    - Qwen 2.5 (阿里，中文优秀)
 *    - Mistral 7B
 *    - 部署: vLLM, Ollama, LocalAI
 * 
 * 🔷 国内模型
 *    - 通义千问 (阿里)
 *    - 文心一言 (百度)
 *    - GLM-4 (智谱)
 */

export interface LLMConfig {
    provider: 'openai' | 'anthropic' | 'local' | 'qwen' | 'custom';

    // OpenAI
    openai?: {
        apiKey: string;
        model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';
        temperature: number;     // 0-1, 建议 0.3 用于订单处理
        maxTokens: number;
    };

    // Anthropic Claude
    anthropic?: {
        apiKey: string;
        model: 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307';
    };

    // 本地/自部署 (通过 OpenAI 兼容 API)
    local?: {
        baseUrl: string;         // 如 http://localhost:11434/v1 (Ollama)
        model: string;           // 如 'llama3.1:70b', 'qwen2.5:72b'
        apiKey?: string;         // 可选
    };

    // 通义千问
    qwen?: {
        apiKey: string;
        model: 'qwen-max' | 'qwen-plus' | 'qwen-turbo';
    };
}

// ============================================================
// 4️⃣ TTS 语音合成服务 - AI 回复顾客
// ============================================================
/**
 * 推荐服务商：
 * 
 * 🔷 ElevenLabs (最自然)
 *    - API: https://elevenlabs.io/
 *    - 优点: 声音极其自然，支持克隆
 *    - 价格: $0.30/1000 字符
 * 
 * 🔷 OpenAI TTS
 *    - API: https://platform.openai.com/docs/guides/text-to-speech
 *    - 优点: API 简单，效果不错
 *    - 价格: $15/1M 字符
 * 
 * 🔷 Azure Neural TTS
 *    - 优点: 中文效果好
 * 
 * 🔷 Google Cloud TTS
 *    - 优点: 多语言支持
 */

export interface TTSConfig {
    provider: 'elevenlabs' | 'openai' | 'azure' | 'google';

    openai?: {
        apiKey: string;
        model: 'tts-1' | 'tts-1-hd';
        voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    };

    elevenlabs?: {
        apiKey: string;
        voiceId: string;         // 预设或克隆的声音 ID
    };
}

// ============================================================
// 📞 通话记录数据结构
// ============================================================

export interface CallRecord {
    id: string;
    phoneNumber: string;       // 来电号码
    callStartTime: Date;
    callEndTime?: Date;
    duration?: number;         // 秒

    // 转录内容
    transcript: Array<{
        role: 'customer' | 'ai';
        text: string;
        timestamp: number;
    }>;

    // LLM 提取的订单信息
    extractedOrder?: {
        items: Array<{
            name: string;
            quantity: number;
            modifiers?: string[];  // 如 "不要香菜", "多放辣"
        }>;
        orderType: 'pickup' | 'delivery';
        customerName?: string;
        deliveryAddress?: string;
        specialInstructions?: string;
    };

    // 订单状态
    orderCreated: boolean;
    orderId?: string;

    // 音频文件 (可选存储)
    audioUrl?: string;
}

// ============================================================
// 🎯 AI 接线员服务类
// ============================================================

class AIReceptionistService {
    private voipConfig: VoIPConfig | null = null;
    private asrConfig: ASRConfig | null = null;
    private llmConfig: LLMConfig | null = null;
    private ttsConfig: TTSConfig | null = null;

    private callRecords: CallRecord[] = [];

    // 系统提示词 (可自定义)
    private systemPrompt = `你是 Synapse 中餐厅的 AI 接线员。你的任务是：
1. 礼貌地接听电话
2. 帮助顾客点餐
3. 确认订单详情（菜品、数量、取餐/外卖、地址）
4. 询问是否有特殊要求

菜单包括：宫保鸡丁($15.99)、麻婆豆腐($12.99)、红烧肉($18.99)、蛋炒饭($8.99) 等。

请用简洁友好的语气与顾客对话。确认订单时要复述一遍。`;

    /**
     * 配置 VoIP 服务
     */
    configureVoIP(config: VoIPConfig): void {
        this.voipConfig = config;
        console.log('📞 [AI Receptionist] VoIP configured:', config.provider);
    }

    /**
     * 配置 ASR 服务
     */
    configureASR(config: ASRConfig): void {
        this.asrConfig = config;
        console.log('🎤 [AI Receptionist] ASR configured:', config.provider);
    }

    /**
     * 配置 LLM 服务
     */
    configureLLM(config: LLMConfig): void {
        this.llmConfig = config;
        console.log('🧠 [AI Receptionist] LLM configured:', config.provider);
    }

    /**
     * 配置 TTS 服务
     */
    configureTTS(config: TTSConfig): void {
        this.ttsConfig = config;
        console.log('🔊 [AI Receptionist] TTS configured:', config.provider);
    }

    /**
     * 处理来电 (主入口)
     * TODO: 实际实现需要对接 VoIP WebSocket
     */
    async handleIncomingCall(phoneNumber: string): Promise<CallRecord> {
        console.log('📞 [AI Receptionist] Incoming call from:', phoneNumber);

        const record: CallRecord = {
            id: `CALL_${Date.now()}`,
            phoneNumber,
            callStartTime: new Date(),
            transcript: [],
            orderCreated: false,
        };

        // TODO: 实际流程
        // 1. 接听电话 (VoIP)
        // 2. 循环: 录音 → ASR → LLM → TTS → 播放
        // 3. 当 LLM 判断订单完成时，创建订单
        // 4. 挂断电话

        this.callRecords.push(record);
        return record;
    }

    /**
     * 语音转文字
     * TODO: 实现各服务商的调用
     */
    async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
        if (!this.asrConfig) {
            throw new Error('ASR not configured');
        }

        console.log('🎤 [AI Receptionist] Transcribing audio...');

        // TODO: 根据 provider 调用相应 API
        // 示例: OpenAI Whisper
        // const formData = new FormData();
        // formData.append('file', new Blob([audioBuffer]), 'audio.wav');
        // formData.append('model', 'whisper-1');
        // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        //   method: 'POST',
        //   headers: { 'Authorization': `Bearer ${this.asrConfig.whisper?.apiKey}` },
        //   body: formData,
        // });

        return '模拟转录文本';
    }

    /**
     * LLM 处理对话
     * TODO: 实现各模型的调用
     */
    async processWithLLM(
        transcript: CallRecord['transcript'],
        customerMessage: string
    ): Promise<{ response: string; orderComplete: boolean; extractedOrder?: CallRecord['extractedOrder'] }> {
        if (!this.llmConfig) {
            throw new Error('LLM not configured');
        }

        console.log('🧠 [AI Receptionist] Processing with LLM...');

        // TODO: 构建 messages 并调用 LLM API
        // 使用 function calling 提取订单信息

        return {
            response: '模拟 AI 回复',
            orderComplete: false,
        };
    }

    /**
     * 文字转语音
     * TODO: 实现各服务商的调用
     */
    async synthesizeSpeech(text: string): Promise<ArrayBuffer> {
        if (!this.ttsConfig) {
            throw new Error('TTS not configured');
        }

        console.log('🔊 [AI Receptionist] Synthesizing speech...');

        // TODO: 调用 TTS API 生成音频

        return new ArrayBuffer(0);
    }

    /**
     * 创建订单
     */
    async createOrderFromCall(record: CallRecord): Promise<string> {
        if (!record.extractedOrder) {
            throw new Error('No order extracted from call');
        }

        console.log('📝 [AI Receptionist] Creating order from call:', record.id);

        // TODO: 调用 orderStore 或 API 创建订单
        const orderId = `ORD_${Date.now()}`;

        record.orderCreated = true;
        record.orderId = orderId;

        return orderId;
    }

    /**
     * 获取通话记录
     */
    getCallRecords(): CallRecord[] {
        return this.callRecords;
    }

    /**
     * 获取配置状态
     */
    getStatus(): {
        voip: boolean;
        asr: boolean;
        llm: boolean;
        tts: boolean;
    } {
        return {
            voip: !!this.voipConfig,
            asr: !!this.asrConfig,
            llm: !!this.llmConfig,
            tts: !!this.ttsConfig,
        };
    }
}

export const aiReceptionistService = new AIReceptionistService();
export default aiReceptionistService;
