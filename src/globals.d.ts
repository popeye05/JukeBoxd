// Global type declarations for Node.js environment
declare global {
  var process: {
    env: { [key: string]: string | undefined };
    exit: (code?: number) => never;
  };
  var console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
  };
  var Buffer: {
    from: (str: string, encoding?: string) => any;
  };
  var require: {
    (id: string): any;
    main: any;
  };
  var module: {
    exports: any;
  };
  var __dirname: string;
  var setTimeout: (callback: () => void, ms: number) => any;
}

export {};