import {
    SubstateDiff,
    VaultId,
    Vault,
    SubstateId,
    SubstateValue,
    ResourceContainer,
    ResourceAddress,
    Amount,
    RejectReason,
} from '@tari-project/typescript-bindings';
import { TappletSigner } from './TappletSigner';
import { TxSimulationResult } from './txSimulation';
import {
    FinalizeResult,
    FinalizeResultStatus,
    SubmitTransactionRequest,
    TransactionStatus,
} from '@tari-project/tarijs-types';

export interface TransactionEvent {
    methodName: Exclude<keyof TappletSigner, 'runOne'>;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    args: any[];
    id: number;
}

function isOfType<T extends object>(obj: T, key: keyof T): boolean {
    return obj !== null && typeof obj === 'object' && key in obj;
}

export const txCheck = {
    isAccept: (result: FinalizeResultStatus): result is { Accept: SubstateDiff } => {
        return 'Accept' in result;
    },

    isVaultId: (substateId: SubstateId): substateId is { Vault: VaultId } => {
        return isOfType(substateId, 'Vault' as keyof SubstateId);
    },

    isVaultSubstate: (substate: SubstateValue): substate is { Vault: Vault } => {
        return 'Vault' in substate;
    },

    isFungible: (
        resourceContainer: ResourceContainer
    ): resourceContainer is { Fungible: { address: ResourceAddress; amount: Amount; locked_amount: Amount } } => {
        return 'Fungible' in resourceContainer;
    },

    isReject: (result: FinalizeResultStatus): result is { Reject: RejectReason } => {
        return 'Reject' in result;
    },
    isAcceptFeeRejectRest: (
        result: FinalizeResultStatus
    ): result is { AcceptFeeRejectRest: [SubstateDiff, RejectReason] } => {
        return 'AcceptFeeRejectRest' in result;
    },
};

export type TappletSignerMethod = Exclude<keyof TappletSigner, 'runOne'>;

export interface TappletTransaction {
    id: number;
    methodName: TappletSignerMethod;
    args: SubmitTransactionRequest[];
    status: TransactionStatus;
    dryRun: TxSimulationResult;
    submit: () => Promise<FinalizeResult | null>;
    cancel: () => void;
    runSimulation: () => Promise<TxSimulationResult>;
}
