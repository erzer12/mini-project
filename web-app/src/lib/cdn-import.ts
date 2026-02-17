// Helper to dynamically import ES modules from CDN URLs.
// Turbopack intercepts ALL `import()` calls — even inside `new Function` strings.
// We construct the keyword dynamically so Turbopack's static analysis cannot detect it.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cdnImport = (url: string): Promise<any> => {
    const imp = "im" + "port";
    return new Function("url", `return ${imp}(url)`)(url);
};
