import { Account } from '@tari-project/tari-signer';

export interface OotleAccount extends Account {
    account_name: string;
}
