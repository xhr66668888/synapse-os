import { create } from 'zustand';
import type { LicenseType } from '../types/database';

// Feature Flag 配置
interface FeatureFlags {
    // 基础功能 (所有版本)
    visualInventory: boolean;      // 视觉库存监控
    deliveryCircuitBreaker: boolean; // 外卖熔断
    basicPOS: boolean;             // 基础 POS

    // Standard+ 功能
    robotControl: boolean;         // 机器人控制
    physicalInventory: boolean;    // 物理库存扣减

    // Gold 专属功能
    tasteCustomization: boolean;   // 口味个性化
    userIdPersonalization: boolean; // 用户 ID 个性化
    dynamicMenu: boolean;          // 动态菜单
}

// Feature Flag Store
interface FeatureFlagStore {
    licenseType: LicenseType;
    features: FeatureFlags;
    setLicense: (license: LicenseType) => void;
    hasFeature: (feature: keyof FeatureFlags) => boolean;
}

// 根据授权等级获取功能配置
const getFeatures = (license: LicenseType): FeatureFlags => {
    const base: FeatureFlags = {
        visualInventory: true,
        deliveryCircuitBreaker: true,
        basicPOS: true,
        robotControl: false,
        physicalInventory: false,
        tasteCustomization: false,
        userIdPersonalization: false,
        dynamicMenu: false,
    };

    if (license === 'STANDARD' || license === 'GOLD') {
        base.robotControl = true;
        base.physicalInventory = true;
    }

    if (license === 'GOLD') {
        base.tasteCustomization = true;
        base.userIdPersonalization = true;
        base.dynamicMenu = true;
    }

    return base;
};

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
    // 默认 GOLD 版本 (全功能开放)
    licenseType: 'GOLD',
    features: getFeatures('GOLD'),

    setLicense: (license: LicenseType) => {
        set({
            licenseType: license,
            features: getFeatures(license),
        });
    },

    hasFeature: (feature: keyof FeatureFlags) => {
        return get().features[feature];
    },
}));

// Hook 快捷方式
export const useFeatureFlag = (feature: keyof FeatureFlags): boolean => {
    return useFeatureFlagStore((state) => state.features[feature]);
};

export const useLicenseType = (): LicenseType => {
    return useFeatureFlagStore((state) => state.licenseType);
};
