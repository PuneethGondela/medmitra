"use client";
import React from "react";
import { Input as UIInput, InputProps as UIInputProps } from "./ui/input";

export interface InputComponentProps extends UIInputProps {
  label?: string;
}

export default function Input({ label, name, className, ...props }: InputComponentProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <UIInput
        id={name}
        name={name}
        className={className}
        {...props}
      />
    </div>
  );
}
