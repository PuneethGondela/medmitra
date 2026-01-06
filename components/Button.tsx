// components/Button.tsx - Legacy wrapper for compatibility
"use client";
import React from "react";
import { Button as UIButton, ButtonProps as UIButtonProps } from "@/components/ui/button";

type ButtonVariant = "primary" | "secondary" | "outline";

type Props = Omit<UIButtonProps, 'variant'> & {
  variant?: ButtonVariant;
};

export default function Button({ children, variant = "primary", className, ...props }: Props) {
  // Map legacy variants to new ones
  const variantMap: Record<ButtonVariant, "default" | "secondary" | "outline"> = {
    primary: "default",
    secondary: "secondary",
    outline: "outline"
  };

  return (
    <UIButton
      {...props}
      variant={variantMap[variant]}
      className={className}
    >
      {children}
    </UIButton>
  );
}
