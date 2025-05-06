export type SupportedChain = 'MAINNET' | 'STAGENET' | 'NEXTNET' | '';

export interface TappletConfig {
    packageName: string;
    version: string;
    supportedChain: SupportedChain[];
    permissions?: object[]; //TODO use TariPermissions from tari.js
}
export interface ActiveTapplet {
    tapplet_id: number;
    display_name: string;
    source: string;
    version: string;
    supportedChain: SupportedChain[];
    permissions?: object[]; //TODO use TariPermissions from tari.js
}

export interface BuiltInTapplet {
    id: number;
    registry_id: string;
    package_name: string;
    version: string;
}

export interface DevTapplet {
    id: number;
    package_name: string;
    endpoint: string;
    display_name: string;
    about_summary: string;
    about_description: string;
}

export interface InstalledTapplet {
    id: number;
    tapplet_id: number;
    tapplet_version_id: string;
}

export interface InstalledTappletWithAssets {
    installed_tapplet: InstalledTapplet;
    display_name: string;
    installed_version: string;
    latest_version: string;
    logoAddr: string;
    backgroundAddr: string;
}
