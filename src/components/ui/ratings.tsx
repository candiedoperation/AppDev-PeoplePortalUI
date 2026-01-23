/**
 * Ratings component from Open PR to shadcn/ui.
 * View more information here:
 *  - https://github.com/shadcn-ui/ui/pull/2350
 */

import React, { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const ratingVariants = {
    default: {
        star: "text-foreground",
        emptyStar: "text-muted-foreground",
    },
    destructive: {
        star: "text-destructive",
        emptyStar: "text-destructive/70",
    },
    yellow: {
        star: "text-yellow-500",
        emptyStar: "text-muted-foreground",
    },
}

interface RatingsProps extends React.HTMLAttributes<HTMLDivElement> {
    totalStars?: number
    size?: number
    fill?: boolean
    Icon?: React.ReactElement
    variant?: keyof typeof ratingVariants
    asInput?: boolean
    value: number
    onValueChange?: (value: number) => void
}

const Ratings = ({ ...props }: RatingsProps) => {
    const {
        totalStars = 5,
        size = 20,
        fill = true,
        Icon = <Star />,
        variant = "default",
        asInput = false,
        onValueChange,
        value,
    } = props

    const [hoverValue, setHoverValue] = useState<number | null>(null)

    const handleMouseEnter = (index: number) => {
        if (onValueChange) setHoverValue(index)
    }

    const handleMouseLeave = () => {
        if (onValueChange) setHoverValue(null)
    }

    const handleClick = (index: number) => {
        if (onValueChange) onValueChange(index)
    }

    return (
        <div
            className={cn("flex items-center gap-0.5")}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {[...Array(totalStars)].map((_, i) => {
                const starValue = i + 1
                const isFull = starValue <= Math.floor(value)
                const isPartial = starValue === Math.ceil(value) && value % 1 > 0

                // Interaction Logic
                const isHovering = hoverValue !== null
                // If isHovering:
                //   Show stars up to hoverValue.
                //   If star was originally full (<= value), show Solid.
                //   If star was NOT full (> value), show Preview (Opacity).

                const isSolid = isHovering
                    ? (starValue <= hoverValue && starValue <= value)
                    : isFull

                const isPreview = isHovering
                    ? (starValue <= hoverValue && starValue > value)
                    : false

                // If not hovering and is partial, render partial.
                if (!isHovering && isPartial) {
                    return (
                        <PartialStar
                            key={i}
                            fillPercentage={value % 1}
                            size={size}
                            className={cn(ratingVariants[variant].star)}
                            Icon={Icon}
                            asInput={asInput}
                            onValueChange={() => handleClick(starValue)}
                            onMouseEnter={() => handleMouseEnter(starValue)}
                        />
                    )
                }

                // Determine styling based on state
                let fillClass = "fill-transparent"
                let variantClass = ratingVariants[variant].emptyStar

                if (isSolid) {
                    fillClass = fill ? "fill-current" : "fill-transparent"
                    variantClass = ratingVariants[variant].star
                } else if (isPreview) {
                    fillClass = "fill-current opacity-50" // "background color with slight opacity"
                    variantClass = ratingVariants[variant].star
                }

                return React.cloneElement(Icon as React.ReactElement<any>, {
                    key: i,
                    size,
                    className: cn(
                        fillClass,
                        variantClass,
                        asInput || onValueChange ? "cursor-pointer" : ""
                    ),
                    role: (asInput || onValueChange) ? "input" : undefined,
                    onMouseEnter: () => handleMouseEnter(starValue),
                    onClick: () => handleClick(starValue),
                })
            })}
        </div>
    )
}

interface PartialStarProps {
    fillPercentage: number
    size: number
    className?: string
    Icon: React.ReactElement
    asInput?: boolean
    onValueChange?: () => void
    onMouseEnter?: () => void
}

const PartialStar = ({ ...props }: PartialStarProps) => {
    const { fillPercentage, size, className, Icon, asInput, onValueChange, onMouseEnter } =
        props

    return (
        <div
            role={asInput ? "input" : undefined}
            onClick={() => onValueChange && onValueChange()}
            onMouseEnter={onMouseEnter}
            className={cn("relative inline-block", asInput && "cursor-pointer")}
        >
            {React.cloneElement(Icon as React.ReactElement<any>, {
                size,
                className: cn("fill-transparent", className),
            })}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    overflow: "hidden",
                    width: `${fillPercentage * 100}%`,
                }}
            >
                {React.cloneElement(Icon as React.ReactElement<any>, {
                    size,
                    className: cn("fill-current", className),
                })}
            </div>
        </div>
    )
}

export default Ratings