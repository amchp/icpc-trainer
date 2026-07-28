import type { ReactNode } from "react";

function FormulaFrame({ label, latex, children }: { readonly label: string; readonly latex: string; readonly children: ReactNode }): React.JSX.Element {
  return (
    <figure className="overflow-x-auto rounded-md border border-violet-400/20 bg-violet-400/[0.045] px-4 py-5 text-center">
      <math className="min-w-max font-serif text-xl text-violet-100 sm:text-2xl" display="block" aria-label={label} data-latex={latex}>
        <semantics>
          <mrow>{children}</mrow>
          <annotation encoding="application/x-tex">{latex}</annotation>
        </semantics>
      </math>
    </figure>
  );
}

export function BatchSearchWorkFormula({ label }: { readonly label: string }): React.JSX.Element {
  const latex = String.raw`T_{\max}(n,q)=q\cdot n,\qquad q=n\Rightarrow T_{\max}(n,n)=n^2`;
  return (
    <FormulaFrame label={label} latex={latex}>
      <msub><mi>T</mi><mi>max</mi></msub><mo>(</mo><mi>n</mi><mo>,</mo><mi>q</mi><mo>)</mo><mo>=</mo><mi>q</mi><mo>·</mo><mi>n</mi>
      <mo>,</mo><mspace width="1em" />
      <mi>q</mi><mo>=</mo><mi>n</mi><mo>⇒</mo><msub><mi>T</mi><mi>max</mi></msub><mo>(</mo><mi>n</mi><mo>,</mo><mi>n</mi><mo>)</mo>
      <mo>=</mo><msup><mi>n</mi><mn>2</mn></msup>
    </FormulaFrame>
  );
}

export function QuadraticBigOFormula({ label }: { readonly label: string }): React.JSX.Element {
  const latex = String.raw`n\cdot n=n^2\in O(n^2)`;
  return (
    <FormulaFrame label={label} latex={latex}>
      <mi>n</mi><mo>·</mo><mi>n</mi><mo>=</mo><msup><mi>n</mi><mn>2</mn></msup>
      <mo>∈</mo><mi>O</mi><mo>(</mo><msup><mi>n</mi><mn>2</mn></msup><mo>)</mo>
    </FormulaFrame>
  );
}

export function LinearithmicBigOFormula({ label }: { readonly label: string }): React.JSX.Element {
  const latex = String.raw`n\log_2 n+2n-1\in O(n\log n)`;
  return (
    <FormulaFrame label={label} latex={latex}>
      <mi>n</mi><msub><mi>log</mi><mn>2</mn></msub><mi>n</mi><mo>+</mo><mn>2</mn><mi>n</mi><mo>−</mo><mn>1</mn>
      <mo>∈</mo><mi>O</mi><mo>(</mo><mi>n</mi><mi>log</mi><mi>n</mi><mo>)</mo>
    </FormulaFrame>
  );
}

export function ConstantSpaceFormula({ label }: { readonly label: string }): React.JSX.Element {
  const latex = String.raw`M_{aux}(n)=2\text{ variables}\in O(1)`;
  return (
    <FormulaFrame label={label} latex={latex}>
      <msub><mi>M</mi><mi>aux</mi></msub><mo>(</mo><mi>n</mi><mo>)</mo><mo>=</mo><mn>2</mn><mtext> variables</mtext>
      <mo>∈</mo><mi>O</mi><mo>(</mo><mn>1</mn><mo>)</mo>
    </FormulaFrame>
  );
}

export function RuntimeFormula({ label }: { readonly label: string }): React.JSX.Element {
  const latex = String.raw`t\approx\frac{c\,f(n)}{r}`;
  return (
    <FormulaFrame label={label} latex={latex}>
      <mi>t</mi><mo>≈</mo><mfrac><mrow><mi>c</mi><mo>⁢</mo><mi>f</mi><mo>(</mo><mi>n</mi><mo>)</mo></mrow><mi>r</mi></mfrac>
    </FormulaFrame>
  );
}

export function MemoryFormula({ label }: { readonly label: string }): React.JSX.Element {
  const latex = String.raw`M_{total}=M_{input}+M_{aux},\qquad M_{input}=8n\text{ bytes}`;
  return (
    <FormulaFrame label={label} latex={latex}>
      <msub><mi>M</mi><mi>total</mi></msub><mo>=</mo><msub><mi>M</mi><mi>input</mi></msub><mo>+</mo><msub><mi>M</mi><mi>aux</mi></msub>
      <mo>,</mo><mspace width="1em" />
      <msub><mi>M</mi><mi>input</mi></msub><mo>=</mo><mn>8</mn><mi>n</mi><mtext> bytes</mtext>
    </FormulaFrame>
  );
}
