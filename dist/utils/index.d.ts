export declare const URL_REGEX: RegExp;
export declare const isURL: (text: string) => boolean;
export declare const expandURL: (url: string) => Promise<string>;
export declare const downloadFile: (url: string) => Promise<{
    data: Buffer;
    contentType: string | null;
}>;
