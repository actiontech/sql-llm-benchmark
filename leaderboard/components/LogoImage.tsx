import React from "react";

interface LogoImageProps {
    organization: string;
    width: number;
    height: number;
    style?: React.CSSProperties;
    logoInfo: Record<string, string>;
}

export const LogoImage: React.FC<LogoImageProps> = ({
    organization,
    width,
    height,
    style,
    logoInfo
}) => {
    const orgKey = organization.toLowerCase().replace(/\s/g, "-");
    const ext = logoInfo[orgKey];
    const src = ext ? `/logos/${orgKey}.${ext}` : "";

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