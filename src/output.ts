export class ActionResults {
  private readonly errors: string[] = [];

  public AppendError(error: any): void {
    this.errors.push(error.toString());
  }

  public hasErrors(): boolean {
    return this.errors.length > 0;
  }

  public getErrorMessage(): string {
    return this.errors.join("\n");
  }
}
