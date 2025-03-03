import { create } from './create.ts';
import { useTappletSignerStore } from './useTappletSignerStore.ts';
import { OotleAccount } from '@app/types/ootle/account.ts';
import { AccountInfo } from '@tari-project/typescript-bindings';

interface State {
    ootleAccount?: OotleAccount;
    ootleAccountsList: AccountInfo[];
}

interface Actions {
    createAccount: (name: string) => Promise<void>;
    setDefaultAccount: (name: string) => Promise<void>;
    getOotleAccountInfo: () => Promise<void>;
    getOotleAccountsList: () => Promise<void>;
}

type OotleWalletStoreState = State & Actions;

const initialState: State = {
    ootleAccount: undefined,
    ootleAccountsList: [],
};

export const useOotleWalletStore = create<OotleWalletStoreState>()((set) => ({
    ...initialState,
    createAccount: async (name: string) => {
        const provider = useTappletSignerStore.getState().tappletProvider;
        try {
            if (!provider) {
                return;
            }

            const responseNewAcc = await provider.createFreeTestCoins(name);

            console.info('created acc: ', responseNewAcc);
            // this needs to be set manually
            await provider.setDefaultAccount(name);
            const account = await provider.getAccount();
            set({
                ootleAccount: account,
            });
        } catch (error) {
            console.error('Could not create the new Ootle account: ', error);
        }
    },
    setDefaultAccount: async (name: string) => {
        const provider = useTappletSignerStore.getState().tappletProvider;
        try {
            if (!provider) {
                return;
            }
            await provider.setDefaultAccount(name);
            // if tapplet uses TU Provider it gets default account
            // this is to make sure tapplet uses the account selected by the user
            const account = await provider.getAccount();
            set({
                ootleAccount: account,
            });
        } catch (error) {
            console.error('Could not set the default Ootle account: ', error);
        }
    },
    getOotleAccountInfo: async () => {
        const provider = useTappletSignerStore.getState().tappletProvider;
        try {
            if (!provider) {
                return;
            }
            // if tapplet uses TU Provider it gets default account
            // this is to make sure tapplet uses the account selected by the user
            const account = await provider.getAccount();
            set({
                ootleAccount: account,
            });
        } catch (error) {
            console.error('Could not get the Ootle account info: ', error);
        }
    },
    getOotleAccountsList: async () => {
        const provider = useTappletSignerStore.getState().tappletProvider;
        try {
            if (!provider) {
                return;
            }
            const list = await provider.getAccountsList();
            set({
                ootleAccountsList: list.accounts,
            });
        } catch (error) {
            console.error('Could not get ootle accounts list: ', error);
        }
    },
}));
