// src/custom-elements.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    "perspective-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}
