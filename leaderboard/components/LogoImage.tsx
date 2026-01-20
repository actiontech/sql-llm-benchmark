import React from "react";

interface LogoImageProps {
    organization: string;
    width: number;
    height: number;
    style?: React.CSSProperties;
    logoInfo: Record<string, string>;
    modelLogoInfo?: Record<string, { ext: string; originalName: string }>;
}

export const LogoImage: React.FC<LogoImageProps> = ({
    organization,
    width,
    height,
    style,
    logoInfo,
    modelLogoInfo = {}
}) => {
    const orgKey = organization.toLowerCase().replace(/\s/g, "-");
    
    // 优先使用 modelLogo 文件夹中的图标
    let src = "";
    const modelLogoData = modelLogoInfo[orgKey];
    
    if (modelLogoData) {
        // 使用原始文件名构建路径（保留大小写）
        src = `/modelLogo/${modelLogoData.originalName}.${modelLogoData.ext}`;
    } else {
        // 如果 modelLogo 中没有，回退到 logos 文件夹
        const ext = logoInfo[orgKey];
        if (ext) {
            src = `/logos/${orgKey}.${ext}`;
        }
    }

    if (!src) {
        return (
            <span style={{ ...style, width, height }}>
                {organization}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={organization}
            style={{ width, height, objectFit: "contain", ...style }}
        />
    );
}; 