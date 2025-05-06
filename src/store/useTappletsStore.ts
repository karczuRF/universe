import { create } from './create.ts';
import {
    ActiveTapplet,
    BuiltInTapplet,
    DevTapplet,
    InstalledTappletWithAssets,
    TappletConfig,
} from '@app/types/tapplets/tapplet.ts';
import { useTappletProviderStore } from './useTappletProviderStore.ts';
import { invoke } from '@tauri-apps/api/core';
import { setError } from './actions/appStateStoreActions.ts';

export const TAPPLET_CONFIG_FILE = 'tapplet.config.json'; //TODO

interface State {
    isInitialized: boolean;
    isFetching: boolean;
    activeTapplet: ActiveTapplet | undefined;
    installedTapplets: InstalledTappletWithAssets[];
    devTapplets: DevTapplet[];
}

interface Actions {
    setActiveTapp: (tapplet?: ActiveTapplet) => Promise<void>;
    setActiveTappById: (tappletId: number, isBuiltIn?: boolean) => Promise<void>;
    installTapplet: (tappletId: string) => Promise<void>;
    deactivateTapplet: () => Promise<void>;
    getInstalledTapps: () => Promise<void>;
}

type TappletsStoreState = State & Actions;

const initialState: State = {
    isFetching: false,
    isInitialized: false,
    activeTapplet: undefined,
    installedTapplets: [],
    devTapplets: [],
};

export const useTappletsStore = create<TappletsStoreState>()((set, get) => ({
    ...initialState,

    setActiveTapp: async (tapplet) => {
        set({ activeTapplet: tapplet });
    },
    deactivateTapplet: async () => {
        set({ activeTapplet: undefined });
    },
    setActiveTappById: async (tappletId, isBuiltIn = false, isDev = false) => {
        console.info('SET ACTIVE TAP', tappletId, get().activeTapplet?.tapplet_id);
        if (tappletId == get().activeTapplet?.tapplet_id) return;
        const tappProviderState = useTappletProviderStore.getState();
        // built-in tapplet
        if (isBuiltIn) {
            const tapplet = get().installedTapplets.find((tapp) => tapp.installed_tapplet.id === tappletId);
            if (!tapplet) return;
            const activeTapplet = await invoke('launch_tapplet', { installedTappletId: tappletId });
            set({ activeTapplet });
            // TODO change provider name
            tappProviderState.setTappletProvider('builtInProvider', activeTapplet);
            return;
        }

        if (isDev) {
            const tapplet = get().devTapplets.find((tapp) => tapp.id === tappletId);
            if (!tapplet) return;
            const resp = await fetch(`${tapplet.endpoint}/${TAPPLET_CONFIG_FILE}`);
            if (!resp.ok) return;
            const config: TappletConfig = await resp.json();
            console.info('Dev Tapplet config', config);
            if (!config) return;
            const activeTapplet: ActiveTapplet = {
                tapplet_id: tapplet.id,
                version: config.version,
                display_name: tapplet.display_name,
                source: tapplet.endpoint,
                supportedChain: config.supportedChain,
                permissions: config.permissions,
            };
            set({ activeTapplet });
            tappProviderState.setTappletSigner(config.packageName, activeTapplet);
            return;
        }

        const activeTapplet = await invoke('launch_tapplet', { installedTappletId: tappletId });
        set({ activeTapplet });
        tappProviderState.setTappletSigner(tappletId.toString(), activeTapplet);
        return;
    },
    installTapplet: async (tappletId: string) => {
        console.info('[STORE] fetch tapp');
        try {
            // TODO invoke to add tapplet
            const tapplet = await invoke('download_and_extract_tapp', { tappletId });
            const installedTapplet = await invoke('insert_installed_tapp_db', { tappletId });
            console.info('[STORE] fetch tapp success', tapplet, installedTapplet);
            // TODO refactor types and assets path
            const tapp: InstalledTappletWithAssets = {
                display_name: tapplet.display_name,
                installed_tapplet: installedTapplet,
                installed_version: installedTapplet.tapplet_version_id,
                latest_version: '',
                logoAddr: tapplet.logoAddr,
                backgroundAddr: tapplet.backgroundAddr,
            };

            set((state) => ({
                isInitialized: true,
                installedTapplets: [...state.installedTapplets, tapp],
            }));
        } catch (error) {
            console.error('Error installing tapplet: ', error);
            setError(`'Error installing tapplet: ${error}`);
        }
    },
    getInstalledTapps: async () => {
        console.info('[STORE TAPP] fetch registered tapp');
        set({ isFetching: true });
        try {
            const installedTapplets = await invoke('read_installed_tapp_db');
            console.info('[STORE] get installed tapp success', installedTapplets);
            set({ installedTapplets });
        } catch (error) {
            console.error('Error fetching registered tapplets: ', error);
            setError(`'Error fetching registered tapplets: ${error}`);
        }
    },
}));
