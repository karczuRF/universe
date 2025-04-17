import { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { DialogContent, FormControl, MenuItem, SelectChangeEvent } from '@mui/material';
import { useOotleWalletStore } from '@app/store/useOotleWalletStore';
import { AccountInfo } from '@tari-project/typescript-bindings';
import { OotleAccount } from '@app/types/ootle';
import { SquaredButton } from '@app/components/elements/buttons/SquaredButton';
import { Input } from '@app/components/elements/inputs/Input';
import { SettingsGroup, SettingsGroupContent } from '../../components/SettingsGroup.styles';
import { Button } from '@app/components/elements/buttons/Button';
import styled from 'styled-components';
import { Select } from '@app/components/elements/inputs/Select';
import * as m from 'motion/react-m';

const Wrapper = styled(m.div)`
    width: 100%;
    display: flex;
    position: relative;
`;

interface SelectAccountProps {
    accountsList: AccountInfo[];
    currentAccount?: OotleAccount;
}

function SelectOotleAccount({ accountsList, currentAccount }: SelectAccountProps) {
    const createAccount = useOotleWalletStore((s) => s.createAccount);
    const setDefaultAccount = useOotleWalletStore((s) => s.setDefaultAccount);
    const currentAccountName = currentAccount?.account_name ?? '';
    const [newAccountName, setNewAccountName] = useState('');

    const accountOptions = useMemo(() => {
        return accountsList.map((acc) => ({
            label: acc.account.name ?? '',
            value: acc.account.name ?? '',
        }));
    }, [accountsList]);

    const handleCreateNewAccount = useCallback(async () => {
        console.info('CREATE ACCOUNT', newAccountName);
        await createAccount(newAccountName);
    }, [createAccount, newAccountName]);

    const handleAccountChange = useCallback(
        async (value: string) => {
            console.info('CHANGE ACCOUNT TO: ', value);
            await setDefaultAccount(value);
        },
        [setDefaultAccount]
    );

    const onAddAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewAccountName(e.target.value);
    };

    //TODO refactor select component
    return (
        <Box>
            <SettingsGroup>
                <Input
                    name="new-account-name"
                    type="text"
                    placeholder="New account name"
                    value={newAccountName}
                    onChange={onAddAccountChange}
                />
                <Button size="medium" onClick={handleCreateNewAccount} disabled={!newAccountName}>
                    {'Create account'}
                </Button>
            </SettingsGroup>
            <SettingsGroupContent>
                <Wrapper>
                    <Select
                        options={accountOptions}
                        onChange={handleAccountChange}
                        selectedValue={currentAccountName}
                        variant="bordered"
                        forceHeight={36}
                    />
                </Wrapper>
            </SettingsGroupContent>
        </Box>
    );
}

export default SelectOotleAccount;
