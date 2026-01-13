/**
 * paramHelpers.js
 * 參數轉換輔助函數
 * 用於處理 Ratio 控制器與實際 Ratio 值之間的非線性映射
 */

/**
 * 將控制器值 (0-100) 轉換為實際 Ratio 值 (1-100)
 * 映射規則：
 * - 0-50: 1:1 到 5:1 (常用範圍，精細控制)
 * - 50-75: 5:1 到 10:1 (中度壓縮)
 * - 75-100: 10:1 到 100:1 (極限壓縮)
 * @param {number} ctrl - 控制器值 (0-100)
 * @returns {number} 實際 Ratio 值
 */
export const calculateRatioFromControl = (ctrl) => {
    if (ctrl <= 50) {
        // 0-50: 1:1 到 5:1
        return 1 + (ctrl / 50) * 4;
    } else if (ctrl <= 75) {
        // 50-75: 5:1 到 10:1
        return 5 + ((ctrl - 50) / 25) * 5;
    } else {
        // 75-100: 10:1 到 100:1
        return 10 + ((ctrl - 75) / 25) * 90;
    }
};

/**
 * 將實際 Ratio 值轉換為控制器值 (0-100)
 * 這是 calculateRatioFromControl 的反向函數
 * @param {number} r - 實際 Ratio 值
 * @returns {number} 控制器值 (0-100)
 */
export const calculateControlFromRatio = (r) => {
    if (r <= 5) {
        // 1:1 到 5:1 -> 0-50
        return (r - 1) / 4 * 50;
    } else if (r <= 10) {
        // 5:1 到 10:1 -> 50-75
        return 50 + (r - 5) / 5 * 25;
    } else {
        // 10:1 到 100:1 -> 75-100
        return 75 + (r - 10) / 90 * 25;
    }
};
