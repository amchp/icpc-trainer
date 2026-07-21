import type { HTMLAttributes } from "react";

interface MathMLAttributes extends HTMLAttributes<HTMLElement> {
  readonly display?: "block" | "inline";
  readonly encoding?: string;
  readonly width?: string;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      annotation: MathMLAttributes;
      math: MathMLAttributes;
      mfrac: MathMLAttributes;
      mi: MathMLAttributes;
      mn: MathMLAttributes;
      mo: MathMLAttributes;
      mrow: MathMLAttributes;
      mspace: MathMLAttributes;
      msub: MathMLAttributes;
      msup: MathMLAttributes;
      mtext: MathMLAttributes;
      munderover: MathMLAttributes;
      semantics: MathMLAttributes;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      annotation: MathMLAttributes;
      math: MathMLAttributes;
      mfrac: MathMLAttributes;
      mi: MathMLAttributes;
      mn: MathMLAttributes;
      mo: MathMLAttributes;
      mrow: MathMLAttributes;
      mspace: MathMLAttributes;
      msub: MathMLAttributes;
      msup: MathMLAttributes;
      mtext: MathMLAttributes;
      munderover: MathMLAttributes;
      semantics: MathMLAttributes;
    }
  }
}
