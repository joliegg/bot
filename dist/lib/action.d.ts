declare class Action {
    static platforms: never[];
    static enabled: boolean;
    static match(text: string, platform: string): boolean;
    constructor(text: string, platform: string);
    run(): Promise<string>;
}
export default Action;
