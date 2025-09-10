import React, { useState, useEffect } from "react";

interface StyledProgressBarProps {
    score: number;
    isHighestScore?: boolean;
    delay?: number; // 添加延迟参数，用于控制动画开始时间
}

/**
 * @description 新版样式进度条，支持动态增长动画
 * @param score 分数 (0-100)
 * @param isHighestScore 是否为最高分
 * @param delay 动画延迟时间（毫秒）
 */
export const StyledProgressBar: React.FC<StyledProgressBarProps> = ({
    score = 0,
    isHighestScore = false,
    delay = 0
}) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 延迟显示动画
        const timer = setTimeout(() => {
            setIsVisible(true);
            setAnimatedScore(score);
        }, delay);

        return () => clearTimeout(timer);
    }, [score, delay]);

    // 根据分数选择颜色，越高分颜色越深
    const getColor = (s: number): string => {
        if (s >= 85) return "#1D4F91"; // 深蓝色
        if (s >= 65) return "#4F88D1"; // 中等蓝色
        return "#A3C2F2"; // 明亮浅蓝
    };
    const barColor = getColor(score);

    // Main container must be relative for absolute children
    return (
        <div
            style={{
                width: "100%", // 占据整个列宽
                display: "flex", // 使用 flexbox 布局
                alignItems: "center", // 垂直居中对齐
                height: "24px", // 为组件设置标准高度以保证对齐
                position: "relative", // 确保内部元素可以相对定位
            }}
        >
            {/* 进度条部分 */}
            <div
                style={{
                    width: `${animatedScore}%`,
                    height: "12px",
                    backgroundColor: barColor,
                    borderRadius: "6px",
                    transition: isVisible ? "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                    flexShrink: 0, // 防止进度条缩小
                    maxWidth: `calc(100% - 45px)`, // 确保进度条不会占据所有空间，为分数气泡留出空间 (假设气泡宽度约40px + 5px间距)
                }}
            />

            {/* 分数气泡，通过 flexbox 布局紧跟在进度条末尾 */}
            <div
                style={{
                    marginLeft: "5px", // 与进度条的固定间隙
                    height: 22,
                    padding: "0 8px", // 调整 padding 减少宽度
                    backgroundColor: isHighestScore ? "#FFD700" : "white", // 亮金色
                    border: `1px solid #e0e0e0`,
                    borderRadius: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    whiteSpace: "nowrap", // 防止分数换行
                    minWidth: "35px", // 确保气泡有最小宽度
                    flexShrink: 0, // 防止气泡缩小
                    opacity: isVisible ? 1 : 0,
                    transition: isVisible ? "opacity 0.3s ease 0.5s" : "none", // 气泡延迟显示
                }}
            >
                <span
                    style={{
                        color: isHighestScore ? "#8B572A" : "#1D4F91",
                        fontWeight: "bold",
                        fontSize: 12,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {score.toFixed(1)}
                </span>
            </div>
        </div>
    );
}; 