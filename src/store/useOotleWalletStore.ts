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
        const signer = useTappletSignerStore.getState().tappletSigner;
        try {
            if (!signer) {
                return;
            }

            const responseNewAcc = await signer.createFreeTestCoins(name);

            console.info('created acc: ', responseNewAcc);
            // this needs to be set manually
            await signer.setDefaultAccount(name);
            const account = await signer.getAccount();
            set({
                ootleAccount: account,
            });
        } catch (error) {
            console.error('Could not create the new Ootle account: ', error);
        }
    },
    setDefaultAccount: async (name: string) => {
        const signer = useTappletSignerStore.getState().tappletSigner;
        try {
            if (!signer) {
                return;
            }
            await signer.setDefaultAccount(name);
            // if tapplet uses TU signer it gets default account
            // this is to make sure tapplet uses the account selected by the user
            const account = await signer.getAccount();
            set({
                ootleAccount: account,
            });
        } catch (error) {
            console.error('Could not set the default Ootle account: ', error);
        }
    },
    getOotleAccountInfo: async () => {
        const signer = useTappletSignerStore.getState().tappletSigner;
        try {
            if (!signer) {
                return;
            }
            // if tapplet uses TU signer it gets default account
            // this is to make sure tapplet uses the account selected by the user
            const account = await signer.getAccount();
            set({
                ootleAccount: account,
            });
        } catch (error) {
            console.error('Could not get the Ootle account info: ', error);
        }
    },
    getOotleAccountsList: async () => {
        const signer = useTappletSignerStore.getState().tappletSigner;
        try {
            if (!signer) {
                return;
            }
            const list = await signer.getAccountsList();
            set({
                ootleAccountsList: list.accounts,
            });
        } catch (error) {
            console.error('Could not get ootle accounts list: ', error);
        }
    },
}));
