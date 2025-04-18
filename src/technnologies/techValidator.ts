
export interface TechValidator {
    isSupporting(wd: string): Promise<boolean>;
    extractModule(wd: string): Promise<Module>;
    install(source: Module, wd: string): Promise<void>;
    validate(wd: string): Promise<void>;
}

export interface Module {
    name: string;
    path: string;
    type: string;
}