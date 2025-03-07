import { create } from './create.ts';
import { ActiveTapplet } from '@app/types/ootle/tapplet.ts';
import { useAppStateStore } from './appStateStore.ts';
import { TappletSigner, TappletSignerParams } from '@app/types/ootle/TappletSigner.ts';
import { TransactionEvent, TUTransaction, txCheck } from '@app/types/ootle/transaction.ts';
import {
    FinalizeResult,
    IndexerProvider,
    IndexerProviderParameters,
    SubmitTransactionRequest,
    TariPermissions,
    TransactionStatus,
    UpSubstates,
} from '@tari-project/tarijs';
import { useOotleWalletStore } from './useOotleWalletStore.ts';
import { BalanceUpdate, TxSimulation, TxSimulationResult } from '@app/types/ootle/txSimulation.ts';
import { AccountsGetBalancesResponse } from '@tari-project/typescript-bindings';
import { createPermissionFromType } from '@tari-project/tari-permissions';

interface State {
    isInitialized: boolean;
    tappletSigner?: TappletSigner;
    transactions: Record<string, TUTransaction>;
    provider?: IndexerProvider;
}

//TODO do we need tapp provider id at all?
interface Actions {
    initTappletSigner: () => Promise<void>;
    initTappletProvider: () => Promise<void>;
    setTappletSigner: (id: string, launchedTapplet: ActiveTapplet) => Promise<void>;
    addTransaction: (event: MessageEvent<TransactionEvent>) => Promise<void>;
    getTransactionById: (id: number) => TUTransaction | undefined;
    getPendingTransaction: () => TUTransaction | undefined;
    runTransaction: (event: MessageEvent<TransactionEvent>) => Promise<void>;
}

type TappletSignerStoreState = State & Actions;

const initialState: State = {
    isInitialized: false,
    tappletSigner: undefined,
    transactions: {},
    provider: undefined,
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
            // const provider = await IndexerProvider.buildFetchSigner(params);
            const provider = await IndexerProvider.build(params);
            const isc = provider.isConnected();
            console.info('🤝 IS CONNECTED', isc);

            set({ provider });
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
    addTransaction: async (event: MessageEvent<TransactionEvent>) => {
        const { methodName, args, id } = event.data;
        const provider = get().tappletSigner;
        const appStateStore = useAppStateStore.getState();

        const runSimulation = async (): Promise<TxSimulationResult> => {
            // const { methodName, args, id } = event.data;
            // const provider = get().tappletSigner;
            const account = useOotleWalletStore.getState().ootleAccount;
            const appStateStore = useAppStateStore.getState();
            console.info(`🌎️🌎️🌎️ [TU store][run simulation] SIMULATION`, methodName, id, args);
            console.info(`🌎️🌎️🌎️ [TU store][run simulation] provider & acc`, provider, account);
            try {
                if (!provider || !account) {
                    return createInvalidTransactionResponse('Provider and/or account undefined');
                }
                if (methodName !== 'submitTransaction') {
                    return createInvalidTransactionResponse(`Simulation for ${String(methodName)} not supported`);
                }

                console.info(`🌎️🌎️🌎️ [TU store][run simulation] Run method "${String(methodName)}"`);
                const transactionReq: SubmitTransactionRequest = { ...args[0], is_dry_run: true };
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] tx req`, transactionReq);
                const tx = await provider?.runOne(methodName, [transactionReq]);
                await provider.client.waitForTransactionResult({
                    transaction_id: tx.transaction_id,
                    timeout_secs: 10,
                });
                const txReceipt = await provider.getTransactionResult(tx.transaction_id);
                const txResult = txReceipt.result as FinalizeResult | null;
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] tx result`, txResult);
                if (!txResult?.result) {
                    return createInvalidTransactionResponse('Transaction result undefined');
                }

                const txSimulation: TxSimulation = {
                    status: txReceipt.status,
                    errorMsg: getErrorMessage(txResult),
                };
                if (!txCheck.isAccept(txResult.result)) return { balanceUpdates: [], txSimulation };

                // TODO TMP
                const walletBalance = await fetchWalletBalances(provider, account.address);
                const balanceUpdates = walletBalance
                    ? calculateBalanceUpdates(txResult.result.Accept.up_substates, walletBalance)
                    : [];
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] wallet balances`, walletBalance);
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] balance updates`, balanceUpdates);
                if (txReceipt.status !== TransactionStatus.Accepted) {
                    set((state) => ({
                        transactions: {
                            ...state.transactions,
                            [id]: {
                                ...state.transactions[id],
                                ...{ status: 'failure' },
                            },
                        },
                    }));
                    console.info(`🌎️🌎️🌎️ [TU store][run simulation] updated status`, get().transactions);
                }

                return { balanceUpdates, txSimulation, estimatedFee: txResult.fee_receipt.total_fees_paid };
            } catch (error) {
                console.error(`Error running method "${String(methodName)}": ${error}`);
                appStateStore.setError(`Error running method "${String(methodName)}": ${error}`);
                return createInvalidTransactionResponse(`Error running method "${String(methodName)}": ${error}`);
            }
        };

        const submit = async (): Promise<FinalizeResult | null> => {
            // const { methodName, args, id } = event.data;
            try {
                console.info(`🌎️🌎️🌎️ [TU store][SUBMIT] ID`, id);
                if (!provider) {
                    appStateStore.setError(`Provider undefined`);
                    return null;
                }
                // const provider = get().tappletSigner;
                console.info(`🌎️ [TU store][run tx] Running method "${String(methodName)}"`);
                const result = await provider?.runOne(methodName, args);
                if (event.source) {
                    event.source.postMessage({ id, result, type: 'signer-call' }, { targetOrigin: event.origin });
                }
                await provider.client.waitForTransactionResult({
                    transaction_id: result.transaction_id,
                    timeout_secs: 10,
                });
                const txReceipt = await provider.getTransactionResult(result.transaction_id);
                const txResult = txReceipt.result as FinalizeResult | null;
                console.info(`🌎️ [TU store][run tx] RESULT AND RECEIPT`, txReceipt, txResult);
                set((state) => ({
                    transactions: {
                        ...state.transactions,
                        [id]: {
                            ...state.transactions[id],
                            ...{ status: txReceipt.status == TransactionStatus.Accepted ? 'success' : 'failure' },
                        },
                    },
                }));
                return txResult;
            } catch (error) {
                console.error(`Error running method "${String(methodName)}": ${error}`);
                appStateStore.setError(`Error running method "${String(methodName)}": ${error}`);
                return null;
            }
        };

        const cancel = async () => {
            if (event.source) {
                event.source.postMessage(
                    { id, result: {}, resultError: 'Transaction was cancelled', type: 'signer-call' },
                    { targetOrigin: event.origin }
                );
            }

            console.info(`🌎️🌎️🌎️ [TU store][CANCEL] ID`, id);
            // TODO fix
            set((state) => ({
                transactions: {
                    ...state.transactions,
                    [id]: {
                        ...state.transactions[id],
                        ...{ status: 'cancelled' },
                    },
                },
            }));
            console.info(`🌎️🌎️🌎️ [TU store][run simulation] updated status`, get().transactions);
        };

        try {
            console.info(`🌎️ [TU store][init tx]`);

            const newTransaction: TUTransaction = {
                methodName,
                args,
                id,
                status: 'pending',
                submit,
                cancel,
                runSimulation,
            };
            console.info(`🌎️🌎️🌎️  [TU store][init tx] TX ADDED ID`, id);
            // update state
            // const transactions = [...get().transactions, newTx];
            set((state) => ({
                transactions: {
                    ...state.transactions,
                    [id]: newTransaction,
                },
            }));
            console.info(`🌎️ [TU store][init tx] success`, newTransaction);
        } catch (error) {
            // const appStateStore = useAppStateStore.getState();
            console.error('Error setting new transaction: ', error);
            appStateStore.setError(`Error setting new transaction: ${error}`);
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

    getTransactionById: (id) => {
        return get().transactions[id];
    },
    getPendingTransaction: () => {
        const pendingTransaction = Object.values(get().transactions).find(
            (transaction) => transaction.status === 'pending'
        );
        console.log('TX pending', pendingTransaction);
        return pendingTransaction;
    },
    // runSimulation: async (id) => {
    //     const tx = get().transactions.find((transaction) => transaction.id === id);
    //     console.log('TX SIMULATION RUN ID', tx);
    //     if (!tx)
    //         return {
    //             balanceUpdates: [],
    //             txSimulation: {
    //                 status: TransactionStatus.InvalidTransaction,
    //                 errorMsg: 'No tx found',
    //             },
    //         };
    //     const { balanceUpdates, estimatedFee, txSimulation } = await tx.runSimulation();
    //     console.log('TX SIMULATION', balanceUpdates, estimatedFee, txSimulation);
    //     return { balanceUpdates, txSimulation, estimatedFee };
    // },
}));

const createInvalidTransactionResponse = (errorMsg: string) => ({
    balanceUpdates: [],
    txSimulation: {
        status: TransactionStatus.InvalidTransaction,
        errorMsg,
    },
});

const fetchWalletBalances = async (
    provider: TappletSigner,
    address: string
): Promise<AccountsGetBalancesResponse | undefined> => {
    try {
        return await provider.getAccountBalances(address);
    } catch (error) {
        console.error(`Error fetching account balances: ${error}`);
        return undefined;
    }
};

const calculateBalanceUpdates = (
    up_substates: UpSubstates,
    walletBalances: AccountsGetBalancesResponse
): BalanceUpdate[] => {
    return up_substates
        .map((upSubstate) => {
            const [substateId, { substate }] = upSubstate;

            if (!txCheck.isVaultId(substateId) || !txCheck.isVaultSubstate(substate)) return undefined;
            if (!txCheck.isFungible(substate.Vault.resource_container)) return undefined;

            const userBalance = walletBalances.balances.find((balance) => {
                return txCheck.isVaultId(balance.vault_address) && balance.vault_address.Vault === substateId.Vault;
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
};

const getErrorMessage = (txResult: FinalizeResult): string | undefined => {
    if (txCheck.isReject(txResult?.result)) {
        return txResult.result.Reject as string;
    } else if (txCheck.isAcceptFeeRejectRest(txResult?.result)) {
        return txResult.result.AcceptFeeRejectRest[1] as string;
    }
    return undefined;
};
