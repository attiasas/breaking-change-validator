
export interface Validator {
    isSupporting(wd: string): Promise<boolean>;
    validate(wd: string): Promise<void>;
}

export interface TechValidator extends Validator {
    extractModule(wd: string): Promise<Module>;
    inject(source: Module, wd: string): Promise<void>;
}

export interface Module {
    name: string;
    path: string;
    type: string;
}
