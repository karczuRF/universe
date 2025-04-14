import { create } from './create.ts';
import { IndexerProvider, IndexerProviderParameters } from '@tari-project/indexer-provider';
import { TariPermissions } from '@tari-project/tari-permissions';
import { setError } from './index.ts';

interface State {
    isInitialized: boolean;
    provider?: IndexerProvider;
}

interface Actions {
    initTappletProvider: () => Promise<void>;
}

type TappletProviderStoreState = State & Actions;

const initialState: State = {
    isInitialized: false,
    provider: undefined,
};

export const useTappletProviderStore = create<TappletProviderStoreState>()((set, get) => ({
    ...initialState,

    initTappletProvider: async () => {
        try {
            // TODO tmp solution
            const requiredPermissions = new TariPermissions();
            const optionalPermissions = new TariPermissions();
            requiredPermissions.addPermission('Admin');
            console.info(`🌎️ [TU store][init provider]`);
            const INDEXER = 'http://18.217.22.26:12006/json_rpc';
            const params: IndexerProviderParameters = {
                indexerJrpcUrl: INDEXER,
                permissions: requiredPermissions,
            };

            const provider = await IndexerProvider.build(params);

            set({ provider });
        } catch (error) {
            console.error('Error setting tapplet provider: ', error);
            setError(`Error setting tapplet provider: ${error}`);
        }
    },
}));
