"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./SickoButton.module.css";

type CommonProps = {
  children: ReactNode;
  tone?: "paper" | "blood" | "dark" | "ghost";
  full?: boolean;
  arrow?: boolean;
  className?: string;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type LinkProps = CommonProps & { href: string };

export default function SickoButton(props: ButtonProps | LinkProps) {
  const { children, tone = "paper", full = false, arrow = true, className = "" } = props;
  const classes = [
    styles.button,
    tone === "blood" ? styles.blood : "",
    tone === "dark" ? styles.dark : "",
    tone === "ghost" ? styles.ghost : "",
    full ? styles.full : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in props && typeof props.href === "string") {
    return (
      <Link href={props.href} className={classes}>
        <span>{children}</span>
        {arrow && <span className={styles.icon} aria-hidden>→</span>}
      </Link>
    );
  }

  const {
    tone: _tone,
    full: _full,
    arrow: _arrow,
    className: _className,
    children: _children,
    ...buttonProps
  } = props as ButtonProps;

  return (
    <button {...buttonProps} className={classes}>
      <span>{children}</span>
      {arrow && <span className={styles.icon} aria-hidden>→</span>}
    </button>
  );
}
