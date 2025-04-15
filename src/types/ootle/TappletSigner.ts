import {
    stringToSubstateId,
    KeyBranch,
    AccountsGetBalancesResponse,
    TransactionSubmitRequest,
    AccountsListResponse,
    WalletDaemonClient,
    AccountSetDefaultResponse,
} from '@tari-project/wallet_jrpc_client';
import { IPCRpcTransport } from './ipc_transport';
import { OotleAccount } from './account';
import { TappletPermissions } from '@tari-project/tari-permissions';
import {
    AccountData,
    GetTransactionResultResponse,
    ListSubstatesResponse,
    SubmitTransactionRequest,
    SubmitTransactionResponse,
    Substate,
    TemplateDefinition,
    VaultBalances,
} from '@tari-project/tarijs-types';
import {
    BalanceEntry,
    ComponentAccessRules,
    ConfidentialViewVaultBalanceRequest,
    Instruction,
    ListAccountNftRequest,
    ListAccountNftResponse,
    PublishTemplateRequest,
    PublishTemplateResponse,
    SubstatesGetResponse,
    SubstatesListRequest,
} from '@tari-project/typescript-bindings';
import '@tari-project/tarijs-types';
import {
    convertStringToTransactionStatus,
    createNftAddressFromResource,
    ListSubstatesRequest,
    substateIdToString,
} from '@tari-project/tarijs-types';
import { TariSigner } from '@tari-project/tari-signer';

export interface WindowSize {
    width: number;
    height: number;
}

export interface TappletSignerParams {
    id: string;
    permissions: TappletPermissions;
    name?: string;
    onConnection?: () => void;
}

export type TappletSignerMethod = Exclude<keyof TappletSigner, 'runOne'>;

export interface ListAccountNftFromBalancesRequest {
    balances: BalanceEntry[];
}

export class TappletSigner implements TariSigner {
    public signerName = 'TappletSigner';
    id: string;
    params: TappletSignerParams;
    client: WalletDaemonClient;
    isProviderConnected: boolean;

    private constructor(
        params: TappletSignerParams,
        connection: WalletDaemonClient,
        public width = 0,
        public height = 0
    ) {
        this.params = params;
        this.client = connection;
        this.isProviderConnected = true;
        this.id = params.id;
    }

    static build(params: TappletSignerParams): TappletSigner {
        const client = WalletDaemonClient.new(new IPCRpcTransport());
        return new TappletSigner(params, client);
    }
    public setWindowSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    public sendWindowSizeMessage(tappletWindow: Window | null, targetOrigin: string): void {
        tappletWindow?.postMessage({ height: this.height, width: this.width, type: 'resize' }, targetOrigin);
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    async runOne(method: any, args: any[]): Promise<any> {
        console.info('[TU][TappletSigner] runOne', method);
        const res = (this[method] as (...args: any) => Promise<any>)(...args);
        return res;
    }

    public isConnected(): boolean {
        return this.isProviderConnected; //TODO tmp solution shoule be better one
    }

    public async getClient(): Promise<WalletDaemonClient> {
        return this.client;
    }

    // TODO account name should be included in TU Provider method definition to pass the arg
    public async createFreeTestCoins(accountName = 'test', amount = 1_000_000, fee?: number): Promise<AccountData> {
        const res = await this.client.createFreeTestCoins({
            account: (accountName && { Name: accountName }) || null,
            amount,
            max_fee: fee ?? null,
            key_id: null,
        });
        return {
            account_id: res.account.key_index,
            address: (res.account.address as { Component: string }).Component,
            public_key: res.public_key,
            resources: [],
        };
    }

    public async createAccount(
        accountName?: string,
        fee?: number,
        customAccessRules?: ComponentAccessRules,
        isDefault = true
    ): Promise<AccountData> {
        const res = await this.client.accountsCreate({
            account_name: accountName ?? null,
            custom_access_rules: customAccessRules ?? null,
            is_default: isDefault,
            key_id: null,
            max_fee: fee ?? null,
        });
        return {
            account_id: 0,
            address: (res.address as { Component: string }).Component,
            public_key: res.public_key,
            resources: [],
        };
    }

    public requestParentSize(): Promise<WindowSize> {
        return Promise.resolve({ width: this.width, height: this.height });
    }

    public async getAccount(): Promise<OotleAccount> {
        const { account, public_key } = await this.client.accountsGetDefault({});
        console.info('🔌 [TU][Provider] getAccount with accountsGetDefault', account, public_key);

        //TODO JUST TMP CHECKER
        const nftList = await this.client.nftsList({
            account: { ComponentAddress: substateIdToString(account.address) },
            limit: 20,
            offset: 0,
        });
        console.info('🛜 [TU][signer] nfts_list acc', nftList);

        // TODO tip: if fails try `account: { ComponentAddress: account.address }`
        const { balances } = await this.client.accountsGetBalances({
            account: { ComponentAddress: substateIdToString(account.address) },
            refresh: false,
        });

        return {
            account_id: account.key_index,
            address: substateIdToString(account.address),
            account_name: account.name ?? '',
            public_key,

            resources: balances.map((b: any) => ({
                type: b.resource_type,
                resource_address: b.resource_address,
                balance: b.balance + b.confidential_balance,
                token_symbol: b.token_symbol,
                vault_id:
                    typeof b.vault_address === 'string' && b.vault_address.length > 0
                        ? b.vault_address
                        : 'Vault' in b.vault_address
                          ? b.vault_address.Vault
                          : b.vault_address,
            })),
        };
    }

    public async getAccountBalances(componentAddress: string): Promise<AccountsGetBalancesResponse> {
        return await this.client.accountsGetBalances({
            account: { ComponentAddress: componentAddress },
            refresh: true,
        });
    }

    public async getAccountsList(limit = 10, offset = 0): Promise<AccountsListResponse> {
        return await this.client.accountsList({
            limit,
            offset,
        });
    }

    public async getAccountsBalances(accountName: string, refresh = false): Promise<AccountsGetBalancesResponse> {
        return await this.client.accountsGetBalances({ account: { Name: accountName }, refresh });
    }

    public async getSubstate(substate_id: string): Promise<Substate> {
        // TODO update param type if fix for `substate_id` is done in WalletDaemonClient
        const substateId = stringToSubstateId(substate_id);
        const { value, record } = await this.client.substatesGet({ substate_id: substateId });
        return {
            value,
            address: {
                substate_id: substateIdToString(record.substate_id),
                version: record.version,
            },
        };
    }

    public async submitTransaction(req: SubmitTransactionRequest): Promise<SubmitTransactionResponse> {
        const params: TransactionSubmitRequest = {
            transaction: {
                V1: {
                    network: req.network,
                    fee_instructions: req.fee_instructions as Instruction[],
                    instructions: req.instructions as Instruction[],
                    inputs: req.required_substates.map((s) => ({
                        // TODO: Hmm The bindings want a SubstateId object, but the wallet only wants a string. Any is used to skip type checking here
                        substate_id: s.substate_id as any,
                        version: s.version ?? null,
                    })),
                    min_epoch: null,
                    max_epoch: null,
                    is_seal_signer_authorized: req.is_seal_signer_authorized,
                },
            },
            signing_key_index: req.account_id,
            autofill_inputs: [],
            detect_inputs: true,
            proof_ids: [],
            detect_inputs_use_unversioned: req.detect_inputs_use_unversioned,
        };

        const res = await this.client.submitTransaction(params);
        return { transaction_id: res.transaction_id };
    }

    public async getTransactionResult(transactionId: string): Promise<GetTransactionResultResponse> {
        const res = await this.client.getTransactionResult({
            transaction_id: transactionId,
        });

        return {
            transaction_id: transactionId,
            status: convertStringToTransactionStatus(res.status),
            result: res.result as any,
        };
    }

    public async getPublicKey(branch: string, index: number): Promise<string> {
        const res = await this.client.createKey({ branch: branch as KeyBranch, specific_index: index });
        return res.public_key;
    }

    public async getTemplateDefinition(template_address: string): Promise<TemplateDefinition> {
        const res = await this.client.templatesGet({ template_address });
        return res.template_definition;
    }

    public async getConfidentialVaultBalances({
        vault_id,
        maximum_expected_value,
        minimum_expected_value,
        view_key_id,
    }: ConfidentialViewVaultBalanceRequest): Promise<VaultBalances> {
        const res = await this.client.viewVaultBalance({
            view_key_id,
            vault_id,
            minimum_expected_value,
            maximum_expected_value,
        });
        return { balances: res.balances as unknown as Map<string, number | null> };
    }

    public async listSubstates({
        filter_by_template,
        filter_by_type,
        limit,
        offset,
    }: ListSubstatesRequest): Promise<ListSubstatesResponse> {
        const res = await this.client.substatesList({
            filter_by_template,
            filter_by_type,
            limit,
            offset,
        } as SubstatesListRequest);
        const substates = res.substates.map((s) => ({
            substate_id: substateIdToString(s.substate_id),
            module_name: s.module_name,
            version: s.version,
            template_address: s.template_address,
        }));

        return { substates };
    }

    public async setDefaultAccount(accountName: string): Promise<AccountSetDefaultResponse> {
        return await this.client.accountsSetDefault({ account: { Name: accountName } });
    }

    public async transactionsPublishTemplate(request: PublishTemplateRequest): Promise<PublishTemplateResponse> {
        return await this.client.publishTemplate(request);
    }

    public async getNftsList({ account, limit, offset }: ListAccountNftRequest): Promise<ListAccountNftResponse> {
        const res = await this.client.nftsList({
            account,
            limit,
            offset,
        });

        return res;
    }

    public async getNftsFromAccountBalances(req: ListAccountNftFromBalancesRequest): Promise<SubstatesGetResponse[]> {
        const accountNfts: SubstatesGetResponse[] = [];
        const balances = req.balances;
        if (balances.length === 0) return accountNfts;

        for (const balance of balances) {
            if (balance.resource_type !== 'NonFungible') continue;

            const substateNft = await this.client.substatesGet({
                substate_id: balance.vault_address,
            });

            if ('Vault' in substateNft.value) {
                const resourceContainer = substateNft.value.Vault.resource_container;
                if (resourceContainer && 'NonFungible' in resourceContainer) {
                    const nonFungibleContainer = resourceContainer.NonFungible;
                    const { address, token_ids } = nonFungibleContainer;

                    for (const tokenId of token_ids) {
                        const nftId = createNftAddressFromResource(address, tokenId);
                        // TODO tmp type convertion untill fix for `substateGet` is done
                        const nftIdSubstate = stringToSubstateId(nftId);
                        const nftData = await this.client.substatesGet({ substate_id: nftIdSubstate });
                        accountNfts.push(nftData);
                    }
                }
            }
        }
        console.info('🛜🛜🛜 [TU][signer][getNftsFromAccountBalances]', accountNfts);
        return accountNfts;
    }
}

// export function createNftAddressFromResource(address: ResourceAddress, tokenId: NonFungibleId): string {
//     let nftAddress = 'nft_';

//     const resourceAddress = address.replace(/^resource_/, '');
//     nftAddress += resourceAddress;

//     nftAddress += '_uuid_';

//     const nftIdHexString = convertU256ToHexString(tokenId);
//     nftAddress += nftIdHexString;

//     return nftAddress;
// }
