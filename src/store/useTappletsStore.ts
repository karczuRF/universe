import { create } from 'zustand';
import { ActiveTapplet, BridgeTxDetails } from '@app/types/tapplets/tapplet.types.ts';
import { useTappletSignerStore } from './useTappletSignerStore.ts';
import { invoke } from '@tauri-apps/api/core';

interface State {
    isInitialized: boolean;
    isFetching: boolean;
    activeTapplet: ActiveTapplet | undefined;
    ongoingBridgeTx: BridgeTxDetails | undefined;
    isPendingTappletTx: boolean;
}

interface Actions {
    setActiveTapp: (tapplet?: ActiveTapplet) => Promise<void>;
    setActiveTappById: (tappletId: number, isBuiltIn?: boolean) => Promise<void>;
    deactivateTapplet: () => Promise<void>;
    setOngoingBridgeTx: (tx: BridgeTxDetails) => void;
    removeOngoingBridgeTx: () => void;
}

type TappletsStoreState = State & Actions;

const initialState: State = {
    isFetching: false,
    isInitialized: false,
    activeTapplet: undefined,

    ongoingBridgeTx: undefined,
    isPendingTappletTx: false,
};

export const useTappletsStore = create<TappletsStoreState>()((set, get) => ({
    ...initialState,
    setActiveTapp: async (tapplet) => {
        set({ activeTapplet: tapplet });
    },
    deactivateTapplet: async () => {
        set({ activeTapplet: undefined });
    },
    setActiveTappById: async (tappletId, isBuiltIn = false) => {
        if (tappletId == get().activeTapplet?.tapplet_id) return;
        const tappProviderState = useTappletSignerStore.getState();
        if (!tappProviderState.isInitialized) tappProviderState.initTappletSigner();

        // built-in tapplet
        if (isBuiltIn) {
            const name = 'bridge'; //TODO add names for more options
            const activeTapplet = await invoke('start_tari_tapplet_binary', { binaryName: name });
            set({ activeTapplet });
            return;
        }

        // by default tapplets are supposed to work with the Ootle
        // run the Ootle dev/registed tapplet below
        return;
    },
    setOngoingBridgeTx: (tx: BridgeTxDetails) => {
        set({
            ongoingBridgeTx: tx,
            isPendingTappletTx: true,
        });
    },
    removeOngoingBridgeTx: () => {
        set({
            ongoingBridgeTx: undefined,
            isPendingTappletTx: false,
        });
    },
}));
