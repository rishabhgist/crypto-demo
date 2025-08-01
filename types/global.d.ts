declare module "*.wasm" {
  const value: string;
  export default value;
}

declare module "@finos/perspective";

declare namespace JSX {
  interface IntrinsicElements {
    "perspective-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}
