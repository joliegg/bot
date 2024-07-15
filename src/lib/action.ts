class Action {

  static platforms = [];
  static enabled = true;

  static match(text: string, platform: string): boolean {
    return false;
  }

  constructor(text: string, platform: string) {

  }

  run(): Promise<string> {
    return Promise.resolve('');
  }
}


export default Action;
