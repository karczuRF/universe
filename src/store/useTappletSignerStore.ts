import { create } from './create.ts';
import { ActiveTapplet } from '@app/types/ootle/tapplet.ts';
import { useAppStateStore } from './appStateStore.ts';
import { TappletSigner, TappletSignerParams } from '@app/types/ootle/TappletSigner.ts';
import { TransactionEvent } from '@app/types/ootle/transaction.ts';

import { createPermissionFromType, TariPermissions } from '@tari-project/tari-permissions';

interface State {
    isInitialized: boolean;
    tappletSigner?: TappletSigner;
}

//TODO do we need tapp provider id at all?
interface Actions {
    initTappletSigner: () => Promise<void>;
    setTappletSigner: (id: string, launchedTapplet: ActiveTapplet) => Promise<void>;
    runTransaction: (event: MessageEvent<TransactionEvent>) => Promise<void>;
}

type TappletSignerStoreState = State & Actions;

const initialState: State = {
    isInitialized: false,
    tappletSigner: undefined,
};

export const useTappletSignerStore = create<TappletSignerStoreState>()((set, get) => ({
    ...initialState,

    initTappletSigner: async () => {
        try {
            console.info(`🌎️ [TU store][init provider]`);

            const params: TappletSignerParams = {
                id: '0',
                permissions: { requiredPermissions: [], optionalPermissions: [] },
            };
            const provider: TappletSigner = TappletSigner.build(params);

            set({ isInitialized: true, tappletSigner: provider });
        } catch (error) {
            const appStateStore = useAppStateStore.getState();
            console.error('Error setting tapplet provider: ', error);
            appStateStore.setError(`Error setting tapplet provider: ${error}`);
        }
    },
    setTappletSigner: async (id: string, launchedTapplet: ActiveTapplet) => {
        try {
            // TODO tmp solution
            const requiredPermissions = new TariPermissions();
            const optionalPermissions = new TariPermissions();
            if (launchedTapplet.permissions) {
                launchedTapplet.permissions.requiredPermissions.map((p) =>
                    requiredPermissions.addPermission(createPermissionFromType(p))
                );
                launchedTapplet.permissions.optionalPermissions.map((p) =>
                    optionalPermissions.addPermission(createPermissionFromType(p))
                );
            }
            const params: TappletSignerParams = {
                id,
                permissions: launchedTapplet.permissions ?? { requiredPermissions: [], optionalPermissions: [] },
            };
            const provider: TappletSigner = TappletSigner.build(params);

            set({ isInitialized: true, tappletSigner: provider });
        } catch (error) {
            const appStateStore = useAppStateStore.getState();
            console.error('Error setting tapplet provider: ', error);
            appStateStore.setError(`Error setting tapplet provider: ${error}`);
        }
    },
    runTransaction: async (event: MessageEvent<TransactionEvent>) => {
        const { methodName, args, id } = event.data;
        try {
            const provider = get().tappletSigner;
            console.info(`🌎️ [TU store][run tx] Running method "${String(methodName)}"`);
            const result = await provider?.runOne(methodName, args);
            if (event.source) {
                event.source.postMessage({ id, result, type: 'signer-call' }, { targetOrigin: event.origin });
            }
        } catch (error) {
            const appStateStore = useAppStateStore.getState();
            console.error(`Error running method "${String(methodName)}": ${error}`);
            appStateStore.setError(`Error running method "${String(methodName)}": ${error}`);
        }
    },
}));
