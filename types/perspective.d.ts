declare module "@finos/perspective" {
  export function worker(): any;
  export interface Table {
    replace(data: any[]): Promise<void>;
    update(data: any[]): Promise<void>;
    view(config?: any): any;
    schema(): Promise<any>;
    size(): Promise<number>;
    delete(): Promise<void>;
  }
}

declare module "@finos/perspective-viewer" {
  export interface PerspectiveViewerElement extends HTMLElement {
    load(table: any): Promise<void>;
    table: any;
    setAttribute(name: string, value: string): void;
    restore(config: any): Promise<void>;
    save(): any;
  }
}

declare module "@finos/perspective-viewer-datagrid" {}
declare module "@finos/perspective-viewer-d3fc" {}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "perspective-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        ref?: React.Ref<any>;
      };
    }
  }
}

declare module "@finos/perspective/dist/esm/perspective.inline.js" {
  import * as perspective from "@finos/perspective";
  export = perspective;
}

// For perspective viewer
declare module "@finos/perspective-viewer/dist/esm/perspective-viewer.inline.js" {
  import * as perspectiveViewer from "@finos/perspective-viewer";
  export = perspectiveViewer;
}

declare module "chartjs-adapter-date-fns";
