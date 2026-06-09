"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label?: string;
}

export function CopyButton({
  value,
  label = "Копировать",
  className,
  variant = "outline",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={onCopy}
      aria-label={copied ? "Скопировано" : label}
      className={cn(className)}
      {...props}
    >
      {copied ? <Check className="text-emerald-500" /> : <Copy />}
      <span>{copied ? "Скопировано" : label}</span>
    </Button>
  );
}
