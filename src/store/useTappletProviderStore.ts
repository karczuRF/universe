import { create } from './create.ts';
import { ActiveTapplet } from '@app/types/ootle/tapplet.ts';
import { useAppStateStore } from './appStateStore.ts';
import { TappletProvider, TappletProviderParams } from '@app/types/ootle/TappletProvider.ts';
import { toPermission } from '@app/types/ootle/tariPermissions.ts';
import { TransactionEvent, txCheck, TxSimulation } from '@app/types/ootle/transaction.ts';
import { TariPermissions } from '@tari-project/tari-permissions';
import { FinalizeResult, SubmitTransactionRequest, TransactionStatus } from '@tari-project/tarijs';
import { useOotleWalletStore } from './useOotleWalletStore.ts';
import { AccountsGetBalancesResponse } from '@tari-project/typescript-bindings';
import { BalanceUpdate } from '@app/types/ootle/txSimulation.ts';

interface State {
    isInitialized: boolean;
    tappletProvider?: TappletProvider;
}

//TODO do we need tapp provider id at all?
interface Actions {
    initTappletProvider: () => Promise<void>;
    setTappletProvider: (id: string, launchedTapplet: ActiveTapplet) => Promise<void>;
    runTransaction: (event: MessageEvent<TransactionEvent>) => Promise<void>;
    runSimulation: (
        event: MessageEvent<TransactionEvent>
    ) => Promise<{ balanceUpdates: BalanceUpdate[]; txSimulation: TxSimulation }>;
}

type TappletProviderStoreState = State & Actions;

const initialState: State = {
    isInitialized: false,
    tappletProvider: undefined,
};

export const useTappletProviderStore = create<TappletProviderStoreState>()((set, get) => ({
    ...initialState,
    initTappletProvider: async () => {
        try {
            console.info(`🌎️ [TU store][init provider]`);

            const params: TappletProviderParams = {
                id: '0',
                permissions: { requiredPermissions: [], optionalPermissions: [] },
            };
            const provider: TappletProvider = TappletProvider.build(params);

            set({ isInitialized: true, tappletProvider: provider });
        } catch (error) {
            const appStateStore = useAppStateStore.getState();
            console.error('Error setting tapplet provider: ', error);
            appStateStore.setError(`Error setting tapplet provider: ${error}`);
        }
    },
    setTappletProvider: async (id: string, launchedTapplet: ActiveTapplet) => {
        try {
            // TODO tmp solution
            const requiredPermissions = new TariPermissions();
            const optionalPermissions = new TariPermissions();
            if (launchedTapplet.permissions) {
                launchedTapplet.permissions.requiredPermissions.map((p) =>
                    requiredPermissions.addPermission(toPermission(p))
                );
                launchedTapplet.permissions.optionalPermissions.map((p) =>
                    optionalPermissions.addPermission(toPermission(p))
                );
            }
            const params: TappletProviderParams = {
                id,
                permissions: launchedTapplet.permissions ?? { requiredPermissions: [], optionalPermissions: [] },
            };
            const provider: TappletProvider = TappletProvider.build(params);

            set({ isInitialized: true, tappletProvider: provider });
        } catch (error) {
            const appStateStore = useAppStateStore.getState();
            console.error('Error setting tapplet provider: ', error);
            appStateStore.setError(`Error setting tapplet provider: ${error}`);
        }
    },
    runTransaction: async (event: MessageEvent<TransactionEvent>) => {
        const { methodName, args, id } = event.data;
        try {
            const provider = get().tappletProvider;
            console.info(`🌎️ [TU store][run tx] Running method "${methodName}"`);
            const result = await provider?.runOne(methodName, args);
            if (event.source) {
                event.source.postMessage({ id, result, type: 'provider-call' }, { targetOrigin: event.origin });
            }
        } catch (error) {
            const appStateStore = useAppStateStore.getState();
            console.error(`Error running method "${methodName}": ${error}`);
            appStateStore.setError(`Error running method "${methodName}": ${error}`);
        }
    },
    runSimulation: async (
        event: MessageEvent<TransactionEvent>
    ): Promise<{ balanceUpdates: BalanceUpdate[]; txSimulation: TxSimulation }> => {
        const appStateStore = useAppStateStore.getState();
        const account = useOotleWalletStore.getState().ootleAccount;
        const provider = get().tappletProvider;
        const { methodName, args, id } = event.data;
        console.info(`🌎️ [TU store][run simulation] SIMULATION`, methodName, id, args);
        console.info(`🌎️ [TU store][run simulation] provider & acc`, provider, account);
        try {
            if (methodName !== 'submitTransaction') {
                return {
                    balanceUpdates: [],
                    txSimulation: {
                        status: TransactionStatus.InvalidTransaction,
                        errorMsg: `Simulation for ${methodName} not supported`,
                    },
                };
            }
            console.info(`🌎️ [TU store][run simulation] Run method "${methodName}"`);
            if (!provider || !account)
                return {
                    balanceUpdates: [],
                    txSimulation: {
                        status: TransactionStatus.InvalidTransaction,
                        errorMsg: 'Provider and/or account undefined',
                    },
                };
            const transactionReq: SubmitTransactionRequest = { ...args[0], is_dry_run: true };
            console.info(`🌎️ [TU store][run simulation] tx req`, transactionReq);
            const tx = await provider?.runOne(methodName, [transactionReq]);
            await provider.client.waitForTransactionResult({
                transaction_id: tx.transaction_id,
                timeout_secs: 10,
            });
            const txReceipt = await provider.getTransactionResult(tx.transaction_id);
            const txResult = txReceipt.result as FinalizeResult | null;
            if (!txResult?.result)
                return {
                    balanceUpdates: [],
                    txSimulation: {
                        status: TransactionStatus.InvalidTransaction,
                        errorMsg: 'Transaction result undefined',
                    },
                };

            const txSimulation: TxSimulation = {
                status: txReceipt.status,
                errorMsg: txCheck.isReject(txResult?.result) ? (txResult.result.Reject as string) : '',
            };
            if (!txCheck.isAccept(txResult.result)) return { balanceUpdates: [], txSimulation };

            let walletBalances: AccountsGetBalancesResponse;
            try {
                //TODO check if this works at all
                walletBalances = await provider.getAccountBalances(account.address);
            } catch (error) {
                console.error(error);
                appStateStore.setError(`Error running method "${methodName}": ${error}`);
                return {
                    balanceUpdates: [],
                    txSimulation: {
                        status: TransactionStatus.InvalidTransaction,
                        errorMsg: `Error fetching account balances: ${error}`,
                    },
                };
            }

            const { up_substates } = txResult.result.Accept;
            const balanceUpdates: BalanceUpdate[] = up_substates
                .map((upSubstate) => {
                    const [substateId, { substate }] = upSubstate;
                    if (!txCheck.isVaultId(substateId) || !txCheck.isVaultSubstate(substate)) return undefined;
                    if (!txCheck.isFungible(substate.Vault.resource_container)) return undefined;
                    const userBalance = walletBalances.balances.find((balance) => {
                        if (!txCheck.isVaultId(balance.vault_address)) return false;
                        return balance.vault_address.Vault === substateId.Vault;
                    });
                    if (!userBalance) return undefined;
                    return {
                        vaultAddress: substateId.Vault,
                        tokenSymbol: userBalance.token_symbol || '',
                        currentBalance: userBalance.balance,
                        newBalance: substate.Vault.resource_container.Fungible.amount,
                    };
                })
                .filter((vault): vault is BalanceUpdate => vault !== undefined);

            return { balanceUpdates, txSimulation };

            // if (event.source) {
            //     event.source.postMessage({ id, result, type: 'provider-call' }, { targetOrigin: event.origin });
            // }
        } catch (error) {
            console.error(`Error running method "${methodName}": ${error}`);
            appStateStore.setError(`Error running method "${methodName}": ${error}`);
            return {
                balanceUpdates: [],
                txSimulation: {
                    status: TransactionStatus.InvalidTransaction,
                    errorMsg: `Error running method "${methodName}": ${error}`,
                },
            };
        }
    },
}));
