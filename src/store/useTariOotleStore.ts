import { invoke } from '@tauri-apps/api';
import { create } from 'zustand';
import { useAppStateStore } from './appStateStore';

interface State {
    swarmDaemonInitiated: boolean;
}

//TODO do we need tapp provider id at all?
interface Actions {
    startSwarmDaemmon: () => Promise<void>;
    stopSwarmDaemmon: () => Promise<void>;
}

type TariOotleStoreState = State & Actions;

const initialState: State = {
    swarmDaemonInitiated: false,
};

export const useTariOotleStore = create<TariOotleStoreState>()((set, get) => ({
    ...initialState,
    startSwarmDaemmon: async () => {
        // if let Err(e) = start_swarm_daemon().await {
        //     error!(target: LOG_TARGET, "Could not start Ootle swarm daemon: {:?}", e);
        // }
        try {
            await invoke('run_swarm_daemon', {});
            console.info('🚀 Run Tari Swarm!');
            set({ swarmDaemonInitiated: true });
        } catch (e) {
            const appStateStore = useAppStateStore.getState();
            console.error('Failed to start mining: ', e);
            appStateStore.setError(e as string);
        }
    },
    stopSwarmDaemmon: async () => {
        console.info('🚀 Stop Tari Swarm!');
    },
}));
