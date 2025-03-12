import { create } from './create.ts';
import { useAppStateStore } from './appStateStore.ts';
import { TappletSigner } from '@app/types/ootle/TappletSigner.ts';
import { TransactionEvent, TappletTransaction, txCheck } from '@app/types/ootle/transaction.ts';
import { FinalizeResult, SubmitTransactionRequest, TransactionStatus, UpSubstates } from '@tari-project/tarijs';
import { useOotleWalletStore } from './useOotleWalletStore.ts';
import { BalanceUpdate, TxSimulationResult } from '@app/types/ootle/txSimulation.ts';
import { AccountsGetBalancesResponse } from '@tari-project/typescript-bindings';
import { useTappletSignerStore } from './useTappletSignerStore.ts';

interface State {
    pendingTxId?: number;
    transactions: Record<string, TappletTransaction>;
}

interface Actions {
    addTransaction: (event: MessageEvent<TransactionEvent>) => Promise<void>;
    getTransactionById: (id: number) => TappletTransaction | undefined;
    getPendingTransaction: () => TappletTransaction | undefined;
}

type TappletTransactionsStoreState = State & Actions;

const initialState: State = {
    pendingTxId: undefined,
    transactions: {},
};

export const useTappletTransactionsStore = create<TappletTransactionsStoreState>()((set, get) => ({
    ...initialState,

    addTransaction: async (event: MessageEvent<TransactionEvent>) => {
        const { methodName, args, id } = event.data;
        const appStateStore = useAppStateStore.getState();
        const signer = useTappletSignerStore.getState().tappletSigner;

        const updateStatus = (status: TransactionStatus) => {
            set((state) => ({
                transactions: {
                    ...state.transactions,
                    [id]: {
                        ...state.transactions[id],
                        ...{ status },
                    },
                },
            }));
        };
        const updateDryRunResult = (txDryRunResult: TxSimulationResult) => {
            set((state) => ({
                transactions: {
                    ...state.transactions,
                    [id]: {
                        ...state.transactions[id],
                        ...{
                            dryRun: txDryRunResult,
                        },
                    },
                },
            }));
        };

        const runSimulation = async (): Promise<TxSimulationResult> => {
            updateStatus(TransactionStatus.DryRun);
            const account = useOotleWalletStore.getState().ootleAccount;
            const appStateStore = useAppStateStore.getState();

            try {
                if (methodName !== 'submitTransaction') {
                    updateStatus(TransactionStatus.Pending);
                    const txDryRunResult = createInvalidTxSimulationResult(
                        `Simulation for ${String(methodName)} not supported`
                    );
                    updateDryRunResult(txDryRunResult);
                    return txDryRunResult;
                }
                if (!signer || !account) {
                    const txDryRunResult = createInvalidTxSimulationResult(
                        `${!signer ? 'Signer' : 'Account'} undefined`
                    );
                    updateDryRunResult(txDryRunResult);
                    return txDryRunResult;
                }

                console.info(`🌎️🌎️🌎️ [TU store][run simulation] Run method "${String(methodName)}"`);
                const transactionReq: SubmitTransactionRequest = { ...args[0], is_dry_run: true };
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] tx req`, transactionReq);
                const tx = await signer?.runOne(methodName, [transactionReq]);
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] tx runOne ressult`, tx);
                await signer.client.waitForTransactionResult({
                    transaction_id: tx.transaction_id,
                    timeout_secs: 10,
                });
                const txReceipt = await signer.getTransactionResult(tx.transaction_id);
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] txReceipt`, txReceipt);
                const txResult = txReceipt.result as FinalizeResult | null;
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] tx result`, txResult);
                if (!txResult?.result) {
                    const txDryRunResult = createInvalidTxSimulationResult('Transaction result undefined');
                    updateDryRunResult(txDryRunResult);
                    updateStatus(TransactionStatus.Pending);
                    return txDryRunResult;
                }

                const txSimulation = {
                    status: txReceipt.status,
                    errorMsg: getErrorMessage(txResult),
                };

                if (!txCheck.isAccept(txResult.result)) {
                    updateDryRunResult({
                        balanceUpdates: [],
                        txSimulation,
                        estimatedFee: txResult.fee_receipt.total_fees_paid,
                    });
                    updateStatus(TransactionStatus.Pending);
                    return { balanceUpdates: [], txSimulation };
                }

                // TODO TMP
                const walletBalance = await fetchWalletBalances(signer, account.address);
                const balanceUpdates = walletBalance
                    ? calculateBalanceUpdates(txResult.result.Accept.up_substates, walletBalance)
                    : [];
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] wallet balances`, walletBalance);
                console.info(`🌎️🌎️🌎️ [TU store][run simulation] balance updates`, balanceUpdates);

                updateStatus(TransactionStatus.Pending);
                updateDryRunResult({
                    balanceUpdates,
                    txSimulation: txSimulation,
                    estimatedFee: txResult.fee_receipt.total_fees_paid,
                });
                console.info(`🌎️🌎️🌎️ [dryrun][TU store][run simulation] updated status`, get().transactions);
                return { balanceUpdates, txSimulation, estimatedFee: txResult.fee_receipt.total_fees_paid };
            } catch (error) {
                console.error(`Error running method "${String(methodName)}": ${error}`);
                appStateStore.setError(`Error running method "${String(methodName)}": ${error}`);
                return createInvalidTxSimulationResult(`Error running method "${String(methodName)}": ${error}`);
            }
        };

        const submit = async (): Promise<FinalizeResult | null> => {
            console.warn('✅✅✅[dryrun][ootle store] submit');
            try {
                console.info(`🌎️🌎️🌎️ [TU store][SUBMIT] ID`, id);
                if (!signer) {
                    appStateStore.setError(`Signer undefined`);
                    return null;
                }
                console.info(`🌎️ [TU store][run tx] Running method "${String(methodName)}"`);
                const result = await signer?.runOne(methodName, args);
                if (event.source) {
                    event.source.postMessage({ id, result, type: 'signer-call' }, { targetOrigin: event.origin });
                }
                await signer.client.waitForTransactionResult({
                    transaction_id: result.transaction_id,
                    timeout_secs: 10,
                });
                const txReceipt = await signer.getTransactionResult(result.transaction_id);
                const txResult = txReceipt.result as FinalizeResult | null;
                console.info(`🌎️🌎️🌎️  [TU store][run tx] RESULT AND RECEIPT`, txReceipt, txResult);
                updateStatus(txReceipt.status);
                set({ pendingTxId: undefined });
                return txResult;
            } catch (error) {
                console.error(`Error running method "${String(methodName)}": ${error}`);
                appStateStore.setError(`Error running method "${String(methodName)}": ${error}`);
                return null;
            }
        };

        const cancel = async () => {
            updateStatus(TransactionStatus.Rejected);
            if (event.source) {
                event.source.postMessage(
                    { id, result: {}, resultError: 'Transaction was cancelled', type: 'signer-call' },
                    { targetOrigin: event.origin }
                );
            }

            console.info(`🌎️🌎️🌎️ [TU store][CANCEL] ID`, id);
            console.info(`🌎️🌎️🌎️ [TU store][run simulation] updated status`, get().transactions);
            set({ pendingTxId: undefined });
        };

        try {
            console.info(`🌎️ [TU store][init tx]`);

            const newTransaction: TappletTransaction = {
                methodName,
                args,
                id,
                status: TransactionStatus.Pending,
                dryRun: {
                    balanceUpdates: [],
                    txSimulation: {
                        status: TransactionStatus.DryRun,
                    },
                },
                submit,
                cancel,
                runSimulation,
            };
            console.info(`🌎️🌎️🌎️  [TU store][init tx] TX ADDED ID`, id);
            set((state) => ({
                pendingTxId: id,
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
    getTransactionById: (id) => {
        return get().transactions[id];
    },
    getNewTransaction: () => {
        const tx = Object.values(get().transactions).find(
            (transaction) => transaction.status === TransactionStatus.New
        );
        return tx;
    },
    getPendingTransaction: () => {
        // const tx = Object.values(get().transactions).find(
        //     (transaction) => transaction.status === TransactionStatus.Pending
        // );
        // console.log('TX pending', tx);
        // return tx;
        const id = get().pendingTxId;
        return id ? get().transactions[id] : undefined;
    },
}));

const createInvalidTxSimulationResult = (errorMsg: string) => ({
    balanceUpdates: [],
    txSimulation: {
        status: TransactionStatus.InvalidTransaction,
        errorMsg,
    },
});

const fetchWalletBalances = async (
    signer: TappletSigner,
    address: string
): Promise<AccountsGetBalancesResponse | undefined> => {
    try {
        return await signer.getAccountBalances(address);
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
