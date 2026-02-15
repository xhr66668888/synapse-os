/**
 * ============================================================
 * 🍳 持久化口味偏好服务 (Taste Preference Service)
 * ============================================================
 * 
 * 流程：
 * 1. 顾客扫码/手机号登录 → 获取历史偏好
 * 2. 点餐时自动应用个人口味参数
 * 3. 机器人按个性化参数烹饪
 * 4. 用餐后发送短信问卷收集反馈
 * 5. 根据反馈更新偏好数据
 * 
 * 数据存储：
 * - 云端数据库 (Supabase / 自建)
 * - 本地 IndexedDB 缓存
 * 
 * ============================================================
 */

// ============================================================
// 📋 数据结构定义
// ============================================================

/**
 * 顾客账户 (以手机号为主键)
 */
export interface CustomerAccount {
    id: string;
    phone: string;              // 手机号 (主要登录方式)
    name?: string;
    email?: string;
    createdAt: Date;
    lastVisit?: Date;
    totalOrders: number;
    totalSpent: number;
}

/**
 * 口味偏好参数
 * 每个参数范围 1-5:
 *   1 = 最少/最淡
 *   3 = 标准
 *   5 = 最多/最浓
 */
export interface TastePreferences {
    // 基础口味
    saltiness: number;          // 咸度 (1=淡, 5=重盐)
    spiciness: number;          // 辣度 (1=不辣, 5=特辣)
    oiliness: number;           // 油量 (1=少油, 5=多油)
    sweetness: number;          // 甜度 (1=不甜, 5=很甜)
    sourness: number;           // 酸度 (1=不酸, 5=很酸)

    // 份量偏好
    portionSize: number;        // 份量 (1=小份, 5=大份)
    meatAmount: number;         // 肉量 (1=少肉, 5=多肉)
    vegetableAmount: number;    // 菜量 (1=少菜, 5=多菜)

    // 特殊要求
    noGarlic: boolean;          // 不要蒜
    noCilantro: boolean;        // 不要香菜
    noOnion: boolean;           // 不要葱
    noMSG: boolean;             // 不要味精

    // 自定义备注
    customNotes?: string;
}

/**
 * 问卷反馈记录
 */
export interface FeedbackRecord {
    id: string;
    customerId: string;
    orderId: string;
    createdAt: Date;

    // 反馈内容
    feedback: {
        wasTooSalty?: boolean;     // 太咸了
        wasTooLight?: boolean;     // 太淡了
        wasTooSpicy?: boolean;     // 太辣了
        wasNotSpicyEnough?: boolean;  // 不够辣
        wasTooOily?: boolean;      // 太油了
        wasNotOilyEnough?: boolean;   // 不够油
        portionTooSmall?: boolean; // 量太少
        portionTooBig?: boolean;   // 量太多
        wantMoreMeat?: boolean;    // 想要更多肉
        wantMoreVegetable?: boolean;  // 想要更多菜
        generalRating: 1 | 2 | 3 | 4 | 5;  // 总体评分
        comments?: string;         // 其他意见
    };

    // 是否已处理
    processed: boolean;
}

// ============================================================
// 📱 短信服务配置 (问卷推送)
// ============================================================
/**
 * 推荐服务商：
 * 
 * 🔷 Twilio SMS (推荐美国市场)
 *    - API: https://www.twilio.com/sms
 *    - 价格: ~$0.0079/条
 * 
 * 🔷 AWS SNS
 *    - 适合已用 AWS 的项目
 * 
 * 🔷 阿里云短信 (国内)
 *    - 适合中国市场
 */

export interface SMSConfig {
    provider: 'twilio' | 'aws' | 'aliyun' | 'custom';

    twilio?: {
        accountSid: string;
        authToken: string;
        fromNumber: string;       // 发送方号码
    };

    aws?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
    };

    // 问卷链接配置
    surveyBaseUrl: string;       // 如 https://your-app.com/survey
}

// ============================================================
// 🔧 问卷模板
// ============================================================

export const SURVEY_QUESTIONS = {
    zh: {
        greeting: '感谢您在 Synapse 餐厅用餐！请花 1 分钟告诉我们您的用餐体验：',
        questions: [
            { key: 'saltiness', text: '咸度如何？', options: ['太淡', '刚好', '太咸'] },
            { key: 'spiciness', text: '辣度如何？', options: ['不够辣', '刚好', '太辣'] },
            { key: 'oiliness', text: '油量如何？', options: ['太少', '刚好', '太油'] },
            { key: 'portion', text: '份量如何？', options: ['太少', '刚好', '太多'] },
            { key: 'meat', text: '肉量如何？', options: ['想多点', '刚好', '太多'] },
            { key: 'overall', text: '总体评分', options: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'] },
        ],
        thankYou: '感谢反馈！下次点餐时我们会根据您的口味调整 🍳',
    },
    en: {
        greeting: 'Thanks for dining at Synapse! Please take 1 minute to share your experience:',
        questions: [
            { key: 'saltiness', text: 'How was the saltiness?', options: ['Too light', 'Just right', 'Too salty'] },
            { key: 'spiciness', text: 'How was the spice level?', options: ['Not enough', 'Just right', 'Too spicy'] },
            { key: 'oiliness', text: 'How was the oil level?', options: ['Too little', 'Just right', 'Too oily'] },
            { key: 'portion', text: 'How was the portion size?', options: ['Too small', 'Just right', 'Too big'] },
            { key: 'meat', text: 'How was the meat amount?', options: ['Want more', 'Just right', 'Too much'] },
            { key: 'overall', text: 'Overall rating', options: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'] },
        ],
        thankYou: 'Thanks for your feedback! We\'ll adjust your next meal to your taste 🍳',
    },
};

// ============================================================
// 🎯 口味偏好服务类
// ============================================================

class TastePreferenceService {
    private smsConfig: SMSConfig | null = null;

    // 模拟数据库 (实际应连接 Supabase)
    private customers: Map<string, CustomerAccount> = new Map();
    private preferences: Map<string, TastePreferences> = new Map();
    private feedbacks: FeedbackRecord[] = [];

    /**
     * 配置短信服务
     */
    configureSMS(config: SMSConfig): void {
        this.smsConfig = config;
        console.log('📱 [TastePreference] SMS configured:', config.provider);
    }

    /**
     * 通过手机号登录/注册
     */
    async loginByPhone(phone: string): Promise<CustomerAccount> {
        let customer = this.customers.get(phone);

        if (!customer) {
            // 新用户，创建账户
            customer = {
                id: `CUST_${Date.now()}`,
                phone,
                createdAt: new Date(),
                totalOrders: 0,
                totalSpent: 0,
            };
            this.customers.set(phone, customer);

            // 初始化默认偏好
            this.preferences.set(customer.id, this.getDefaultPreferences());

            console.log('👤 [TastePreference] New customer registered:', phone);
        } else {
            customer.lastVisit = new Date();
            console.log('👤 [TastePreference] Customer logged in:', phone);
        }

        return customer;
    }

    /**
     * 获取默认口味偏好
     */
    getDefaultPreferences(): TastePreferences {
        return {
            saltiness: 3,
            spiciness: 3,
            oiliness: 3,
            sweetness: 3,
            sourness: 3,
            portionSize: 3,
            meatAmount: 3,
            vegetableAmount: 3,
            noGarlic: false,
            noCilantro: false,
            noOnion: false,
            noMSG: false,
        };
    }

    /**
     * 获取顾客口味偏好
     */
    async getPreferences(customerId: string): Promise<TastePreferences | null> {
        return this.preferences.get(customerId) || null;
    }

    /**
     * 更新口味偏好
     */
    async updatePreferences(
        customerId: string,
        updates: Partial<TastePreferences>
    ): Promise<TastePreferences> {
        const current = this.preferences.get(customerId) || this.getDefaultPreferences();
        const updated = { ...current, ...updates };
        this.preferences.set(customerId, updated);

        console.log('🍳 [TastePreference] Updated preferences for:', customerId);
        return updated;
    }

    /**
     * 将口味偏好转换为机器人参数
     * 这是核心功能 - 将用户口味映射到烹饪参数
     */
    convertToRobotParams(prefs: TastePreferences): Record<string, number | boolean> {
        return {
            // 调味参数 (1-5 → 机器人可理解的 0-100 或具体克数)
            SALT_LEVEL: Math.round((prefs.saltiness - 1) * 25),      // 0-100%
            SPICE_LEVEL: Math.round((prefs.spiciness - 1) * 25),     // 0-100%
            OIL_AMOUNT: Math.round((prefs.oiliness - 1) * 25),       // 0-100%
            SUGAR_LEVEL: Math.round((prefs.sweetness - 1) * 25),     // 0-100%
            VINEGAR_LEVEL: Math.round((prefs.sourness - 1) * 25),    // 0-100%

            // 份量参数
            PORTION_MULTIPLIER: 0.7 + (prefs.portionSize - 1) * 0.15, // 0.7x - 1.3x
            MEAT_MULTIPLIER: 0.7 + (prefs.meatAmount - 1) * 0.15,
            VEGETABLE_MULTIPLIER: 0.7 + (prefs.vegetableAmount - 1) * 0.15,

            // 排除项
            SKIP_GARLIC: prefs.noGarlic,
            SKIP_CILANTRO: prefs.noCilantro,
            SKIP_ONION: prefs.noOnion,
            SKIP_MSG: prefs.noMSG,
        };
    }

    /**
     * 发送问卷短信
     * TODO: 实现实际短信发送
     */
    async sendSurvey(customerId: string, orderId: string): Promise<boolean> {
        if (!this.smsConfig) {
            console.warn('📱 [TastePreference] SMS not configured');
            return false;
        }

        const customer = Array.from(this.customers.values()).find(c => c.id === customerId);
        if (!customer) return false;

        const surveyUrl = `${this.smsConfig.surveyBaseUrl}?customer=${customerId}&order=${orderId}`;
        const message = `${SURVEY_QUESTIONS.zh.greeting}\n\n点击填写: ${surveyUrl}`;

        console.log('📱 [TastePreference] Sending survey SMS to:', customer.phone);
        console.log('📱 Message:', message);

        // TODO: 实际调用 Twilio/AWS 发送短信
        // const twilio = require('twilio')(this.smsConfig.twilio!.accountSid, this.smsConfig.twilio!.authToken);
        // await twilio.messages.create({
        //   body: message,
        //   from: this.smsConfig.twilio!.fromNumber,
        //   to: customer.phone,
        // });

        return true;
    }

    /**
     * 处理问卷反馈
     * 根据反馈自动调整口味偏好
     */
    async processFeedback(feedback: FeedbackRecord): Promise<void> {
        const prefs = await this.getPreferences(feedback.customerId);
        if (!prefs) return;

        const updates: Partial<TastePreferences> = {};

        // 根据反馈调整偏好
        if (feedback.feedback.wasTooSalty) {
            updates.saltiness = Math.max(1, prefs.saltiness - 1);
        } else if (feedback.feedback.wasTooLight) {
            updates.saltiness = Math.min(5, prefs.saltiness + 1);
        }

        if (feedback.feedback.wasTooSpicy) {
            updates.spiciness = Math.max(1, prefs.spiciness - 1);
        } else if (feedback.feedback.wasNotSpicyEnough) {
            updates.spiciness = Math.min(5, prefs.spiciness + 1);
        }

        if (feedback.feedback.wasTooOily) {
            updates.oiliness = Math.max(1, prefs.oiliness - 1);
        } else if (feedback.feedback.wasNotOilyEnough) {
            updates.oiliness = Math.min(5, prefs.oiliness + 1);
        }

        if (feedback.feedback.portionTooSmall) {
            updates.portionSize = Math.min(5, prefs.portionSize + 1);
        } else if (feedback.feedback.portionTooBig) {
            updates.portionSize = Math.max(1, prefs.portionSize - 1);
        }

        if (feedback.feedback.wantMoreMeat) {
            updates.meatAmount = Math.min(5, prefs.meatAmount + 1);
        }

        if (feedback.feedback.wantMoreVegetable) {
            updates.vegetableAmount = Math.min(5, prefs.vegetableAmount + 1);
        }

        // 应用更新
        if (Object.keys(updates).length > 0) {
            await this.updatePreferences(feedback.customerId, updates);
            console.log('🔄 [TastePreference] Auto-adjusted preferences:', updates);
        }

        feedback.processed = true;
        this.feedbacks.push(feedback);
    }

    /**
     * 获取顾客的反馈历史
     */
    getFeedbackHistory(customerId: string): FeedbackRecord[] {
        return this.feedbacks.filter(f => f.customerId === customerId);
    }

    /**
     * 获取所有顾客 (管理后台用)
     */
    getAllCustomers(): CustomerAccount[] {
        return Array.from(this.customers.values());
    }
}

export const tastePreferenceService = new TastePreferenceService();
export default tastePreferenceService;
